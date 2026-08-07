---
name: sdd
description: Spec-Driven Development with a context-aware information hierarchy. Solves agent context overflow by organizing specs into 4 layers loaded progressively.
---

# SDD Skill: Context-Aware Spec-Driven Development

## Policy: type-based DFC (Directory-File-Content)

- Keep `spec.md` concise (≤200 lines) as the Layer-1 entrypoint.
- Enforce **coverage of information types**, not fixed file names.
- Default to **update-in-place** when requirements change.
- Keep one current truth: specs must match latest requirements and implementation.

### Non-Negotiable Rules
1. **Update-In-Place by Default**: modify existing spec files first; don't keep adding parallel docs.
2. **One Current Truth, Zero Stale Truth**: stale content must be removed, merged, or archived.
3. **Current State First**: `spec.md` must include a short current-state snapshot and keep it fresh.
4. **Freshness Check Before Done**: implementation, tests, and spec must agree.

### DFC Coverage Model
In DFC tables, define each file by `path + type + required_when + line_budget + must_read`. Recommended `type` values:
- `problem_scope` (always) · `runtime_flow` (always) · `validation_risk` (when side effects / safety risks exist) · `interface_contract` (when external contracts exist: API/IPC/events) · `data_model` (when persistence or migration exists) · `ux_interaction` (when user interaction is in scope) · `test_plan` (always)

`api.md`, `database.md`, `ui.md`, etc. are examples only, not mandatory file names.

## Core Problem This Solves

**The Context Overflow Problem**: traditional SDD creates too many spec files per feature (e.g. 130+ files, 9,000+ lines for one feature). Agents can't load all context, so specs get ignored during implementation, research gets lost, early specs become obsolete but clutter the directory. **Root cause**: a flat file structure doesn't account for agent context limits.

## Solution: 4-Layer Information Hierarchy

```
Layer 1: spec.md (200 lines)        → ALWAYS load
Layer 2: Sub-specs (150 lines each) → Load ON-DEMAND based on task
Layer 3: Research & ADRs            → Load WHEN REFERENCED
Layer 4: Archive                    → NEVER load (historical only)
```
**Context Reduction**: 9,000+ lines → 300-600 lines loaded per task.

### Layer 1: spec.md (ALWAYS load, ≤200 lines)
Single source of truth. Contents: **Current State** (10-20 lines) · **Summary** (1-2 paras) · **User Stories** (prioritized) · **Success Criteria** (3-5 measurable) · **High-Level Architecture** (bullets/diagram, no low-level detail) · **DFC Table** (file map with `type` + line budgets) · **Key Decisions** (brief or links to ADRs) · **Implementation Sequence** · **Agent Notes** (gotchas, verification hints). Why 200 lines? Keeps the overview concise and ensures agents always read it.

### Layer 2: Sub-Specs (load ON-DEMAND, ~100-200 lines each)
Component-specific implementation details. Create one per major information type/component when spec.md would otherwise exceed 200 lines, or when a component has distinct scope + testing strategy. Lowercase names matching your domain (`runtime.md`, `sync.md`, `ui.md`). Use a directory when a component needs multiple related files (`validation/spec.md`, `validation/rules.md`).

### Layer 3: Research & ADRs (load WHEN REFERENCED)
- **Research**: create `research/index.md` mapping each file → the question it answers → what it's relevant to. Reference explicitly from spec.md ("see research/field-analysis.md"); agents load a research file only when referenced.
- **ADRs**: `decisions/NNN-title.md` in ADR format (Context, Decision, Rationale, Consequences). Reference from spec.md.

### Layer 4: Archive (HISTORICAL ONLY, never loaded)
Obsolete/replaced content, kept for git history. Agents never load `archive/` during implementation.

## Agent Workflow

```
1. READ spec.md (200 lines)          → overview, user stories, component map
2. IDENTIFY task type                → API? UI? data? validation?
3. LOAD the relevant sub-spec        → e.g. api.md (150 lines)
4. IF stuck / need context           → follow research links from spec.md
5. UPDATE spec.md as work progresses → mark stories complete, update sequence
```
Typical context load: 300-600 lines (vs 9,000+ in a flat structure).

## File Naming Conventions

- **Lowercase**: `spec.md`, `api.md`, `database.md` — not `SPEC.md`/`API.md`. (Exception: `README.md`.)
- **Simple files over directories**: `api.md`, not `api/spec.md` — until a component needs multiple files.

```
feature-name/
├── spec.md                 # always this name
├── api.md / database.md / ui.md   # component names (lowercase)
├── validation/             # directory when multiple related files
│   ├── spec.md
│   └── rules.md
├── research/
│   ├── index.md            # always create an index
│   └── field-analysis.md
└── decisions/
    └── 001-config-approach.md   # ADR format
```

## Creating a New Feature Spec

1. Create the feature directory under your specs location.
2. Create `spec.md` with the Layer-1 structure above (YAML frontmatter: a version field / status /
   created / updated), with the body sections the Layer-1 definition above enumerates; fill
   in feature details.
3. Create sub-specs as needed (Layer 2: one cohesive component each, frontmatter + focused sections).
4. If research exists, `mkdir research` and create `research/index.md` (Layer 3: an annotated
   index linking each research doc).
5. Register the spec in your spec registry/index (id, name, path, version, status).

If your distribution ships spec templates, start from those instead of blank files (a local
overlay may map their location).

**Checklist**: spec.md ≤200 lines · sub-specs for major components · `research/index.md` if research exists · lowercase names · registered in the index · frontmatter version set.

## Handling Requirement Changes

**DO**: update the existing spec (spec.md or the relevant sub-spec) · use git to track what changed · move substantial obsolete content to `archive/` · bump the frontmatter version + `updated`.
**DON'T**: create versioned files (`v2-spec.md`) · keep obsolete specs alongside current ones · create "update"/"changes" files.
Use `git log --follow spec.md` to see evolution.

## Common Pitfalls

1. **spec.md growing too large** → extract details to sub-specs; keep only pointers in spec.md.
2. **Creating sub-specs too early** → keep details in spec.md until it exceeds ~150 lines.
3. **Research not linked** → create `research/index.md` and link explicitly from spec.md.
4. **Versioning files instead of using git** → one `spec.md`, use git history.
5. **Mixing layers** → spec.md = overview + pointers; sub-specs = implementation details.

## Quick Reference

```
Layer 1: spec.md (200 lines)        → ALWAYS load
Layer 2: api.md, ui.md (~150 lines) → Load on-demand
Layer 3: research/, decisions/       → Load when referenced
Layer 4: archive/                    → Never load

Workflow: read spec.md → identify task type → load relevant sub-spec → follow research links → update spec.md
Names: lowercase (api.md)  ·  Lines: spec.md ≤200, sub-specs ≤200  ·  Updates: edit existing (git history)  ·  Obsolete: → archive/
```
