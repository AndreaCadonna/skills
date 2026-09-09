#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditApplication,
  auditApplicationWithSources,
  indexMarkdownSources,
  materialResumeEntries,
  materialResumePaths,
} from "./audit_application.mjs";
import { buildAtsTex, populatedSectionTitles } from "./render_ats_resume.mjs";
import { injectHeadline, loadGenerator, toResumakeValues } from "./render_resumake.mjs";
import { normalizeResume, sanitizeDocumentBasename, validateResume } from "./validate_resume.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const SAMPLE_PATH = path.join(SKILL_DIR, "assets", "sample-resume.json");

function sampleContentAudit() {
  return {
    version: 1,
    evidenceUnits: [
      {
        id: "recent-workflow",
        rolePath: "work[0]",
        importance: "important",
        sourceIds: ["sample-source"],
        availableFields: {
          goalProblem: "Replace recurring spreadsheet workflows",
          engineeringObject: "TypeScript services and React interfaces",
          ownership: "Built",
          methodDecision: "Service and interface implementation",
          scope: "Three internal operations teams",
          outcome: "Teams used the new workflow instead of recurring spreadsheets",
        },
        resumePaths: ["work[0].highlights[0]"],
        preservedFields: ["goalProblem", "engineeringObject", "ownership", "scope", "outcome"],
        fieldOmissions: [],
      },
      {
        id: "recent-collaboration",
        rolePath: "work[0]",
        importance: "supporting",
        sourceIds: ["sample-source"],
        availableFields: {
          goalProblem: "Improve release quality",
          engineeringObject: "Release process",
          ownership: "Led cross-functional collaboration",
          methodDecision: "Product and design partnership",
          scope: null,
          outcome: "Improved release quality",
        },
        resumePaths: ["work[0].highlights[1]"],
        preservedFields: ["goalProblem", "ownership", "methodDecision", "outcome"],
        fieldOmissions: [],
      },
      {
        id: "recent-performance",
        rolePath: "work[0]",
        importance: "important",
        sourceIds: ["sample-source"],
        availableFields: {
          goalProblem: null,
          engineeringObject: "Page-load performance",
          ownership: "Reduced",
          methodDecision: "Used project performance measurements",
          scope: "Median page-load time",
          outcome: "Reduced median page-load time by 32%",
        },
        resumePaths: ["work[0].highlights[2]"],
        preservedFields: ["engineeringObject", "ownership", "methodDecision", "scope", "outcome"],
        fieldOmissions: [],
      },
    ],
    bulletAudits: [
      {
        path: "work[0].highlights[0]",
        evidenceUnitIds: ["recent-workflow"],
        primaryIdea: "Replace a recurring internal workflow",
        kind: "accomplishment",
        strongerAccomplishmentAvailable: false,
      },
      {
        path: "work[0].highlights[1]",
        evidenceUnitIds: ["recent-collaboration"],
        primaryIdea: "Cross-functional release-quality collaboration",
        kind: "accomplishment",
        strongerAccomplishmentAvailable: false,
      },
      {
        path: "work[0].highlights[2]",
        evidenceUnitIds: ["recent-performance"],
        primaryIdea: "Measured page-load improvement",
        kind: "accomplishment",
        strongerAccomplishmentAvailable: false,
      },
    ],
    roleAudits: [
      {
        path: "work[0]",
        recentOrTargetRelevant: true,
        coverageDecision: "sufficient",
        notes: "The role establishes workflow purpose, technical ownership, scope, and qualitative and measured outcomes.",
      },
      {
        path: "work[1]",
        recentOrTargetRelevant: false,
        coverageDecision: "not-applicable",
        notes: "Older supporting role.",
      },
    ],
  };
}

function sampleChronologyAudit() {
  return {
    claimedExperience: "five years",
    canonicalRoles: ["work-example-systems", "work-sample-software"],
    includedRoles: ["work-example-systems", "work-sample-software"],
    omittedRoles: [],
    visibleTimelineSupportsClaim: true,
    notes: "The two visible roles cover the public five-year experience claim.",
  };
}

function sampleEmphasis() {
  return {
    summary: ["five years", "reliable web applications"],
    "skills[0].keywords[0]": ["TypeScript"],
    "skills[1].keywords[0]": ["React"],
    "work[0].highlights[0]": ["TypeScript services", "three internal operations teams"],
    "work[0].highlights[1]": ["cross-functional collaboration", "release quality"],
    "work[0].highlights[2]": ["32%", "median page-load time"],
    "work[1].highlights[0]": ["Node.js API features", "customer account management"],
    "work[1].highlights[1]": ["PostgreSQL queries", "production support procedures"],
    "projects[0].highlights[0]": ["selectable-text LaTeX PDFs", "without sending candidate data"],
  };
}

function sampleSourceDocuments() {
  return [{
    name: "candidate.md",
    content: [
      "`<!-- source-id: example-only -->` is documentation, not evidence.",
      "<!-- source-id: sample-source -->",
      "Sample evidence.",
      "  <!-- source-id: work-example-systems -->",
      "Current role.",
      "<!-- source-id: work-sample-software -->",
      "Earlier role.",
    ].join("\n"),
  }];
}

function strictClaims(resume) {
  return materialResumeEntries(resume).map(([resumePath, value]) => {
    const claim = {
      path: resumePath,
      value,
      sourceIds: ["sample-source"],
      confidence: "high",
      disclosure: "public-safe",
    };
    if (/^skills\[\d+\]\.keywords\[\d+\]$/.test(resumePath)) {
      claim.proficiencyClass = "core-current";
      claim.recency = "current";
      claim.evidenceContext = "professional";
    }
    return claim;
  });
}

async function main() {
  const sample = JSON.parse(await fs.readFile(SAMPLE_PATH, "utf8"));
  const skillText = await fs.readFile(path.join(SKILL_DIR, "SKILL.md"), "utf8");
  const frontmatter = skillText.match(/^---\s*\n([\s\S]*?)\n---/);
  assert(frontmatter, "SKILL.md frontmatter is missing");
  assert.match(frontmatter[1], /^name:\s*tailor-resume\s*$/m);
  assert.match(frontmatter[1], /^description:\s*\S.+$/m);
  const agentYaml = await fs.readFile(path.join(SKILL_DIR, "agents", "openai.yaml"), "utf8");
  assert.match(agentYaml, /default_prompt:\s*"[^"]*\$tailor-resume[^"]*"/);
  const sampleReport = validateResume(sample);
  assert.equal(sampleReport.valid, true);
  assert.deepEqual(sampleReport.errors, []);
  assert.deepEqual(sampleReport.warnings, []);
  const hiddenAward = structuredClone(sample);
  hiddenAward.awards = [{ title: "Hidden award" }];
  assert.equal(toResumakeValues(hiddenAward).awards.length, 1);
  hiddenAward.sections.push("awards");
  assert.equal(toResumakeValues(hiddenAward).awards.length, 2);

  const weak = structuredClone(sample);
  weak.basics.label = "";
  weak.renderer.kind = "resumake";
  weak.selectedTemplate = 2;
  weak.work[0].highlights[0] = "Responsible for internal applications.";
  const weakReport = validateResume(weak);
  const warningFields = new Set(weakReport.warnings.map((warning) => warning.field));
  assert(warningFields.has("basics.label"));
  assert(warningFields.has("renderer.kind"));
  assert(warningFields.has("work[0].highlights[0]"));

  const legacy = structuredClone(sample);
  delete legacy.renderer;
  delete legacy.strategy;
  legacy.basics.headline = legacy.basics.label;
  delete legacy.basics.label;
  const normalizedLegacy = normalizeResume(legacy);
  assert.equal(normalizedLegacy.renderer.kind, "resumake");
  assert.equal(normalizedLegacy.basics.label, "Full Stack Software Engineer | TypeScript, React, and Node.js");
  assert(!validateResume(legacy).warnings.some((warning) => warning.field === "basics.label"));
  assert.equal(validateResume(normalizedLegacy).valid, true);
  assert.deepEqual(normalizeResume(normalizedLegacy), normalizedLegacy);
  assert.equal(sanitizeDocumentBasename("Alex Example/Resume.pdf"), "Alex_Example-Resume");

  const invalidFont = structuredClone(sample);
  invalidFont.renderer.bodyFontSize = 9;
  assert.equal(validateResume(invalidFont).valid, false);

  const atsTex = buildAtsTex(sampleReport.normalized);
  assert.match(atsTex, /fontsize\{11\}/);
  assert.match(atsTex, /Full Stack Software Engineer/);
  assert.match(atsTex, /textbf\{LinkedIn:\}/);
  assert.match(atsTex, /textbf\{GitHub:\}/);
  assert.match(atsTex, /definecolor\{sectionblue\}\{HTML\}\{1F4E79\}/);
  assert.match(atsTex, /begin\{flushleft\}/);
  assert.doesNotMatch(atsTex, /begin\{center\}/);
  assert.match(atsTex, /vspace\{4pt\}\\hrule\\vspace\{4pt\}/);
  assert.match(atsTex, /textbf\{Website:\}.*textbf\{LinkedIn:\}.*textbf\{GitHub:\}/);
  assert.match(atsTex, /href\{https:\/\/social\.example\/alex\}\{LinkedIn\}/);
  assert.doesNotMatch(atsTex, /begin\{tabular\}/);
  assert.deepEqual(populatedSectionTitles(sampleReport.normalized), [
    "Profile", "Skills", "Work Experience", "Projects", "Education",
  ]);

  const emphasized = structuredClone(sample);
  emphasized.emphasis = sampleEmphasis();
  emphasized.emphasisPolicy = {
    maxPhrasesPerField: 3,
    requireAllBullets: true,
  };
  const emphasizedReport = validateResume(emphasized);
  assert.equal(emphasizedReport.valid, true);
  const emphasizedTex = buildAtsTex(emphasizedReport.normalized);
  assert.match(emphasizedTex, /textbf\{TypeScript services\}/);
  assert.match(emphasizedTex, /textbf\{TypeScript\}/);
  assert.match(emphasizedTex, /textbf\{32\\%\}/);

  const selectiveEmphasis = structuredClone(sample);
  selectiveEmphasis.emphasis = {
    "work[0].highlights[0]": [
      "Built",
      "TypeScript services",
      "React interfaces",
      "three internal operations teams",
    ],
  };
  assert.equal(validateResume(selectiveEmphasis).valid, true);
  assert.deepEqual(materialResumePaths(selectiveEmphasis), materialResumePaths(sample));

  const cappedSelectiveEmphasis = structuredClone(selectiveEmphasis);
  cappedSelectiveEmphasis.emphasisPolicy = {
    maxPhrasesPerField: 3,
    requireAllBullets: false,
  };
  assert.equal(validateResume(cappedSelectiveEmphasis).valid, false);

  const missingBulletEmphasis = structuredClone(emphasized);
  delete missingBulletEmphasis.emphasis["work[1].highlights[1]"];
  assert.equal(validateResume(missingBulletEmphasis).valid, false);

  const invalidEmphasisPhrase = structuredClone(emphasized);
  invalidEmphasisPhrase.emphasis["work[0].highlights[0]"] = ["Missing framework"];
  assert.equal(validateResume(invalidEmphasisPhrase).valid, false);

  const emptyEmphasis = structuredClone(sample);
  emptyEmphasis.emphasis = { "work[0].highlights[0]": [] };
  assert.equal(validateResume(emptyEmphasis).valid, false);

  const malformedEmphasis = structuredClone(sample);
  malformedEmphasis.emphasis = {
    "work[0].highlights[0]": ["TypeScript services", 42],
  };
  const malformedEmphasisReport = validateResume(malformedEmphasis);
  assert.equal(malformedEmphasisReport.valid, false);
  assert(malformedEmphasisReport.errors.some((item) => (
    item.field === "emphasis.work[0].highlights[0][1]"
    && item.message.includes("Expected a string")
  )));

  const overlappingEmphasis = structuredClone(sample);
  overlappingEmphasis.emphasis = {
    "work[0].highlights[0]": ["TypeScript", "TypeScript services"],
  };
  assert(validateResume(overlappingEmphasis).errors.some((item) => (
    item.message.includes("may not overlap")
  )));

  const hiddenWorkEmphasis = structuredClone(sample);
  hiddenWorkEmphasis.sections = hiddenWorkEmphasis.sections.filter((section) => section !== "work");
  hiddenWorkEmphasis.emphasis = {
    "work[0].highlights[0]": ["TypeScript services"],
  };
  assert(validateResume(hiddenWorkEmphasis).errors.some((item) => (
    item.message.includes("Unknown or empty emphasis path")
  )));

  const renderedOnlyPolicy = structuredClone(sample);
  renderedOnlyPolicy.sections = renderedOnlyPolicy.sections.filter((section) => section !== "work");
  renderedOnlyPolicy.emphasis = {
    "projects[0].highlights[0]": ["selectable-text LaTeX PDFs"],
  };
  renderedOnlyPolicy.emphasisPolicy = {
    maxPhrasesPerField: 3,
    requireAllBullets: true,
  };
  assert.equal(validateResume(renderedOnlyPolicy).valid, true);

  const specialCharacters = structuredClone(sample);
  const specialText = "Built C++ and .NET handlers for 95% &amp; paths_with_{braces}\\root.";
  specialCharacters.work[0].highlights[0] = specialText;
  specialCharacters.emphasis = {
    "work[0].highlights[0]": [
      "C++",
      ".NET",
      "95% &amp; paths_with_{braces}\\root",
    ],
  };
  const specialCharactersReport = validateResume(specialCharacters);
  assert.equal(specialCharactersReport.valid, true);
  assert.equal(specialCharactersReport.normalized.work[0].highlights[0], specialText);
  assert.doesNotMatch(JSON.stringify(specialCharactersReport.normalized.work), /\\\\textbf/);
  const specialCharactersTex = buildAtsTex(specialCharactersReport.normalized);
  assert(specialCharactersTex.includes("\\textbf{C++}"));
  assert(specialCharactersTex.includes("\\textbf{.NET}"));
  assert(specialCharactersTex.includes(
    "\\textbf{95\\% \\&amp; paths\\_with\\_\\{braces\\}\\textbackslash{}root}",
  ));

  const literalMarkup = structuredClone(sample);
  literalMarkup.work[0].highlights[0] = "Kept **C++** and \\textbf{.NET} literal in migration notes.";
  const literalMarkupReport = validateResume(literalMarkup);
  assert.equal(literalMarkupReport.valid, true);
  const literalMarkupTex = buildAtsTex(literalMarkupReport.normalized);
  assert(literalMarkupTex.includes("**C++**"));
  assert(literalMarkupTex.includes("\\textbackslash{}textbf\\{.NET\\}"));
  assert.doesNotMatch(literalMarkupTex, /\\textbf\{C\+\+\}/);

  const resumakeEmphasis = structuredClone(selectiveEmphasis);
  resumakeEmphasis.renderer.kind = "resumake";
  const resumakeEmphasisReport = validateResume(resumakeEmphasis);
  assert.equal(resumakeEmphasisReport.valid, false);
  assert(resumakeEmphasisReport.errors.some((item) => (
    item.message.includes("original Resumake templates do not support")
  )));
  assert.throws(
    () => toResumakeValues(resumakeEmphasis),
    /original Resumake templates do not support/,
  );

  const claims = materialResumePaths(sample).map((resumePath) => ({
    path: resumePath,
    sourceIds: ["sample-source"],
  }));
  const audit = {
    targetRole: sample.strategy.targetRole,
    requirements: [{
      id: "req-1",
      text: "Build full-stack web applications",
      priority: "required",
      evidenceClass: "direct",
      sourceIds: ["sample-source"],
      resumePaths: ["work[0].highlights[0]"],
      treatment: "demonstrate",
    }],
    claims,
  };
  const legacyReport = auditApplication(sample, audit);
  assert.equal(legacyReport.valid, true);
  assert.equal(legacyReport.mode, "legacy");
  assert(legacyReport.warnings.some((warning) => warning.field === "auditMode"));
  assert(legacyReport.warnings.some((warning) => warning.field === "contentAudit"));
  const incompleteAudit = structuredClone(audit);
  incompleteAudit.claims.pop();
  assert.equal(auditApplication(sample, incompleteAudit).valid, false);

  const contentAudited = structuredClone(audit);
  contentAudited.claims = strictClaims(sample);
  contentAudited.contentAudit = sampleContentAudit();
  contentAudited.chronologyAudit = sampleChronologyAudit();
  const strictOptions = { mode: "strict", sourceDocuments: sampleSourceDocuments() };
  const strictAudit = (auditInput, resumeInput = sample, options = strictOptions) => (
    auditApplication(resumeInput, auditInput, options)
  );
  const contentAuditedReport = strictAudit(contentAudited);
  assert.equal(contentAuditedReport.valid, true);
  assert.equal(contentAuditedReport.mode, "strict");
  assert.deepEqual(contentAuditedReport.warnings, []);

  const missingContentAudit = structuredClone(contentAudited);
  delete missingContentAudit.contentAudit;
  assert(strictAudit(missingContentAudit).errors.some((item) => item.field === "contentAudit"));
  const renamedContentAudit = structuredClone(contentAudited);
  renamedContentAudit.contentAuditLegacy = renamedContentAudit.contentAudit;
  delete renamedContentAudit.contentAudit;
  assert(strictAudit(renamedContentAudit).errors.some((item) => (
    item.field === "contentAudit" && item.message.includes("exactly")
  )));

  const missingCanonicalRole = structuredClone(contentAudited);
  missingCanonicalRole.chronologyAudit.includedRoles.pop();
  assert.equal(strictAudit(missingCanonicalRole).valid, false);
  const duplicateCanonicalRole = structuredClone(contentAudited);
  duplicateCanonicalRole.chronologyAudit.canonicalRoles.push("work-example-systems");
  assert(strictAudit(duplicateCanonicalRole).errors.some((item) => (
    item.field.startsWith("chronologyAudit.canonicalRoles") && item.message.includes("unique")
  )));
  const unknownIncludedRole = structuredClone(contentAudited);
  unknownIncludedRole.chronologyAudit.includedRoles[0] = "work-renamed-role";
  assert(strictAudit(unknownIncludedRole).errors.some((item) => (
    item.field === "chronologyAudit.includedRoles[0]" && item.message.includes("Unknown canonical source ID")
  )));
  const omittedWithoutReason = structuredClone(contentAudited);
  omittedWithoutReason.chronologyAudit.canonicalRoles.push("work-omitted-role");
  omittedWithoutReason.chronologyAudit.omittedRoles.push({ roleId: "work-omitted-role", reason: "" });
  const omittedSourceOptions = {
    mode: "strict",
    sourceDocuments: [{
      name: "candidate.md",
      content: `${sampleSourceDocuments()[0].content}\n<!-- source-id: work-omitted-role -->\nOmitted role.`,
    }],
  };
  assert(strictAudit(omittedWithoutReason, sample, omittedSourceOptions).errors.some((item) => (
    item.field === "chronologyAudit.omittedRoles[0].reason"
  )));
  const unsupportedDuration = structuredClone(contentAudited);
  unsupportedDuration.chronologyAudit.visibleTimelineSupportsClaim = false;
  assert.equal(strictAudit(unsupportedDuration).valid, false);

  const unresolvedReferences = [
    ["requirements", (candidate) => { candidate.requirements[0].sourceIds = ["missing-source"]; }],
    ["claims", (candidate) => { candidate.claims[0].sourceIds = ["missing-source"]; }],
    ["content", (candidate) => { candidate.contentAudit.evidenceUnits[0].sourceIds = ["missing-source"]; }],
    ["chronology", (candidate) => { candidate.chronologyAudit.canonicalRoles[0] = "missing-source"; }],
  ];
  unresolvedReferences.forEach(([label, mutate]) => {
    const candidate = structuredClone(contentAudited);
    mutate(candidate);
    assert(
      strictAudit(candidate).errors.some((item) => item.message.includes("Unknown canonical source ID")),
      `${label} source references must resolve`,
    );
  });
  const mixedReferenceLists = [
    ["requirements", (candidate) => { candidate.requirements[0].sourceIds.push(42); }],
    ["claims", (candidate) => { candidate.claims[0].sourceIds.push(42); }],
    ["content", (candidate) => { candidate.contentAudit.evidenceUnits[0].sourceIds.push(42); }],
    ["canonical chronology", (candidate) => { candidate.chronologyAudit.canonicalRoles.push(42); }],
    ["included chronology", (candidate) => { candidate.chronologyAudit.includedRoles.push(42); }],
  ];
  mixedReferenceLists.forEach(([label, mutate]) => {
    const candidate = structuredClone(contentAudited);
    mutate(candidate);
    assert(
      strictAudit(candidate).errors.some((item) => item.message.includes("non-empty canonical source ID string")),
      `${label} must reject mixed-type source IDs`,
    );
  });
  const editorialId = structuredClone(contentAudited);
  editorialId.requirements[0].sourceIds = ["A1-D"];
  assert(strictAudit(editorialId).errors.some((item) => item.message.includes("A1-D")));

  const noMarkers = strictAudit(contentAudited, sample, {
    mode: "strict",
    sourceDocuments: [{ name: "empty.md", content: "No evidence markers here." }],
  });
  assert(noMarkers.errors.some((item) => item.message.includes("no valid canonical source markers")));
  const duplicateMarkers = indexMarkdownSources([
    ...sampleSourceDocuments(),
    { name: "duplicate.md", content: "<!-- source-id: sample-source -->\nDuplicate." },
  ]);
  assert(duplicateMarkers.errors.some((item) => item.message.includes("Duplicate source ID sample-source")));
  const malformedMarkers = indexMarkdownSources([{
    name: "malformed.md",
    content: "<!-- source-id: Not_Kebab -->\nMalformed.",
  }]);
  assert(malformedMarkers.errors.some((item) => item.message.includes("Malformed source marker")));
  const fencedExample = indexMarkdownSources([{
    name: "fenced.md",
    content: [
      "````md",
      "``` fake closer text",
      "```",
      "<!-- source-id: still-ignored -->",
      "````",
      "<!-- source-id: real-source -->",
      "Evidence.",
    ].join("\n"),
  }]);
  assert.deepEqual([...fencedExample.sourceIds], ["real-source"]);
  assert.deepEqual(fencedExample.errors, []);

  const missingConfidence = structuredClone(contentAudited);
  delete missingConfidence.claims[0].confidence;
  assert(strictAudit(missingConfidence).errors.some((item) => item.field === "claims[0].confidence"));
  const missingDisclosure = structuredClone(contentAudited);
  delete missingDisclosure.claims[0].disclosure;
  assert(strictAudit(missingDisclosure).errors.some((item) => item.field === "claims[0].disclosure"));
  for (const unsafeDisclosure of ["private", "unverified", "confidential", "ask"]) {
    const unsafeClaim = structuredClone(contentAudited);
    unsafeClaim.claims[0].disclosure = unsafeDisclosure;
    assert(
      strictAudit(unsafeClaim).errors.some((item) => item.field === "claims[0].disclosure"),
      `${unsafeDisclosure} must not authorize a public claim`,
    );
  }
  const generalizedClaim = structuredClone(contentAudited);
  generalizedClaim.claims[0].disclosure = "generalize-before-use";
  assert(strictAudit(generalizedClaim).errors.some((item) => item.field === "claims[0].publicWordingReviewed"));
  generalizedClaim.claims[0].publicWordingReviewed = true;
  assert.equal(strictAudit(generalizedClaim).valid, true);

  const skillClaimIndex = contentAudited.claims.findIndex((claim) => claim.path === "skills[0].keywords[0]");
  const missingProficiency = structuredClone(contentAudited);
  delete missingProficiency.claims[skillClaimIndex].proficiencyClass;
  assert(strictAudit(missingProficiency).errors.some((item) => item.field.endsWith(".proficiencyClass")));
  const missingRecency = structuredClone(contentAudited);
  delete missingRecency.claims[skillClaimIndex].recency;
  assert(strictAudit(missingRecency).errors.some((item) => item.field.endsWith(".recency")));
  const missingContext = structuredClone(contentAudited);
  delete missingContext.claims[skillClaimIndex].evidenceContext;
  assert(strictAudit(missingContext).errors.some((item) => item.field.endsWith(".evidenceContext")));
  const unqualifiedSkill = structuredClone(contentAudited);
  unqualifiedSkill.claims[skillClaimIndex].proficiencyClass = "working-familiarity";
  assert(strictAudit(unqualifiedSkill).errors.some((item) => item.field.endsWith(".qualification")));
  const invisibleQualification = structuredClone(unqualifiedSkill);
  invisibleQualification.claims[skillClaimIndex].qualification = "Working Knowledge";
  assert(strictAudit(invisibleQualification).errors.some((item) => (
    item.field.endsWith(".qualification") && item.message.includes("rendered")
  )));
  const experimentalSkill = structuredClone(contentAudited);
  experimentalSkill.claims[skillClaimIndex].proficiencyClass = "experimental";
  assert(strictAudit(experimentalSkill).errors.some((item) => item.message.includes("primary skills section")));

  const reorderedResume = structuredClone(sample);
  [reorderedResume.work[0].highlights[0], reorderedResume.work[0].highlights[1]] = [
    reorderedResume.work[0].highlights[1], reorderedResume.work[0].highlights[0],
  ];
  assert(strictAudit(contentAudited, reorderedResume).errors.some((item) => item.message.includes("Claim value is stale")));
  const removedResume = structuredClone(sample);
  removedResume.work[0].highlights.pop();
  assert(strictAudit(contentAudited, removedResume).errors.some((item) => (
    item.message.includes("Unknown or empty resume path") || item.message.includes("Claim value is stale")
  )));

  const silentOutcomeDrop = structuredClone(contentAudited);
  silentOutcomeDrop.contentAudit.evidenceUnits[0].preservedFields = [
    "goalProblem", "engineeringObject", "ownership", "scope",
  ];
  const silentOutcomeDropReport = strictAudit(silentOutcomeDrop);
  assert.equal(silentOutcomeDropReport.valid, false);
  assert(silentOutcomeDropReport.errors.some((item) => item.message.includes("outcome evidence")));

  const justifiedDecisionBullet = structuredClone(silentOutcomeDrop);
  justifiedDecisionBullet.contentAudit.evidenceUnits[0].fieldOmissions = [{
    field: "outcome",
    reason: "decision-focused-nearby-result",
    detail: "The architecture bullet stays focused; the related role result is established by the performance bullet.",
    nearbyResumePaths: ["work[0].highlights[2]"],
  }];
  justifiedDecisionBullet.contentAudit.bulletAudits[0].kind = "decision";
  assert.equal(strictAudit(justifiedDecisionBullet).valid, true);

  const genericSummary = structuredClone(contentAudited);
  genericSummary.contentAudit.bulletAudits[1].kind = "responsibility-summary";
  genericSummary.contentAudit.bulletAudits[1].strongerAccomplishmentAvailable = true;
  const genericSummaryReport = strictAudit(genericSummary);
  assert.equal(genericSummaryReport.valid, true);
  assert(genericSummaryReport.warnings.some((item) => item.message.includes("stronger accomplishment")));

  const silentEvidenceSelectionDrop = structuredClone(contentAudited);
  silentEvidenceSelectionDrop.contentAudit.evidenceUnits.push({
    id: "unused-accomplishment",
    rolePath: "work[0]",
    importance: "important",
    sourceIds: ["sample-source"],
    availableFields: {
      goalProblem: "Remove recurring release handoffs",
      engineeringObject: "Release workflow",
      ownership: "Redesigned",
      methodDecision: "Automated the handoff sequence",
      scope: "Two release teams",
      outcome: "Reduced manual coordination",
    },
    resumePaths: [],
    preservedFields: [],
    fieldOmissions: [],
  });
  assert.equal(strictAudit(silentEvidenceSelectionDrop).valid, false);
  silentEvidenceSelectionDrop.contentAudit.evidenceUnits.at(-1).selectionOmission = {
    reason: "space-prioritization",
    detail: "A more target-relevant accomplishment used the available bullet slot.",
    nearbyResumePaths: [],
  };
  assert.equal(strictAudit(silentEvidenceSelectionDrop).valid, true);

  const roleCoverageGap = structuredClone(justifiedDecisionBullet);
  roleCoverageGap.contentAudit.evidenceUnits[0].preservedFields = [
    "engineeringObject", "ownership", "scope",
  ];
  roleCoverageGap.contentAudit.evidenceUnits[0].fieldOmissions.push({
    field: "goalProblem",
    reason: "space-prioritization",
    detail: "The draft allocated the space to target-specific technical evidence.",
    nearbyResumePaths: [],
  });
  roleCoverageGap.contentAudit.evidenceUnits[1].preservedFields = ["ownership", "methodDecision"];
  const roleCoverageGapReport = strictAudit(roleCoverageGap);
  assert.equal(roleCoverageGapReport.valid, false);
  assert(roleCoverageGapReport.errors.some((item) => item.message.includes("Combined role bullets")));
  roleCoverageGap.contentAudit.roleAudits[0].coverageDecision = "deliberate-omission";
  roleCoverageGap.contentAudit.roleAudits[0].notes = "Goal and outcome evidence was deliberately compressed for space after preserving the role result elsewhere.";
  assert.equal(strictAudit(roleCoverageGap).valid, true);

  const cliDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "tailor-resume-audit-"));
  try {
    const cliResumePath = path.join(cliDirectory, "resume.json");
    const cliAuditPath = path.join(cliDirectory, "audit.json");
    const cliSourcePath = path.join(cliDirectory, "candidate.md");
    await Promise.all([
      fs.writeFile(cliResumePath, JSON.stringify(sample), "utf8"),
      fs.writeFile(cliAuditPath, JSON.stringify(contentAudited), "utf8"),
      fs.writeFile(cliSourcePath, sampleSourceDocuments()[0].content, "utf8"),
    ]);
    const apiFileReport = await auditApplicationWithSources(sample, contentAudited, [cliSourcePath]);
    assert.equal(apiFileReport.valid, true);
    const cliResult = spawnSync(
      process.execPath,
      [path.join(SCRIPT_DIR, "audit_application.mjs"), cliResumePath, cliAuditPath, "--source", cliSourcePath],
      { encoding: "utf8" },
    );
    assert.equal(cliResult.status, 0, cliResult.stderr || cliResult.stdout);
    assert.equal(JSON.parse(cliResult.stdout).mode, "strict");
    const implicitMode = spawnSync(
      process.execPath,
      [path.join(SCRIPT_DIR, "audit_application.mjs"), cliResumePath, cliAuditPath],
      { encoding: "utf8" },
    );
    assert.equal(implicitMode.status, 2);
    const legacyCli = spawnSync(
      process.execPath,
      [path.join(SCRIPT_DIR, "audit_application.mjs"), cliResumePath, cliAuditPath, "--legacy"],
      { encoding: "utf8" },
    );
    assert.equal(legacyCli.status, 0, legacyCli.stderr || legacyCli.stdout);
    assert.equal(JSON.parse(legacyCli.stdout).mode, "legacy");
  } finally {
    await fs.rm(cliDirectory, { recursive: true, force: true });
  }

  for (let template = 1; template <= 9; template += 1) {
    const templateInput = structuredClone(sample);
    templateInput.selectedTemplate = template;
    const values = toResumakeValues(templateInput);
    const generator = await loadGenerator(template);
    const tex = injectHeadline(generator(values), template, values.basics.label);
    assert.match(tex, /Full Stack Software Engineer/);
    assert.match(tex, /selectable-text LaTeX PDFs/);
  }
  const minimalContact = structuredClone(sample);
  minimalContact.basics.email = "";
  minimalContact.basics.phone = "";
  minimalContact.basics.website = "";
  minimalContact.basics.location.address = "";
  minimalContact.basics.profiles = [];
  const minimalValues = toResumakeValues(minimalContact);
  const template1 = await loadGenerator(1);
  assert.match(
    injectHeadline(template1(minimalValues), 1, minimalValues.basics.label),
    /Full Stack Software Engineer/,
  );

  console.log("tailor-resume tests: ok");
}

await main();
