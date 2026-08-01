# Resumake v2 template selection

The skill vendors all nine generators from Resumake v2. Use the user's chosen template when specified. Otherwise default to template 1 for a conservative, single-column, ATS-oriented application and explain the choice briefly.

| ID | General character | Engine | Bundled support files |
|---:|---|---|---|
| 1 | Conservative single-column resume | `pdflatex` | None |
| 2 | Awesome-CV-inspired, polished and visual | `xelatex` | Class, style, and fonts |
| 3 | Dense classic technical resume | `pdflatex` | None |
| 4 | Deedy-inspired single-column resume | `xelatex` | Class and Raleway fonts |
| 5 | Traditional `res` class layout | `xelatex` | Class and Helvetica style |
| 6 | Minimal typographic resume | `xelatex` | TeX/style files and fonts |
| 7 | ModernCV classic layout | `pdflatex` | ModernCV class/style files |
| 8 | McDowell CV layout | `xelatex` | Class file |
| 9 | Compact section-led CV | `pdflatex` | None |

Templates 1, 3, 7, and 9 require `pdflatex`. Templates 2, 4, 5, 6, and 8 require `xelatex`. The renderer copies every required class, style, configuration, and font file into the output bundle.

Do not describe the ReportLab fallback as a Resumake template. It is a separate generic renderer.
