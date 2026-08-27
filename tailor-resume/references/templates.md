# Renderer and template selection

The skill provides one additive custom ATS renderer and vendors all nine original Resumake v2 generators unchanged. Select the renderer before selecting appearance.

## ATS application mode

Default to `renderer.kind: "ats"`. It produces the supported one-column, headline-aware, table-free application layout with 11-point body text by default. It is not an original Resumake template and must never be described as template 10.

## Portfolio mode

Use `renderer.kind: "resumake"` when the user explicitly selects an original template or the file is a portfolio copy. A portfolio copy does not remove the need for a simple ATS version when an application system parses the resume.

| ID | General character | Engine | Application guidance |
|---:|---|---|---|
| 1 | Conservative single-column resume using upstream 10-point `article` defaults | `pdflatex` | Legacy/simple option; not the custom ATS renderer |
| 2 | Awesome-CV-inspired, polished and visual | `xelatex` | Portfolio-oriented; uses decorative contact icons |
| 3 | Dense classic technical resume | `pdflatex` | Inspect table-based header extraction carefully |
| 4 | Deedy-inspired single-column resume | `xelatex` | Visually distinctive; not ATS-verified |
| 5 | Traditional `res` class layout | `xelatex` | Not ATS-verified |
| 6 | Minimal typographic resume | `xelatex` | Not ATS-verified |
| 7 | ModernCV classic layout | `pdflatex` | Portfolio-oriented; inspect contact extraction carefully |
| 8 | McDowell CV layout | `xelatex` | Table-based header; not ATS-verified |
| 9 | Compact section-led CV | `pdflatex` | Not ATS-verified |

Templates 1, 3, 7, and 9 require `pdflatex`. Templates 2, 4, 5, 6, and 8 require `xelatex`. The renderer copies required assets into the output bundle.

Existing JSON without a `renderer` object retains Resumake behavior and uses `selectedTemplate`. The custom ATS renderer also leaves `selectedTemplate` restricted to 1-9 so provenance remains unambiguous.

Do not describe the custom ATS renderer or the ReportLab fallback as a Resumake template. Both are separate local renderers.
