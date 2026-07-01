---
name: wip
description: Track each ongoing stream of work as a durable, resumable WIP (Work In Progress) doc — a markdown file that survives session death so the next session (or agent) picks up exactly where the last left off, without needing the prior chat. Defines the frontmatter, the body sections, and the status lifecycle. Load when starting a non-trivial multi-session effort, resuming one, or when asked to "track this" / "log progress" / "what's in flight".
---

# WIP Skill: Durable, Resumable Work Tracking

## Why this exists

Agent sessions and chat context are **ephemeral** — they die, compact, and forget. A stream of
work that spans more than one sitting needs a durable memory that lives *outside* the
conversation, so the next session (yours or another agent's) resumes from a written record
rather than reconstructing state from a lost chat.

A **WIP** is that record: one durable doc per active work stream. It answers, at a glance —
*what is this, what's done, what's left, where's the code, what's related, and what's the state
right now.*

## What a WIP is

One file per active work stream (a feature, a refactor, an investigation). Its filename is a
short **`<slug>`** — a kebab-case identifier (e.g. `auth-token-refresh`), distinct from the
human-readable `title`. Two parts:

### Frontmatter (structured, for scanning/filtering)
```yaml
---
title: <human-readable one-line title>
status: <queued | active | paused | done | cancelled>
priority: <P0 | P1 | P2 | P3>          # triage/sort order; default P1
projects: [<project-key>, ...]         # array, never a bare string
stage: <one-line current-state sentence — the single most useful field>
---
```
- **`priority`** orders/triages WIPs (which to look at first); default **P1** if unsure.
- Optional fields:
  - `paused_reason` (string) — why the work is paused; set it whenever `status: paused`, and **clear it when you resume** (leave paused). Only meaningful while paused.
  - `blocker` (string) — free text naming what a *still-active* item is stuck on (used with `status: active`, not `paused`).
  - `created` / `updated` (dates).
  - In plain-file mode these are free conventions — add what helps. A managed-store overlay may accept only a fixed field set, so check what it supports before relying on one.

### Body (the working record)
```markdown
## Summary
(one substantive paragraph — at least a sentence or two: what + why now. Not a stub.)

## Done
- completed items, optionally grouped by phase

## To do
- [ ] checkbox items, so progress is computable (completed / total)

## Code locations
- path/to/file.ext:42     (point at the real lines the work touches)

## Log            (optional)
- the running decision/execution record: locked design decisions (e.g. a walkthrough's
  Decision Ledger), and high-value execution facts worth carrying across sessions.

## Related docs
- specs, other WIPs, external links
- Parent: <slug>     (when this WIP is a child of a larger effort — see "Splitting")
```

## Status lifecycle

Legal transitions (a terminal state has no exits):

```
queued  → active | cancelled
active  → paused | done | cancelled
paused  → active | done | cancelled          # paused → active is RESUME (the key edge)
done      (terminal)
cancelled (terminal)
```
- `active → done` is direct — **paused is not a required step.** `queued → paused` is **not** legal.
- Even one-sitting work still passes through `active` on its way to done (`queued → active → done`) — there is no direct `queued → done`.
- Do **not** invent values like `in-progress` / `blocked` — use `active` + a `blocker:` note for a stuck-but-active item (a free-convention field in plain-file mode; a managed store may not persist it).
- **Completing:** when you move to `done`, the *Done* section must carry real content (a completion summary) — don't mark done with an empty Done.

## Working rules

- **`stage` is the highest-value field** — keep it a fresh, one-line "current state" so anyone
  (including future-you) knows where things stand without reading the body. Update it every session.
- **One current truth** — update the existing WIP in place; don't spawn parallel `-v2` docs.
  Move substantial obsolete content out rather than letting it accumulate.
- **Checkboxes for tracked work** — use GFM `- [ ]` / `- [x]` in *To do* so completion is
  computable; don't mix checkbox items with prose bullets in the same list (the ratio becomes meaningless).
- **Point at real code** — `path:line` in *Code locations*, so the next session navigates fast.
- **It's a decision/progress log, not a dump** — summarize outcomes; link to logs instead of
  pasting full command output.
- **Resume-first** — on picking up work, read the WIP's `stage` + *To do* before anything else.

## Splitting large work (parent / child)

If a WIP passes ~300 lines or spans clearly separable efforts, split it: a **parent** WIP plus
**child** WIPs. A child links back with a `Parent: <slug>` line in *Related docs*; the parent
lists its children there too. This is a **link convention, not an enforced hierarchy** — nothing
cascades automatically; the link just lets a reader navigate.

## End of life

When a WIP reaches `done` or `cancelled`, **move it out of the active set** — e.g. into
`.workflow/wip/archive/` — with a short completion note. Terminal WIPs left in the active
directory clutter the "what's in flight" view; archiving keeps the active list scannable while
preserving the record (and its git history).

## Persistence

By default, persist each WIP as `.workflow/wip/<slug>.md` in your project (archived ones under
`.workflow/wip/archive/`). *(If a local overlay specifies a managed store — a tool that owns the
WIP's lifecycle, validation, and querying — prefer it over plain files. Such a store may differ
from these plain-file defaults in the fields it accepts, the body-section names it keys checks
off, and the validation it enforces (e.g. rejecting an unknown field or a too-short summary) —
follow its conventions where they differ.)*

## Relationship to other skills

- **Holds the Decision Ledger** — the `walkthrough` skill's written Ledger lives in the work's
  durable doc; the WIP's `## Log` section is its home.
- **Referenced by missions** — each `mission` links back to a parent work item for context (via a
  `Parent:` link); the WIP is the requirement-level record, missions are its execution sub-units.
  (A link, not an enforced parent/child hierarchy.)
- **Fed by tdd** — the `tdd` skill records high-value execution facts into the work log (`## Log`).
