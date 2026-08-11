# Tailor Resume

`tailor-resume` is a local Codex skill for creating truthful, job-specific software-engineering resumes from a candidate knowledge base. It models career stage and role requirements, maps claims to evidence, produces validated resume JSON, and renders TeX or PDF with the original Resumake v2 LaTeX templates.

The primary workflow runs locally. It does not send resume data to a hosted Resumake endpoint.

## What it does

- Tailors resume content to a supplied job description without inventing facts.
- Records evidence and gaps before drafting claims.
- Applies career-stage section, summary, bullet, and page strategies.
- Separates structured validation from a private source-evidence audit.
- Checks ATS template choice, terminology, chronology, bullet quality, and skills-in-context signals.
- Supports all nine original Resumake v2 LaTeX templates.
- Produces a PDF when the required TeX engine is installed, or a self-contained TeX source bundle otherwise.
- Keeps personal source documents outside the published skill package.

## Install

Place the entire `tailor-resume` directory in your Codex skills directory. The default destination is:

```text
~/.codex/skills/tailor-resume
```

Keep the directory intact because the skill depends on its `scripts`, `references`, and `assets` subdirectories. Reload Codex after installing it.

## Use with Codex

Invoke the skill by name and provide a job description plus the candidate sources it may use. You can select a template directly or ask the model to recommend one.

Example prompts:

```text
Use $tailor-resume to tailor my resume for this job description. Use template 1 and render a PDF.
```

```text
Use $tailor-resume with my attached master resume and experience document. Recommend the best template, explain the choice, and generate a PDF.
```

```text
Use $tailor-resume for this role with template 4. Generate the TeX bundle only.
```

The model should treat your supplied resume, documents, sheets, and explicit corrections as the only factual sources. See [SKILL.md](SKILL.md) for the complete agent workflow and safeguards.

The renderer JSON supports non-rendered `strategy` metadata, a rendered `basics.headline`, and project `highlights[]`. See [references/resume-schema.md](references/resume-schema.md).

## Templates

Templates are selected with a number from `1` to `9`. Template 1 is the ATS application default. Other templates are available for explicit preference or portfolio copies but require careful extraction-order review.

| ID | Style | TeX engine |
| --- | --- | --- |
| 1 | Conservative and ATS-friendly | `pdflatex` |
| 2 | Awesome-CV based | `xelatex` |
| 3 | Dense technical layout | `pdflatex` |
| 4 | Deedy-Resume based | `xelatex` |
| 5 | Traditional `res` layout | `xelatex` |
| 6 | Minimal layout | `xelatex` |
| 7 | ModernCV based | `pdflatex` |
| 8 | McDowell-CV based | `xelatex` |
| 9 | Compact layout | `pdflatex` |

More detailed selection guidance is in [references/templates.md](references/templates.md). The templates have different upstream licenses, so review the [third-party notices](assets/resumake-v2/THIRD_PARTY_NOTICES.md) before redistribution or commercial use.

## Requirements

- Node.js 18 or newer.
- `pdflatex` and/or `xelatex` to compile PDFs, depending on the selected template.
- Python and ReportLab only if you choose the optional generic fallback renderer.

The primary Resumake renderer uses vendored generators and assets, so it does not require an npm install or a network request.

## Run the scripts directly

From the `tailor-resume` directory, validate a resume JSON file:

```shell
node scripts/validate_resume.mjs path/to/resume.json
```

Render template 4:

```shell
node scripts/render_resumake.mjs --input path/to/resume.json --output-dir output --basename tailored-resume --template 4
```

Generate a TeX bundle without compiling a PDF:

```shell
node scripts/render_resumake.mjs --input path/to/resume.json --output-dir output --basename tailored-resume --template 4 --tex-only
```

Audit claim and requirement evidence with a private sidecar:

```shell
node scripts/audit_application.mjs path/to/resume.json path/to/application-audit.json
```

Run the regression suite:

```shell
node scripts/test_resume.mjs
```

Use `--overwrite` only when you intentionally want to replace an existing output. The renderer writes a manifest and copies the required template files, fonts, and license notices into the generated source bundle.

The expected JSON shape is documented in [references/resume-schema.md](references/resume-schema.md), with synthetic data in [assets/sample-resume.json](assets/sample-resume.json).

## Privacy

This repository does not need to contain a real person's resume or credentials. Keep candidate source files and generated applications outside version control. The bundled example uses synthetic identities and reserved `.example` URLs.

If you connect the skill to Google Drive or another external source, access is governed by that connector and the permissions you grant; the local renderer itself does not upload the resulting resume.

## Licensing

The skill's original code and documentation are provided under the [MIT License](LICENSE). Vendored Resumake templates, fonts, and related assets retain their upstream licenses and attribution requirements. See [NOTICE](NOTICE) and [assets/resumake-v2/THIRD_PARTY_NOTICES.md](assets/resumake-v2/THIRD_PARTY_NOTICES.md) for the authoritative component-level details.

## Directory guide

| Path | Purpose |
| --- | --- |
| `SKILL.md` | Agent instructions and end-to-end workflow |
| `agents/` | Skill metadata used by Codex |
| `scripts/` | Schema validation, evidence auditing, regression tests, and rendering commands |
| `references/` | Schema, policy, source, renderer, and template guidance |
| `assets/` | Synthetic example plus vendored Resumake v2 runtime assets |
| `LICENSE` and `NOTICE` | Project and third-party licensing information |
