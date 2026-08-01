---
name: tailor-resume
description: Tailor truthful resumes and CVs to job descriptions, build evidence-backed ATS content, convert existing resume data into the local schema, and render verified PDFs or TeX with the nine original Resumake v2 LaTeX templates. Use for targeted job applications, resume rewrites, requirement matching, resume JSON preparation, template selection, or final PDF generation.
---

# Tailor Resume

Produce a targeted resume whose claims remain traceable to the candidate's source material. Use the bundled original Resumake v2 generators locally instead of a remote resume service.

## 1. Resolve the request

Identify:

- the complete job description;
- the candidate source: a supplied resume, a local profile, or connected Google Docs/Sheets;
- whether the user wants analysis, tailored content, JSON, or a final PDF;
- the destination and filename when producing artifacts.

Ask only for an input that cannot be obtained from the current context or available tools. Treat contact details and employment history as sensitive data.

Completion criterion: the target role, candidate source, requested deliverables, and accessible output location are known.

## 2. Load the applicable references

- For every tailoring or rewrite request, read [references/tailoring-policy.md](references/tailoring-policy.md).
- Before creating or validating renderer input, read [references/resume-schema.md](references/resume-schema.md).
- When candidate facts come from Google Docs, Sheets, or unstructured files, read [references/profile-sources.md](references/profile-sources.md).
- Before choosing a template, read [references/templates.md](references/templates.md).
- Before generating a PDF or TeX file, read [references/renderer.md](references/renderer.md).

Completion criterion: every reference required by the active branch has been read before drafting or rendering.

## 3. Build the match matrix

Extract every explicit required and preferred qualification from the job description. Map each requirement to direct evidence, transferable evidence, interest-only knowledge, or a gap. Record source identifiers for evidence.

Completion criterion: every explicit job requirement has one classification and no evidence assertion lacks a source.

## 4. Draft from evidence

Select the most relevant supported facts. Preserve historical titles, employers, dates, technologies, scope, and metrics. Write the headline, summary, experience bullets, skills, education, and relevant projects under the tailoring policy.

Maintain a private evidence map alongside the draft. It may be a table or JSON object, but each material resume claim must point to one or more source identifiers. Do not place the evidence map in the PDF.

Completion criterion: every material claim is supported, every selected section advances the application, and the evidence map covers the complete draft.

## 5. Validate the resume data

Write the final renderer input as UTF-8 JSON. Run:

```text
node <skill-directory>/scripts/validate_resume.mjs <resume.json>
```

Resolve every error. Review warnings against the tailoring policy rather than suppressing them mechanically.

Completion criterion: validation exits successfully and all warnings are either corrected or intentionally accepted.

## 6. Render and inspect

Use the user's selected Resumake template. If they do not specify one, default to template 1 for a conservative ATS-oriented application unless another template clearly serves an expressed preference.

For an original Resumake PDF, run:

```text
node <skill-directory>/scripts/render_resumake.mjs --input <resume.json> --output-dir <directory> --basename <company-role>
```

Use `--template 1` through `--template 9` only to override the JSON choice. Use `--overwrite` only when replacing an identified prior bundle is intended. When the user requests source only, or the required TeX engine is unavailable, add `--tex-only`. Do not claim source-only output is a PDF.

Use the Python ReportLab renderer only when the user explicitly accepts a generic non-Resumake fallback.

Render the resulting PDF pages to images and inspect every page. Check clipping, wrapping, section order, whitespace, glyphs, hyperlinks, and page count. Extract text as a secondary check for missing content. Revise and regenerate until the latest PDF has no visible defects.

Completion criterion: the requested self-contained source bundle and PDF exist; the latest PDF passes visual and text checks. If compilation is blocked by a missing or broken TeX engine, the complete source bundle exists and the limitation is reported precisely.

## 7. Deliver

Return the artifact paths and briefly identify the target role, major tailoring choices, validation status, and any genuine requirement gaps. Keep the evidence map private unless the user asks for it.

For critique-only requests, stop after reporting evidence-backed improvements; do not write artifacts unless requested.
