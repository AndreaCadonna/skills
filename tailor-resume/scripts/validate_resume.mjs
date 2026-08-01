#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_HEADINGS = Object.freeze({
  summary: "Profile",
  awards: "Awards",
  work: "Work Experience",
  skills: "Skills",
  education: "Education",
  projects: "Projects",
});

export const DEFAULT_SECTIONS = Object.freeze([
  "profile",
  "summary",
  "work",
  "skills",
  "education",
  "projects",
]);

const ALLOWED_SECTIONS = new Set(DEFAULT_SECTIONS);
ALLOWED_SECTIONS.add("awards");

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeResume(input) {
  const basics = input?.basics
    && typeof input.basics === "object"
    && !Array.isArray(input.basics)
    ? input.basics
    : {};
  const rawAwards = arrayOrEmpty(input?.awards);
  const legacySummaryIndex = rawAwards.findIndex((award) => (
    text(award?.summary)
    && !text(award?.title)
    && !text(award?.date)
    && !text(award?.awarder)
  ));
  const legacySummary = legacySummaryIndex >= 0
    ? text(rawAwards[legacySummaryIndex]?.summary)
    : "";

  return {
    selectedTemplate: input?.selectedTemplate ?? 1,
    headings: { ...DEFAULT_HEADINGS, ...(input?.headings || {}) },
    sections: Array.isArray(input?.sections)
      ? [...input.sections]
      : [...DEFAULT_SECTIONS],
    basics: {
      name: text(basics.name),
      email: text(basics.email),
      phone: text(basics.phone),
      website: text(basics.website),
      location: { address: text(basics.location?.address) },
      profiles: arrayOrEmpty(basics.profiles).map((profile) => ({
        label: text(profile?.label),
        url: text(profile?.url),
      })),
    },
    summary: text(input?.summary) || legacySummary || "",
    work: arrayOrEmpty(input?.work).map((job) => ({
      company: text(job?.company) || text(job?.name),
      position: text(job?.position),
      location: text(job?.location),
      startDate: text(job?.startDate),
      endDate: text(job?.endDate),
      highlights: arrayOrEmpty(job?.highlights).map(text).filter(Boolean),
    })),
    skills: arrayOrEmpty(input?.skills).map((skill) => ({
      name: text(skill?.name),
      keywords: arrayOrEmpty(skill?.keywords).map(text).filter(Boolean),
    })),
    education: arrayOrEmpty(input?.education).map((item) => ({
      institution: text(item?.institution),
      location: text(item?.location),
      studyType: text(item?.studyType),
      area: text(item?.area),
      startDate: text(item?.startDate),
      endDate: text(item?.endDate),
      score: text(item?.score) || text(item?.gpa),
    })),
    projects: arrayOrEmpty(input?.projects).map((project) => ({
      name: text(project?.name),
      description: text(project?.description),
      url: text(project?.url),
      keywords: arrayOrEmpty(project?.keywords).map(text).filter(Boolean),
    })),
    awards: rawAwards
      .filter((_, index) => index !== legacySummaryIndex)
      .map((award) => ({
        title: text(award?.title),
        date: text(award?.date),
        awarder: text(award?.awarder),
        summary: text(award?.summary),
      })),
  };
}

export function validateResume(input) {
  const errors = [];
  const warnings = [];
  const error = (field, message) => errors.push({ field, message });
  const warn = (field, message) => warnings.push({ field, message });

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      errors: [{ field: "$", message: "Resume must be a JSON object." }],
      warnings,
      normalized: null,
    };
  }

  for (const field of ["work", "skills", "education", "projects", "awards"]) {
    if (input[field] !== undefined && !Array.isArray(input[field])) {
      error(field, "Expected an array.");
    }
  }
  if (input.sections !== undefined && !Array.isArray(input.sections)) {
    error("sections", "Expected an array.");
  }
  if (
    input.basics !== undefined
    && (!input.basics || typeof input.basics !== "object" || Array.isArray(input.basics))
  ) {
    error("basics", "Expected an object.");
  }
  if (
    input.headings !== undefined
    && (!input.headings || typeof input.headings !== "object" || Array.isArray(input.headings))
  ) {
    error("headings", "Expected an object.");
  }

  const resume = normalizeResume(input);

  if (!Number.isInteger(resume.selectedTemplate) || resume.selectedTemplate < 1 || resume.selectedTemplate > 9) {
    error("selectedTemplate", "Expected an integer from 1 through 9.");
  }
  if (!resume.basics.name) {
    error("basics.name", "A candidate name is required.");
  }
  if (resume.basics.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.basics.email)) {
    warn("basics.email", "Email format looks unusual.");
  }
  if (resume.basics.website.split(/\s+/).filter(Boolean).length > 1) {
    warn("basics.website", "Resumake renders one website; only the first URL will be used.");
  }
  if (!resume.summary) {
    warn("summary", "A targeted summary is recommended.");
  } else {
    const sentenceCount = (resume.summary.match(/[.!?](?:\s|$)/g) || []).length;
    if (sentenceCount > 2) {
      warn("summary", "Keep the summary to at most two sentences.");
    }
    if (resume.summary.length > 420) {
      warn("summary", "The summary is likely too long for a compact resume.");
    }
  }

  const seenSections = new Set();
  resume.sections.forEach((section, index) => {
    if (!ALLOWED_SECTIONS.has(section)) {
      error("sections[" + index + "]", "Unknown section: " + String(section));
    }
    if (seenSections.has(section)) {
      error("sections[" + index + "]", "Duplicate section: " + String(section));
    }
    seenSections.add(section);
  });
  if (resume.sections[0] !== "profile") {
    warn("sections", "Place profile first for the bundled template.");
  }
  if (resume.projects.length && resume.sections.at(-1) !== "projects") {
    warn("sections", "Place projects last unless another order is intentional.");
  }
  if (resume.sections.includes("summary") && resume.sections.includes("awards")) {
    warn("sections", "Summary and awards share one upstream Resumake section and will be combined.");
  }

  if (!resume.work.length) {
    warn("work", "No work experience is present.");
  }
  resume.work.forEach((job, index) => {
    const base = "work[" + index + "]";
    if (!job.company) error(base + ".company", "Company is required.");
    if (!job.position) error(base + ".position", "Historical job title is required.");
    if (!job.highlights.length) error(base + ".highlights", "At least one highlight is required.");
    const recommendedMax = index === 0 ? 4 : 3;
    if (job.highlights.length > recommendedMax) {
      warn(base + ".highlights", "Recommended maximum is " + recommendedMax + " bullets.");
    }
    job.highlights.forEach((highlight, bulletIndex) => {
      if (highlight.length > 260) {
        warn(base + ".highlights[" + bulletIndex + "]", "Bullet may wrap excessively.");
      }
    });
  });

  resume.skills.forEach((skill, index) => {
    const base = "skills[" + index + "]";
    if (!skill.name) error(base + ".name", "Skill category is required.");
    if (!skill.keywords.length) error(base + ".keywords", "At least one keyword is required.");
  });

  resume.education.forEach((item, index) => {
    if (!item.institution) {
      error("education[" + index + "].institution", "Institution is required.");
    }
  });

  resume.projects.forEach((project, index) => {
    const base = "projects[" + index + "]";
    if (!project.name) error(base + ".name", "Project name is required.");
    if (!project.description) error(base + ".description", "Project description is required.");
  });

  resume.awards.forEach((award, index) => {
    if (![award.title, award.summary, award.awarder, award.date].some(Boolean)) {
      error("awards[" + index + "]", "At least one award field is required.");
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized: resume,
  };
}

export async function readResume(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(source);
  } catch (cause) {
    throw new Error("Invalid JSON in " + filePath + ": " + cause.message);
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || process.argv.includes("--help")) {
    console.log("Usage: node validate_resume.mjs <resume.json>");
    process.exitCode = filePath ? 0 : 2;
    return;
  }

  try {
    const report = validateResume(await readResume(path.resolve(filePath)));
    console.log(JSON.stringify({
      valid: report.valid,
      errors: report.errors,
      warnings: report.warnings,
    }, null, 2));
    process.exitCode = report.valid ? 0 : 1;
  } catch (cause) {
    console.error(cause.message);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
