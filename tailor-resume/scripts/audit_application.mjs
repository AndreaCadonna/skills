#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeResume, readResume } from "./validate_resume.mjs";

const PRIORITIES = new Set(["required", "preferred"]);
const EVIDENCE_CLASSES = new Set(["direct", "transferable", "interest", "gap"]);
const TREATMENTS = new Set(["claim", "demonstrate", "omit", "disclose"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

export function materialResumePaths(resumeInput) {
  const resume = normalizeResume(resumeInput);
  const selected = new Set(resume.sections);
  const paths = [];
  const add = (pathName, value) => {
    if (text(value)) paths.push(pathName);
  };

  for (const field of ["name", "headline", "email", "phone", "website"]) {
    add(`basics.${field}`, resume.basics[field]);
  }
  add("basics.location.address", resume.basics.location.address);
  resume.basics.profiles.forEach((profile, index) => {
    add(`basics.profiles[${index}].label`, profile.label);
    add(`basics.profiles[${index}].url`, profile.url);
  });
  if (selected.has("summary")) add("summary", resume.summary);
  if (selected.has("work")) resume.work.forEach((job, index) => {
    for (const field of ["company", "position", "location", "startDate", "endDate"]) {
      add(`work[${index}].${field}`, job[field]);
    }
    job.highlights.forEach((value, bulletIndex) => add(`work[${index}].highlights[${bulletIndex}]`, value));
  });
  if (selected.has("skills")) resume.skills.forEach((skill, index) => {
    add(`skills[${index}].name`, skill.name);
    skill.keywords.forEach((value, keywordIndex) => add(`skills[${index}].keywords[${keywordIndex}]`, value));
  });
  if (selected.has("education")) resume.education.forEach((item, index) => {
    for (const field of ["institution", "location", "studyType", "area", "startDate", "endDate", "score"]) {
      add(`education[${index}].${field}`, item[field]);
    }
  });
  if (selected.has("projects")) resume.projects.forEach((project, index) => {
    for (const field of ["name", "description", "url"]) add(`projects[${index}].${field}`, project[field]);
    project.keywords.forEach((value, keywordIndex) => add(`projects[${index}].keywords[${keywordIndex}]`, value));
    project.highlights.forEach((value, bulletIndex) => add(`projects[${index}].highlights[${bulletIndex}]`, value));
  });
  if (selected.has("awards")) resume.awards.forEach((award, index) => {
    for (const field of ["title", "date", "awarder", "summary"]) add(`awards[${index}].${field}`, award[field]);
  });
  return paths;
}

export function auditApplication(resumeInput, auditInput) {
  const errors = [];
  const warnings = [];
  const error = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });

  if (!auditInput || typeof auditInput !== "object" || Array.isArray(auditInput)) {
    return { valid: false, errors: [{ field: "$", message: "Audit must be a JSON object." }], warnings };
  }
  const materialPaths = new Set(materialResumePaths(resumeInput));
  const requirements = Array.isArray(auditInput.requirements) ? auditInput.requirements : [];
  const claims = Array.isArray(auditInput.claims) ? auditInput.claims : [];
  if (!Array.isArray(auditInput.requirements)) error("requirements", "Expected an array.");
  if (!Array.isArray(auditInput.claims)) error("claims", "Expected an array.");
  if (!text(auditInput.targetRole)) warn("targetRole", "Record the exact target role.");
  const resumeTargetRole = normalizeResume(resumeInput).strategy.targetRole;
  if (text(auditInput.targetRole) && resumeTargetRole && text(auditInput.targetRole) !== resumeTargetRole) {
    error("targetRole", "Audit targetRole must match resume strategy.targetRole.");
  }

  const requirementIds = new Set();
  requirements.forEach((row, index) => {
    const base = `requirements[${index}]`;
    const id = text(row?.id);
    const evidenceClass = text(row?.evidenceClass);
    const treatment = text(row?.treatment);
    const sourceIds = strings(row?.sourceIds);
    const resumePaths = strings(row?.resumePaths);
    if (!id) error(`${base}.id`, "Stable requirement ID is required.");
    else if (requirementIds.has(id)) error(`${base}.id`, "Requirement ID must be unique.");
    requirementIds.add(id);
    if (!text(row?.text)) error(`${base}.text`, "Requirement text is required.");
    if (!PRIORITIES.has(text(row?.priority))) error(`${base}.priority`, "Use required or preferred.");
    if (!EVIDENCE_CLASSES.has(evidenceClass)) error(`${base}.evidenceClass`, "Use direct, transferable, interest, or gap.");
    if (!TREATMENTS.has(treatment)) error(`${base}.treatment`, "Use claim, demonstrate, omit, or disclose.");
    if (evidenceClass && evidenceClass !== "gap" && !sourceIds.length) {
      error(`${base}.sourceIds`, "Non-gap evidence requires at least one source ID.");
    }
    if (evidenceClass === "gap" && ["claim", "demonstrate"].includes(treatment)) {
      error(base, "A gap cannot be claimed or demonstrated.");
    }
    if (evidenceClass === "interest" && ["claim", "demonstrate"].includes(treatment)) {
      error(base, "Interest-only knowledge may be disclosed as learning, not claimed or demonstrated as experience.");
    }
    if (["claim", "demonstrate"].includes(treatment) && !resumePaths.length) {
      error(`${base}.resumePaths`, "Claimed or demonstrated requirements need a resume path.");
    }
    resumePaths.forEach((resumePath) => {
      if (!materialPaths.has(resumePath)) error(`${base}.resumePaths`, `Unknown or empty resume path: ${resumePath}`);
    });
  });

  const coveredPaths = new Set();
  claims.forEach((row, index) => {
    const base = `claims[${index}]`;
    const resumePath = text(row?.path);
    const sourceIds = strings(row?.sourceIds);
    if (!resumePath) error(`${base}.path`, "Resume path is required.");
    else if (coveredPaths.has(resumePath)) error(`${base}.path`, "Claim path must be unique.");
    coveredPaths.add(resumePath);
    if (resumePath && !materialPaths.has(resumePath)) error(`${base}.path`, `Unknown or empty resume path: ${resumePath}`);
    if (!sourceIds.length) error(`${base}.sourceIds`, "Every material claim requires at least one source ID.");
  });

  const claimSources = new Map(claims.map((row) => [
    text(row?.path),
    new Set(strings(row?.sourceIds)),
  ]));
  requirements.forEach((row, index) => {
    if (!["claim", "demonstrate"].includes(text(row?.treatment))) return;
    const requirementSources = new Set(strings(row?.sourceIds));
    strings(row?.resumePaths).forEach((resumePath) => {
      const sources = claimSources.get(resumePath) || new Set();
      if (![...requirementSources].some((sourceId) => sources.has(sourceId))) {
        error(
          `requirements[${index}].resumePaths`,
          `Requirement and claim sources do not overlap for ${resumePath}.`,
        );
      }
    });
  });

  const missingPaths = [...materialPaths].filter((resumePath) => !coveredPaths.has(resumePath));
  if (missingPaths.length) {
    error("claims", `Missing source coverage for ${missingPaths.length} material path(s): ${missingPaths.join(", ")}`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

async function readJson(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch (cause) {
    throw new Error(`Invalid JSON in ${filePath}: ${cause.message}`);
  }
}

async function main() {
  const [resumePath, auditPath] = process.argv.slice(2);
  if (!resumePath || !auditPath || process.argv.includes("--help")) {
    console.log("Usage: node audit_application.mjs <resume.json> <application-audit.json>");
    process.exitCode = resumePath && auditPath ? 0 : 2;
    return;
  }
  try {
    const report = auditApplication(
      await readResume(path.resolve(resumePath)),
      await readJson(path.resolve(auditPath)),
    );
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.valid ? 0 : 1;
  } catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
