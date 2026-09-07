# Tailoring policy

Use this policy as the source of truth for software-engineering resume content decisions.

## Truth and metric ledger

Classify candidate facts before drafting:

- **Immutable:** employer, historical title, dates, degree, institution, project identity, technology used, ownership level, and measured result.
- **Reframmable:** emphasis, ordering, action verb, concise wording, and supported transferable capability.
- **Target-facing:** headline, conditional summary, skills ordering, section selection, and employer terminology.
- **Gap:** an unsupported requirement that stays out of experience claims.

Classify quantitative evidence as measured, sourced estimate, scope proxy, or confidential. Preserve supplied numbers and qualifiers exactly. Never convert an impression into a metric. When exact figures are unavailable, prefer defensible scope such as services, teams, users, regions, repositories, release steps, or recurring manual work.

For each recent or target-relevant experience, record:

- product or user context;
- the concrete engineering object;
- ownership and collaborators;
- implementation method and consequential decisions;
- scale or a defensible scope proxy;
- outcome;
- confidence in the evidence;
- disclosure level (`public`, `generalized`, `confidential`, or `ask`);
- stable source IDs.

Ask a focused follow-up question when a missing value would materially weaken an important claim. Generalize confidential context without fabricating it, and omit facts that cannot be disclosed safely.

## Role model and requirement matrix

Capture explicit responsibilities, required and preferred qualifications, domain, target seniority, operating expectations, and repeated verbs. Record inferred expectations separately.

Use one row per explicit requirement:

| ID | Requirement | Priority | Evidence class | Source IDs | Resume paths | Treatment |
|---|---|---|---|---|---|---|
| stable ID | exact phrase | required / preferred | direct / transferable / interest / gap | IDs or none | paths or none | claim / demonstrate / omit / disclose |

Repetition is a relevance signal, not proof that a phrase is mandatory. Use exact terminology when accurate and natural. Never paste hidden keywords, copy the job description, or turn preferred technology into professional experience.

## Career-stage strategy

Choose the order that exposes the strongest target evidence while preserving chronology.

| Profile | Default evidence order after the contact block |
|---|---|
| Student or new graduate | Education, Skills, Experience, Projects, Awards |
| Junior with professional experience | Skills, Experience, Projects, Education, Awards |
| Mid-level | Summary when useful, Skills, Experience, selected Projects, Education, Awards |
| Senior | Summary, Skills, Experience, selected leadership/open source, Education |
| Staff or lead | Technical summary, selected organizational impact when supported, Experience, Skills, selected external signals, Education |
| Career change | Summary, Skills, relevant Projects, chronological Experience, Education |
| ML research or research engineering | Research/engineering summary, Skills, Experience, selected Publications/Projects, Education |

Treat these as defaults, not rigid templates. Keep reverse chronology inside the experience section. Do not use a purely functional resume to hide dates or employers.

### Career-history completeness

Inventory the canonical professional chronology before selecting content. Keep every role needed to substantiate a duration claim or prevent a misleading gap. Compress an older or less relevant role to one line or one bullet before omitting it. Record every omitted role and the concrete reason in the application audit, and confirm that the visible dates still support the headline and summary.

Do not let a total software-experience duration read as a duration in a newer specialization. Reconcile every `N+ years` statement against the work dates visible in the application copy.

## Headline and summary

- Put a concise target identity beneath the name, such as `Backend Software Engineer | Distributed Systems and Go`.
- Use the advertised title only when evidence supports its function and seniority; otherwise use the closest honest identity.
- Preserve every historical title unchanged.
- Do not use `Aspiring`, `Technology Enthusiast`, `Seeking a Position`, or unsupported adjectives.

Use a summary only when it clarifies specialization, seniority, transition, research focus, or uncommon scope. A straightforward student or junior resume may omit it. Keep it to two compact sentences for normal resumes; senior or staff summaries may use up to roughly five short rendered lines when necessary.

A useful summary establishes professional identity, dated relevant experience when calculable without double-counting, technical focus, scale, and one or two differentiators. Do not invent a duration when dates overlap or lack precision.

## SWE achievement bullets

### Preserve purpose and impact before compression

For every recent or target-relevant role, compare the strongest evidence units before choosing bullets. Audit each unit as:

```text
Goal/problem | Engineering object | Ownership | Method/decision | Scope | Outcome
```

Treat a user goal, removed limitation, replaced workflow, operational benefit, or qualitative result as substantive evidence. Do not discard it merely because an implementation detail sounds more technical. When no trustworthy metric exists, use the supported qualitative outcome or a defensible scope proxy; never manufacture precision.

Preserve one primary idea per bullet. A bullet does not need all six fields, and forcing them can obscure the accomplishment. Across a recent or target-relevant role, however, the selected bullets should collectively establish the product or user purpose and the strongest supported result. An architecture or decision-focused bullet may omit a repeated outcome when a nearby bullet clearly establishes the associated purpose and result.

Preserve supported technical substance as well as purpose and impact. For each major recent or target-relevant role, the combined bullets should normally contain at least two system-specific technical methods when evidence permits, such as a language, framework, API, data store, infrastructure mechanism, testing strategy, or consequential design decision. A role-level technology list is not sufficient proof that a technology belongs in a particular bullet; bind the stack to the engineering object before using it. If that binding is absent and materially affects target fit, ask the candidate instead of omitting the stack or inferring it.

Record a deliberate reason whenever an important supported goal/problem or outcome is omitted: genuine duplication, disclosure restriction, space prioritization, or an intentionally decision-focused bullet whose related result is established nearby. Apply the same review to strong evidence units omitted entirely during selection. Historical accuracy, confidentiality, uncertainty, and source support still determine whether evidence is eligible for use.

Prefer a supported accomplishment over a generic responsibility summary that serves the same target requirement. Keep a responsibility-summary bullet only when it supplies necessary role context that the surrounding accomplishments do not establish.

Prefer a varied combination of:

```text
Action + engineering object + method or decision + scope + verified outcome
Problem + intervention + result
Scope + ownership + impact
Migration from state + to state + breadth + benefit
Risk + control + reliability or security outcome
```

Important bullets should identify the service, component, model, platform, pipeline, migration, product flow, or engineering process. Include the technical method, constraint, or trade-off when it demonstrates judgment. Use an outcome without a number when no metric exists.

Do not join unrelated evidence merely to preserve space. Delivery speed, mentoring, organizational representation, and separate product outcomes require separate bullets unless one is clearly supporting context for the bullet's single primary idea. A semicolon does not make unrelated accomplishments one idea.

Reject unexplained placeholders such as `major feature`, `key component`, and `various improvements`. A strong default shape is `Action + engineering object + method or decision + scope + outcome`, but omit unsupported components rather than forcing them.

Match evidence to level:

- **Student/junior:** concrete contribution, shipped feature, testing, accessibility, learning demonstrated through delivery.
- **Mid-level:** independent end-to-end ownership, production operation, product collaboration, service or user outcomes.
- **Senior:** architecture, trade-offs, multi-service scope, reliability, migrations, mentoring, and technical direction.
- **Staff/lead:** ambiguous problems, multi-team strategy, standards, platforms, organizational adoption, risk, and engineering leverage.

Use two to five high-signal bullets for a recent important role. Compress less relevant or older roles to the evidence needed for chronology and progression. Put the strongest target evidence first. Avoid `responsible for`, `worked on`, `helped with`, and repeated generic verbs.

## Skills, projects, and links

- Group hard skills into recognizable, target-relevant categories.
- Ensure most prominent technologies also appear in work, project, education, or sourced summary context.
- Remove obsolete, beginner-only, duplicated, or weakly remembered tools.
- Demonstrate communication, collaboration, ownership, and mentoring through behavior rather than soft-skill labels.
- Separate professional evidence from explicit learning interests.
- Keep proficiency treatment consistent across the headline, summary, skills, work, and projects. A technology classified below `core-current` must not appear as an unqualified headline specialization.

For a project, show the problem or user, architecture or difficult decision, testing/deployment, and verified adoption, performance, accuracy, or scope. Prioritize projects for students, juniors, career changers, and candidates entering a specialty without equivalent professional evidence. Senior candidates should include only unusually relevant projects or external work.

Include LinkedIn, GitHub, portfolios, publications, or demos only when polished, consistent with the resume, and relevant. Do not expose repositories with secrets or contradictory claims.

Select each project to close a high-priority requirement that professional work does not demonstrate more strongly. Record that purpose in the requirement matrix or evidence audit. Order projects by target relevance and preserve honest maturity labels such as prototype, working MVP, deployed project, maintained tool, or production-operated system.

## Scan emphasis

When the user requests scan-oriented bolding, represent it in the resume input's structured `emphasis` map. Give each retained accomplishment bullet one to three meaningful emphasis spans. Favor target-relevant languages, frameworks, APIs, tools, concrete engineering objects, architecture patterns, metrics, scope, outcomes, and reliability, security, or evaluation controls.

Prioritize emphasis in this order when the evidence is available: engineering object; target-relevant language or framework; architecture, reliability, security, or evaluation mechanism; measured outcome or scope. Avoid spending limited emphasis on generic ownership language when a concrete technology, system, control, or result is available in the same bullet.

Do not bold generic verbs, generic status values, or irrelevant technology merely to satisfy a formatting rule. If a bullet contains no phrase worth emphasizing for the target role, rewrite it with supported context or remove it. Emphasis should direct attention to evidence rather than turn the page into a keyword field.

## Compression and page strategy

Use the shortest length that preserves relevant proof:

- normally one page for students and junior engineers;
- one or two pages for mid-level engineers when page two contains useful outcomes or ownership;
- up to two pages for senior and staff candidates with differentiated system or organizational scope.

Do not shrink text or margins to force one page. Remove unrelated history, routine duties, duplicated claims, generic course badges, weak links, and low-value projects before removing target evidence.

## ATS application policy

For the application copy:

- prefer a single-column, reverse-chronological layout;
- keep contact details in the document body;
- use conventional headings and consistent dates;
- avoid photos, skill bars, charts, text boxes, decorative icons, and complex columns;
- introduce useful acronyms once, such as `Amazon Web Services (AWS)` or `continuous integration and delivery (CI/CD)`;
- keep URLs meaningful when printed;
- verify selectable text and logical plain-text extraction order.

Use employer-requested file formats. PDF is the default only when the employer does not request DOCX or another format.

## Final audit

Before rendering, confirm:

- every material claim maps to source IDs;
- every recent or target-relevant bullet has been compared with the six evidence fields and carries one primary idea;
- system-specific technologies are preserved in recent and target-relevant experience when supported, and no bullet inherits technologies only from a role-level inventory;
- each major recent or target-relevant role demonstrates concrete technical methods across its bullets when the evidence permits;
- the combined bullets for each recent or target-relevant role preserve important supported purpose and outcome, or record a deliberate omission reason;
- every explicit requirement appears in the requirement matrix;
- titles, dates, technologies, ownership, metrics, and contact information are source-backed;
- gaps remain gaps and inferred expectations stay labelled;
- target terminology reads naturally;
- section order matches the career-stage strategy;
- the top third communicates role, level, stack, impact, and scale;
- a six-second scan of the first visible screen also surfaces one differentiated result or scope signal and any material location or eligibility information;
- the visible work chronology supports every experience-duration claim and every omitted role has an audited reason;
- proficiency wording is consistent across the headline, summary, skills, work, and projects;
- requested emphasis is reproducible from the resume input and every emphasized phrase is supported and materially useful;
- current or regenerated applications use `contentAudit` exactly and do not rely on the legacy compatibility warning;
- verb tense, spelling, capitalization, and technology names are consistent;
- every line increases confidence that the candidate can perform the target job.
