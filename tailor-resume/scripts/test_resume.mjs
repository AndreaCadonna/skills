#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditApplication, materialResumePaths } from "./audit_application.mjs";
import { injectHeadline, loadGenerator, toResumakeValues } from "./render_resumake.mjs";
import { validateResume } from "./validate_resume.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, "..");
const SAMPLE_PATH = path.join(SKILL_DIR, "assets", "sample-resume.json");

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
  weak.basics.headline = "";
  weak.selectedTemplate = 2;
  weak.work[0].highlights[0] = "Responsible for internal applications.";
  const weakReport = validateResume(weak);
  const warningFields = new Set(weakReport.warnings.map((warning) => warning.field));
  assert(warningFields.has("basics.headline"));
  assert(warningFields.has("selectedTemplate"));
  assert(warningFields.has("work[0].highlights[0]"));

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
  const incompleteAudit = structuredClone(audit);
  incompleteAudit.claims.pop();
  assert.equal(auditApplication(sample, incompleteAudit).valid, false);

  for (let template = 1; template <= 9; template += 1) {
    const templateInput = structuredClone(sample);
    templateInput.selectedTemplate = template;
    const values = toResumakeValues(templateInput);
    const generator = await loadGenerator(template);
    const tex = injectHeadline(generator(values), template, values.basics.headline);
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
    injectHeadline(template1(minimalValues), 1, minimalValues.basics.headline),
    /Full Stack Software Engineer/,
  );

  console.log("tailor-resume tests: ok");
}

await main();
