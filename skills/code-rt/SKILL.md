---
name: code-rt
description: Independent adversarial gate for finished code when the signed route identifies material correctness, contract, regression, security, data, concurrency, or explicit-preference risk. Uses single or double clean confirmation according to route risk. Skip for mechanical work or tiny explicit changes whose targeted evidence closes the realistic risk. Load on "code-rt" / "code gate" / "independently review the code".
---

# code-rt: red-team convergence gate for the coding / Review phase

## Why this exists

code-rt is the **independent adversarial audit of a finished risky diff**: a separate code-reading red team hunts for blocking defects the author missed and loops the author through fixes. A signed `single` route needs one blocking-clean pass; `double` needs two fresh sequential clean passes.

- **Design side:** author drafts the Decision Ledger → the design gate audits completeness → user sign-off.
- **Code side:** author writes the code → the signed route may run **code-rt**, `prove-done`, and
  `accept-rt` according to their independent applicability → user review.

The same engine runs both. code-rt is just the **code instantiation** of the shared red-team
convergence loop. `prove-done` is the author's end-to-end self-cert on the audited diff. For
when those later stations are ON, an acceptance fix loops back through every affected gate/evidence step.

## When to run

- Run only when the signed route turns it ON, after that code artifact is frozen and before dependent verification/handoff claims.
- Behavior change is a risk signal, not an unconditional trigger. Turn it ON for material correctness,
  contract, regression, security, data, concurrency, or explicit-preference risk. Skip mechanical work
  and tiny explicit changes whose targeted checks close the realistic failure modes.
- It does NOT replace the user's pass/reject sign-off — that stays, now reviewing a code-rt-converged diff.

## What it is NOT

- Not the author re-checking their own work (that's `prove-done`).
- Not a style/lint pass — open-ended quality nits are **exiled** to a separate cleanup pass, never gated on (Tier 3 below).
- Not a substitute for the user's review.

## The rubric — three tiers

The red team classifies every finding into exactly one tier. **Convergence = zero Tier-1 + Tier-2 findings for the signed confirmation mode.** Tier 3 is advisory only and never blocks.

A blocking finding must provide a concrete failure scenario, affected requirement/contract/user or
safety behavior, source/runtime evidence, and the real cost of leaving it unfixed. Speculative
robustness, naming, organization, symmetry, and unsigned extra scope are Tier 3 or omitted.

| Tier | What | Gates? |
|---|---|---|
| **1 — MUST-FIX** | A correctness / contract bug **in** the diff, OR a regression / performance hit / security surface **exposed-by** the diff (not just contained in it). Plus: does the code satisfy every acceptance-criteria item? (Mirrors prove-done dims C-Regression + D-Observability so the audit is never narrower than the self-cert.) | **BLOCKS + loops** |
| **2 — pref-conformance** | A clear violation of an EXPLICIT preference signed as a delivery constraint, with the same concrete failure/contract/evidence/cost materiality required above. Correctness outranks prefs; on conflict, correctness wins and the red team FLAGS the pref to the user. Style-only preference drift is Tier 3. | **BLOCKS** |
| **3 — quality nits** | Open-ended quality / style / "could be cleaner". | **NEVER** — note as advisory, defer to a cleanup pass |

## Inputs (artifact assembly)

The invoker hands the red team: the **diff** (the code under audit) as the engine `artifact`; the **task contract** — the structured acceptance criteria + authorized commands — as `context`; the **test / build output**; the user's **coding preferences** (for the Tier-2 check).

## Execution grounding (mandatory)

The red team is **execution-capable** (has read/grep/shell). It MUST run the task's build / test / lint commands and exercise the acceptance criteria; every finding is grounded in real output with `file:line`.

**Degraded path:** if it genuinely cannot build/test (env missing), it degrades to a static review and marks every affected finding **"UNVERIFIED — grounding unavailable"**, surfaced to the user. It never silently passes as if verified.

**Grounding cuts BOTH ways — the "verified benign" trap.** A finding's SAFE verdict needs grounding just as much as its unsafe one. If you flag a risk but your "it's fine / Tier-3" rests on a runtime path you did NOT actually run (e.g. "the caller falls back", "an existing store still loads on upgrade", "it matches a pre-existing pattern"), that is **NOT a Tier-3 nicety** — mark it **Tier-1 UNVERIFIED (blocking-until-grounded)** and attempt the path: you are execution-capable, so launch it / load the real prior artifact / hit the actual branch. "Matches a pre-existing pattern" is not grounding. The **author may NOT later downgrade** such a finding to non-blocking by reasoning alone — only a run clears it. For example, a settings-load risk reasoned down as a platform fallback could still produce a crash on launch; only a real launch clears that blocker.

## Convergence loop

Inherited from the shared engine:
- Run one fresh red team. **Blocking holes found → NOT converged** (cheap, cost 1) → author folds the fixes and resubmits. **Blocking-clean + `single` → converged. Blocking-clean + `double` → run a 2nd fresh sequential confirmation; both clean → converged.**
- **CAP = 3 fix-rounds.** At the cap with unresolved blocking findings → **STOP and escalate to the user** (record the remaining blockers). A blocked task CANNOT be marked done — the user releases it (with guidance) or cancels it. No infinite loop; no force-completing past unresolved blockers.

Every update reports `fix round / 3`, open Tier-1/Tier-2 count, and `confirmation pass 1/1` or
`1/2, 2/2`. If the frozen artifact scope changes, report the old/new file or contract count and why.

## Findings schema (the engine `findingsSchema` arg)

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["dimension", "location", "tier", "title", "why", "blocking"],
    "properties": {
      "dimension":     { "type": "string" },
      "location":      { "type": "string", "description": "file:line" },
      "tier":          { "type": "integer", "enum": [1, 2, 3] },
      "severity":      { "type": "string", "enum": ["critical", "major", "minor"] },
      "title":         { "type": "string" },
      "why":           { "type": "string", "description": "grounded in real build/test output" },
      "blocking":      { "type": "boolean", "description": "true for tier 1+2" },
      "suggested_fix": { "type": "string" }
    },
    "allOf": [
      { "if": { "properties": { "tier": { "enum": [1, 2] } } }, "then": { "properties": { "blocking": { "const": true } } } },
      { "if": { "properties": { "tier": { "const": 3 } } }, "then": { "properties": { "blocking": { "const": false } } } }
    ]
  } } }
}
```

## Framing (the engine `framingLines` arg)

```
You are an adversarial CODE-review RED TEAM auditing a finished coding task. Your ONLY job is to find real defects in the DIFF. You do NOT approve or bless — you surface blocking problems.
Ground every finding in real output: you MUST run the task's build / test / lint commands and exercise the acceptance criteria; cite file:line. If you cannot build/test, say so and mark findings UNVERIFIED — never imply verification you did not do.

Classify each finding into a tier:
TIER 1 (MUST-FIX, blocking): a correctness/contract bug IN the diff, OR a regression / performance hit / security surface EXPOSED-BY the diff (not just contained in it). Does the code satisfy every acceptance criterion?
TIER 2 (blocking): a clear violation of an EXPLICIT preference signed as a delivery constraint, with the same materiality required below. Correctness outranks prefs; on conflict, correctness wins and you FLAG the pref. Style-only preference drift is Tier 3.
TIER 3 (advisory, NEVER blocks): open-ended quality/style nits — note as advisory, defer to a cleanup pass; do not gate on them.
MATERIALITY BAR: a Tier-1 or Tier-2 blocker must name all four: (1) a concrete failure, (2) the affected requirement/contract/user/safety behavior, (3) source or runtime evidence, and (4) the real cost of leaving it unresolved. Without all four, classify it Tier 3 or omit it.
SCOPE FREEZE: every blocker must trace to the signed acceptance criteria, task contract, declared rubric, or behavior materially exposed by the diff. Fix and confirmation rounds must not broaden that scope. Unrelated hardening goals or newly invented protocol requirements are Tier 3 or omitted.
GROUNDING CUTS BOTH WAYS: a finding whose "safe / Tier-3" verdict rests on a runtime path you did NOT run (e.g. "the caller falls back", "an existing store still loads on upgrade", "same as a pre-existing pattern") is NOT Tier-3 — mark it TIER 1 UNVERIFIED and try to run that path. "Matches a pre-existing pattern" is not grounding.

Convergence is zero TIER-1 + TIER-2 findings. Report TIER-3 as advisory only.
```

Dimensions (the engine `dimensions` arg): `correctness / contract` · `regression (adjacent unmodified behavior)` · `diff-exposed risk (perf / security surface / resource)` · `acceptance-criteria satisfaction` · `error handling & edge cases` · `observability` · `pref-conformance`.

## Engine

code-rt does not reimplement the loop — it instantiates the shared **red-team-gate engine** (its canonical convergence invariants live in the engine header). Invoke it with:
`{ artifact: <diff>, context: <AC + commands + test output + prefs>, framingLines: <above>, findingsSchema: <above>, identityFields: ['dimension','location','title'], dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'DIFF (the code under audit)', confirmation: <route single|double>, protocolVersion: 1 }`.
Every pass uses a fresh context/session and a reviewer capable of reading the code and running the
authorized verification. A different model or client is optional diversity only when it is
comparably capable (or better) and reliable; never downgrade reviewer quality merely to obtain
heterogeneity. Same-model fresh-context passes are fully valid. An off-engine runner is a plain
agent, so reproduce this rubric verbatim (framing + dimensions + findings schema).

## Relationship to the other gates

- **Audits** → the finished diff (independent check of the code the author wrote).
- **Gates** → the risky code artifact when this station is ON; on cap → escalate to the user.
- **Followed by** → whichever verification/acceptance stations are ON, then user review. An
  acceptance fix that changes this artifact invalidates the verdict and loops back through code-rt.
- **Delegates to** → a separate cleanup pass for Tier-3 quality nits.
- **Shares the engine with** → the design gate (`design-rt`), BDD gate (`bdd-rt`), test gate
  (`test-rt`), and user-facing acceptance gate (`accept-rt`).
