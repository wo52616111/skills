---
name: mission
description: A mission is a single-agent execution contract — a durable, reviewable unit of delegated work that survives across sessions. The agent runs it silently after sign-off and the user reviews the result at a review gate (pass/reject). Missions are the "during execution" carrier of the Briefing → Silent → Review work mode. Multiple agents CAN claim missions in parallel, but that is a secondary capability, not the primary purpose. Load when delegating a chunk of work that needs a review gate, durability across sessions, or "split into missions" / "review missions".
---

# Mission Skill: Single-Agent Execution Contract

## What a mission IS

A **mission** is a contract between the user and an agent for one delegated chunk of work:

1. **An execution contract** — it carries the decisions locked during the briefing
   (`walkthrough`), plus exactly what the agent may do and how it behaves when things go
   sideways. After sign-off, the agent executes **silently** against this contract without
   interrupting the user.
2. **A review gate** — the agent cannot declare the work accepted. It marks the mission
   `done`; the user (or a reviewing agent) reviews and pass/rejects.
3. **Cross-session durable** — the mission record survives session death. A new session
   picks up exactly where the last left off. This is what ephemeral subagents cannot give you.

This is the **"Silent execute"** stage of the work mode. The contract is produced by the
briefing (`walkthrough`); the mission is where execution and review happen.

### What a mission is NOT
This kind of system is often framed as "multiple agents self-organize and collaborate via
messages." In practice that almost never materializes. **Do not design your usage around
multi-agent collaboration.** A mission is useful even when exactly one agent will ever touch
it. Multi-agent claiming still works (see Appendix) but it is a bonus, not the reason to use missions.

## When to use a mission vs a subagent

**Use a mission when:**
- The work needs a review gate (pass/reject) before it counts as done.
- It must survive across sessions (if this session dies, the state must persist).
- The agent will execute silently against a signed contract and you'll review later.

**Use a subagent when:**
- Short-lived, within this session, you just need a result back.
- Pure research/query, no review/retry cycle, nobody else needs to continue it.

**Never do both for the same work.** Choose one path.

## Mission file format (the contract)

A mission is a durable doc with these sections. The first block is the briefing contract;
the last sections are the execution-safety + verification surface that make silent execution
possible. *(If your setup has a managed store for these, an overlay maps the lifecycle/metadata
to it. Standalone, it is just a markdown file with these sections.)*

```markdown
# <mission title>

## Status
- lifecycle state / priority / who-claimed / parent links / skip flags  (lifecycle metadata)

## Acceptance criteria
<structured, enumerable — one confirmed requirement point per `- [ ]` item. This is the
ORACLE the pre-coding test gate and the code gate check tests/code against, so keep each
item a checkable behavior, not prose. If none was given it shows `(see Context)`.>

## Context
<self-contained briefing: goal, repo paths, the locked decisions from the walkthrough.
Pretend the next agent has never seen this repo or your chat.>

## Commands
<the bash patterns, write paths, and external calls the agent is authorized to run.
Signed off in the briefing so execution needs no permission round-trips.>

## Open Assumptions
<assumptions the agent is proceeding on. The user can correct any before/at review.>

## Stop Conditions
<what to do when things go sideways: tests fail → retry N then roll back + park;
lint fails → auto-fix, else park; dependency missing → do NOT auto-install, park.>

## Parked Decisions
<APPEND-ONLY during execution. Every in-flight uncertainty the agent resolved on its
own instead of interrupting the user: what it hit, what it chose, why, how to override.
The user sweeps this at review. Empty at sign-off.>

## Verification Ledger
<filled by the agent IMMEDIATELY BEFORE marking done, via the `prove-done` skill.
Five dimensions (Reach / Behavior / Regression / Observability / Honesty), each
marked [a] run-verified, [b] compile-enforced, or [c] not verified. Any [c] item
MUST be escalated to the user via Parked Decisions before done — silent proceed is forbidden.>

## Blocked
<APPENDED when a mission is escalated to the user (e.g. an automated gate hit its
fix-cap with unresolved blocking findings). Records why + what the user must decide.
A blocked mission cannot be marked done — release or cancel it.>

## Result
<filled at done: what changed, how to verify, caveats.>

## Messages
<async notes between agents — secondary; usually empty.>
```

`Context` is required. The four execution-safety sections (`Commands` / `Open Assumptions` /
`Stop Conditions` / `Parked Decisions`) are what let the agent run without interrupting the
user — include them for any non-trivial mission. `Verification Ledger` is the verification
gate filled just before done (see `prove-done`).

## Status machine

```
open → claimed → done → passed (terminal)
                  ↓
              rejected → open (Result preserved as Attempt N)
        claimed → blocked → open      (escalated to the user; release back)
                  ↓
              (blocked CANNOT → done — must be released or cancelled)
Any non-terminal → cancelled (terminal)
```

`blocked` is the escalation landing state: an agent (or an automated gate that hit its
fix-cap) escalates unresolved blocking work to the user instead of force-completing. Done
requires `claimed`, so a blocked mission can never be silently marked done — the user
releases it (→ open, to retry with guidance) or cancels it. *(Which transitions are
mechanically enforced vs convention is environment-specific.)*

## Core workflow (single agent — the common case)

```
1. (briefing) Produce the contract — usually via the `walkthrough` skill.
2. Create the mission with full Context + safety sections.
3. Claim the mission.
4. Execute SILENTLY against the contract:
   - In-contract situations → follow the contract.
   - Out-of-contract uncertainty → take the conservative option, append to
     ## Parked Decisions, keep going. Do NOT interrupt the user.
   - Permission denied / blocked → skip + park. Tests fail → follow Stop Conditions.
5. Before done: load `prove-done` and fill the ## Verification Ledger (5 dimensions).
   Any unverified [c] items are escalated via ## Parked Decisions. No silent proceed.
6. Mark done with a Result — what changed, how to verify, caveats.
7. (review gate) User / reviewer reads diff + Parked Decisions + Verification Ledger → pass/reject.
8. Update the parent work log with the outcome.
```

Key rules:
- **Every mission has a parent work item** (required).
- **Context must be self-contained** — the next agent can't see your chat history.
- **The contract has 4 execution-safety sections + 1 verification gate.**
- **Done / release work from any session** — finish a mission claimed in a previous conversation.
- **After marking done, move on** — don't wait for review.
- **Never interrupt the user mid-execution** — park instead.

## Principles

- **Context completeness** — pretend the next agent has never seen this repo.
- **Atomic missions** — one mission = one clear deliverable.
- **Silent execution** — after sign-off, park uncertainties; don't interrupt.
- **Review gate** — the agent proposes done; the user disposes.
- **Scope discipline** — do exactly what the Context says, no bonus refactors.

## Appendix — Multi-agent parallel execution (secondary)

Missions can be claimed by multiple agent sessions in parallel. This is durable, observable,
and cross-session — but it is a bonus capability, not the primary use case.

- The primary agent acts as scheduler + fallback worker: create missions, leave some open for
  other sessions, claim and process the rest one at a time, then review all.
- **Do NOT spawn subagents to consume missions** — subagents can't participate in
  review/reject/retry or receive messages. Use subagents OR missions, not both.
- Parallelism comes from multiple agent *sessions*, not from spawning subagents.
- Recursive decomposition: a claimed mission too large can be re-split into child missions,
  then marked done with "Decomposed into …". The reviewer verifies children collectively cover
  the parent's intent before passing.

## Anti-patterns

- Designing usage around multi-agent collaboration (it rarely materializes).
- Referencing chat context in Context ("as discussed above").
- Creating missions without acceptance criteria or without the safety sections.
- Interrupting the user mid-execution instead of parking.
- Waiting for review after marking done.
- Spawning subagents to claim missions.
