# Candidate profile sources

Build a source inventory before tailoring. Keep the reusable skill separate from private candidate data.

## Preferred source order

1. Use a structured local profile when the user identifies one as canonical.
2. Use connected Google Docs or Sheets when the user identifies them as canonical and the host exposes the required connector.
3. Use files or resume text supplied in the current request.
4. Ask for an export or pasted content when the source cannot be accessed.

Do not silently substitute public web profiles for a user-designated private knowledge base.

## Google Docs and Sheets

Read only the identified documents and relevant ranges. Capture source IDs that remain understandable during the run:

- `doc:<document-name>#<heading>`
- `sheet:<spreadsheet-name>!<sheet-name>:<row-or-range>`

When the documents contain overlapping facts, prefer the source the user marks authoritative. Otherwise, surface material conflicts in dates, titles, metrics, or technology claims before drafting.

For repeated use, recommend exporting the cleaned inventory to a private, versioned JSON or YAML file. Google can remain the authoring source while the structured export reduces retrieval and interpretation time.

Treat this inventory as a master evidence resume, not as the document submitted to employers. Capture every defensible achievement, metric, scope proxy, project, technology, leadership example, publication, and certification, then select only relevant evidence for each application.

## Inventory shape

Use stable IDs for factual units:

```json
{
  "experiences": [{
    "id": "work-company",
    "company": "Company",
    "title": "Historical title",
    "startDate": "2021-01",
    "endDate": "Present",
    "facts": [{
      "id": "work-company-performance",
      "statement": "Source-backed achievement",
      "technologies": ["Angular", "RxJS"],
      "metrics": [{
        "value": "32%",
        "kind": "measured",
        "description": "Median page-load reduction"
      }],
      "source": "doc:Experience KB#Company"
    }]
  }]
}
```

IDs exist for traceability; they do not appear in the final resume.

## Privacy boundary

Keep personal candidate data outside a distributable skill package. Store it in a user-controlled local path or retrieve it through an authorized connector. Send it to a remote renderer only after the user has knowingly selected that renderer. The bundled renderer operates locally.
