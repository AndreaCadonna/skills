# Resume rendering

Both supported renderer paths run locally. The additive ATS renderer owns its layout; the Resumake renderer runs the nine original vendored generators without editing their source. Neither path calls resumake.io or another remote endpoint.

## Requirements

- Node.js 18 or newer for validation and source generation.
- A local TeX distribution when a PDF is requested.
- `pdflatex` for the ATS renderer and Resumake templates 1, 3, 7, and 9.
- `xelatex` for Resumake templates 2, 4, 5, 6, and 8.
- Poppler `pdfinfo` and `pdftotext` for compiled ATS quality checks.
- Python 3 with ReportLab only for the separate generic fallback.

The source generators have no npm-install step. Resumake v2's pinned `common-tags` dependency and all template assets are bundled with the skill.

## Validate

```text
node <skill-directory>/scripts/validate_resume.mjs <resume.json>
```

Validation prints a JSON report. Exit code `1` means the input cannot be rendered. Warnings identify content that deserves review but do not block rendering.

## Render the custom ATS layout

Set `renderer.kind` to `ats`, then run:

```text
node <skill-directory>/scripts/render_ats_resume.mjs --input <resume.json> --output-dir <directory> --basename <bundle-name>
```

The command creates a `<bundle-name>/` directory containing normalized `resume.json`, professionally named TeX and PDF files, `build.log`, `qa.json`, and a provenance README. `renderer.documentBasename` controls the TeX/PDF filename independently of the bundle directory. Use `--tex-only` to skip compilation and `--overwrite` only to replace the exact existing bundle.

The ATS layout is one column, uses 11-point body text by default, keeps contact details and up to three selected labeled links in the document body, renders skills as flowing paragraphs, and uses no tables, columns, text boxes, or graphics. It supports A4 and Letter page sizes.

When a PDF is compiled, the renderer fails quality checks for overfull TeX boxes, more than two pages, missing selectable name/headline/contact text, missing or out-of-order section headings, Unicode replacement glyphs, or missing URI annotations. Review `qa.json` and `build.log`; mechanical checks do not replace visual inspection.

## Render an original Resumake template

Set `renderer.kind` to `resumake` or omit `renderer`, then run:

```text
node <skill-directory>/scripts/render_resumake.mjs --input <resume.json> --output-dir <directory> --basename <company-role>
```

The renderer creates a self-contained `<company-role>/` bundle containing normalized `resume.json`, generated `resume.tex`, required template files and fonts, `build.log`, and a PDF. It refuses to replace an existing bundle unless `--overwrite` is present. When `renderer.documentBasename` is supplied, the compiled PDF uses that professional name; otherwise legacy `resume.pdf` naming is retained.

Use `--template 1` through `--template 9` to override `selectedTemplate`. Use `--tex-only` to generate the complete source bundle without invoking a TeX engine. Input strings are treated as plain text and LaTeX control characters are escaped. Compilation explicitly disables shell escape.

If the requested engine is absent or cannot initialize, keep the source bundle, report the missing engine, and do not claim that a PDF was produced. The bundle can be compiled on another machine or uploaded to a compatible LaTeX editor.

## Generic fallback

When the user explicitly accepts the generic ReportLab layout, run:

```text
python <skill-directory>/scripts/render_resume.py --input <resume.json> --output-dir <directory> --basename <company-role>
```

This creates a ReportLab PDF and normalized JSON. It supports template 1 data only, but its design is not the upstream Resumake template 1 or the custom ATS renderer.

The generic fallback is not ATS-verified. Inspect its extracted reading order explicitly because it uses layout tables for aligned dates and locations.

## Verify

Render every generated PDF page to PNG and inspect it. Check clipping, wrapping, orphaned headings, split education entries, hierarchy, whitespace, glyphs, visible URLs, links, and whether every page contains meaningful evidence. A successful TeX exit is not visual verification.

For an ATS application copy, also:

1. confirm PDF text is selectable;
2. extract all text and inspect logical reading order, not only completeness;
3. confirm the name, headline, contact details, and conventional section labels survive extraction;
4. confirm the build log contains no overfull boxes;
5. check dates remain attached to the correct roles and schools;
6. confirm visible URLs retain URI annotations;
7. perform a rapid top-third scan for target role, current level, relevant stack, strongest impact, and scale;
8. use one or two pages according to evidence strength without shrinking body text below 10.5 points.

The custom ATS renderer is the default application renderer. All original Resumake templates, including template 1, retain their upstream layout and typography; a visually correct Resumake PDF still requires an explicit parsing-risk warning and careful extraction review.

## Provenance

The original template source and assets come from Resumake v2 commit `0274664df69a9d55fa7548d497e6ef765b9f0435`. Read [../assets/resumake-v2/PROVENANCE.md](../assets/resumake-v2/PROVENANCE.md) and [../assets/resumake-v2/THIRD_PARTY_NOTICES.md](../assets/resumake-v2/THIRD_PARTY_NOTICES.md) for licensing and attribution. Every original Resumake source bundle includes these notices and the applicable license texts. Custom ATS bundles identify themselves as additive local output and do not claim Resumake provenance.
