# Application evidence audit

Use a private JSON sidecar to prove that a tailored resume remains traceable to candidate sources. Do not embed source IDs in the rendered resume.

## Shape

```json
{
  "targetRole": "Backend Software Engineer",
  "requirements": [{
    "id": "req-1",
    "text": "Build distributed services in Go",
    "priority": "required",
    "evidenceClass": "direct",
    "sourceIds": ["work-example-service"],
    "resumePaths": ["work[0].highlights[0]"],
    "treatment": "demonstrate"
  }],
  "claims": [{
    "path": "work[0].highlights[0]",
    "sourceIds": ["work-example-service"]
  }]
}
```

## Rules

- Use one requirement record for every explicit required or preferred qualification.
- Use `direct`, `transferable`, `interest`, or `gap` for `evidenceClass`.
- Use `claim`, `demonstrate`, `omit`, or `disclose` for `treatment`.
- Give direct, transferable, and interest records at least one source ID.
- Give claimed or demonstrated requirements at least one resume path.
- Use one claim record for every material path: headline, summary, immutable employment and education facts, bullets, skills, projects, awards, metrics, and contact information.
- Point `path` at the normalized resume JSON, for example `basics.headline`, `skills[0].keywords[1]`, or `projects[0].highlights[0]`.
- Cover material fields in selected sections. Populated data intentionally omitted from `sections` is not a rendered claim.
- For a claimed or demonstrated requirement, its requirement source IDs must overlap the claim source IDs at each referenced resume path.
- Resolve conflicting source facts before drafting. Do not let multiple sources silently justify inconsistent dates, titles, technologies, or metrics.

## Run

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json>
```

An audit success means the sidecar covers the material resume paths and its classifications are internally consistent. It does not independently prove that a source document is true; the agent must have actually inspected the cited sources.
