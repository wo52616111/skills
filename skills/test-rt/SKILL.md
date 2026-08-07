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
- When BDD is ON, include the gated `AC -> scenario` trace as context. Judge whether the actual tests
  automate the relevant behavior, but do not reopen scenario wording or product-example choices owned
  by `bdd-rt` unless the test exposes a real contradiction.

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

Every blocking finding must identify a concrete test failure mode, the affected AC/BDD behavior,
evidence from the test or Red execution, and the real cost of accepting the weak test. Speculative
robustness and stylistic preferences are advisory.

**Convergence = zero BLOCKING findings for the signed confirmation mode** (`single` or `double`).

## Execution grounding (red-is-red)

The red team is **execution-capable**. It MUST run the tests with the project's own test command against the pre-impl stub and confirm each new test fails **at its assertion**. Running against a stub is the normal TDD Red state.

**Structural tooling rule:** if the project has no test harness, TDD and test-rt are OFF; do not install
one implicitly. A degraded static path exists only when a signed TDD route has a real harness but the
current reviewer cannot execute it (for example, a paste-only/no-shell client). Then mark Red-is-red
UNVERIFIED and never imply a clean runtime check.

## Convergence loop (cheap)

- Inherit fail-fast behavior plus the signed confirmation mode. A blocking pass returns immediately;
  `single` accepts one fresh clean pass, while `double` confirms with a second fresh sequential pass.
- **Fix-rounds are bounded by the `tdd` skill's loop-guards** (max 3 / same-signature 2 / no-new-evidence) — NOT a new cap. At the guard limit with unresolved blocking findings → hand the residual list to the user. Clean tests cost one pass in `single` mode and two fresh sequential passes in `double`; messy tests converge within the guard or escalate.

Every update reports `fix round / 3`, open blocker count, confirmation progress, `clusters passed /
planned clusters`, and `ACs automated / applicable ACs`. Denominator changes are explicit.

## Inputs (artifact assembly)

The signed acceptance criteria (oracle) + the **test files** (the artifact) + the stub / signatures (to run red-is-red) + the test command. Passed as the engine `artifact` + `context`.

## Findings schema (the engine `findingsSchema` arg)

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": { "findings": { "type": "array", "items": {
    "type": "object", "additionalProperties": false,
    "required": ["kind", "dimension", "acceptance_criterion", "test_name", "location", "problem", "blocking"],
    "properties": {
      "kind":                 { "type": "string", "enum": ["blocking", "advisory"] },
      "dimension":            { "type": "string", "enum": ["ac-coverage", "assertion-strength", "red-is-red", "edge-failure", "behavior-not-impl", "determinism", "other"] },
      "acceptance_criterion": { "type": "string", "description": "which AC this is about" },
      "test_name":            { "type": "string", "description": "test name, or (missing) when the finding is an uncovered AC" },
      "location":             { "type": "string", "description": "file:line, or acceptance-criteria location for an uncovered AC" },
      "problem":              { "type": "string" },
      "blocking":             { "type": "boolean", "description": "true for kind=blocking; false for kind=advisory" },
      "suggested_fix":        { "type": "string" }
    },
    "allOf": [
      { "if": { "properties": { "kind": { "const": "blocking" } } }, "then": { "properties": { "blocking": { "const": true } } } },
      { "if": { "properties": { "kind": { "const": "advisory" } } }, "then": { "properties": { "blocking": { "const": false } } } }
    ]
  } } }
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

For every blocker, name the concrete false-confidence/failure scenario, affected AC or behavior,
execution/source evidence, and real delivery cost. Without all four, use advisory or omit it.

ADVISORY only (never blocks): missing edge/failure cases beyond the ACs, behavior-not-implementation coupling, determinism/flakiness, performance, naming/organization — note them.

Convergence is zero BLOCKING findings. If you cannot run the tests, mark red-is-red UNVERIFIED and say so — never imply a check you did not perform.
```

Dimensions (the engine `dimensions` arg): `ac-coverage (bijection)` · `assertion-strength` · `red-is-red` · `edge / failure coverage` · `behavior-not-implementation` · `determinism / independence`.

## Engine

Instantiates the shared **red-team-gate engine** (its canonical convergence invariants live in the engine header). Invoke it with:
`{ artifact: <test files>, context: <ACs + stub + test command>, framingLines: <above>, findingsSchema: <above>, identityFields: ['dimension','acceptance_criterion','test_name','location'], dimensions: <above>, agentType: 'general-purpose', artifactLabel: 'TEST CASES (pre-implementation, under audit)', confirmation: <route single|double>, protocolVersion: 1 }`.
Every pass uses a fresh context/session and a reviewer capable of running the project's tests and
judging their assertions. A different model or client is optional diversity only when it is
comparably capable (or better) and reliable; never downgrade reviewer quality merely to obtain
heterogeneity. Same-model fresh-context passes are fully valid. An off-engine runner is a plain
agent, so reproduce this rubric verbatim.

## Relationship to the other gates

- **Upstream oracle** → the task's structured acceptance criteria (from the briefing).
- **BDD context when applicable** → gated behavior scenarios define the outer examples; this gate audits
  the executable tests, not the Gherkin formulation.
- **Makes meaningful** → the `tdd` skill's Gate 2 ("targeted tests pass") + the `prove-done` Behavior dimension — once tests are independently checked here, "tests pass" is no longer self-referential.
- **Independent of** → the code gate (`code-rt`), which separately audits the final code.
- **Shares the engine with** → the design gate (`design-rt`), BDD gate (`bdd-rt`), code gate
  (`code-rt`), and user-facing acceptance gate (`accept-rt`).
