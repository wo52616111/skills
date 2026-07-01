---
name: tdd
description: Risk-aware agent TDD workflow with clear enablement rules, hard pre-handoff gates, loop guardrails, and a pre-coding test gate that makes "tests pass" non-self-referential.
---

# TDD Skill: Risk-Aware Agent Delivery

## Goal

Use TDD where it provides clear quality ROI, avoid it where it adds friction, and enforce objective pre-handoff quality gates so users are not asked to test broken builds.

---

## Decision 1: When to Enable TDD

Three modes:

- `FORCE_ON`: TDD is mandatory
- `FORCE_OFF`: TDD is skipped
- `AUTO`: score-based decision

Priority: `FORCE_ON`/`FORCE_OFF` override `AUTO`.

### FORCE_ON — enable by default for
- Bug fixes (especially regressions)
- Architecture refactors or core-flow rewrites
- Critical run-paths (startup, config load, core command path)
- Data correctness or security boundary changes

### FORCE_OFF — skip for
- Copy/text/docs-only edits
- Pure visual/style tweaks without behavior change
- Mechanical rename/path moves without behavior change
- Temporary local debug scaffolding not intended for durable code

### AUTO Scoring Rule

- `benefit = regression_risk + logic_complexity + cross_module_impact + hard_to_manually_verify`
- `cost = test_setup_heavy + test_runtime_slow + requirement_instability`
- Enable TDD when `benefit >= cost + 1`

Before implementation, output: selected mode + why it applies + the benefit/cost breakdown (if `AUTO`).

---

## Decision 2: Hard Pre-Handoff Gates

No handoff unless all required gates pass:

1. `Gate 1`: Compile/type-check passes
2. `Gate 2`: Targeted tests for changed behavior pass — in a TDD path this is meaningful **only because the tests were independently vetted** by the pre-coding test gate (Decision 10); otherwise "tests pass" is the author grading their own paper
3. `Gate 3`: Critical-path smoke checks pass (startup + core path)

Validation order: default `targeted -> affected`; escalate to full suite only on high-risk triggers.

Hard rule: no broken handoff. If compile or required checks fail, do not ask the user to test.

---

## Decision 3: Loop and Error-Abyss Control

### Stop-Loss Defaults
- `max_attempts_per_red = 3`
- `same_failure_signature_limit = 2`
- `max_minutes_per_red = 10`

### No-New-Evidence Rule
A retry is not allowed without at least one of: new evidence / new hypothesis / new, justified change in approach. If any stop-loss threshold triggers, move to `DIAGNOSE` immediately.

---

## Decision 4: Root-Cause Lane Rule (No Band-Aid)

- Each attempt cycle focuses on one root-cause hypothesis.
- Any layer can be changed if the root cause requires it (including architecture/infrastructure).
- Unrelated opportunistic edits are not allowed in the same cycle.
- If the root cause is architectural, fix architecture — don't patch symptoms. For non-trivial architecture changes, present a proposal and wait for user confirmation.

---

## Decision 5: Test Scope and Cost Control

Progressive levels: `L1` targeted · `L2` affected module/package · `L3` full suite. Default `L1 -> L2`; escalate to `L3` only on high-risk triggers (core entry/state-machine/concurrency changed; broad cross-module footprint; regression/critical-path fix; repeated "local green, integration red").

---

## Decision 6: Human Escalation Threshold

Stop and ask for user input when: a non-trivial architecture change is required; two diagnose cycles show no progress; the test itself may be invalid / requirements conflict; or data-migration/security/external-side-effect risk is involved.

---

## Decision 7: Diagnose Output Contract

On entering `DIAGNOSE`, include all of: `failure_signature` · `hypothesis` · `changed_files` · `reproduction_steps` · `last_test_command` · `why_previous_attempt_failed`.

---

## Decision 8: Spec × TDD Collaboration

The requirements baseline (the spec) is human-owned; the work log records execution facts.

- Treat the spec as source of truth for requirements, acceptance, and architecture intent.
- The agent does not directly rewrite core spec content by default; if a spec change is needed, submit a proposal first (reason, impact, suggested text) and apply only after explicit user approval.
- Auto-update the work log with high-value, decision-oriented, searchable execution facts — not a verbose noise dump.

---

## Decision 9: Checkpoint Cadence

Checkpoint on validated value slices, not every attempt. Recommended: every 1–3 green slices, or at risk boundaries. Good moments: Gate 2/3 passed for a meaningful behavior slice; a root-cause fix verified stable; a multi-module change reaching a stable state. Do not checkpoint failed intermediate retries, no-evidence repeats, or noisy transient logs.

---

## Decision 10: Pre-coding Test Gate (when TDD is on)

When TDD is enabled the test cases ARE the contract — but the author writing them and self-greening them is not an independent check. Gate them BEFORE coding:

- **Batch by cohesive AC-cluster.** Don't gate one test at a time (round explosion) or write every test for a giant task up front (attention overflow). Write the tests for a cohesive cluster of acceptance criteria, then gate that cluster before coding it. (Same slicing as Decision 9.)
- **Run the test gate at each Red→Green boundary** — an independent red team checks the cluster's tests nail their acceptance criteria (AC-coverage + assertion-strength + red-is-red) against the pre-impl stub, before any implementation exists. (See the `test-rt` skill.)
- **Fix-rounds reuse Decision 3's loop-guards** (max 3 / same-signature 2 / no-new-evidence); at the limit with unresolved blocking findings, escalate to the user rather than code against bad tests.
- **Coverage:** every acceptance criterion must end up claimed by a cluster that PASSED the gate before handoff.

The task's structured **acceptance criteria** are the gate's oracle — keep each a checkable behavior. This gate is what makes Gate 2 meaningful instead of self-referential.

---

## Standard Execution Flow

1. Determine mode (`FORCE_ON`/`FORCE_OFF`/`AUTO`).
2. For TDD paths, run Red → Green → Refactor in micro-slices.
3. In TDD: at each Red→Green boundary, gate the cluster's tests via the test gate before writing impl (Decision 10).
4. Enforce stop-loss and no-new-evidence rules.
5. If blocked, switch to `DIAGNOSE` with the required output contract.
6. Verify using progressive test scope (L1/L2/L3 as needed).
7. Enforce pre-handoff gates (Gate 1/2/3).
8. Update the work log with a high-value summary.
9. Propose spec changes only when needed; do not auto-edit the spec baseline.

---

## Anti-Patterns

- Infinite Green retries without new evidence
- Handoff while compile/tests are still failing
- Symptom patching when the root cause is architectural
- Full-suite overuse for low-risk trivial tasks
- Turning the spec into a progress journal
- Turning the work log into a verbose noise dump

---

## Quick Reference

```text
Enablement:  FORCE_ON / FORCE_OFF / AUTO   (AUTO => enable when benefit >= cost + 1)
Hard Gates:  Gate1 compile/type-check · Gate2 targeted tests · Gate3 critical-path smoke
Loop Guard:  max_attempts_per_red=3 · same_failure_signature_limit=2 · max_minutes_per_red=10 · no-new-evidence => no retry
Scope:       default L1 -> L2 ; high-risk => L3
Ownership:   Spec human-owned baseline · work log agent-updated · spec changes proposal-first
```
