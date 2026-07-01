---
name: test-rt
description: Independent adversarial gate on the TEST CASES in TDD, run BEFORE the implementation is written (the Red step). It checks that the tests truthfully and completely NAIL every confirmed requirement point (the task's acceptance criteria) — the input-side counterpart to the code gate's output-side audit. Cheap by design. Load when a task has TDD enabled and tests are written but coding has not started, or on "test gate" / "judge the tests" / "test case review".
---

# test-rt: nail the requirements before coding (pre-coding TDD test gate)

## Why this exists

In TDD the tests ARE the contract. But if the same agent writes the tests, runs them green, and no independent eye checks whether those tests are any good, a weak or wrong test set silently becomes a false "tests pass" later. This gate closes that input-side gap: **before any implementation is written, an independent red team checks that the test cases truthfully and completely nail every confirmed requirement.**

- It is the **input-side** counterpart to the **code gate** (`code-rt`, which audits the output code).
- Its core job is deliberately TIGHT: *did the tests pin down every agreed requirement?* Everything beyond that (extra edges, perf) is advisory, never blocking.

## When to run

- **Only when TDD is enabled** for the task (`tdd` skill: FORCE_ON, or AUTO with benefit ≥ cost + 1). If TDD is off there are no first-class tests to judge. TDD-enablement IS the proportionality signal — no separate risk gate.
- At the **Red step**: tests written, implementation not yet. Runs against the pre-impl stub.
- **Granularity:** judge per **cohesive cluster of acceptance criteria**, at the boundary before coding that cluster — not one test at a time (round explosion), not a whole giant task at once (attention overflow). The `tdd` skill owns how work is chunked; this gate runs at each boundary.
- **Coverage:** keep a running `AC → owning cluster` check; before handoff, every acceptance criterion must be claimed by a cluster that PASSED this gate (claimed AND converged).

## The oracle

The ground truth is the task's **structured acceptance criteria** (the enumerable, signed requirement points). The gate's authority is *"do the tests faithfully + completely encode these ACs"*, **not** absolute correctness.

- If the ACs are unstructured / absent → enumerate what you can and **flag "completeness UNVERIFIABLE"**; do not fabricate criteria.
- If a test faithfully encodes an AC but the **AC itself looks wrong/contradictory** → the loop can't fix that (changing an AC = changing the signed contract) → **escalate to the user**; it does not block the other clusters.

## The rubric

**BLOCKING (must fix) — three dimensions, all objective:**
1. **AC-coverage** — every confirmed AC has ≥1 real test; every test maps to an AC (no orphans).
2. **Assertion-strength** — the test actually checks the AC; a vacuous / tautological assertion that cannot fail is worse than no test.
3. **Red-is-red** — the test genuinely FAILS at its assertion against the absent implementation (not a setup / compile / import error). A test that passes against the stub is broken.

**ADVISORY (note, NEVER blocks):** extra edge / failure cases beyond the ACs, behavior-not-implementation coupling, determinism / flakiness, performance, naming / organization.

**Convergence = zero BLOCKING findings.**

## Execution grounding (red-is-red)

The red team is **execution-capable**. It MUST run the tests with the project's own test command against the pre-impl stub and confirm each new test fails **at its assertion**. Running against a stub is the normal TDD Red state.

**Degraded path:** if it cannot run pre-impl (e.g. no harness), it does a static review and marks every test **"red-is-red UNVERIFIED"** (surfaced to the user) — never a silent pass. A paste-only / no-shell client cannot run the probe → the whole red-is-red dimension degrades to static + UNVERIFIED.

## Convergence loop (cheap)

- Inherit the shared engine's asymmetric 1→confirm: a clean pass is confirmed by a 2nd independent red team (two-clean), because the assertion-strength judgment can be missed by one pass. A pass with findings returns immediately (cost 1).
- **Fix-rounds are bounded by the `tdd` skill's loop-guards** (max 3 / same-signature 2 / no-new-evidence) — NOT a new cap. At the guard limit with unresolved blocking findings → hand the residual list to the user. Good tests = 2 passes; messy tests = a few guarded rounds then converge or escalate.

## Inputs (artifact assembly)

The signed acceptance criteria (oracle) + the **test files** (the artifact) + the stub / signatures (to run red-is-red) + the test command. Passed as the engine `artifact` + `context`.

## Findings schema (the engine `findingsSchema` arg)

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["kind", "dimension", "acceptance_criterion", "problem"],
    "properties": {
      "kind":                 { "type": "string", "enum": ["blocking", "advisory"] },
      "dimension":            { "type": "string", "enum": ["ac-coverage", "assertion-strength", "red-is-red", "edge-failure", "behavior-not-impl", "determinism", "other"] },
      "acceptance_criterion": { "type": "string", "description": "which AC this is about" },
      "test_name":            { "type": "string" },
      "location":             { "type": "string", "description": "file:line" },
      "problem":              { "type": "string" },
      "suggested_fix":        { "type": "string" }
    } } } }
}
```

## Framing (the engine `framingLines` arg)

```
You are an adversarial RED TEAM auditing TEST CASES written BEFORE the implementation exists (the TDD Red step). Your ONLY job: find ways the tests fail to truthfully and completely NAIL the confirmed requirements (the acceptance criteria). You do NOT approve or bless.
The ORACLE is the task's acceptance criteria — the signed, enumerable requirement points. Judge the tests against THAT, not against any absolute notion of correctness. If a test faithfully encodes an AC but the AC itself looks wrong, do NOT rewrite it — FLAG it for the user.
You MUST run the tests against the current pre-implementation stub using the project's test command, and confirm each NEW test FAILS at its assertion (not at a setup/compile/import error). A test that passes against the stub, or errors before its assertion, is broken.

BLOCKING findings (must fix):
1. AC-COVERAGE — a confirmed acceptance criterion with no real test, OR a test with no AC it maps to.
2. ASSERTION-STRENGTH — a vacuous / tautological assertion that cannot actually fail (worse than no test).
3. RED-IS-RED — a test that does not genuinely fail at its assertion against the absent implementation.

ADVISORY only (never blocks): missing edge/failure cases beyond the ACs, behavior-not-implementation coupling, determinism/flakiness, performance, naming/organization — note them.

Convergence is zero BLOCKING findings. If you cannot run the tests, mark red-is-red UNVERIFIED and say so — never imply a check you did not perform.
```

Dimensions (the engine `dimensions` arg): `ac-coverage (bijection)` · `assertion-strength` · `red-is-red` · `edge / failure coverage` · `behavior-not-implementation` · `determinism / independence`.

## Engine

Instantiates the shared **red-team-gate engine** (its canonical convergence invariants live in the engine header). Invoke it with:
`{ artifact: <test files>, context: <ACs + stub + test command>, framingLines: <above>, findingsSchema: <above>, dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'TEST CASES (pre-implementation, under audit)' }`.
Client-agnostic: without a workflow runner, run the same passes via the client's subagent primitive (or sequential fresh-context passes) with this rubric — independence is what matters.

## Relationship to the other gates

- **Upstream oracle** → the task's structured acceptance criteria (from the briefing).
- **Makes meaningful** → the `tdd` skill's Gate 2 ("targeted tests pass") + the `prove-done` Behavior dimension — once tests are independently checked here, "tests pass" is no longer self-referential.
- **Independent of** → the code gate (`code-rt`), which separately audits the final code.
- **Shares the engine with** → the design gate (`design-rt`) and the code gate (`code-rt`).
