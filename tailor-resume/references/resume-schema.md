# Resume JSON schema

The UTF-8 contract remains compatible with the original Resumake data while adding local strategy, headline, and project-evidence fields.

## Root

```json
{
  "selectedTemplate": 1,
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

`selectedTemplate` must be an integer from 1 through 9. Template 1 is the ATS application default.

## Strategy

- `careerStage`: `unspecified`, `student`, `junior`, `mid`, `senior`, `staff`, `career-change`, or `research`.
- `outputMode`: `application` or `portfolio`.
- `targetRole`, `roleFamily`, and `locale` are non-rendered strategy metadata.
- `pageTarget`: `1`, `2`, or `null`. It guides inspection and never authorizes content removal or typography shrinkage.

## Fields

- `basics.name` is required. Optional fields are `headline`, `email`, `phone`, `location.address`, `website`, and `profiles[]` with `label` and `url`. The local wrapper renders `headline` near the contact block. Original Resumake templates render one website; the first website or profile URL is used.
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
    "headline": "Backend Software Engineer | Distributed Systems and Go"
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

Allowed section identifiers are `profile`, `summary`, `awards`, `work`, `skills`, `education`, and `projects`. A section renders only when selected and populated.
