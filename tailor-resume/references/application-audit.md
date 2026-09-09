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
    "value": "Replaced a recurring manual release workflow with a queued deployment service used by three product teams.",
    "sourceIds": ["work-example-service"],
    "confidence": "high",
    "disclosure": "public-safe"
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
  },
  "chronologyAudit": {
    "claimedExperience": "5+ years",
    "canonicalRoles": ["work-example", "work-earlier"],
    "includedRoles": ["work-example", "work-earlier"],
    "omittedRoles": [],
    "visibleTimelineSupportsClaim": true,
    "notes": "The visible chronology supports the public duration claim."
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
- In a strict audit, copy the current normalized resume string into `value`. This binds the evidence decision to the content at that path and makes a reordered or edited field fail until the sidecar is updated.
- Give every public claim `confidence` of `high`, `medium`, or `low`. Strict mode rejects `low`; confirm or omit that claim rather than upgrading it in the sidecar.
- Give every public claim a disclosure value from the mapping below. Strict mode rejects private and unresolved evidence. Generalized evidence also requires `publicWordingReviewed: true` after reviewing that the actual public wording removes the sensitive detail without changing the claim. The agent may record this editorial review when the source disclosure boundary permits generalization; unresolved permission or disclosure requires user clarification.
- Cover material fields in selected sections. Populated data intentionally omitted from `sections` is not a rendered claim.
- For a claimed or demonstrated requirement, its requirement source IDs must overlap the claim source IDs at each referenced resume path.
- Resolve conflicting source facts before drafting. Do not let multiple sources silently justify inconsistent dates, titles, technologies, or metrics.

### Disclosure mapping

The audit accepts the canonical values in the first column and their older ledger equivalents in the second. Both names have the same safety behavior.

| Audit value | Older ledger value | Public-claim treatment |
|---|---|---|
| `public-safe` | `public` | Allowed |
| `generalize-before-use` | `generalized` | Allowed only with `publicWordingReviewed: true` |
| `private` | `confidential` | Rejected |
| `unverified` | `ask` | Rejected until confirmed |

Marker existence and metadata completeness do not establish that a claim is true or that generalized wording is safe. Compare the claim with the marked source block and its nested confidence, attribution, status, metric, maturity, and disclosure limits.

### Selected skill claims

For each `skills[n].keywords[m]` claim, record:

- `proficiencyClass`: `core-current`, `working-familiarity`, `previous-professional`, `project-only`, or `experimental`;
- `recency`: a supported date, range, or `current` statement;
- `evidenceContext`: `professional`, `project`, `education`, or `mixed`;
- `qualification`: the visible phrase used for a non-core skill, such as `Working Knowledge`, `Previous Professional Experience`, or `Project Experience`.

Strict mode rejects experimental skills in the primary skills section. It also requires the non-core `qualification` to appear in the rendered skill category or keyword. The audit never infers proficiency from a technology name, source marker, or repeated keyword.

## Chronology audit

Add `chronologyAudit` to every new tailored application. `includedRoles` aligns one-to-one with `work[]` in rendered order:

- `claimedExperience`: the public duration claim, or an empty string when none is used;
- `canonicalRoles`: stable source IDs for every professional role in the canonical candidate source;
- `includedRoles`: canonical role IDs represented in the resume;
- `omittedRoles`: objects with `roleId` and a concrete `reason`;
- `visibleTimelineSupportsClaim`: `true` only after reconciling the public claim with the displayed work dates;
- `notes`: a concise explanation of the reconciliation.

Every canonical role must be included or listed exactly once as omitted. An omission is invalid when it creates a misleading gap or removes dates required to substantiate the public duration claim. The audit fails when a duration claim exists and `visibleTimelineSupportsClaim` is not `true`.

## Semantic content-selection audit

Add `contentAudit` to new tailored applications. Older sidecars without it remain valid for compatibility but produce a migration warning; they prove traceability only, not drafting-quality coverage.

Use the property name `contentAudit` exactly. Do not store a current semantic audit under `contentAuditLegacy` or another alias. Legacy compatibility exists only so old applications can be inspected; any application newly drafted, rewritten, or regenerated under the current workflow must migrate to `contentAudit` before delivery.

### Evidence units

Create an evidence unit for each high-value accomplishment or decision considered for a recent or target-relevant role, including strong evidence left out during compression. Record all six `availableFields` keys:

- `goalProblem`: user goal, limitation, pain point, risk, or workflow being replaced;
- `engineeringObject`: feature, service, component, platform, pipeline, product flow, or engineering process;
- `ownership`: candidate contribution and collaborators;
- `methodDecision`: implementation method, constraint, decision, or trade-off;
- `scope`: measured scale or a defensible qualitative proxy;
- `outcome`: user, operational, product, reliability, quality, or organizational result.

Use a supported string or `null` for every key. A qualitative result and a scope proxy are valid evidence; a metric is not required. `sourceIds` remain the authority for truth, confidence, uncertainty, history, and disclosure decisions.

Record technologies inside `methodDecision` only when the source binds them to that evidence unit. Do not copy a role-level stack into every unit. For a major recent or target-relevant role, the selected evidence units should normally preserve system-specific technical methods in at least two bullets when such evidence exists; explain a deliberate exception in the role audit notes.

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

## Source resolution and run

Strict mode reads only the local Markdown paths supplied on the command line. It indexes standalone canonical markers in the exact form `<!-- source-id: lowercase-kebab-case -->`, ignores examples inside fenced code or prose, and fails on a source with no valid markers, malformed standalone marker comments, duplicate IDs, or referenced IDs that are absent. It resolves references in requirements, claims, content evidence units, and all chronology role lists. It never opens paths found inside resume or audit content and never fetches sources.

Run strict mode for every new or regenerated application. Repeat `--source` when the evidence comes from more than one explicitly approved local Markdown file:

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json> --source <candidate.md> [--source <additional.md> ...]
```

The callable equivalent is:

```js
const report = await auditApplicationWithSources(resume, audit, [candidateMarkdownPath]);
```

`auditApplication(resume, audit, { mode: "strict", sourceDocuments: [{ name, content }] })` is available when the caller already holds explicitly selected Markdown text. The caller, not the audit, chooses those sources.

Use legacy inspection only for an old sidecar that will not be regenerated or delivered:

```text
node <skill-directory>/scripts/audit_application.mjs <resume.json> <application-audit.json> --legacy
```

Legacy reports return `mode: "legacy"` and a prominent warning. They do not resolve source IDs, require current claim metadata, or require `contentAudit` and `chronologyAudit`.

A strict audit success means the sidecar covers and value-binds the material resume paths, every referenced ID exists once in the supplied source registry, claim metadata is publicly eligible, selected skills preserve proficiency treatment, and the current `contentAudit` and `chronologyAudit` are internally consistent. Chronology success records an editorial and source review against the visible work dates; it does not calculate or certify a duration. No mechanical audit proves that a source statement is true, that a marker is the right semantic evidence, that one causal chain is accurate, or that generalized wording is safe.

Before rendering, complete the editorial checkpoint the script cannot judge: keep the profile and skill list brief, show soft skills through behavior, keep one supported causal chain per bullet, attribute technologies to the named system rather than a role-wide stack, and confirm each bold span highlights meaningful evidence.
