---
name: tailor-resume
description: Tailor truthful software-engineering resumes and CVs to job descriptions, build source-backed ATS content, audit requirement and claim evidence, convert existing resume data into the local schema, and render verified PDFs or TeX with the nine original Resumake v2 LaTeX templates. Use for targeted SWE applications, resume rewrites, requirement matching, resume JSON preparation, template selection, evidence audits, or final PDF generation.
---

# Tailor Resume

Produce a role-specific evidence document whose claims remain traceable to candidate sources. Use the bundled Resumake v2 generators locally instead of a remote resume service.

## 1. Resolve the request

Identify:

- the complete job description and target role;
- the candidate source: supplied resume, local profile, or connected Google Docs/Sheets;
- the candidate's career stage, target seniority, SWE role family, and relevant locale;
- whether the output is an ATS application copy or a more visual portfolio copy;
- whether the user wants analysis, tailored content, JSON, an evidence audit, or a final PDF;
- the destination and filename when producing artifacts.

Infer career stage and role family from reliable context when possible. Ask only for an input that cannot be obtained safely. Treat contact details and employment history as sensitive data.

Completion criterion: target, sources, strategy, deliverables, and output location are known.

## 2. Load the applicable references

- For every tailoring or rewrite, read [references/tailoring-policy.md](references/tailoring-policy.md).
- Before creating renderer input, read [references/resume-schema.md](references/resume-schema.md).
- Before creating or validating an evidence sidecar, read [references/application-audit.md](references/application-audit.md).
- When facts come from Google Docs, Sheets, or unstructured files, read [references/profile-sources.md](references/profile-sources.md).
- Before choosing a template, read [references/templates.md](references/templates.md).
- Before generating PDF or TeX, read [references/renderer.md](references/renderer.md).

Completion criterion: every reference required by the active branch has been read before acting.

## 3. Model the role and evidence

Extract explicit responsibilities, required and preferred qualifications, domain context, seniority signals, operating expectations, and repeated role verbs. Mark inferred expectations as inferred rather than presenting them as job requirements.

Map each explicit requirement to direct evidence, transferable evidence, interest-only knowledge, or a gap. Record stable source identifiers. Build the career-stage strategy and recommended section order under the tailoring policy.

When important evidence is vague, ask focused questions about the engineering object, contribution, method, users, system scale, baseline, result, or defensible scope proxy. Never manufacture a metric to strengthen a bullet.

Completion criterion: every explicit requirement is classified, inferred signals are labelled, and every evidence assertion has a source.

## 4. Draft and compress from evidence

Select the most relevant supported facts. Preserve historical titles, employers, dates, technologies, ownership, scope, and metrics. Write the headline, conditional summary, experience bullets, skills, education, and relevant projects under the career-stage and SWE guidance.

Maintain a private evidence sidecar alongside the draft. Each material claim must identify its resume path and one or more source IDs. Remove low-value duties, duplicated claims, obsolete tools, weak projects, and links that do not strengthen the application.

Completion criterion: every material claim is supported, the top third establishes role fit, and every included line advances the application.

## 5. Validate structure and evidence

Write renderer input and the evidence sidecar as UTF-8 JSON. Run structural and semantic validation:

```text
node <skill-directory>/scripts/validate_resume.mjs <resume.json>
```

When an evidence sidecar is available, run:

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json>
```

Resolve every error. Review warnings against the tailoring policy instead of suppressing them mechanically. Do not describe schema validation alone as proof that resume claims are supported.

Completion criterion: schema validation succeeds, the evidence audit succeeds when applicable, and warnings are corrected or intentionally accepted.

## 6. Render and inspect

Use the user's selected template. For an ATS application copy, default to template 1 and warn before using a template that is not ATS-verified. For a portfolio copy, follow the user's visual preference.

Render with:

```text
node <skill-directory>/scripts/render_resumake.mjs --input <resume.json> --output-dir <directory> --basename <company-role>
```

Use `--template 1` through `--template 9` only to override JSON. Use `--overwrite` only when replacing an identified prior bundle is intended. Add `--tex-only` when source only is requested or the TeX engine is unavailable. Use the ReportLab renderer only when the user explicitly accepts a generic non-Resumake fallback.

Inspect every PDF page for clipping, wrapping, hierarchy, whitespace, glyphs, links, and meaningful page use. Confirm text is selectable, extracted text follows logical reading order, conventional headings survive extraction, and contact details are present in the body. Perform a rapid top-third scan for target role, level, relevant stack, strongest impact, and scale.

Use the shortest length that preserves differentiated evidence. Do not achieve a page target through unreadable typography or removal of essential proof.

Completion criterion: requested artifacts exist and the latest PDF passes visual, text, ATS, rapid-scan, and page-value checks.

## 7. Deliver

Return artifact paths and briefly identify the target role, career-stage strategy, major tailoring choices, schema validation, evidence-audit status, ATS inspection, and genuine requirement gaps. Keep the evidence sidecar private unless requested.

For critique-only requests, stop after reporting evidence-backed improvements; do not write artifacts unless requested.
