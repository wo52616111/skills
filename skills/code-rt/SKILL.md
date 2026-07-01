---
name: code-rt
description: Independent adversarial red-team gate for CODE, run in the Review phase after a coding task — the post-execution counterpart to how the design gate gates the design phase. It is the INDEPENDENT audit of the finished diff; an independent code-reading red team finds blocking defects, the author fixes, and it passes only after TWO consecutive clean rounds (capped); then the author's prove-done self-cert is the final step before done. Load when a coding task is finished and about to be marked done, or on "code-rt" / "code gate" / "independently review the code".
---

# code-rt: red-team convergence gate for the coding / Review phase

## Why this exists

code-rt is the **independent adversarial audit of the finished diff**: a separate code-reading red team that hunts for blocking defects the author missed, loops the author through fixes, and passes only on two consecutive clean rounds. It is the Review-phase mirror of the Briefing-phase design gate — an independent red team auditing the phase's output.

- **Design side:** author drafts the Decision Ledger → the design gate audits completeness → user sign-off.
- **Code side:** author writes the code → **code-rt** audits the diff → author's `prove-done` self-cert → user review.

The same engine runs both. code-rt is just the **code instantiation** of the shared red-team convergence loop. `prove-done` — the author's own end-to-end self-cert — is the *final* step before done, run on the already-audited diff; code-rt is the independent check that precedes it.

## When to run

- **After** the coding task is finished, **before** the author's final `prove-done` Verification Ledger and before the task is marked done. code-rt gates the author's ability to mark the task done: it should not be marked done until code-rt has converged (and then prove-done passes).
- **Trigger:** any task whose code changes carry behavior change. **Skip** pure-mechanical work (rename / format / docs) — flagged via the task's recorded skip flag. A skip is the exception, not the default.
- It does NOT replace the user's pass/reject sign-off — that stays, now reviewing a code-rt-converged diff.

## What it is NOT

- Not the author re-checking their own work (that's `prove-done`).
- Not a style/lint pass — open-ended quality nits are **exiled** to a separate cleanup pass, never gated on (Tier 3 below).
- Not a substitute for the user's review.

## The rubric — three tiers

The red team classifies every finding into exactly one tier. **Convergence = zero Tier-1 + Tier-2 findings, twice.** Tier 3 is advisory only and never blocks.

| Tier | What | Gates? |
|---|---|---|
| **1 — MUST-FIX** | A correctness / contract bug **in** the diff, OR a regression / performance hit / security surface **exposed-by** the diff (not just contained in it). Plus: does the code satisfy every acceptance-criteria item? (Mirrors prove-done dims C-Regression + D-Observability so the audit is never narrower than the self-cert.) | **BLOCKS + loops** |
| **2 — pref-conformance** | A clear violation of the user's EXPLICIT stated coding preferences (objective, finite). Correctness outranks prefs; on conflict, correctness wins and the red team FLAGS the pref to the user. | **BLOCKS** |
| **3 — quality nits** | Open-ended quality / style / "could be cleaner". | **NEVER** — note as advisory, defer to a cleanup pass |

## Inputs (artifact assembly)

The invoker hands the red team: the **diff** (the code under audit) as the engine `artifact`; the **task contract** — the structured acceptance criteria + authorized commands — as `context`; the **test / build output**; the user's **coding preferences** (for the Tier-2 check).

## Execution grounding (mandatory)

The red team is **execution-capable** (has read/grep/shell). It MUST run the task's build / test / lint commands and exercise the acceptance criteria; every finding is grounded in real output with `file:line`.

**Degraded path:** if it genuinely cannot build/test (env missing), it degrades to a static review and marks every affected finding **"UNVERIFIED — grounding unavailable"**, surfaced to the user. It never silently passes as if verified.

**Grounding cuts BOTH ways — the "verified benign" trap.** A finding's SAFE verdict needs grounding just as much as its unsafe one. If you flag a risk but your "it's fine / Tier-3" rests on a runtime path you did NOT actually run (e.g. "the caller falls back", "an existing store still loads on upgrade", "it matches a pre-existing pattern"), that is **NOT a Tier-3 nicety** — mark it **Tier-1 UNVERIFIED (blocking-until-grounded)** and attempt the path: you are execution-capable, so launch it / load the real prior artifact / hit the actual branch. "Matches a pre-existing pattern" is not grounding. The **author may NOT later downgrade** such a finding to non-blocking by reasoning alone — only a run clears it. (This is real: a Tier-1 crash-on-launch once shipped past two clean rounds because a flagged settings-load risk was reasoned down to "benign" on a wrong assumption about a platform fallback path, and only a real-machine launch caught it.)

## Convergence loop

Inherited from the shared engine (asymmetric 1→confirm):
- Run 1 red team. **Holes found → NOT converged** (cheap, cost 1) → author folds the fixes, resubmits. **Clean → run a 2nd independent red team to confirm.** Two consecutive clean = **converged**.
- **CAP = 3 fix-rounds.** At the cap with unresolved blocking findings → **STOP and escalate to the user** (record the remaining blockers). A blocked task CANNOT be marked done — the user releases it (with guidance) or cancels it. No infinite loop; no force-completing past unresolved blockers.

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
    } } } }
}
```

## Framing (the engine `framingLines` arg)

```
You are an adversarial CODE-review RED TEAM auditing a finished coding task. Your ONLY job is to find real defects in the DIFF. You do NOT approve or bless — you surface blocking problems.
Ground every finding in real output: you MUST run the task's build / test / lint commands and exercise the acceptance criteria; cite file:line. If you cannot build/test, say so and mark findings UNVERIFIED — never imply verification you did not do.

Classify each finding into a tier:
TIER 1 (MUST-FIX, blocking): a correctness/contract bug IN the diff, OR a regression / performance hit / security surface EXPOSED-BY the diff (not just contained in it). Does the code satisfy every acceptance criterion?
TIER 2 (blocking): a clear violation of the user's EXPLICIT stated coding preferences — objective, finite. Correctness outranks prefs; on conflict, correctness wins and you FLAG the pref.
TIER 3 (advisory, NEVER blocks): open-ended quality/style nits — note as advisory, defer to a cleanup pass; do not gate on them.
GROUNDING CUTS BOTH WAYS: a finding whose "safe / Tier-3" verdict rests on a runtime path you did NOT run (e.g. "the caller falls back", "an existing store still loads on upgrade", "same as a pre-existing pattern") is NOT Tier-3 — mark it TIER 1 UNVERIFIED and try to run that path. "Matches a pre-existing pattern" is not grounding.

Convergence is zero TIER-1 + TIER-2 findings. Report TIER-3 as advisory only.
```

Dimensions (the engine `dimensions` arg): `correctness / contract` · `regression (adjacent unmodified behavior)` · `diff-exposed risk (perf / security surface / resource)` · `acceptance-criteria satisfaction` · `error handling & edge cases` · `observability` · `pref-conformance`.

## Engine

code-rt does not reimplement the loop — it instantiates the shared **red-team-gate engine** (its canonical convergence invariants live in the engine header). Invoke it with:
`{ artifact: <diff>, context: <AC + commands + test output + prefs>, framingLines: <above>, findingsSchema: <above>, dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'DIFF (the code under audit)' }`.
Client-agnostic: on a client without a workflow runner, run the same passes via its subagent primitive (or sequential fresh-context passes) with this rubric — independence is what matters.

## Relationship to the other gates

- **Audits** → the finished diff (independent check of the code the author wrote).
- **Gates** → marking the task done (must converge first); on cap → escalate to the user.
- **Followed by** → the author's final `prove-done` self-cert, then the user's review (sign-off).
- **Delegates to** → a separate cleanup pass for Tier-3 quality nits.
- **Shares the engine with** → the design gate (`design-rt`) and the test gate (`test-rt`).
