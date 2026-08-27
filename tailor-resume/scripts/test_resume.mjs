#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditApplication, materialResumePaths } from "./audit_application.mjs";
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
  assert.equal(sanitizeDocumentBasename("Alex Example/Resume.pdf"), "Alex_Example-Resume");

  const invalidFont = structuredClone(sample);
  invalidFont.renderer.bodyFontSize = 9;
  assert.equal(validateResume(invalidFont).valid, false);

  const atsTex = buildAtsTex(sampleReport.normalized);
  assert.match(atsTex, /fontsize\{11\}/);
  assert.match(atsTex, /Full Stack Software Engineer/);
  assert.match(atsTex, /textbf\{LinkedIn:\}/);
  assert.match(atsTex, /textbf\{GitHub:\}/);
  assert.doesNotMatch(atsTex, /begin\{tabular\}/);
  assert.deepEqual(populatedSectionTitles(sampleReport.normalized), [
    "Profile", "Skills", "Work Experience", "Projects", "Education",
  ]);

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
  assert.equal(auditApplication(sample, audit).valid, true);
  assert(auditApplication(sample, audit).warnings.some((warning) => warning.field === "contentAudit"));
  const incompleteAudit = structuredClone(audit);
  incompleteAudit.claims.pop();
  assert.equal(auditApplication(sample, incompleteAudit).valid, false);

  const contentAudited = structuredClone(audit);
  contentAudited.contentAudit = sampleContentAudit();
  const contentAuditedReport = auditApplication(sample, contentAudited);
  assert.equal(contentAuditedReport.valid, true);
  assert.deepEqual(contentAuditedReport.warnings, []);

  const silentOutcomeDrop = structuredClone(contentAudited);
  silentOutcomeDrop.contentAudit.evidenceUnits[0].preservedFields = [
    "goalProblem", "engineeringObject", "ownership", "scope",
  ];
  const silentOutcomeDropReport = auditApplication(sample, silentOutcomeDrop);
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
  assert.equal(auditApplication(sample, justifiedDecisionBullet).valid, true);

  const genericSummary = structuredClone(contentAudited);
  genericSummary.contentAudit.bulletAudits[1].kind = "responsibility-summary";
  genericSummary.contentAudit.bulletAudits[1].strongerAccomplishmentAvailable = true;
  const genericSummaryReport = auditApplication(sample, genericSummary);
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
  assert.equal(auditApplication(sample, silentEvidenceSelectionDrop).valid, false);
  silentEvidenceSelectionDrop.contentAudit.evidenceUnits.at(-1).selectionOmission = {
    reason: "space-prioritization",
    detail: "A more target-relevant accomplishment used the available bullet slot.",
    nearbyResumePaths: [],
  };
  assert.equal(auditApplication(sample, silentEvidenceSelectionDrop).valid, true);

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
  const roleCoverageGapReport = auditApplication(sample, roleCoverageGap);
  assert.equal(roleCoverageGapReport.valid, false);
  assert(roleCoverageGapReport.errors.some((item) => item.message.includes("Combined role bullets")));
  roleCoverageGap.contentAudit.roleAudits[0].coverageDecision = "deliberate-omission";
  roleCoverageGap.contentAudit.roleAudits[0].notes = "Goal and outcome evidence was deliberately compressed for space after preserving the role result elsewhere.";
  assert.equal(auditApplication(sample, roleCoverageGap).valid, true);

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
