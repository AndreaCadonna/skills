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

export const CAREER_STAGES = Object.freeze([
  "unspecified",
  "student",
  "junior",
  "mid",
  "senior",
  "staff",
  "career-change",
  "research",
]);

export const OUTPUT_MODES = Object.freeze(["application", "portfolio"]);
export const RENDERER_KINDS = Object.freeze(["ats", "resumake"]);
export const ATS_BODY_FONT_SIZES = Object.freeze([10.5, 11, 11.5, 12]);
export const PAGE_SIZES = Object.freeze(["A4", "Letter"]);

const ALLOWED_SECTIONS = new Set([...DEFAULT_SECTIONS, "awards"]);
const CAREER_STAGE_SET = new Set(CAREER_STAGES);
const OUTPUT_MODE_SET = new Set(OUTPUT_MODES);
const RENDERER_KIND_SET = new Set(RENDERER_KINDS);
const ATS_BODY_FONT_SIZE_SET = new Set(ATS_BODY_FONT_SIZES);
const PAGE_SIZE_SET = new Set(PAGE_SIZES);
const SUMMARY_RECOMMENDED = new Set(["senior", "staff", "career-change", "research"]);
const WEAK_BULLET_START = /^(responsible for|worked on|helped with|assisted with|involved in)\b/i;
const SCALE_OR_OUTCOME = /(\d|%|percent|across|adopted|availability|cost|customer|decreas|eliminat|faster|improv|increas|latency|lower|reduc|reliability|revenue|saving|serving|team|throughput|user)/i;
const VAGUE_ENGINEERING_OBJECT = /\b(major feature|key component|various improvements|multiple improvements|several improvements|various features)\b/i;
const CONVENTIONAL_HEADINGS = new Set([
  "profile", "summary", "awards", "experience", "work experience",
  "professional experience", "relevant experience", "technical experience",
  "skills", "technical skills", "education", "projects", "selected projects",
  "certifications", "publications", "education and certifications",
]);

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function normalizeEmphasis(value) {
  if (!plainObject(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([pathName, phrases]) => [
    text(pathName),
    arrayOrEmpty(phrases).map(text).filter(Boolean),
  ]).filter(([pathName]) => pathName));
}

function normalizeEmphasisPolicy(value) {
  const policy = plainObject(value) ? value : {};
  return {
    maxPhrasesPerField: policy.maxPhrasesPerField ?? null,
    requireAllBullets: policy.requireAllBullets ?? false,
  };
}

function emphasisTargets(resume) {
  const targets = new Map();
  const selected = new Set(resume.sections);
  const add = (pathName, value, allowWholeField = false) => {
    if (text(value)) targets.set(pathName, { value: text(value), allowWholeField });
  };
  if (selected.has("summary")) add("summary", resume.summary);
  if (selected.has("skills")) {
    resume.skills.forEach((skill, index) => {
      skill.keywords.forEach((keyword, keywordIndex) => {
        add(`skills[${index}].keywords[${keywordIndex}]`, keyword, true);
      });
    });
  }
  if (selected.has("work")) {
    resume.work.forEach((job, index) => {
      job.highlights.forEach((highlight, bulletIndex) => {
        add(`work[${index}].highlights[${bulletIndex}]`, highlight);
      });
    });
  }
  if (selected.has("projects")) {
    resume.projects.forEach((project, index) => {
      add(`projects[${index}].description`, project.description);
      project.highlights.forEach((highlight, bulletIndex) => {
        add(`projects[${index}].highlights[${bulletIndex}]`, highlight);
      });
    });
  }
  return targets;
}

export function sanitizeDocumentBasename(value, fallback = "resume") {
  let name = text(value) || fallback;
  name = name.replace(/\.pdf$/i, "")
    .replace(/[<>:\"/\\|?*\x00-\x1f]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  if (!name || name === "." || name === "..") name = fallback;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = `${name}-resume`;
  return name;
}

function normalizePageSize(value) {
  const clean = text(value).toLowerCase();
  if (clean === "a4") return "A4";
  if (clean === "letter") return "Letter";
  return text(value) || "A4";
}

function recommendedSections(stage) {
  const orders = {
    student: ["profile", "summary", "education", "skills", "work", "projects", "awards"],
    junior: ["profile", "summary", "skills", "work", "projects", "education", "awards"],
    mid: ["profile", "summary", "skills", "work", "projects", "education", "awards"],
    senior: ["profile", "summary", "skills", "work", "projects", "education", "awards"],
    staff: ["profile", "summary", "work", "skills", "projects", "education", "awards"],
    "career-change": ["profile", "summary", "skills", "projects", "work", "education", "awards"],
    research: ["profile", "summary", "skills", "work", "projects", "education", "awards"],
  };
  return orders[stage] || [...DEFAULT_SECTIONS, "awards"];
}

function year(value) {
  const match = text(value).match(/\b(?:19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function dateStyle(value) {
  const clean = text(value);
  if (!clean || /^present$/i.test(clean)) return null;
  if (/^\d{4}$/.test(clean)) return "YYYY";
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(clean)) return "YYYY-MM";
  if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(clean)) return "Month YYYY";
  return "other";
}

export function normalizeResume(input) {
  const basics = plainObject(input?.basics) ? input.basics : {};
  const strategy = plainObject(input?.strategy) ? input.strategy : {};
  const renderer = plainObject(input?.renderer) ? input.renderer : {};
  const emphasis = normalizeEmphasis(input?.emphasis);
  const emphasisPolicy = normalizeEmphasisPolicy(input?.emphasisPolicy);
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
    renderer: {
      kind: text(renderer.kind) || "resumake",
      documentBasename: text(renderer.documentBasename),
      bodyFontSize: renderer.bodyFontSize ?? 11,
      pageSize: normalizePageSize(renderer.pageSize),
    },
    strategy: {
      careerStage: text(strategy.careerStage) || "unspecified",
      outputMode: text(strategy.outputMode) || "application",
      targetRole: text(strategy.targetRole),
      roleFamily: text(strategy.roleFamily),
      locale: text(strategy.locale),
      pageTarget: strategy.pageTarget ?? null,
    },
    headings: { ...DEFAULT_HEADINGS, ...(input?.headings || {}) },
    sections: Array.isArray(input?.sections)
      ? [...input.sections]
      : [...DEFAULT_SECTIONS],
    emphasis,
    emphasisPolicy,
    basics: {
      name: text(basics.name),
      label: text(basics.label) || text(basics.headline),
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
      highlights: arrayOrEmpty(project?.highlights).map(text).filter(Boolean),
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
  for (const field of ["basics", "headings", "strategy", "renderer", "emphasis", "emphasisPolicy"]) {
    if (
      input[field] !== undefined
      && (!input[field] || typeof input[field] !== "object" || Array.isArray(input[field]))
    ) {
      error(field, "Expected an object.");
    }
  }
  if (plainObject(input.renderer)) {
    for (const field of ["kind", "documentBasename", "pageSize"]) {
      if (input.renderer[field] !== undefined && typeof input.renderer[field] !== "string") {
        error(`renderer.${field}`, "Expected a string.");
      }
    }
    if (input.renderer.bodyFontSize !== undefined && typeof input.renderer.bodyFontSize !== "number") {
      error("renderer.bodyFontSize", "Expected a number.");
    }
  }
  if (plainObject(input.emphasisPolicy)) {
    for (const key of Object.keys(input.emphasisPolicy)) {
      if (!["maxPhrasesPerField", "requireAllBullets"].includes(key)) {
        error(`emphasisPolicy.${key}`, "Unknown emphasis-policy field.");
      }
    }
    if (
      input.emphasisPolicy.maxPhrasesPerField !== undefined
      && input.emphasisPolicy.maxPhrasesPerField !== null
      && (!Number.isInteger(input.emphasisPolicy.maxPhrasesPerField)
        || input.emphasisPolicy.maxPhrasesPerField < 1)
    ) {
      error("emphasisPolicy.maxPhrasesPerField", "Use a positive integer or null.");
    }
    if (
      input.emphasisPolicy.requireAllBullets !== undefined
      && typeof input.emphasisPolicy.requireAllBullets !== "boolean"
    ) {
      error("emphasisPolicy.requireAllBullets", "Expected true or false.");
    }
  }

  const resume = normalizeResume(input);
  const { strategy } = resume;
  const tailoredWorkflow = plainObject(input.strategy) || input?.renderer?.kind === "ats";

  if (!Number.isInteger(resume.selectedTemplate) || resume.selectedTemplate < 1 || resume.selectedTemplate > 9) {
    error("selectedTemplate", "Expected an integer from 1 through 9.");
  }
  if (!RENDERER_KIND_SET.has(resume.renderer.kind)) {
    error("renderer.kind", "Use ats or resumake.");
  }
  if (resume.renderer.kind === "ats" && !ATS_BODY_FONT_SIZE_SET.has(resume.renderer.bodyFontSize)) {
    error("renderer.bodyFontSize", `Use one of: ${ATS_BODY_FONT_SIZES.join(", ")} points.`);
  }
  if (!PAGE_SIZE_SET.has(resume.renderer.pageSize)) {
    error("renderer.pageSize", "Use A4 or Letter.");
  }
  if (resume.renderer.documentBasename) {
    const safeName = sanitizeDocumentBasename(resume.renderer.documentBasename);
    if (safeName !== resume.renderer.documentBasename) {
      warn("renderer.documentBasename", `The output basename will be sanitized to ${safeName}.`);
    }
  }
  if (!CAREER_STAGE_SET.has(strategy.careerStage)) {
    error("strategy.careerStage", "Use one of: " + CAREER_STAGES.join(", ") + ".");
  }
  if (!OUTPUT_MODE_SET.has(strategy.outputMode)) {
    error("strategy.outputMode", "Use application or portfolio.");
  }
  if (strategy.pageTarget !== null && ![1, 2].includes(strategy.pageTarget)) {
    error("strategy.pageTarget", "Use 1, 2, or null.");
  }
  if (strategy.careerStage !== "unspecified" && strategy.pageTarget === null) {
    warn("strategy.pageTarget", "Record a one- or two-page inspection target for this application.");
  }
  if (["student", "junior"].includes(strategy.careerStage) && strategy.pageTarget === 2) {
    warn("strategy.pageTarget", "Start with one page for this career stage unless a second page preserves essential relevant evidence.");
  }
  if (tailoredWorkflow && strategy.outputMode === "application" && resume.renderer.kind === "resumake") {
    warn("renderer.kind", "Original Resumake templates are not ATS-verified; this application copy requires explicit extraction-order review.");
  }

  const targets = emphasisTargets(resume);
  const hasEmphasis = plainObject(input.emphasis) && Object.keys(input.emphasis).length > 0;
  const hasEmphasisPolicy = resume.emphasisPolicy.maxPhrasesPerField !== null
    || resume.emphasisPolicy.requireAllBullets;
  if ((hasEmphasis || hasEmphasisPolicy) && resume.renderer.kind === "resumake") {
    error(
      hasEmphasis ? "emphasis" : "emphasisPolicy",
      "Inline emphasis requires renderer.kind ats; original Resumake templates do not support it.",
    );
  }
  if (hasEmphasis) {
    for (const [pathName, rawPhrases] of Object.entries(input.emphasis)) {
      const field = `emphasis.${pathName}`;
      if (!Array.isArray(rawPhrases)) {
        error(field, "Expected an array of exact phrases.");
        continue;
      }
      const target = targets.get(pathName);
      if (!target) {
        error(field, "Unknown or empty emphasis path.");
        continue;
      }
      if (!rawPhrases.length) {
        error(field, "Use at least one non-empty emphasis phrase.");
      }
      if (
        resume.emphasisPolicy.maxPhrasesPerField !== null
        && rawPhrases.length > resume.emphasisPolicy.maxPhrasesPerField
      ) {
        error(field, `Use no more than ${resume.emphasisPolicy.maxPhrasesPerField} emphasis phrase(s) for this field.`);
      }
      const seen = new Set();
      const spans = [];
      rawPhrases.forEach((rawPhrase, index) => {
        const phraseField = `${field}[${index}]`;
        if (typeof rawPhrase !== "string") {
          error(phraseField, "Expected a string containing an exact phrase.");
          return;
        }
        const phrase = text(rawPhrase);
        if (!phrase) {
          error(phraseField, "Emphasis phrase must be non-empty.");
          return;
        }
        if (phrase !== rawPhrase) {
          error(phraseField, "Do not use leading or trailing whitespace in an emphasis phrase.");
        }
        if (seen.has(phrase)) error(phraseField, "Duplicate emphasis phrase.");
        seen.add(phrase);
        const first = target.value.indexOf(phrase);
        const last = target.value.lastIndexOf(phrase);
        if (first < 0) {
          error(phraseField, "Phrase does not occur in the target field with exact case.");
          return;
        }
        if (first !== last) {
          error(phraseField, "Phrase must occur exactly once in the target field.");
          return;
        }
        if (!target.allowWholeField && phrase === target.value) {
          error(phraseField, "Do not emphasize the entire field.");
        }
        spans.push({ start: first, end: first + phrase.length, phraseField });
      });
      spans.sort((left, right) => left.start - right.start);
      for (let index = 1; index < spans.length; index += 1) {
        if (spans[index].start < spans[index - 1].end) {
          error(spans[index].phraseField, "Emphasis phrases may not overlap.");
        }
      }
    }
  }
  if (resume.emphasisPolicy.requireAllBullets) {
    const selected = new Set(resume.sections);
    const requiredBulletPaths = [
      ...(selected.has("work") ? resume.work.flatMap((job, index) => (
        job.highlights.map((_, bulletIndex) => `work[${index}].highlights[${bulletIndex}]`)
      )) : []),
      ...(selected.has("projects") ? resume.projects.flatMap((project, index) => (
        project.highlights.map((_, bulletIndex) => `projects[${index}].highlights[${bulletIndex}]`)
      )) : []),
    ];
    requiredBulletPaths.forEach((pathName) => {
      if (!resume.emphasis[pathName]?.length) {
        error(`emphasis.${pathName}`, "The configured emphasis policy requires at least one phrase for every rendered bullet.");
      }
    });
  }
  if (!strategy.targetRole) {
    warn("strategy.targetRole", "Record the target role so positioning can be audited.");
  }
  if (strategy.careerStage === "unspecified") {
    warn("strategy.careerStage", "Record career stage to apply the correct section, summary, bullet, and page strategy.");
  }

  if (!resume.basics.name) {
    error("basics.name", "A candidate name is required.");
  }
  if (tailoredWorkflow && strategy.outputMode === "application" && !resume.basics.label) {
    warn("basics.label", "Add an evidence-supported target headline beneath the candidate name.");
  }
  if (resume.basics.label.length > 120) {
    warn("basics.label", "Keep the headline to approximately 120 characters or fewer.");
  }
  if (resume.basics.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.basics.email)) {
    warn("basics.email", "Email format looks unusual.");
  }
  if (resume.renderer.kind === "resumake" && resume.basics.website.split(/\s+/).filter(Boolean).length > 1) {
    warn("basics.website", "Resumake renders one website; only the first URL will be used.");
  }
  if (resume.renderer.kind === "ats" && resume.basics.profiles.length > 3) {
    warn("basics.profiles", "The ATS renderer displays the first three selected profiles; remove unselected links.");
  }
  if (resume.renderer.kind === "ats") {
    resume.basics.profiles.slice(0, 3).forEach((profile, index) => {
      if (profile.url && !profile.label) {
        warn(`basics.profiles[${index}].label`, "Add a descriptive label such as LinkedIn, GitHub, or Portfolio.");
      }
    });
  }
  for (const [field, url] of [
    ["basics.website", resume.basics.website.split(/\s+/).filter(Boolean)[0] || ""],
    ...resume.basics.profiles.map((profile, index) => [`basics.profiles[${index}].url`, profile.url]),
  ]) {
    if (url && !/^https?:\/\//i.test(url)) warn(field, "Use a complete http:// or https:// URL.");
  }

  if (!resume.summary && SUMMARY_RECOMMENDED.has(strategy.careerStage)) {
    warn("summary", "A compact summary is recommended for this career-stage strategy.");
  } else if (resume.summary) {
    const sentenceCount = (resume.summary.match(/[.!?](?:\s|$)/g) || []).length;
    const sentenceLimit = ["senior", "staff"].includes(strategy.careerStage) ? 3 : 2;
    if (sentenceCount > sentenceLimit) {
      warn("summary", `Keep the summary to at most ${sentenceLimit} compact sentences.`);
    }
    if (resume.summary.length > 520) {
      warn("summary", "The summary is likely too long for a compact SWE resume.");
    }
  }

  const seenSections = new Set();
  resume.sections.forEach((section, index) => {
    if (!ALLOWED_SECTIONS.has(section)) {
      error(`sections[${index}]`, "Unknown section: " + String(section));
    }
    if (seenSections.has(section)) {
      error(`sections[${index}]`, "Duplicate section: " + String(section));
    }
    seenSections.add(section);
  });
  if (resume.sections[0] !== "profile") {
    warn("sections", "Place the contact/profile block first.");
  }
  const expected = recommendedSections(strategy.careerStage)
    .filter((section) => resume.sections.includes(section));
  if (resume.sections.some((section, index) => expected[index] !== section)) {
    warn("sections", `Review section order for ${strategy.careerStage}: ${expected.join(", ")}.`);
  }
  if (resume.sections.includes("summary") && resume.sections.includes("awards")) {
    warn("sections", "Summary and awards share one upstream Resumake section; do not combine them unless the merged heading and reading order are intentional.");
  }
  if (strategy.outputMode === "application") {
    for (const [key, value] of Object.entries(resume.headings)) {
      if (text(value) && !CONVENTIONAL_HEADINGS.has(text(value).toLowerCase())) {
        warn(`headings.${key}`, "Use a conventional ATS-recognizable section label for the application copy.");
      }
    }
  }

  if (!resume.work.length && !["student", "career-change"].includes(strategy.careerStage)) {
    warn("work", "No work experience is present.");
  }
  resume.work.forEach((job, index) => {
    const base = `work[${index}]`;
    if (!job.company) error(`${base}.company`, "Company is required.");
    if (!job.position) error(`${base}.position`, "Historical job title is required.");
    if (!job.highlights.length) error(`${base}.highlights`, "At least one highlight is required.");
    if (job.highlights.length > 5) {
      warn(`${base}.highlights`, "Use no more than five high-signal bullets for a major role; compress by relevance.");
    }
    job.highlights.forEach((highlight, bulletIndex) => {
      const field = `${base}.highlights[${bulletIndex}]`;
      if (highlight.length > 300) warn(field, "Bullet may wrap excessively.");
      if (WEAK_BULLET_START.test(highlight)) warn(field, "Replace the weak duty phrase with the candidate's supported contribution.");
      if (VAGUE_ENGINEERING_OBJECT.test(highlight)) warn(field, "Name the concrete service, component, product flow, pipeline, or engineering process.");
      if (index === 0 && bulletIndex === 0 && !SCALE_OR_OUTCOME.test(highlight)) {
        warn(field, "The first recent-role bullet should usually show a defensible result or scope signal.");
      }
    });
    if (index < resume.work.length - 1) {
      const currentYear = year(job.startDate);
      const nextYear = year(resume.work[index + 1].startDate);
      if (currentYear !== null && nextYear !== null && currentYear < nextYear) {
        warn("work", "Work entries do not appear to be in reverse chronological order.");
      }
    }
  });

  resume.skills.forEach((skill, index) => {
    const base = `skills[${index}]`;
    if (!skill.name) error(`${base}.name`, "Skill category is required.");
    if (!skill.keywords.length) error(`${base}.keywords`, "At least one keyword is required.");
  });

  const evidenceCorpus = [
    resume.summary,
    ...resume.work.flatMap((job) => job.highlights),
    ...resume.projects.flatMap((project) => [project.description, ...project.highlights]),
  ].join(" ").toLowerCase();
  const keywords = resume.skills.flatMap((skill) => skill.keywords);
  const contextualized = keywords.filter((keyword) => evidenceCorpus.includes(keyword.toLowerCase()));
  if (keywords.length >= 4 && contextualized.length / keywords.length < 0.5) {
    warn("skills", "Fewer than half of listed technologies appear in summary, experience, or project context; remove weak items or demonstrate them.");
  }

  resume.education.forEach((item, index) => {
    if (!item.institution) error(`education[${index}].institution`, "Institution is required.");
  });

  resume.projects.forEach((project, index) => {
    const base = `projects[${index}]`;
    if (!project.name) error(`${base}.name`, "Project name is required.");
    if (!project.description && !project.highlights.length) {
      error(`${base}.description`, "Provide a description or at least one project highlight.");
    }
    if (["student", "junior", "career-change"].includes(strategy.careerStage) && !project.highlights.length) {
      warn(`${base}.highlights`, "Add evidence of architecture, testing/deployment, scope, or outcome for this career-stage strategy.");
    }
    project.highlights.forEach((highlight, bulletIndex) => {
      if (highlight.length > 300) warn(`${base}.highlights[${bulletIndex}]`, "Project bullet may wrap excessively.");
    });
  });

  resume.awards.forEach((award, index) => {
    if (![award.title, award.summary, award.awarder, award.date].some(Boolean)) {
      error(`awards[${index}]`, "At least one award field is required.");
    }
  });

  const styles = new Set([
    ...resume.work.flatMap((job) => [job.startDate, job.endDate]),
    ...resume.education.flatMap((item) => [item.startDate, item.endDate]),
  ].map(dateStyle).filter(Boolean));
  if (styles.size > 1 || styles.has("other")) {
    warn("dates", "Use one recognizable date format consistently, such as YYYY, YYYY-MM, or Mon YYYY.");
  }

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
    return JSON.parse(source.replace(/^\uFEFF/, ""));
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
if (isMain) await main();
