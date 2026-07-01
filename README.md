# the line — composable skills for disciplined agent coding

A set of **composable agent skills** for driving non-trivial coding work through a disciplined,
gated pipeline — plus the shared red-team engine the gates run on. Each skill is a plain
`SKILL.md` (methodology, not tooling) that drops into any agent that loads markdown skills.

**Use the whole set, or just the skills you want.** Fully assembled they *are* "the line" — the orchestrator
wires the whole pipeline end-to-end. But each skill also stands alone: wrote a diff with no
walkthrough and no TDD? run `code-rt` on it. Hand-wrote some tests? run `test-rt`. Just want to
align on a plan before building? run `walkthrough`. Nothing requires the full pipeline.

The core belief: **nothing advances on the author's say-so.** Work is broken into missions, and
each stage must pass an *independent adversarial gate* before it moves on — convergence is earned
by review, not declared by the writer.

## The pipeline (fully assembled)

```
the line
|
+- walkthrough (whole requirement) -> design gate -> converge -> sign-off -> split into N missions
     |
     +- each mission  [a durable mission contract carries the chain]:
          tdd -> test gate -> coding -> code gate -> prove-done -> review
```

One requirement-level design pass — the split into missions follows the user's design
**sign-off** — then each mission runs the same per-mission chain. `N = 1` is not special-cased;
it's just one mission.

Not every station is mandatory; the per-mission *route* says which run. `coding` is the author's
own implementation step — the one stage the line does *not* delegate to a skill. The **test gate**
runs only when `tdd` is on, and the **code gate** skips pure-mechanical work (rename / format /
docs). And when `tdd` is on, the `tdd -> test gate -> coding` loop runs **per acceptance-criteria
cluster** (interleaved) — each cluster's tests are gated at their Red->Green boundary before that
cluster's code — not as one "write all tests, gate once, then code" pass.

## The pieces, by role

The skills split into a few roles. Only `the-line` needs the others; every other skill is usable
on its own.

| Role | Skill | What it does |
|---|---|---|
| **Orchestrator** | **the-line** | The thin conductor for the *fully-assembled* pipeline. Fixes the order, the two run-modes — *the line* (adaptive, the default: the agent proposes which stations run or skip per mission) and *the hard line* (pin all applicable stations on) — the skip norm, and the gate labels, then delegates every stage to the skill below. Reimplements nothing. |
| **Stations** (the work) | **walkthrough** | The design/briefing stage (requirement-level, before the split) — *propose, don't interrogate*. Produces a Decision Ledger, runs the design gate, ends in sign-off. |
| | **mission** | The **carrier**: a durable, independently-executable contract for one unit of work (see *Why split into missions*). The per-mission stations run *inside* a mission. |
| | **tdd** | Risk-aware TDD: when to enable, hard pre-handoff gates, loop guards. |
| | **prove-done** | The author's own 5-dimension end-to-end self-cert, filled just before marking a mission done. |
| **Gates** (independent red-team convergence — one engine, one rubric each) | **design-rt** | The **design gate** — is the Decision Ledger complete? (missing / over-parked / weak-N/A nodes) |
| | **test-rt** | The **test gate** — do the tests pin every requirement, *before* code exists? Runs only when `tdd` is on. |
| | **code-rt** | The **code gate** — is the diff sound? (correctness / contract / regression / security / acceptance) |
| **Substrate** (durable docs) | **wip** | Tracks *execution progress* — a resumable doc that survives session death: what's done, what's left, current state. |
| | **sdd** | Structures *the design* — a context-aware, 4-layer spec hierarchy that fits agent context limits. |
| **Engine** | *(engine/)* | **red-team-gate** — the shared convergence *mechanism* every gate runs on; `engine/red-team-gate.js` is one optional client accelerator for it. |

## How the pieces relate

The stations do the work; the **gates** (design-rt / test-rt / code-rt) make each stage's output
trustworthy; the **substrate** (wip + sdd) makes it all survive across sessions. Four
relationships are worth spelling out — they're the ones the flat list hides.

### 1. spec vs. wip — structure vs. progress

The two durable docs answer different questions:

- **`sdd` (spec)** holds the **structural truth** — *what* we're building and how it's shaped:
  architecture, contracts, data model, success criteria. It's the design, layered so an agent
  loads only what it needs — a ~200-line always-on entrypoint plus on-demand sub-specs
  (~100-200 lines each), so a task loads roughly 300-600 lines total, not the whole spec.
- **`wip`** holds the **progress truth** — *where the work stands right now*: what's done, what's
  left, the current one-line stage, and a running decision log. Built to be picked up cold by the
  next session with no prior chat.

A spec that never changes and a wip that's all history are both fine — they're deliberately
separate. One is the blueprint; the other is the build log.

### 2. How the substrate feeds the pipeline

The stations don't hold their own state — they read and write the substrate:

- **walkthrough -> wip.** The walkthrough's Decision Ledger is *persisted in the wip's `## Log`* —
  its durable home, so the design survives the session that produced it. If the design is
  substantial enough to be a blueprint, it also gets structured as an **sdd spec**.
- **wip -> missions.** The wip is the *requirement-level* record; each **mission** links back to
  it (a `Parent:` reference). Missions are its execution sub-units.
- **tdd -> the work log.** `tdd` records high-value execution facts into the work stream's log —
  the wip's `## Log` when a wip is that stream's record.

So one work stream reads top-to-bottom: **wip** (progress + Ledger) -> **spec** (structure, when
the design warrants one) -> **missions** (each executing its contract's locked decisions) -> gates
-> back into the wip.

### 3. The gates: one engine, a rubric each

`design-rt`, `test-rt`, and `code-rt` aren't three hard-coded steps — they're **instantiations of
one convergence engine**, each passing its own rubric (`framingLines` / `dimensions` /
`findingsSchema`) against a different artifact. The engine is rubric-agnostic; a new kind of gate
is just a new rubric, not new machinery.

The gates that exist today:

| Gate | Skill | Artifact under audit | Hunts for |
|---|---|---|---|
| **design gate** | `design-rt` | the Decision Ledger | missing / over-parked / weak-N/A decision nodes |
| **test gate** | `test-rt` | the tests (pre-code) | tests that don't truly pin a requirement |
| **code gate** | `code-rt` | the diff | correctness / contract / regression / security / acceptance defects |

The mechanism is identical for all three:

- an **independent** red team hunts holes (a fresh agent, not the author);
- **asymmetric escalation** — a *fail* is cheap to trust (one real hole -> send back, cost: one
  pass), a *clean pass* is the dangerous claim, so it's double-checked by a **second, independent**
  red team;
- **"converged" requires two consecutive clean passes** — never two simultaneous ones — and the
  red team **never blesses "done"**; only the human signs off.

The engine returns `{ converged, openNodes, checks, note? }` (plus `error?` on a mis-run); a
caller loops until `converged`. The shared invariants (the three above, plus no-downgrade,
scope-in-as-a-floor, and verify-against-source) live in `engine/red-team-gate.js`'s header, so
every gate inherits them; each gate skill carries only its rubric. `design-rt` uses the engine's
built-in default preset; `test-rt` and `code-rt` override it.

### 4. Why split into missions

Splitting a converged design into N missions isn't bureaucracy. A **mission** is an
independently-executable, atomically-claimable unit — a self-contained contract (its Context and
locked decisions, acceptance criteria, the four execution-safety sections — Commands / Open
Assumptions / Stop Conditions / Parked Decisions — and a Verification Ledger) that survives session
death. Two payoffs, in priority order:

- **Durability + review (the everyday reason).** Even run serially by one agent, each mission is a
  reviewable checkpoint you can pass/reject and resume cold in a later session — persistent state
  that ephemeral sub-agents can't give you. This is the primary reason a mission exists.
- **Parallel fan-out (a bonus).** Because missions are independent and atomically claimable, they
  *can* be handed to multiple agents/sessions at once — the throughput motivation they grew out of
  (large decomposable work: refactors, audits, multi-file features). In practice that rarely
  materializes, so the `mission` skill treats single-agent use as primary and explicitly warns
  against *designing* your workflow around parallelism.

## Install

### With `npx skills` (recommended)

These skills follow the [open `skills` CLI](https://github.com/vercel-labs/skills) layout, so the
`skills` CLI installs them into whatever agent you use (Claude Code, Cursor, Codex, …):

```bash
# install the whole family into the current project
npx skills add wo52616111/skills

# or a single skill
npx skills add wo52616111/skills --skill code-rt

# user-level instead of project-level
npx skills add wo52616111/skills -g

# target a specific agent
npx skills add wo52616111/skills -a claude-code
```

Preview a repo's skills before installing with `npx skills add wo52616111/skills --list`.

The CLI auto-detects your agent and drops each `SKILL.md` into its skill directory. Manage them
with `npx skills list` / `update` / `remove`.

### Manual

- **Skills**: copy the directories under `skills/` into your agent's skill directory (a
  project-level or user-level `skills/` folder your agent loads). Copy just the ones you want —
  they work standalone.
- **Engine**: put `engine/red-team-gate.js` where your client discovers workflow scripts (consult
  your client's docs for the exact directory). The gate is client-agnostic — with no workflow
  runner, run the same red-team passes via your client's sub-agent primitive, or as sequential
  fresh-context passes.

## Using it

Once installed, invoke a skill by naming what you want:

- **`run the line`** (or `the line` / `follow the line`) — the full pipeline, adaptive mode: the
  agent proposes a per-mission route.
- **`the hard line`** — the full pipeline, forced mode: pin all applicable stations on.
- **`walk me through this`** (or `walk it through`) — just the design/briefing stage.
- **`code gate` / `test gate`** — run just that gate on a diff or a test file you already have.

`the-line` also loads **automatically** for non-trivial work (multi-file / multi-repo, a behavior
change, or genuinely new logic) even without the phrase — so you mostly get it by default; the
phrases are how you explicitly *ask* for it (or a single skill).

## Notes for adopters

- These skills are **methodology**. Where one refers to a "durable doc", a "mission contract", or a
  spec, it means *a file you keep*. Only `wip` fixes a default path (`.workflow/wip/`); the others
  don't, so a parallel layout like `.workflow/specs/` and `.workflow/missions/` is just a sensible
  convention, not a skill requirement. If your setup has a managed tool for these, wire the skill
  to it; otherwise plain files work.
- Each `SKILL.md` is self-contained and adoptable alone — the stations and gates reference each
  other, so the full set is most useful together, but any one is a valid drop-in.
- The gates assume your agent can spawn an **independent** sub-agent (a fresh context, not the
  author). Without that primitive, run the confirming pass as a separate, clean-context turn.
