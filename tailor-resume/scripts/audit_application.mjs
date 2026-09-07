#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeResume, readResume } from "./validate_resume.mjs";

const PRIORITIES = new Set(["required", "preferred"]);
const EVIDENCE_CLASSES = new Set(["direct", "transferable", "interest", "gap"]);
const TREATMENTS = new Set(["claim", "demonstrate", "omit", "disclose"]);
const CONTENT_FIELDS = Object.freeze([
  "goalProblem",
  "engineeringObject",
  "ownership",
  "methodDecision",
  "scope",
  "outcome",
]);
const CONTENT_FIELD_SET = new Set(CONTENT_FIELDS);
const CONTENT_IMPORTANCE = new Set(["important", "supporting"]);
const BULLET_KINDS = new Set(["accomplishment", "decision", "responsibility-summary", "context"]);
const ROLE_COVERAGE_DECISIONS = new Set(["sufficient", "deliberate-omission", "not-applicable"]);
const OMISSION_REASONS = new Set([
  "genuine-duplication",
  "disclosure-restriction",
  "space-prioritization",
  "decision-focused-nearby-result",
]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validateOmission({ omission, field, error, knownHighlightPaths, rolePath, excludedResumePaths = new Set() }) {
  if (!plainObject(omission)) {
    error(field, "Expected an omission object.");
    return;
  }
  const reason = text(omission.reason);
  const nearbyResumePaths = strings(omission.nearbyResumePaths);
  if (omission.nearbyResumePaths !== undefined && !Array.isArray(omission.nearbyResumePaths)) {
    error(`${field}.nearbyResumePaths`, "Expected an array.");
  }
  if (!OMISSION_REASONS.has(reason)) {
    error(`${field}.reason`, `Use one of: ${[...OMISSION_REASONS].join(", ")}.`);
  }
  if (!text(omission.detail)) {
    error(`${field}.detail`, "Explain the evidence-selection trade-off.");
  }
  nearbyResumePaths.forEach((resumePath) => {
    if (!knownHighlightPaths.has(resumePath)) {
      error(`${field}.nearbyResumePaths`, `Unknown work-highlight path: ${resumePath}`);
    } else if (!resumePath.startsWith(`${rolePath}.highlights[`)) {
      error(`${field}.nearbyResumePaths`, `Nearby evidence must belong to ${rolePath}.`);
    } else if (excludedResumePaths.has(resumePath)) {
      error(`${field}.nearbyResumePaths`, "Nearby evidence must be established by another bullet.");
    }
  });
  if (["genuine-duplication", "decision-focused-nearby-result"].includes(reason) && !nearbyResumePaths.length) {
    error(`${field}.nearbyResumePaths`, `${reason} requires at least one nearby resume path.`);
  }
}

function validateContentAudit({ resume, auditInput, materialPaths, claimSources, error, warn }) {
  const contentAudit = auditInput.contentAudit;
  if (contentAudit === undefined) {
    warn(
      "contentAudit",
      "Add the semantic content-selection audit for new tailored drafts; legacy traceability-only maps remain valid.",
    );
    return;
  }
  if (!plainObject(contentAudit)) {
    error("contentAudit", "Expected an object.");
    return;
  }
  if (contentAudit.version !== 1) {
    error("contentAudit.version", "Use content-audit version 1.");
  }

  const evidenceUnits = Array.isArray(contentAudit.evidenceUnits) ? contentAudit.evidenceUnits : [];
  const bulletAudits = Array.isArray(contentAudit.bulletAudits) ? contentAudit.bulletAudits : [];
  const roleAudits = Array.isArray(contentAudit.roleAudits) ? contentAudit.roleAudits : [];
  if (!Array.isArray(contentAudit.evidenceUnits)) error("contentAudit.evidenceUnits", "Expected an array.");
  if (!Array.isArray(contentAudit.bulletAudits)) error("contentAudit.bulletAudits", "Expected an array.");
  if (!Array.isArray(contentAudit.roleAudits)) error("contentAudit.roleAudits", "Expected an array.");

  const knownRolePaths = new Set(resume.work.map((_, index) => `work[${index}]`));
  const knownHighlightPaths = new Set(
    resume.work.flatMap((job, index) => (
      job.highlights.map((_, bulletIndex) => `work[${index}].highlights[${bulletIndex}]`)
    )),
  );
  const unitIds = new Set();
  const unitsById = new Map();

  evidenceUnits.forEach((unit, index) => {
    const base = `contentAudit.evidenceUnits[${index}]`;
    const id = text(unit?.id);
    const rolePath = text(unit?.rolePath);
    const importance = text(unit?.importance);
    const sourceIds = strings(unit?.sourceIds);
    const resumePaths = strings(unit?.resumePaths);
    const preservedFields = strings(unit?.preservedFields);
    const availableFields = plainObject(unit?.availableFields) ? unit.availableFields : {};
    const fieldOmissions = Array.isArray(unit?.fieldOmissions) ? unit.fieldOmissions : [];

    if (!id) error(`${base}.id`, "Stable evidence-unit ID is required.");
    else if (unitIds.has(id)) error(`${base}.id`, "Evidence-unit ID must be unique.");
    unitIds.add(id);
    if (!knownRolePaths.has(rolePath)) error(`${base}.rolePath`, `Unknown work role path: ${rolePath || "(empty)"}`);
    if (!CONTENT_IMPORTANCE.has(importance)) error(`${base}.importance`, "Use important or supporting.");
    if (!Array.isArray(unit?.sourceIds)) error(`${base}.sourceIds`, "Expected an array.");
    if (!sourceIds.length) error(`${base}.sourceIds`, "Every evidence unit requires at least one source ID.");
    if (!Array.isArray(unit?.resumePaths)) error(`${base}.resumePaths`, "Expected an array.");
    if (!Array.isArray(unit?.preservedFields)) error(`${base}.preservedFields`, "Expected an array.");
    if (!plainObject(unit?.availableFields)) error(`${base}.availableFields`, "Expected an object.");
    CONTENT_FIELDS.forEach((fieldName) => {
      if (!Object.hasOwn(availableFields, fieldName)) {
        error(`${base}.availableFields.${fieldName}`, "Record a supported value or null.");
      } else if (availableFields[fieldName] !== null && typeof availableFields[fieldName] !== "string") {
        error(`${base}.availableFields.${fieldName}`, "Use a string or null.");
      } else if (typeof availableFields[fieldName] === "string" && !text(availableFields[fieldName])) {
        error(`${base}.availableFields.${fieldName}`, "Use a supported non-empty string or null.");
      }
    });
    resumePaths.forEach((resumePath) => {
      if (!knownHighlightPaths.has(resumePath) || !materialPaths.has(resumePath)) {
        error(`${base}.resumePaths`, `Unknown or empty work-highlight path: ${resumePath}`);
      } else if (!resumePath.startsWith(`${rolePath}.highlights[`)) {
        error(`${base}.resumePaths`, `Evidence unit belongs to ${rolePath}, not ${resumePath}.`);
      }
      const sourcesForClaim = claimSources.get(resumePath) || new Set();
      if (!sourceIds.some((sourceId) => sourcesForClaim.has(sourceId))) {
        error(`${base}.sourceIds`, `Evidence-unit and claim sources do not overlap for ${resumePath}.`);
      }
    });
    const seenPreservedFields = new Set();
    preservedFields.forEach((fieldName) => {
      if (!CONTENT_FIELD_SET.has(fieldName)) {
        error(`${base}.preservedFields`, `Unknown content field: ${fieldName}`);
      } else if (seenPreservedFields.has(fieldName)) {
        error(`${base}.preservedFields`, `Duplicate content field: ${fieldName}`);
      } else if (!text(availableFields[fieldName])) {
        error(`${base}.preservedFields`, `Cannot preserve unsupported or empty field: ${fieldName}`);
      }
      seenPreservedFields.add(fieldName);
    });
    if (preservedFields.length && !resumePaths.length) {
      error(`${base}.preservedFields`, "An omitted evidence unit cannot preserve fields in the resume.");
    }

    const omittedFields = new Set();
    if (!Array.isArray(unit?.fieldOmissions)) error(`${base}.fieldOmissions`, "Expected an array.");
    fieldOmissions.forEach((omission, omissionIndex) => {
      const omissionBase = `${base}.fieldOmissions[${omissionIndex}]`;
      const fieldName = text(omission?.field);
      if (!CONTENT_FIELD_SET.has(fieldName)) {
        error(`${omissionBase}.field`, `Use one of: ${CONTENT_FIELDS.join(", ")}.`);
      } else if (omittedFields.has(fieldName)) {
        error(`${omissionBase}.field`, "Each omitted field may be recorded only once.");
      } else if (!text(availableFields[fieldName])) {
        error(`${omissionBase}.field`, `Cannot omit unsupported or empty field: ${fieldName}`);
      } else if (seenPreservedFields.has(fieldName)) {
        error(`${omissionBase}.field`, `A field cannot be both preserved and omitted: ${fieldName}`);
      }
      omittedFields.add(fieldName);
      validateOmission({
        omission,
        field: omissionBase,
        error,
        knownHighlightPaths,
        rolePath,
        excludedResumePaths: new Set(resumePaths),
      });
    });

    if (!resumePaths.length) {
      validateOmission({
        omission: unit?.selectionOmission,
        field: `${base}.selectionOmission`,
        error,
        knownHighlightPaths,
        rolePath,
      });
      if (text(unit?.selectionOmission?.reason) === "decision-focused-nearby-result") {
        error(
          `${base}.selectionOmission.reason`,
          "decision-focused-nearby-result applies to an included decision bullet, not a wholly omitted evidence unit.",
        );
      }
    } else if (unit?.selectionOmission !== undefined && unit.selectionOmission !== null) {
      error(`${base}.selectionOmission`, "Included evidence must not have a selection omission.");
    }
    if (importance === "important" && resumePaths.length) {
      for (const fieldName of ["goalProblem", "outcome"]) {
        if (
          text(availableFields[fieldName])
          && !seenPreservedFields.has(fieldName)
          && !omittedFields.has(fieldName)
        ) {
          error(
            `${base}.fieldOmissions`,
            `Important supported ${fieldName} evidence must be preserved or deliberately omitted.`,
          );
        }
      }
    }
    unitsById.set(id, {
      ...unit,
      auditIndex: index,
      id,
      rolePath,
      importance,
      resumePaths,
      preservedFields: seenPreservedFields,
      availableFields,
    });
  });

  const bulletPaths = new Set();
  const bulletKinds = new Map();
  bulletAudits.forEach((bullet, index) => {
    const base = `contentAudit.bulletAudits[${index}]`;
    const resumePath = text(bullet?.path);
    const evidenceUnitIds = strings(bullet?.evidenceUnitIds);
    const kind = text(bullet?.kind);
    if (!knownHighlightPaths.has(resumePath)) error(`${base}.path`, `Unknown work-highlight path: ${resumePath || "(empty)"}`);
    else if (bulletPaths.has(resumePath)) error(`${base}.path`, "Bullet audit path must be unique.");
    bulletPaths.add(resumePath);
    if (!Array.isArray(bullet?.evidenceUnitIds)) error(`${base}.evidenceUnitIds`, "Expected an array.");
    if (!evidenceUnitIds.length) error(`${base}.evidenceUnitIds`, "Audit each bullet against at least one evidence unit.");
    const seenEvidenceUnitIds = new Set();
    evidenceUnitIds.forEach((id) => {
      if (seenEvidenceUnitIds.has(id)) error(`${base}.evidenceUnitIds`, `Duplicate evidence-unit ID: ${id}`);
      seenEvidenceUnitIds.add(id);
      const unit = unitsById.get(id);
      if (!unit) error(`${base}.evidenceUnitIds`, `Unknown evidence-unit ID: ${id}`);
      else if (!unit.resumePaths.includes(resumePath)) {
        error(`${base}.evidenceUnitIds`, `${id} does not map to ${resumePath}.`);
      }
    });
    if (!text(bullet?.primaryIdea)) error(`${base}.primaryIdea`, "State the bullet's one primary idea.");
    if (!BULLET_KINDS.has(kind)) error(`${base}.kind`, `Use one of: ${[...BULLET_KINDS].join(", ")}.`);
    if (typeof bullet?.strongerAccomplishmentAvailable !== "boolean") {
      error(`${base}.strongerAccomplishmentAvailable`, "Use true or false after comparing available role evidence.");
    }
    bulletKinds.set(resumePath, kind);
    if (kind === "responsibility-summary" && bullet?.strongerAccomplishmentAvailable === true) {
      warn(base, "Generic responsibility summary consumes space while stronger accomplishment evidence is available.");
    }
  });
  unitsById.forEach((unit) => {
    const decisionFocused = Array.isArray(unit.fieldOmissions)
      && unit.fieldOmissions.some((omission) => text(omission?.reason) === "decision-focused-nearby-result");
    if (decisionFocused && !unit.resumePaths.some((resumePath) => bulletKinds.get(resumePath) === "decision")) {
      error(
        `contentAudit.evidenceUnits[${unit.auditIndex}].fieldOmissions`,
        "decision-focused-nearby-result requires the included evidence unit to map to a decision bullet.",
      );
    }
  });

  const auditedRolePaths = new Set();
  roleAudits.forEach((role, index) => {
    const base = `contentAudit.roleAudits[${index}]`;
    const rolePath = text(role?.path);
    const coverageDecision = text(role?.coverageDecision);
    if (!knownRolePaths.has(rolePath)) error(`${base}.path`, `Unknown work role path: ${rolePath || "(empty)"}`);
    else if (auditedRolePaths.has(rolePath)) error(`${base}.path`, "Role audit path must be unique.");
    auditedRolePaths.add(rolePath);
    if (typeof role?.recentOrTargetRelevant !== "boolean") {
      error(`${base}.recentOrTargetRelevant`, "Use true or false.");
    }
    if (!ROLE_COVERAGE_DECISIONS.has(coverageDecision)) {
      error(`${base}.coverageDecision`, `Use one of: ${[...ROLE_COVERAGE_DECISIONS].join(", ")}.`);
    }
    if (role?.recentOrTargetRelevant === true && coverageDecision === "not-applicable") {
      error(`${base}.coverageDecision`, "A recent or target-relevant role requires a coverage decision.");
    }
    if (role?.recentOrTargetRelevant === false && coverageDecision !== "not-applicable") {
      error(`${base}.coverageDecision`, "Use not-applicable for a role outside the detailed content audit.");
    }
    if (coverageDecision === "deliberate-omission" && !text(role?.notes)) {
      error(`${base}.notes`, "Explain the combined role-level omission decision.");
    }
    if (role?.recentOrTargetRelevant !== true) return;

    const roleIndex = Number(rolePath.match(/^work\[(\d+)\]$/)?.[1]);
    const expectedBulletPaths = Number.isInteger(roleIndex)
      ? resume.work[roleIndex].highlights.map((_, bulletIndex) => `${rolePath}.highlights[${bulletIndex}]`)
      : [];
    expectedBulletPaths.forEach((resumePath) => {
      if (!bulletPaths.has(resumePath)) {
        error(`${base}.path`, `Missing individual bullet audit for ${resumePath}.`);
      }
    });

    const roleUnits = [...unitsById.values()].filter((unit) => unit.rolePath === rolePath);
    if (!roleUnits.length) error(`${base}.path`, "Recent or target-relevant role needs evidence units.");
    const uncoveredRoleFields = ["goalProblem", "outcome"].filter((fieldName) => {
      const supported = roleUnits.some((unit) => (
        unit.importance === "important" && text(unit.availableFields[fieldName])
      ));
      const preserved = roleUnits.some((unit) => (
        unit.resumePaths.length && unit.preservedFields.has(fieldName)
      ));
      return supported && !preserved;
    });
    if (uncoveredRoleFields.length && coverageDecision !== "deliberate-omission") {
      error(
        `${base}.coverageDecision`,
        `Combined role bullets preserve no important supported ${uncoveredRoleFields.join(" or ")}; record a deliberate omission or revise coverage.`,
      );
    }
  });
  const missingRoleAudits = [...knownRolePaths].filter((rolePath) => !auditedRolePaths.has(rolePath));
  if (missingRoleAudits.length) {
    error("contentAudit.roleAudits", `Missing role coverage decision(s): ${missingRoleAudits.join(", ")}`);
  }
}

function validateChronologyAudit({ resume, auditInput, error, warn }) {
  const chronology = auditInput.chronologyAudit;
  if (chronology === undefined) {
    warn(
      "chronologyAudit",
      "Add the career-history reconciliation audit for new tailored drafts; legacy maps remain valid.",
    );
    return;
  }
  if (!plainObject(chronology)) {
    error("chronologyAudit", "Expected an object.");
    return;
  }

  const canonicalRoles = strings(chronology.canonicalRoles);
  const includedRoles = strings(chronology.includedRoles);
  const omittedRoles = Array.isArray(chronology.omittedRoles) ? chronology.omittedRoles : [];
  if (!Array.isArray(chronology.canonicalRoles)) error("chronologyAudit.canonicalRoles", "Expected an array.");
  if (!Array.isArray(chronology.includedRoles)) error("chronologyAudit.includedRoles", "Expected an array.");
  if (!Array.isArray(chronology.omittedRoles)) error("chronologyAudit.omittedRoles", "Expected an array.");

  const canonical = new Set();
  canonicalRoles.forEach((roleId, index) => {
    if (canonical.has(roleId)) error(`chronologyAudit.canonicalRoles[${index}]`, "Canonical role IDs must be unique.");
    canonical.add(roleId);
  });
  const included = new Set();
  includedRoles.forEach((roleId, index) => {
    if (included.has(roleId)) error(`chronologyAudit.includedRoles[${index}]`, "Included role IDs must be unique.");
    included.add(roleId);
    if (!canonical.has(roleId)) error(`chronologyAudit.includedRoles[${index}]`, `Unknown canonical role ID: ${roleId}`);
  });
  if (includedRoles.length !== resume.work.length) {
    error(
      "chronologyAudit.includedRoles",
      `Record exactly one canonical role ID for each of the ${resume.work.length} visible work entries.`,
    );
  }

  const omitted = new Set();
  omittedRoles.forEach((row, index) => {
    const base = `chronologyAudit.omittedRoles[${index}]`;
    if (!plainObject(row)) {
      error(base, "Expected an omission object.");
      return;
    }
    const roleId = text(row.roleId);
    if (!roleId) error(`${base}.roleId`, "Canonical role ID is required.");
    else if (!canonical.has(roleId)) error(`${base}.roleId`, `Unknown canonical role ID: ${roleId}`);
    else if (included.has(roleId)) error(`${base}.roleId`, "A role cannot be both included and omitted.");
    else if (omitted.has(roleId)) error(`${base}.roleId`, "Omitted role IDs must be unique.");
    omitted.add(roleId);
    if (!text(row.reason)) error(`${base}.reason`, "Explain why this canonical role is absent from the resume.");
  });

  const unaccounted = canonicalRoles.filter((roleId) => !included.has(roleId) && !omitted.has(roleId));
  if (unaccounted.length) {
    error("chronologyAudit", `Every canonical role must be included or omitted with a reason: ${unaccounted.join(", ")}`);
  }
  const claimedExperience = text(chronology.claimedExperience);
  if (claimedExperience && chronology.visibleTimelineSupportsClaim !== true) {
    error(
      "chronologyAudit.visibleTimelineSupportsClaim",
      "A public experience-duration claim requires explicit confirmation that the visible chronology supports it.",
    );
  }
  if (chronology.visibleTimelineSupportsClaim !== undefined
    && typeof chronology.visibleTimelineSupportsClaim !== "boolean") {
    error("chronologyAudit.visibleTimelineSupportsClaim", "Use true or false.");
  }
  if ((claimedExperience || omittedRoles.length) && !text(chronology.notes)) {
    error("chronologyAudit.notes", "Explain the duration reconciliation and any role omissions.");
  }
}

export function materialResumePaths(resumeInput) {
  const resume = normalizeResume(resumeInput);
  const selected = new Set(resume.sections);
  const paths = [];
  const add = (pathName, value) => {
    if (text(value)) paths.push(pathName);
  };

  for (const field of ["name", "label", "email", "phone", "website"]) {
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
  const resume = normalizeResume(resumeInput);
  const materialPaths = new Set(materialResumePaths(resumeInput));
  const requirements = Array.isArray(auditInput.requirements) ? auditInput.requirements : [];
  const claims = Array.isArray(auditInput.claims) ? auditInput.claims : [];
  if (!Array.isArray(auditInput.requirements)) error("requirements", "Expected an array.");
  if (!Array.isArray(auditInput.claims)) error("claims", "Expected an array.");
  if (!text(auditInput.targetRole)) warn("targetRole", "Record the exact target role.");
  const resumeTargetRole = resume.strategy.targetRole;
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

  validateContentAudit({ resume, auditInput, materialPaths, claimSources, error, warn });
  validateChronologyAudit({ resume, auditInput, error, warn });

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
