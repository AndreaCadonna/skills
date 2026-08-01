# Resume rendering

The primary renderer runs the original, vendored Resumake v2 LaTeX generators locally. It does not call resumake.io or any remote endpoint.

## Requirements

- Node.js 18 or newer for validation and source generation.
- A local TeX distribution when a PDF is requested.
- `pdflatex` for templates 1, 3, 7, and 9.
- `xelatex` for templates 2, 4, 5, 6, and 8.
- Python 3 with ReportLab only for the separate generic fallback.

The source generator has no npm-install step. Resumake v2's pinned `common-tags` dependency and all template assets are bundled with the skill.

## Validate

```text
node <skill-directory>/scripts/validate_resume.mjs <resume.json>
```

Validation prints a JSON report. Exit code `1` means the input cannot be rendered. Warnings identify content that deserves review but do not block rendering.

## Render an original Resumake template

```text
node <skill-directory>/scripts/render_resumake.mjs --input <resume.json> --output-dir <directory> --basename <company-role>
```

The renderer creates a self-contained `<company-role>/` bundle containing normalized `resume.json`, generated `resume.tex`, required template files and fonts, `build.log`, and `resume.pdf`. It refuses to replace an existing bundle unless `--overwrite` is present.

Use `--template 1` through `--template 9` to override `selectedTemplate`. Use `--tex-only` to generate the complete source bundle without invoking a TeX engine. Input strings are treated as plain text and LaTeX control characters are escaped. Compilation explicitly disables shell escape.

If the requested engine is absent or cannot initialize, keep the source bundle, report the missing engine, and do not claim that a PDF was produced. The bundle can be compiled on another machine or uploaded to a compatible LaTeX editor.

## Generic fallback

When the user explicitly accepts a non-Resumake layout, run:

```text
python <skill-directory>/scripts/render_resume.py --input <resume.json> --output-dir <directory> --basename <company-role>
```

This creates a ReportLab PDF and normalized JSON. It supports template 1 data only, but its design is not the upstream Resumake template 1.

## Verify

Render every generated PDF page to PNG and inspect it. Check clipping, wrapping, whitespace, glyphs, links, and page count. Then extract text as a secondary completeness check. A successful TeX exit is not visual verification.

## Provenance

The source and assets come from Resumake v2 commit `0274664df69a9d55fa7548d497e6ef765b9f0435`. Read [../assets/resumake-v2/PROVENANCE.md](../assets/resumake-v2/PROVENANCE.md) and [../assets/resumake-v2/THIRD_PARTY_NOTICES.md](../assets/resumake-v2/THIRD_PARTY_NOTICES.md) for licensing and attribution. Every generated source bundle includes these notices and the applicable license texts.
