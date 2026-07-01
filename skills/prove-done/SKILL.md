---
name: prove-done
description: Mandatory verification gate before marking a coding task done. Forces the agent to prove (via observation or compile-time enforcement) that the change actually works end-to-end across every contract boundary it touches, instead of relying on unit tests that only validate logic given assumed inputs.
---

# Prove-Done Skill

## Goal

Close the gap between "tests pass" and "feature works". A unit test mocks the inputs to your
change; it doesn't prove the inputs ever arrive, that downstream consumers know about your
change, or that the user-facing behavior is what you expected.

Before the agent marks the task done, it must fill a **Verification Ledger** that addresses 5
dimensions of "really done". Any unverified dimension must be explicitly escalated to the
user, not silently proceeded past.

## Output discipline: ledger is internal-by-default

The ledger is an **agent self-check**, not a per-turn report. Surface it only when:

1. **Task contracts** — the ledger goes into the task's `## Verification Ledger` section as
   part of the done deliverable. The reviewer reads it at the review gate. This is the canonical surfacing.
2. **(c) escalations** — when any dimension is `[c]` not-verified, surface ONLY those items +
   the verification step the user needs to take. Skip passing dimensions.
3. **Explicit ask** — if the user asks "show me the ledger" / "what did you check".

Otherwise (conversational work that passed all checks): **just say "done", don't recite the
ledger**. Reciting passing dimensions every turn is performative noise.

## When to Load

- **Mandatory**: at the end of every silent-execute phase, before marking the task done.
- The trigger is the convention itself, not a user request — the agent self-invokes.
- Skip only when the change is trivially un-shippable (work-in-progress dump, mid-refactor
  checkpoint) AND the task is not being marked done (e.g. it will be blocked or released).

## The 5 Dimensions

| # | Dim | The question | QA-canon analogue |
|---|---|---|---|
| **A** | **Reach** | Did the control / data flow my change touched reach the other side of every contract? | Integration concern |
| **B** | **Behavior** | When exercised the user-facing way, does it do the right thing? (happy + non-happy paths) | Functional verification |
| **C** | **Regression** | Did adjacent / unmodified features still work? | Regression testing |
| **D** | **Observability** | If this fails later in production, will it surface (log / metric / error)? | SRE / operability |
| **E** | **Honesty** | Have all unverified items been explicitly raised to the user? | Agent-specific |

## Evidence Levels

- **`[a]` Run-verified** — I ran the system end-to-end and observed the expected outcome. State the command/page/scenario and the observation.
- **`[b]` Compile-enforced** — The type system, code generation, or CI gate makes a one-sided change impossible. State which mechanism.
- **`[c]` Not verified** — State the reason (env not available, token expired, requires user interaction, out of session scope). **Escalated to the user before done, not absorbed silently.**

## Verification Ledger Template

Append this to the task body before marking it done:

```markdown
## Verification Ledger

### A. Reach
- Contracts touched:
  - <contract 1>: producer = ..., consumer = ...
    - Evidence: [a/b/c] <observation or reason>
- Repeat per contract.

### B. Behavior
- Happy path: [a/b/c] <how you exercised it, what you saw>
- Non-happy / edge cases checked: [a/b/c] <which ones, what you saw>

### C. Regression
- Adjacent surfaces examined: <list>
- Evidence: [a/b/c] <run / test / inspection>

### D. Observability
- Failure surface (where would you see this break in prod): <log/metric/error path>
- Evidence: [a/b/c] <verified the signal works>

### E. Honesty (escalation)
- Unverified items (all `[c]` above):
  - <item>: user needs to <concrete verification step> on <env/page/command>
- If empty: "All dimensions verified; no escalations."
```

## Procedure

1. **Inventory contracts touched** — list every runtime boundary the change crosses
   (schema ↔ query, IPC, registry, migration, env, etc.). For each, identify producer and consumer.
2. **For each contract, attempt `[a]` first** — run the system, observe the boundary.
3. **If `[a]` impossible, look for `[b]`** — does codegen / the type system / CI guarantee the
   consumer side is in sync? (e.g. a codegen run + types compile)
4. **If neither, mark `[c]` with a concrete reason**. Do not hand-wave.
5. **Repeat for B–D**. E is computed from A–D's `[c]` items.
6. **If any `[c]`** — do **not** silently mark done. Either resolve it now (try once more, or
   change the implementation so it's verifiable), OR surface to the user with the explicit
   verification step they'd need to perform (record the handoff in `## Parked Decisions`).
   - **EXCEPTION — crash/startup-class `[c]` BLOCKS, it does not surface-and-proceed.** If the
     unverified path is "does the app even launch?" or "does an existing user's first upgrade
     load?", shipping it is a *guaranteed* break, not a deferred risk. Run it to `[a]` (load a
     pre-change artifact, launch the build) before done; if you genuinely cannot, the task is
     blocked, not done. (This is real: a crash-on-launch once shipped because dim B was `[c]`
     "real-machine first launch" and got marked done anyway; only the user's launch caught it.)

## Worked Examples

### Example 1: a service adds a field, a client consumes it (cross-service)

```markdown
### A. Reach
- Contract: Service A's API schema (new field `X`) ↔ Client B's query selection
  - Producer: Service A (resolver / entity)
  - Consumer: Client B (query, codegen output)
  - Evidence: [a] Ran Client B locally against Service A, captured the network response,
    confirmed `X` present in the payload. Re-ran codegen, confirmed the generated type includes it.

### B. Behavior
- Happy path: [a] Opened the consuming screen, observed it renders the value derived from `X`.
- Edge cases: [a] Set `X` to its boundary value via a test fixture, observed the expected floor/clamp.

### C. Regression
- Adjacent surfaces: the sibling features that read the same payload
- Evidence: [a] Full client test suite — 0 new regressions vs HEAD.

### D. Observability
- Failure surface: Service A logs the full result payload (existing). The client has no
  per-tick log; a failure would surface via user report.
- Evidence: [b] Verified the server log format is unchanged.

### E. Honesty
- No `[c]` items.
```

### Example 2: a change verifiable only on another platform (unavoidable `[c]`)

```markdown
### A. Reach
- Contract: core logic ↔ a platform-specific dispatcher (only runs on another OS)
  - Evidence: [c] Can't run that OS from this session. User needs to test on the other
    platform: run the build, trigger the new path, expect <X>.

### E. Honesty
- Unverified items:
  - Reach on the platform-specific dispatcher: needs that machine. User: run the build there,
    trigger the path, confirm the action fires.
```

## Anti-patterns

| ❌ Don't | ✅ Do |
|---|---|
| Declare done because unit tests pass | Tests are necessary, not sufficient. Fill the ledger. |
| Mark a dimension `[a]` because "it should work" | `[a]` requires actual observation. If you didn't run it, it's `[c]`. |
| Silently skip dimensions that feel "not applicable" | If a dim genuinely doesn't apply (e.g. D for a pure refactor with no behavior change), state it: "D N/A: refactor only." |
| Bury `[c]` items in task-body comments | The E section must list them. Escalation is explicit, top-of-mind for review. |
| Use codegen-passes as proof of `[a]` | Codegen passing is `[b]` evidence. For `[a]` you need a runtime observation. |
| Treat token-expired / env-unavailable as a reason to skip | That's exactly when `[c]` + E-section escalation exist. Do not silently proceed. |
| Verify a persisted / serialized struct change with a FRESH run or unit test only | Load a **PRE-CHANGE artifact too** — an existing DB / save-file / config that lacks the new field. The failure mode is "existing users on first **upgrade**" (a stale reader meeting a new writer, or an all-or-nothing loader failing on a missing key), which fresh-install and unit tests can NEVER see. |

## Relation to Other Skills

- `mission` — provides the contract sections (`## Commands` / `## Open Assumptions` /
  `## Stop Conditions` / `## Parked Decisions`). Prove-done's `## Verification Ledger` is the
  additional terminal section, filled before marking done.
- `tdd` — about how to drive code via tests. Prove-done is about what's true *after* tests pass.
- `test-rt` — independently checks (in TDD, before coding) that the TEST CASES nail every
  confirmed requirement. When it has run, dim **B (Behavior)** is no longer self-referential.
- `code-rt` — the **independent adversarial audit of the diff**, run *before* this self-cert: a
  code-reading red team gates the diff (looping fixes, escalating at its cap), and once it has
  converged the author fills this final `prove-done` Verification Ledger before marking done.
  code-rt is the independent check of the code; prove-done is the author's final end-to-end attestation on the audited diff.
