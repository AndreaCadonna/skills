# Resume JSON schema

The UTF-8 contract remains compatible with original Resumake inputs while adding local strategy, target headline, renderer, naming, and project-evidence fields.

## Root

```json
{
  "selectedTemplate": 1,
  "renderer": {
    "kind": "ats",
    "documentBasename": "Alex_Example_Backend_Software_Engineer_Resume",
    "bodyFontSize": 11,
    "pageSize": "A4"
  },
  "strategy": {
    "careerStage": "mid",
    "outputMode": "application",
    "targetRole": "Backend Software Engineer",
    "roleFamily": "backend",
    "locale": "United Kingdom",
    "pageTarget": 1
  },
  "headings": {
    "summary": "Profile",
    "awards": "Awards",
    "work": "Work Experience",
    "skills": "Skills",
    "education": "Education",
    "projects": "Projects"
  },
  "sections": ["profile", "summary", "skills", "work", "projects", "education"],
  "basics": {},
  "summary": "",
  "work": [],
  "skills": [],
  "education": [],
  "projects": [],
  "awards": []
}
```

`selectedTemplate` remains an integer from 1 through 9, including when the ATS renderer is selected. It identifies only an original Resumake template and must never be set to 10 for the custom layout.

## Renderer

- `renderer.kind`: `ats` for the additive custom application layout or `resumake` for an original template.
- `renderer.documentBasename`: optional professional filename without a directory or extension. Unsafe path characters are replaced, `.pdf` is removed, and the final value is capped at 120 characters.
- `renderer.bodyFontSize`: ATS-only; `10.5`, `11`, `11.5`, or `12`. The default is `11`.
- `renderer.pageSize`: `A4` or `Letter`. The default is `A4`.

Inputs without `renderer` remain valid and normalize to `renderer.kind: "resumake"` for migration compatibility. The CLI `--basename` controls the bundle directory; `renderer.documentBasename` controls the user-facing PDF filename.

## Strategy

- `careerStage`: `unspecified`, `student`, `junior`, `mid`, `senior`, `staff`, `career-change`, or `research`.
- `outputMode`: `application` or `portfolio`.
- `targetRole`, `roleFamily`, and `locale` are non-rendered strategy metadata.
- `pageTarget`: `1`, `2`, or `null`. It guides inspection and never authorizes content removal or typography shrinkage.

## Fields

- `basics.name` is required. Optional fields are `label`, `email`, `phone`, `location.address`, `website`, and `profiles[]` with `label` and `url`.
- `basics.label` is the target-facing headline rendered directly below the name. It must not replace historical job titles. Legacy `basics.headline` is accepted as an alias during migration.
- The ATS renderer displays website values plus up to three selected profiles as labeled, visible URLs in the document body. Original Resumake templates receive only the first website or profile URL because that is the upstream contract.
- Every `work[]` item requires `company`, `position`, and non-empty `highlights[]`. It may include `location`, `startDate`, and `endDate`. Legacy `name` is accepted as an alias for `company`.
- Every `skills[]` item requires `name` and non-empty `keywords[]`.
- Every `education[]` item requires `institution` and may include `location`, `studyType`, `area`, dates, and `score`. Legacy `gpa` is accepted as an alias for `score`.
- Every `projects[]` item requires `name` plus either `description` or non-empty `highlights[]`. `url` and `keywords[]` are optional. Original Resumake generators receive a flattened description containing the project highlights; the generic fallback renders them as bullets.
- Every `awards[]` item may contain `title`, `date`, `awarder`, and `summary`, but at least one must be populated.

## Example item shapes

```json
{
  "basics": {
    "name": "Candidate Name",
    "label": "Backend Software Engineer | Distributed Systems and Go",
    "profiles": [
      {"label": "LinkedIn", "url": "https://www.linkedin.com/in/candidate"},
      {"label": "GitHub", "url": "https://github.com/candidate"}
    ]
  },
  "work": [{
    "company": "Company",
    "position": "Historical Job Title",
    "location": "Remote",
    "startDate": "2022-01",
    "endDate": "Present",
    "highlights": ["Evidence-backed achievement with scope and outcome"]
  }],
  "skills": [{
    "name": "Backend",
    "keywords": ["Go", "PostgreSQL", "Kafka"]
  }],
  "education": [{
    "institution": "University",
    "studyType": "BSc",
    "area": "Computer Science",
    "endDate": "2019"
  }],
  "projects": [{
    "name": "Project",
    "description": "Problem and user context.",
    "highlights": ["Architecture, deployment, and verified result."],
    "url": "https://github.com/user/project",
    "keywords": ["Node.js"]
  }]
}
```

The original Resumake schema has no summary section. The wrapper converts root `summary` to an upstream `awards` section headed `Profile`. A legacy awards entry containing only `summary` is recognized as the old summary workaround. If both summary and awards are selected, they share one generated section and validation warns about the merged semantics.

Allowed section identifiers are `profile`, `summary`, `awards`, `work`, `skills`, `education`, and `projects`. A section renders only when selected and populated. Section order is strategy-dependent; the validator recommends a career-stage order but does not require projects to be last.
