---
name: tailor-resume
description: Tailor truthful software-engineering resumes and CVs to job descriptions, build source-backed ATS content, audit requirement and claim evidence, convert existing resume data into the local schema, and render verified PDFs or TeX with a custom ATS layout or the nine original Resumake v2 templates. Use for targeted SWE applications, resume rewrites, requirement matching, resume JSON preparation, renderer selection, evidence audits, or final PDF generation.
---

# Tailor Resume

Produce a role-specific evidence document whose claims remain traceable to candidate sources. Use the additive local ATS renderer for parser-oriented application copies and keep the bundled original Resumake v2 generators available for explicit template choices.

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

For every recent or target-relevant experience, inventory the strongest evidence units and audit `Goal/problem | Engineering object | Ownership | Method/decision | Scope | Outcome`, plus confidence, disclosure level, and source IDs. Include high-value units that may lose the space competition, not only facts already selected for bullets. Missing values are evidence prompts, not permission to infer facts.

Bind technologies to the specific system, feature, service, or project where they were used. A role-level technology inventory is not evidence that every technology applied to every accomplishment. When a target-relevant evidence unit lacks its implementation language, framework, data store, infrastructure, testing tools, or deployment context, ask for the missing system-level mapping when it would materially improve the application.

When important evidence is vague, ask focused questions about the engineering object, contribution, method, users, system scale, baseline, result, or defensible scope proxy. Never manufacture a metric to strengthen a bullet.

Completion criterion: every explicit requirement is classified, inferred signals are labelled, and every evidence assertion has a source.

## 4. Draft and compress from evidence

Select the most relevant supported facts. Preserve historical titles, employers, dates, technologies, ownership, scope, metrics, user goals, replaced workflows, and qualitative outcomes. Do not let technical detail displace stronger supported purpose or impact. Write `basics.label` as the target-facing headline, plus the conditional summary, experience bullets, skills, education, and relevant projects under the career-stage and SWE guidance. Never replace a historical `work[].position` with the target title.

Inventory the canonical career history before compression. Keep every role needed to substantiate a duration claim or avoid a misleading gap; compress older roles before omitting them. Reconcile headline and summary duration claims against the work dates visible in the rendered resume. Preserve proficiency distinctions consistently across the headline, summary, skills, work, and projects.

Maintain a private evidence sidecar alongside the draft. Each material claim must identify its resume path and one or more source IDs. For new tailored drafts, add the semantic `contentAudit` from [references/application-audit.md](references/application-audit.md): record which of the six evidence fields each bullet preserves, justify important supported goal/outcome omissions, state one primary idea per recent or target-relevant bullet, flag responsibility summaries that compete with stronger accomplishments, and review combined coverage for each role. Architecture or decision bullets may rely on a nearby result rather than repeat it.

Use the property name `contentAudit` exactly for every application created or regenerated under the current workflow. Do not rename it to `contentAuditLegacy` or otherwise rely on legacy compatibility. Treat a missing-content-audit warning as unresolved for a current application.

When supported and relevant, the combined bullets for each recent or target-relevant role must demonstrate the principal implementation technologies and technical methods, not only responsibilities, product purpose, and outcomes. As a default, preserve a concrete language, framework, API, data store, infrastructure mechanism, testing method, or consequential engineering decision in at least two bullets for a major recent role; use fewer only when the role has fewer retained bullets or the available technologies would be irrelevant or misleading. Do not infer a system's stack from a role-level inventory.

Remove low-value duties, duplicated claims, obsolete tools, weak projects, and links that do not strengthen the application. Use supported qualitative outcomes and defensible scope proxies when metrics do not exist; never invent precision or treat technical wording as impact.

Completion criterion: every material claim is supported, each recent or target-relevant bullet has one primary idea, combined role bullets preserve important supported purpose and outcome or record a deliberate omission, the visible chronology supports every duration claim, positioning does not contradict the proficiency evidence, the six-second top-third scan establishes role fit and one differentiating result or scope signal, and every included line advances the application.

## 5. Validate structure and evidence

Write renderer input and the evidence sidecar as UTF-8 JSON. Run structural and semantic validation:

```text
node <skill-directory>/scripts/validate_resume.mjs <resume.json>
```

When an evidence sidecar is available, run:

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json>
```

Resolve every error. Review warnings against the tailoring policy instead of suppressing them mechanically, including legacy sidecars without `contentAudit`, prominent skills that are not demonstrated in context, and responsibility summaries that displace stronger accomplishments. A legacy-content-audit warning is acceptable only for a genuinely old application that is being inspected without regeneration; it is not acceptable for a new or regenerated application. Do not describe schema validation alone as proof that resume claims are supported or that impact evidence was preserved. Do not render or deliver while either validator reports `valid: false`. After any role, project, bullet, skill, or section change, update the sidecar and rerun both checks so stale paths cannot survive compression.

Completion criterion: schema validation succeeds, the evidence audit succeeds when applicable, semantic content-selection coverage is complete for new tailored drafts, and warnings are corrected or intentionally accepted.

## 6. Render and inspect

Choose the renderer before choosing appearance. For an ATS application copy, default to `renderer.kind: "ats"`. Use `renderer.kind: "resumake"` only when the user explicitly wants one of the nine original templates or the workflow must preserve legacy behavior. Do not describe the custom layout as Resumake template 10 or as a modified original template.

Render a custom ATS bundle with:

```text
node <skill-directory>/scripts/render_ats_resume.mjs --input <resume.json> --output-dir <directory> --basename <bundle-name>
```

The bundle name is an internal directory name. Use `renderer.documentBasename` for the professional PDF filename. Add `--tex-only` when source only is requested or `pdflatex` is unavailable.

Treat `resume-input.json` as the content and formatting source of truth. Represent requested scan emphasis through the documented `emphasis` map and regenerate the bundle. Never add content or emphasis by editing generated TeX or PDF output directly.

Render an original Resumake bundle with:

Render with:

```text
node <skill-directory>/scripts/render_resumake.mjs --input <resume.json> --output-dir <directory> --basename <company-role>
```

Use `--template 1` through `--template 9` only to override JSON. Use `--overwrite` only when replacing an identified prior bundle is intended. Add `--tex-only` when source only is requested or the TeX engine is unavailable. Use the ReportLab renderer only when the user explicitly accepts a generic non-Resumake fallback.

Review the ATS renderer's `qa.json` and `build.log`, then inspect every PDF page for clipping, wrapping, orphaned headings, split entries, hierarchy, whitespace, glyphs, visible website and project URLs, compact profile labels, and meaningful page use. Confirm there are no overfull TeX boxes, body text is at least 10.5 points, text is selectable, extracted text follows logical reading order, conventional headings survive extraction, URI annotations exist, and contact details are present in the body. Perform a six-second top-third scan for target role, level, relevant stack, strongest impact, scale, and material location or eligibility information. Avoid beginning a page with continuation bullets whose role or project heading appears only on the previous page.

Use the shortest length that preserves differentiated evidence. Do not achieve a page target through unreadable typography or removal of essential proof.

Completion criterion: requested artifacts exist and the latest PDF passes visual, text, ATS, rapid-scan, and page-value checks.

## 7. Deliver

Return artifact paths and briefly identify the target role, career-stage strategy, major tailoring choices, schema validation, evidence-audit status, ATS inspection, and genuine requirement gaps. Keep the evidence sidecar private unless requested.

For critique-only requests, stop after reporting evidence-backed improvements; do not write artifacts unless requested.
