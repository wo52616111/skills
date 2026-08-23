---
name: accept-rt
description: >-
  Holistic PRE-USER-HANDOFF acceptance red-team, run right before showing a finished feature
  to the user — the review that catches as many preventable first-use problems as possible. NOT a
  UX-only gate: it is the whole-delivery "you can't hand the user a broken thing to accept"
  gate, auditing the change across FOUR lenses — design coherence,
  UX/ergonomics/discoverability, correctness/integration, completeness/polish — by mentally
  walking every real user interaction. It exists because "compiles + tests pass + code-rt
  clean" does NOT mean "good to actually use", especially for UI/UX/product work whose runtime
  can't be fully exercised headlessly. Load when the signed route enables holistic pre-handoff
  review, or on "accept-rt" / "acceptance gate" / "review it like the user would".
---

# accept-rt: the holistic pre-handoff acceptance gate

## Why this exists

code-rt catches code DEFECTS. It does not catch a feature that compiles, passes tests, is
code-rt-clean — and is still **bad to use**: an incoherent interaction model, a keybinding
nobody can reach, a cursor you can't see, behaviors that fire inconsistently, a mode with no
discoverable exit, rough half-finished states. Those are DESIGN / UX / integration / polish
holes, and they are exactly what a user finds in the first five minutes of real use.

accept-rt is the gate that finds them FIRST, so the user is the **final sign-off**, not the
first line of basic defect discovery. Its iron principle:

> **The user is the last gate on the most thoroughly checked thing the available runtime permits —
> never the first gate on a knowingly broken one.**
> Handing a user an "error-riddled" implementation to find problems one by one is the failure
> this gate exists to prevent.

It is especially useful when the runtime **cannot be fully tested headlessly** (a native app,
a webview UI, hardware), but static reasoning does not replace live acceptance. It can catch
design, consistency, reachability, and wiring defects before handoff; claims that require a real
launch, upgrade, click, device, or interaction remain explicitly unverified until exercised.

## When to run

- Run when the signed route turns it ON, normally after applicable code-rt has converged and
  prove-done/evidence is filled, before the change is shown to the user.
- User-facing change is a strong applicability signal, not an unconditional trigger. Turn it ON when
  the human-driven surface carries material first-use/coherence/integration risk. Skip internal work
  and directly verifiable low-risk presentation-only changes with a recorded reason.
- When code-rt is also ON, accept-rt runs in addition to it: code-rt asks whether risky code is correct;
  accept-rt asks whether the finished experience is coherent and usable.

## The four lenses (the rubric)

Every finding is classified into one lens. A round is **not clean if it has any BLOCKER** in any
lens.

A blocker must name a concrete first-use/contract/safety failure, the affected user behavior, evidence
from runtime/source or an explicit critical UNVERIFIED path, and the real cost of handoff without a fix.
Speculative polish, subjective preference, and unsigned extra scope are advisory.

| Lens | What it hunts |
|---|---|
| **1 — design coherence** | Is the interaction model coherent + internally CONSISTENT? Do similar situations behave the same (everything that "finishes" / "exits" / "cancels" acts alike)? Does every mode/state have a clear, DISCOVERABLE exit (no dead-ends, no stranding)? |
| **2 — ux / ergonomics / discoverability** | Are keybindings reachable, non-conflicting, discoverable (hinted)? Are visual states correct + accurate (a visible cursor, correct highlights, per-mode hints that match reality)? Is anything confusing or surprising? |
| **3 — correctness / integration** | Real code bugs, edge + EMPTY states, races — AND does the wiring actually work end-to-end across every contract (events, IPC, schema, the other side of every boundary)? |
| **4 — completeness / polish** | Half-implemented states, missing feedback, unhandled errors, "looks done but isn't" rough edges. |

## Severity (gates on BLOCKER only)

| Severity | Meaning | Gates? |
|---|---|---|
| **blocker** | A user would immediately hit a broken / incoherent / confusing / inconsistent thing. Must fix before handoff. | **BLOCKS + loops** |
| **polish** | A rough edge worth fixing before handing over. | Advisory; fix when cheap, otherwise surface honestly |
| **note** | Minor / subjective. | Never blocks |

Convergence = **zero blockers for the signed confirmation mode** (`single` = one fresh clean pass;
`double` = two fresh sequential clean passes). Polish items are fixed or surfaced as a short, honest
"known rough edges" list — never silently shipped as if polished.

## Method — the MENTAL WALKTHROUGH (mandatory)

The reviewer does not just read code; it **enumerates every real user interaction and walks each
one**, asking for EACH: correct? consistent with its sibling behaviors? discoverable? polished?
would the user trip on it? For a launcher/editor UI that means, at minimum: open/summon; type &
edit (every key path); the primary action (fire/submit) for a quick case AND a long/interactive
case; cancel/dismiss; lose focus / click away; re-open; every secondary mode (lists, panels) with
0 / 1 / many items; destructive actions + their guards; and every ERROR + EMPTY state. The
walkthrough list belongs in the invocation's `context`.

## Execution grounding (mandatory, cuts both ways)

The reviewer is execution-capable: it MUST run the build / tests / lint and every authorized live
scenario available in the current environment. When the true runtime cannot be exercised, it still
reviews **design / UX / consistency / wiring STATICALLY from the code**, but labels runtime-only
claims UNVERIFIED and never converts them into a clean observation. Startup, first-upgrade, data-loss,
security, and primary-interaction paths are blocker-until-run when a failure would make the feature
unusable or unsafe. Lower-risk runtime-only checks are handed to the user as explicit acceptance
steps. A "looks fine" verdict that rests on an unrun path is not grounding.

## Revalidation after a finding

Acceptance findings can change code, tests, configuration, or the interaction model. Any such change
invalidates earlier evidence for the affected surface. The author fixes the finding, then reruns only
affected code/evidence stations that were previously ON before invoking accept-rt again. Documentation-only
clarifications that do not change the reviewed artifact do not force that loop.

## Convergence loop

Inherited from the shared red-team-gate engine: one reviewer; any BLOCKER returns immediately.
`single` accepts one clean pass; `double` requires a second fresh sequential confirmation. **CAP = 3 fix-rounds**; at the cap with unresolved
blockers → STOP and escalate to the user with the remaining list (do not hand over a
still-blocked feature as if done).

Every update reports `fix round / 3`, open blocker count, and `confirmation pass 1/1` or `1/2, 2/2`.
If the reviewed interaction inventory grows, report the old/new total and why.

## Findings schema (the engine `findingsSchema` arg)

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["lens", "location", "severity", "blocking", "title", "why", "evidence", "user_impact"],
    "properties": {
      "lens":         { "type": "string", "enum": ["design-coherence","ux-ergonomics","correctness-integration","completeness-polish"] },
      "location":     { "type": "string", "description": "file:line" },
      "severity":     { "type": "string", "enum": ["blocker","polish","note"] },
      "blocking":     { "type": "boolean", "description": "true only for severity=blocker" },
      "title":        { "type": "string" },
      "why":          { "type": "string", "description": "grounded; cite the code + the interaction it breaks" },
      "evidence":     { "type": "string", "description": "runtime observation, command output, or explicit UNVERIFIED reason" },
      "user_impact":  { "type": "string", "description": "what the user experiences / trips on" },
      "suggested_fix":{ "type": "string" }
    },
    "allOf": [
      { "if": { "properties": { "severity": { "const": "blocker" } } }, "then": { "properties": { "blocking": { "const": true } } } },
      { "if": { "properties": { "severity": { "enum": ["polish", "note"] } } }, "then": { "properties": { "blocking": { "const": false } } } }
    ]
  } } }
}
```

## Framing (the engine `framingLines` arg)

```
You are a demanding PRODUCT-ACCEPTANCE reviewer for a user-facing feature. The USER is the FINAL sign-off gate and should not be the first person finding preventable basic problems. Catch everything the available evidence can establish before handoff, while stating runtime limits honestly.
This is NOT just a code-defect pass. Review across FOUR lenses and flag holes in ANY: (1) DESIGN COHERENCE — coherent + internally consistent model; do sibling situations behave alike; does every state have a clear DISCOVERABLE exit. (2) UX / ERGONOMICS / DISCOVERABILITY — reachable, non-conflicting, discoverable keys; correct + accurate visual states + hints; nothing confusing. (3) CORRECTNESS / INTEGRATION — bugs, edge + empty states, races, and end-to-end wiring across every contract. (4) COMPLETENESS / POLISH — half-states, missing feedback, unhandled errors, rough edges.
METHOD: read the changed surface IN FULL + its contracts + the design source of truth + any accumulated user feedback. Then MENTALLY WALK EVERY user interaction (see the provided walkthrough). For EACH ask: correct? consistent with the siblings? discoverable? polished? would the user trip?
Run the build / tests / lint and every authorized live scenario. Where the true runtime cannot be exercised, reason about design/UX/consistency/wiring STATICALLY and label runtime-only claims UNVERIFIED. Startup, first-upgrade, data-loss, security, and primary-interaction paths block until run when failure would make the feature unusable or unsafe.
Classify severity and set blocking explicitly. A BLOCKER requires all four: concrete failure, affected user/contract/safety behavior, evidence, and real cost. POLISH + blocking=false; NOTE + blocking=false. Convergence = zero blocking findings. Rank most-severe first. Do NOT bless — surface problems and evidence limits.
```

Dimensions (the engine `dimensions` arg): `design coherence (model, transitions, consistency of sibling behaviors)` · `ux / ergonomics / discoverability (key reach + conflicts + hints; visual-state accuracy)` · `correctness / integration (bugs, edge + empty states, races, end-to-end wire)` · `completeness / polish (half-states, feedback, error handling)` · `state reachability (every state has a discoverable, non-dead-end exit)` · `consistency with the user's stated model + prior feedback`.

## Engine

accept-rt does not reimplement the loop — it instantiates the shared **red-team-gate engine**
(canonical convergence invariants live in the engine header). Invoke with:
`{ artifact: <the user-facing change + its contract>, context: <ACs + the mental-walkthrough list + accumulated user feedback + user bar + authorized build/test commands>, framingLines: <above>, findingsSchema: <above>, identityFields: ['lens','location','title'], dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'ARTIFACT under acceptance review', confirmation: <route single|double>, protocolVersion: 1 }`.
Every pass uses a fresh context/session and a reviewer capable of reading the changed surface and
running its authorized verification. A different model or client is optional diversity only when
it is comparably capable (or better) and reliable; never downgrade reviewer quality merely to
obtain heterogeneity. Same-model fresh-context passes are fully valid. An off-engine runner is a
plain agent, so reproduce this rubric verbatim.

## Relationship to the other gates

- **design-rt** gates the DESIGN (Briefing phase) before build.
- **bdd-rt** gates formulated behavior examples before sign-off and automation when BDD is on.
- **test-rt** gates TDD test cases before their implementation cluster is written.
- **code-rt** gates the CODE (Review phase) — is the diff correct.
- **accept-rt** gates the EXPERIENCE when this station is ON — is the finished thing as coherent,
  usable, and polished as the available evidence can establish? It runs after every applicable
  code/evidence station, before the user.
- **prove-done** is the author's own end-to-end self-cert; accept-rt is the INDEPENDENT holistic
  check that precedes the user's sign-off.
- **A fix from accept-rt** loops back through each affected station that was ON before accept-rt runs again.
- On BLOCKER-cap → escalate to the user (do not hand over a blocked feature).
