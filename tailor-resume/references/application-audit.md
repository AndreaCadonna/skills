# Application evidence audit

Use a private JSON sidecar to prove that a tailored resume remains traceable to candidate sources and that compression did not silently discard stronger supported evidence. Do not embed source IDs in the rendered resume.

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
  }],
  "contentAudit": {
    "version": 1,
    "evidenceUnits": [{
      "id": "work-example-service",
      "rolePath": "work[0]",
      "importance": "important",
      "sourceIds": ["work-example-service"],
      "availableFields": {
        "goalProblem": "Replace a recurring manual release workflow",
        "engineeringObject": "Release service",
        "ownership": "Owned design and delivery",
        "methodDecision": "Queued deployment jobs with idempotent retries",
        "scope": "Three product teams",
        "outcome": "Reduced manual coordination and made releases repeatable"
      },
      "resumePaths": ["work[0].highlights[0]"],
      "preservedFields": ["goalProblem", "engineeringObject", "ownership", "methodDecision", "scope", "outcome"],
      "fieldOmissions": []
    }],
    "bulletAudits": [{
      "path": "work[0].highlights[0]",
      "evidenceUnitIds": ["work-example-service"],
      "primaryIdea": "Replace manual release coordination",
      "kind": "accomplishment",
      "strongerAccomplishmentAvailable": false
    }],
    "roleAudits": [{
      "path": "work[0]",
      "recentOrTargetRelevant": true,
      "coverageDecision": "sufficient",
      "notes": "The role preserves product purpose, ownership, scope, and outcome without repeating them in every bullet."
    }]
  }
}
```

## Rules

- Use one requirement record for every explicit required or preferred qualification.
- Use `direct`, `transferable`, `interest`, or `gap` for `evidenceClass`.
- Use `claim`, `demonstrate`, `omit`, or `disclose` for `treatment`.
- Give direct, transferable, and interest records at least one source ID.
- Give claimed or demonstrated requirements at least one resume path.
- Use one claim record for every material path: headline, summary, immutable employment and education facts, bullets, skills, projects, awards, metrics, and contact information.
- Point `path` at the normalized resume JSON, for example `basics.label`, `skills[0].keywords[1]`, or `projects[0].highlights[0]`.
- Cover material fields in selected sections. Populated data intentionally omitted from `sections` is not a rendered claim.
- For a claimed or demonstrated requirement, its requirement source IDs must overlap the claim source IDs at each referenced resume path.
- Resolve conflicting source facts before drafting. Do not let multiple sources silently justify inconsistent dates, titles, technologies, or metrics.

## Semantic content-selection audit

Add `contentAudit` to new tailored applications. Older sidecars without it remain valid for compatibility but produce a migration warning; they prove traceability only, not drafting-quality coverage.

### Evidence units

Create an evidence unit for each high-value accomplishment or decision considered for a recent or target-relevant role, including strong evidence left out during compression. Record all six `availableFields` keys:

- `goalProblem`: user goal, limitation, pain point, risk, or workflow being replaced;
- `engineeringObject`: feature, service, component, platform, pipeline, product flow, or engineering process;
- `ownership`: candidate contribution and collaborators;
- `methodDecision`: implementation method, constraint, decision, or trade-off;
- `scope`: measured scale or a defensible qualitative proxy;
- `outcome`: user, operational, product, reliability, quality, or organizational result.

Use a supported string or `null` for every key. A qualitative result and a scope proxy are valid evidence; a metric is not required. `sourceIds` remain the authority for truth, confidence, uncertainty, history, and disclosure decisions.

Use `resumePaths` for bullets that carry the evidence unit and list the fields semantically retained in `preservedFields`. Each evidence unit must share at least one source ID with the claim record at every referenced bullet path. Do not infer preservation from verbs, percentages, or other keywords. The agent must compare the proposed bullet with the cited source evidence.

For an `important` included unit, a supported `goalProblem` or `outcome` must be preserved or entered in `fieldOmissions`. For a unit omitted entirely from the resume, leave `resumePaths` and `preservedFields` empty and add `selectionOmission`. Each omission uses one of:

- `genuine-duplication`;
- `disclosure-restriction`;
- `space-prioritization`;
- `decision-focused-nearby-result`.

Include a concrete `detail`. `genuine-duplication` and `decision-focused-nearby-result` also require `nearbyResumePaths` pointing to another bullet in the same role, and the latter must be attached to an included evidence unit whose bullet `kind` is `decision`. A wholly omitted evidence unit may use the first three reasons, not `decision-focused-nearby-result`. Do not use an omission reason to hide unsupported, uncertain, confidential, or historically inaccurate claims; those protections still govern whether evidence may be used at all.

Use this object for a field omission; omit `field` when the same shape is used as `selectionOmission`:

```json
{
  "field": "outcome",
  "reason": "decision-focused-nearby-result",
  "detail": "This bullet carries the architecture decision; the preceding bullet establishes the related user result.",
  "nearbyResumePaths": ["work[0].highlights[0]"]
}
```

### Bullet and role audits

For every bullet in a role marked `recentOrTargetRelevant`, add one `bulletAudits` record:

- `primaryIdea` states the one idea the bullet is meant to carry;
- `kind` is `accomplishment`, `decision`, `responsibility-summary`, or `context`;
- `evidenceUnitIds` links the bullet to audited evidence;
- `strongerAccomplishmentAvailable` records the semantic comparison against unused role evidence.

The audit warns when a `responsibility-summary` bullet remains even though stronger accomplishment evidence is available. This is a sidecar decision, not keyword classification.

Add one `roleAudits` record for every work entry. Mark recent or target-relevant roles `true` and use `sufficient` when the combined bullets preserve important supported purpose and outcome. A decision-focused bullet may omit a repeated result when another bullet in the same role establishes it. Use `deliberate-omission` with notes when combined role coverage intentionally omits all important supported goal/problem or outcome evidence. Mark other roles `false` with `not-applicable`.

## Run

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json>
```

An audit success means the sidecar covers the material resume paths and its classifications are internally consistent. With `contentAudit`, it also means omission decisions and recent-role coverage have been recorded consistently. It does not prove that a source document is true or that a preservation judgment is semantically correct; the agent must inspect the cited sources and proposed bullets.
