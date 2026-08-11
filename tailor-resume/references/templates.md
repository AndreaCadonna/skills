# Resumake v2 template selection

The skill vendors all nine original generators. Select output mode before selecting appearance.

## ATS application mode

Default to template 1. It is the supported conservative, single-column application default. The other templates remain available but are not ATS-verified; warn the user before using one for an application copy and perform especially careful text-order inspection.

## Portfolio mode

Use the user's chosen design when the file supplements rather than replaces the application copy. A portfolio copy does not remove the need for a simple ATS version when an application system parses the resume.

| ID | General character | Engine | Application guidance |
|---:|---|---|---|
| 1 | Conservative single-column resume | `pdflatex` | Default ATS application template |
| 2 | Awesome-CV-inspired, polished and visual | `xelatex` | Portfolio-oriented; uses decorative contact icons |
| 3 | Dense classic technical resume | `pdflatex` | Inspect table-based header extraction carefully |
| 4 | Deedy-inspired single-column resume | `xelatex` | Visually distinctive; not ATS-verified |
| 5 | Traditional `res` class layout | `xelatex` | Not ATS-verified |
| 6 | Minimal typographic resume | `xelatex` | Not ATS-verified |
| 7 | ModernCV classic layout | `pdflatex` | Portfolio-oriented; inspect contact extraction carefully |
| 8 | McDowell CV layout | `xelatex` | Table-based header; not ATS-verified |
| 9 | Compact section-led CV | `pdflatex` | Not ATS-verified |

Templates 1, 3, 7, and 9 require `pdflatex`. Templates 2, 4, 5, 6, and 8 require `xelatex`. The renderer copies required assets into the output bundle.

Do not describe the ReportLab fallback as a Resumake template. It is a separate generic renderer.
