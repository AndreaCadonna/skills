# Resume JSON schema

The UTF-8 contract remains compatible with the data used by the original MCP server while exposing all Resumake v2 templates.

## Root

```json
{
  "selectedTemplate": 1,
  "headings": {
    "summary": "Profile",
    "awards": "Awards",
    "work": "Work Experience",
    "skills": "Skills",
    "education": "Education",
    "projects": "Projects"
  },
  "sections": ["profile", "summary", "work", "skills", "education", "projects"],
  "basics": {},
  "summary": "",
  "work": [],
  "skills": [],
  "education": [],
  "projects": [],
  "awards": []
}
```

`selectedTemplate` must be an integer from 1 through 9. Omitted headings and sections receive the defaults above.

## Fields

- `basics.name` is required. Optional fields are `email`, `phone`, `location.address`, `website`, and `profiles[]` with `label` and `url`. Original Resumake templates render one website; when `website` contains several whitespace-separated URLs, the wrapper uses the first. If it is empty, the first profile URL is used.
- Every `work[]` item requires `company`, `position`, and a non-empty `highlights[]`. It may include `location`, `startDate`, and `endDate`. Legacy `name` is accepted as an alias for `company`.
- Every `skills[]` item requires `name` and a non-empty `keywords[]`.
- Every `education[]` item requires `institution` and may include `location`, `studyType`, `area`, dates, and `score`. Legacy `gpa` is accepted as an alias for `score`.
- Every `projects[]` item requires `name` and `description`; `url` and `keywords[]` are optional.
- Every `awards[]` item may contain `title`, `date`, `awarder`, and `summary`, but at least one must be populated.

## Example item shapes

```json
{
  "work": [{
    "company": "Company",
    "position": "Historical Job Title",
    "location": "Remote",
    "startDate": "2022-01",
    "endDate": "Present",
    "highlights": ["Evidence-backed achievement"]
  }],
  "skills": [{
    "name": "Frontend",
    "keywords": ["TypeScript", "Angular", "RxJS"]
  }],
  "education": [{
    "institution": "University",
    "studyType": "BSc",
    "area": "Computer Science",
    "endDate": "2019"
  }],
  "projects": [{
    "name": "Project",
    "description": "Verified description",
    "url": "https://github.com/user/project",
    "keywords": ["Node.js"]
  }]
}
```

The original Resumake schema has no summary section. The wrapper converts root `summary` to an upstream `awards` section headed `Profile`. A legacy `awards` entry containing only `summary` is recognized as the old summary workaround. If both `summary` and `awards` are selected, they share one generated section.

Allowed section identifiers are `profile`, `summary`, `awards`, `work`, `skills`, `education`, and `projects`. A section renders only when selected and populated.
