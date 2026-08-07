// One adapter for a client-agnostic red-team convergence gate. Ownership split: the
// per-phase SKILLS (design-rt / bdd-rt / test-rt / code-rt / accept-rt) own their RUBRICS; THIS FILE's header
// owns the SHARED GATE INVARIANTS (see the block below) — the single canonical home.
// The gate is NOT bound to any one client: others run the same red-team passes via their
// own subagent primitive, or fall back to sequential fresh-context passes. This file accelerates
// it via the client's Workflow tool.
//
// GENERIC ENGINE: the control flow below (fail-fast + signed clean confirmation, dedupe, return shape) is
// INSTANTIATION-AGNOSTIC. The three per-instantiation parts are ARGS, with a built-in generic
// DESIGN preset as their defaults (so a design-gate caller can invoke with just {artifact, context}):
//   - framingLines   : the cognitive task (what KIND of holes to hunt, over what artifact)
//   - findingsSchema : the structured-output shape (design: missing/over-parked/weak-na;
//                      code/test/accept instantiations REPLACE this with their own fields)
//   - dimensions     : the rubric dimension list
// A BDD, code, test, or acceptance instantiation calls this same engine with its own
// framingLines + findingsSchema + dimensions. The skills own those rubrics; the shared
// invariants are canonical HERE (the SHARED GATE INVARIANTS block below).
//
// INSTALL: public adopters may copy the released engine artifact into the workflow directory
// used by their client. Private integrations may instead symlink their own canonical source.
//
// COST RULE: a FAIL is cheap to trust (one real BLOCKING hole = not done → send back). A signed
// `single` route accepts one fresh blocking-clean pass. A signed `double` route runs a 2nd fresh,
// SEQUENTIAL confirmation; both clean → converged. `double` remains the backward-compatible default.
//
// TERMINOLOGY: this referee role is the "red team" — it red-teams the artifact and NEVER
// blesses completion. Write "red team" in full, not the "RT" abbreviation.
//
// SHARED GATE INVARIANTS (canonical — every gate that runs this engine inherits these; the
// design-rt / bdd-rt / test-rt / code-rt / accept-rt skills reference here instead of restating them):
//   - SIGNED CONFIRMATION: `single` = one fresh blocking-clean pass; `double` = two fresh blocking-clean
//     passes in sequence. Same-artifact passes are never parallel.
//   - NEVER-BLESS: the red team only red-teams; it never declares "done" — only the human signs off.
//   - NO-DOWNGRADE: every finding is OPEN by default. It leaves OPEN only by being genuinely
//     folded/fixed, or by the USER ruling it out of scope — never by the (biased) calling agent
//     relabelling it "narrow / obvious / not first-order / cosmetic". A round with ANY BLOCKING
//     finding is not clean; there is no "narrowness / diminishing-returns -> declare converged"
//     shortcut. Findings the RED TEAM itself born-labels advisory (blocking:false / kind:'advisory')
//     are reported but never gate — that is tier semantics, not a downgrade.
//   - SCOPE-IN IS A FLOOR, NOT A CEILING: the caller may EXTEND the rubric, never shrink it. When the
//     surface is too big for one red team, split into LANES by dimension/subsystem and run one per
//     lane (coverage-preserving) — never tell a red team "skip area X" (coverage-shrinking = the leak).
//     Hand the resolved set as REFERENCE to dedupe against, not a demand to re-derive; dedup is
//     POST-filtering done in the open (drop a dup by citing the entry), never pre-filtering.
//   - VERIFY-AGAINST-SOURCE: any claim about how EXISTING code behaves (a fallback, a pipeline/stage
//     order, a wire/error shape, a data-structure invariant) must be checked against the real source
//     when the red team can read it — assumed-behavior folds are a top recurring miss.
//   - CAPABILITY BEFORE DIVERSITY: every pass runs in a fresh context/session and the reviewer must
//     have the tools and reasoning capability the rubric requires. A different model family or client
//     can add useful diversity only when it is comparably capable (or better), reliable, and available;
//     it is optional, never a convergence requirement. Never downgrade reviewer quality merely to make
//     the passes heterogeneous. Same-model fresh-context passes are a normal fully-supported path.
//     An off-engine runner is a plain agent: reproduce the rubric (framingLines + dimensions +
//     findingsSchema) verbatim because none of these invariants reach it automatically.
export const meta = {
  name: 'red-team-gate',
  protocolVersion: 1,
  description: 'Arg-driven adversarial convergence gate. Fresh, sufficiently capable red team(s) hunt holes against a per-instantiation rubric. A FAIL returns after one pass. confirmation=single accepts one clean pass; confirmation=double requires a second fresh sequential clean pass and remains the default. Advisory findings are reported but never gate.',
  phases: [
    { title: 'Red-team', detail: 'first independent red team hunts holes' },
    { title: 'Confirm', detail: 'on a clean first pass, a 2nd independent red team confirms' },
  ],
}

// Must be declared AFTER `meta`: the Workflow host requires `export const meta` to be the
// FIRST statement in the script and rejects any non-literal value inside it.
const PROTOCOL_VERSION = 1

// === per-instantiation args (all optional except the artifact) ===
// artifact | ledger : string  — the thing under audit (design: Decision Ledger; code: diff+mission
//                               contract; test: the test cases). `ledger` kept as backward-compat alias.
// context           : string  — supporting material (spec / diff / decisions so far / test output)
// dimensions?       : string[] — rubric dimensions (default = design dimensions)
// framingLines?     : string[] — the cognitive task: what KINDS of holes to hunt (default = design)
// findingsSchema?   : object   — JSON schema for findings (default = design: missing/over-parked/weak-na)
// identityFields?   : string[] — stable top-level fields that identify one logical finding;
//                               REQUIRED with a custom findingsSchema
// weightPasses?     : [string, string] — the two alternating "weight these dims" hints (default = design)
// artifactLabel?    : string   — header for the artifact block (default = 'DECISION LEDGER (the artifact under audit)')
// agentType?        : string   — 'general-purpose' so red teams can Read/Grep real source (the verify-against-code rule)
// protocolVersion?  : number   — fail closed when a caller requires a different gate protocol
// confirmation?     : 'single' | 'double' — clean-pass requirement; defaults to 'double'
// Default to a CODE-CAPABLE agent (Read/Grep/run the repo) so the verify-against-source invariant
// holds for a bare {artifact, context} call; pass an explicit text-only agentType to opt out.
if (args != null && (typeof args !== 'object' || Array.isArray(args))) {
  return {
    converged: false,
    error: 'red-team-gate args must be an object',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const SUPPORTED_ARG_KEYS = new Set([
  'artifact', 'ledger', 'context', 'dimensions', 'framingLines', 'findingsSchema',
  'identityFields', 'weightPasses', 'artifactLabel', 'agentType', 'protocolVersion', 'confirmation',
])
const unknownArg = Object.keys(args || {}).find(key => !SUPPORTED_ARG_KEYS.has(key))
if (unknownArg) {
  return {
    converged: false,
    error: `unsupported red-team-gate argument: ${unknownArg}`,
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
if (args && Object.prototype.hasOwnProperty.call(args, 'artifact')
  && Object.prototype.hasOwnProperty.call(args, 'ledger')) {
  return {
    converged: false,
    error: 'provide artifact or the legacy ledger alias, not both',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const RAW_ARTIFACT = args && (args.artifact != null ? args.artifact : args.ledger)
const RAW_CONTEXT = args && args.context
if (typeof RAW_ARTIFACT !== 'string' || (RAW_CONTEXT != null && typeof RAW_CONTEXT !== 'string')) {
  return {
    converged: false,
    error: 'artifact must be a string and context, when provided, must be a string',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
if ((args?.agentType != null && (typeof args.agentType !== 'string' || !args.agentType.trim()))
  || (args?.artifactLabel != null && (typeof args.artifactLabel !== 'string' || !args.artifactLabel.trim()))) {
  return {
    converged: false,
    error: 'agentType and artifactLabel, when provided, must be non-empty strings',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const AGENT_TYPE = (args && args.agentType) || 'general-purpose'
const ARTIFACT = RAW_ARTIFACT
const CONTEXT = RAW_CONTEXT || ''
const ARTIFACT_LABEL = (args && args.artifactLabel) || 'DECISION LEDGER (the artifact under audit)'
const REQUESTED_PROTOCOL_VERSION = args && args.protocolVersion
const CONFIRMATION = args && Object.prototype.hasOwnProperty.call(args, 'confirmation')
  ? args.confirmation
  : 'double'

if (REQUESTED_PROTOCOL_VERSION != null && REQUESTED_PROTOCOL_VERSION !== PROTOCOL_VERSION) {
  return {
    converged: false,
    error: `red-team-gate protocol mismatch: caller requires ${REQUESTED_PROTOCOL_VERSION}, engine provides ${PROTOCOL_VERSION}`,
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}

if (!['single', 'double'].includes(CONFIRMATION)) {
  return {
    converged: false,
    error: 'confirmation must be single or double — refusing an ambiguous gate',
    openNodes: [],
    checks: 0,
    confirmation: CONFIRMATION,
    protocolVersion: PROTOCOL_VERSION,
  }
}

// Rubric-shaping args are security/reliability boundaries. Require explicit string arrays so a
// scalar/object cannot silently replace the real rubric and produce a false convergence.
function normalizeLines(v, splitDims) {
  if (v == null) return null
  if (!Array.isArray(v)) return null
  const lines = Array.from(v)
  if (lines.some(x => typeof x !== 'string')) return null
  if (splitDims) return lines.map(s => s.trim()).filter(Boolean)
  return lines.some(s => s.trim()) ? lines : null
}

// ===== RUBRIC-SCOPE INVARIANT (read before adding any default below) =====
// The baked defaults below are a GENERIC, publishable DESIGN preset ONLY. This engine's
// mechanism is rubric-agnostic — every rubric is just args. NEVER add a PRIVATE or
// consumer-specific rubric (or any denylist / secret / proprietary content) as a default
// here: private rubrics are ALWAYS passed as args by their caller, so this shareable engine
// never carries private content. Keeping only a generic preset baked is what lets the engine
// be distributed as pure mechanism.
// =========================================================================

const CUSTOM_DIMENSIONS = normalizeLines(args && args.dimensions, true)
if (args && Object.prototype.hasOwnProperty.call(args, 'dimensions') && !CUSTOM_DIMENSIONS?.length) {
  return {
    converged: false,
    error: 'custom dimensions were provided but empty — refusing a coverage-free gate',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const DIMENSIONS = CUSTOM_DIMENSIONS || [
  'engine / core logic',
  'external contract (API / IPC / event / wire format / cross-repo schema)',
  'data model & migration',
  'failure modes & edge cases',
  'security / abuse / auth / rate-limiting',
  'config / schema surface',
  'UX (existence & behavior, not pixels)',
  'telemetry / observability',
  'ops / infra / hosting / cost',
]

// Default framing = design-walkthrough completeness (MISSING / OVER-PARKED / WEAK-N/A).
const DEFAULT_FRAMING = [
  'You are an adversarial completeness RED TEAM for a design walkthrough. Your ONLY job is to find HOLES.',
  'You do NOT approve, bless, or judge "is it done" — you only surface nodes that should be open but are not.',
  'A red team that finds fewer real holes is tolerable; one that wrongly implies "looks complete" is a failure.',
  'MATERIALITY BAR — a finding BLOCKS only when it names: (1) a concrete failure/decision gap, (2) the affected requirement/contract/user/safety behavior, (3) artifact/source/runtime evidence, and (4) the real cost of leaving it unresolved. Without all four it is advisory or omitted.',
  'Polish, symmetry, wording, naming, optional robustness, cheap-to-recover edges, and unsigned extra scope never block. When impact is uncertain, use blocking:false.',
  '',
  'Hunt three kinds of holes in the artifact below:',
  '1. MISSING — a decision node that clears the ASK-gate (Fork / Ripple / Cost / Stake) but is absent.',
  '2. OVER-PARKED — a node parked with a default that is actually a genuine fork the user should decide.',
  '3. WEAK-N/A — a dimension marked "N/A" whose justification does not actually hold for this work.',
  'Also scan any pre-existing Open Questions / TBD / deferred markers in the spec — a pre-existing open item the new work touches is still a hole (classify as MISSING).',
]
const CUSTOM_FRAMING = normalizeLines(args && args.framingLines, false)
if (args && Object.prototype.hasOwnProperty.call(args, 'framingLines') && !CUSTOM_FRAMING?.some(line => line.trim())) {
  return {
    converged: false,
    error: 'custom framingLines were provided but empty — refusing a rubric-free gate',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const FRAMING_LINES = CUSTOM_FRAMING || DEFAULT_FRAMING

const DEFAULT_WEIGHT_PASSES = [
  'This pass: weight CONTRACT / DATA-MODEL / FAILURE-MODE / SECURITY dimensions (most under-walked).',
  'This pass: weight OPS / INFRA / COST / TELEMETRY / UX-existence dimensions (most often forgotten entirely).',
]
// The default weight hints speak the DESIGN preset's dimension vocabulary; steering a
// custom-rubric red team toward dimensions it doesn't have degrades the confirm pass.
// Custom dimensions without custom weightPasses → no weight hint at all.
const HAS_CUSTOM_WEIGHT_PASSES = args && Object.prototype.hasOwnProperty.call(args, 'weightPasses')
const CUSTOM_WEIGHT_PASSES = normalizeLines(args && args.weightPasses, false)
if (HAS_CUSTOM_WEIGHT_PASSES
  && (CUSTOM_WEIGHT_PASSES?.length !== 2 || CUSTOM_WEIGHT_PASSES.some(line => !line.trim()))) {
  return {
    converged: false,
    error: 'weightPasses must contain exactly two non-empty strings',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
const WEIGHT_PASSES = CUSTOM_WEIGHT_PASSES
  || ((args && args.dimensions) ? [] : DEFAULT_WEIGHT_PASSES)

const DEFAULT_FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      description: 'Holes found. Empty = genuinely no hole this pass.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dimension', 'node', 'type', 'why', 'suggested_triage', 'severity', 'blocking'],
        properties: {
          dimension: { type: 'string' },
          node: { type: 'string', description: 'short name of the missing / mis-triaged decision node' },
          type: { type: 'string', enum: ['missing', 'over-parked', 'weak-na'] },
          why: { type: 'string', description: 'concretely why it clears the ASK-gate (fork / ripple / cost / stake)' },
          suggested_triage: { type: 'string', enum: ['ASK', 'PARK', 'PROTOTYPE'] },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          blocking: { type: 'boolean', description: 'true ONLY when the materiality bar is met (concrete cost of leaving this undecided); false = recorded, never gates' },
        },
      },
    },
  },
}

const SUPPORTED_SCHEMA_KEYS = new Set([
  'type', 'description', 'additionalProperties', 'required', 'properties', 'items',
  'enum', 'const', 'allOf', 'anyOf', 'oneOf', 'if', 'then', 'else',
])

function isDenseArray(value) {
  return Array.isArray(value)
    && Array.from({ length: value.length }, (_, index) => Object.prototype.hasOwnProperty.call(value, index)).every(Boolean)
}

function jsonEqual(left, right) {
  if (left === right) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return isDenseArray(left) && isDenseArray(right) && left.length === right.length
      && Array.from(left).every((value, index) => jsonEqual(value, right[index]))
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort()
    const rightKeys = Object.keys(right).sort()
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index] && jsonEqual(left[key], right[key]))
  }
  return false
}

function hasValidSchemaShape(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false
  if (Object.keys(schema).some(key => !SUPPORTED_SCHEMA_KEYS.has(key))) return false
  if (schema.type != null && !['array', 'object', 'string', 'boolean', 'integer', 'number', 'null'].includes(schema.type)) return false
  if (schema.description != null && typeof schema.description !== 'string') return false
  if (schema.additionalProperties != null && typeof schema.additionalProperties !== 'boolean') return false
  if (schema.required != null) {
    if (!isDenseArray(schema.required) || Array.from(schema.required).some(key => typeof key !== 'string')) return false
    if (new Set(schema.required).size !== schema.required.length) return false
  }
  if (schema.enum != null && (!isDenseArray(schema.enum) || schema.enum.length === 0)) return false
  if (schema.properties != null) {
    if (typeof schema.properties !== 'object' || Array.isArray(schema.properties)) return false
    if (Object.values(schema.properties).some(property => !hasValidSchemaShape(property))) return false
  }
  if (schema.additionalProperties === false && schema.required?.some(
    key => !Object.prototype.hasOwnProperty.call(schema.properties || {}, key)
  )) return false
  if (schema.items != null && !hasValidSchemaShape(schema.items)) return false
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    if (schema[keyword] != null
      && (!isDenseArray(schema[keyword]) || schema[keyword].length === 0
        || Array.from(schema[keyword]).some(part => !hasValidSchemaShape(part)))) {
      return false
    }
  }
  for (const keyword of ['if', 'then', 'else']) {
    if (schema[keyword] != null && !hasValidSchemaShape(schema[keyword])) return false
  }
  return true
}

function representativeValues(schema) {
  if (Object.prototype.hasOwnProperty.call(schema, 'const')) return [schema.const]
  if (schema.enum) return Array.from(schema.enum)
  if (schema.type === 'object') {
    return Array.from(schema.required || []).reduce((objects, field) => {
      const values = representativeValues(schema.properties?.[field] || {})
      return objects.flatMap(object => values.map(value => ({ ...object, [field]: value })))
    }, [{}]).filter(value => matchesSchema(value, schema))
  }
  const base = {
    string: ['value'],
    boolean: [true, false],
    integer: [0],
    number: [0],
    null: [null],
    array: [[]],
  }[schema.type] || ['value', true, false, 0, null, {}, []]
  const branches = ['allOf', 'anyOf', 'oneOf']
    .flatMap(keyword => Array.from(schema[keyword] || []))
    .concat(schema.then || [], schema.else || [])
  return base.concat(branches.flatMap(representativeValues))
    .filter((value, index, values) => values.findIndex(candidate => jsonEqual(candidate, value)) === index)
    .filter(value => matchesSchema(value, schema))
}

function canRepresentBlocking(itemSchema, blocking) {
  const required = Array.from(itemSchema.required || [])
  const candidates = required.map(field => {
    if (field === 'blocking') return [blocking]
    return representativeValues(itemSchema.properties?.[field] || {})
  })
  function search(index, finding) {
    if (index === required.length) return matchesSchema(finding, itemSchema)
    const field = required[index]
    return candidates[index].some(value => search(index + 1, { ...finding, [field]: value }))
  }
  return search(0, {})
}

const CUSTOM_FINDINGS_SCHEMA = args && args.findingsSchema
const CUSTOM_IDENTITY_FIELDS = normalizeLines(args && args.identityFields, true)
const HAS_CUSTOM_SCHEMA = args && Object.prototype.hasOwnProperty.call(args, 'findingsSchema')
const HAS_CUSTOM_IDENTITY = args && Object.prototype.hasOwnProperty.call(args, 'identityFields')
if (HAS_CUSTOM_IDENTITY && !CUSTOM_IDENTITY_FIELDS?.length) {
  return {
    converged: false,
    error: 'identityFields must be a non-empty string array',
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}
if (HAS_CUSTOM_SCHEMA) {
  const findings = CUSTOM_FINDINGS_SCHEMA?.properties?.findings
  const item = findings?.items
  const valid = hasValidSchemaShape(CUSTOM_FINDINGS_SCHEMA)
    && CUSTOM_FINDINGS_SCHEMA.type === 'object'
    && Array.isArray(CUSTOM_FINDINGS_SCHEMA.required)
    && CUSTOM_FINDINGS_SCHEMA.required.includes('findings')
    && findings?.type === 'array'
    && item?.type === 'object'
    && Array.isArray(item.required)
    && item.required.includes('blocking')
    && item.properties?.blocking?.type === 'boolean'
    && matchesSchema(true, item.properties.blocking)
    && matchesSchema(false, item.properties.blocking)
    && canRepresentBlocking(item, true)
    && canRepresentBlocking(item, false)
  if (!valid) {
    return {
      converged: false,
      error: 'custom findingsSchema does not implement the required findings[] + boolean blocking protocol',
      openNodes: [],
      checks: 0,
      protocolVersion: PROTOCOL_VERSION,
    }
  }
  if (!CUSTOM_IDENTITY_FIELDS?.length) {
    return {
      converged: false,
      error: 'custom findingsSchema requires non-empty identityFields for stable deduplication',
      openNodes: [],
      checks: 0,
      protocolVersion: PROTOCOL_VERSION,
    }
  }
}
const FINDINGS_SCHEMA = CUSTOM_FINDINGS_SCHEMA || DEFAULT_FINDINGS_SCHEMA
const IDENTITY_FIELDS = CUSTOM_IDENTITY_FIELDS || ['dimension', 'node']
const FINDING_ITEM_SCHEMA = FINDINGS_SCHEMA.properties.findings.items
const invalidIdentityField = IDENTITY_FIELDS.find(
  field => !Object.prototype.hasOwnProperty.call(FINDING_ITEM_SCHEMA.properties || {}, field)
    || !FINDING_ITEM_SCHEMA.required?.includes(field)
)
if (invalidIdentityField) {
  return {
    converged: false,
    error: `identity field ${invalidIdentityField} must exist and be required in the finding schema`,
    openNodes: [],
    checks: 0,
    protocolVersion: PROTOCOL_VERSION,
  }
}

if (!ARTIFACT.trim()) {
  return { converged: false, error: 'no artifact/ledger provided — cannot red-team', openNodes: [], checks: 0, protocolVersion: PROTOCOL_VERSION }
}

function redTeamPrompt(i) {
  return [
    ...FRAMING_LINES,
    '',
    'Check EVERY dimension below — for each, is there real coverage, a justified N/A, or a hole?',
    DIMENSIONS.map((d, k) => `  ${k + 1}. ${d}`).join('\n'),
    '',
    WEIGHT_PASSES.length ? WEIGHT_PASSES[i % WEIGHT_PASSES.length] : '',
    '',
    'Any fold/claim about how EXISTING code behaves (a fallback, a pipeline/stage order, an error or wire shape, a data-structure invariant) must be VERIFIED against the real source if you can read it — never assume it; assumed-behavior folds are a top recurring miss.',
    '',
    '=== CONTEXT (spec / diff / decisions so far) ===',
    CONTEXT || '(none provided)',
    '',
    `=== ${ARTIFACT_LABEL} ===`,
    ARTIFACT,
    '',
    'Return findings via structured output. Be specific: name the exact location/node, not a vague area.',
  ].join('\n')
}

function findingKey(f) {
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(item => canonicalize(item))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map(key => [key, canonicalize(value[key])])
      )
    }
    return typeof value === 'string' ? value.trim() : value
  }
  const identity = Object.fromEntries(
    IDENTITY_FIELDS.map(field => [field, f[field]])
  )
  return JSON.stringify(canonicalize(identity))
}

function dedupe(findings) {
  const seen = new Set()
  const out = []
  for (const f of findings || []) {
    const key = findingKey(f)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

function matchesSchema(value, schema) {
  if (!schema || typeof schema !== 'object') return true
  if (Array.isArray(value) && !isDenseArray(value)) return false
  if (Object.prototype.hasOwnProperty.call(schema, 'const') && !jsonEqual(value, schema.const)) return false
  if (schema.enum && !schema.enum.some(candidate => jsonEqual(candidate, value))) return false

  if (schema.type) {
    const typeMatches = {
      array: Array.isArray(value),
      object: value !== null && typeof value === 'object' && !Array.isArray(value),
      string: typeof value === 'string',
      boolean: typeof value === 'boolean',
      integer: Number.isInteger(value),
      number: typeof value === 'number' && Number.isFinite(value),
      null: value === null,
    }[schema.type]
    if (!typeMatches) return false
  }

  if (schema.allOf && !Array.from(schema.allOf).every(part => matchesSchema(value, part))) return false
  if (schema.anyOf && !Array.from(schema.anyOf).some(part => matchesSchema(value, part))) return false
  if (schema.oneOf && Array.from(schema.oneOf).filter(part => matchesSchema(value, part)).length !== 1) return false
  if (schema.if) {
    const branch = matchesSchema(value, schema.if) ? schema.then : schema.else
    if (branch && !matchesSchema(value, branch)) return false
  }

  if (Array.isArray(value) && schema.items) {
    return Array.from(value).every(item => matchesSchema(item, schema.items))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)
    && (schema.properties || schema.required || schema.additionalProperties !== undefined)) {
    const properties = schema.properties || {}
    if ((schema.required || []).some(key => !Object.prototype.hasOwnProperty.call(value, key))) {
      return false
    }
    if (schema.additionalProperties === false
      && Object.keys(value).some(key => !Object.prototype.hasOwnProperty.call(properties, key))) {
      return false
    }
    return Object.entries(properties).every(
      ([key, propertySchema]) => !Object.prototype.hasOwnProperty.call(value, key)
        || matchesSchema(value[key], propertySchema)
    )
  }
  return true
}

// Convergence counts ONLY blocking findings. Advisory findings are reported back but
// NEVER flip converged; each calling skill owns whether to fix, surface, or defer them.
// Gating on advisory-only rounds makes the convergence loop meaningless.
function splitBlocking(findings) {
  const itemSchema = FINDINGS_SCHEMA.properties.findings.items
  const invalid = findings.filter(f => !matchesSchema(f, itemSchema)
    || IDENTITY_FIELDS.some(field => {
      const value = f[field]
      return value == null || (typeof value === 'string' && !value.trim())
    }))
  const blocking = dedupe(findings.filter(f => f.blocking === true))
  const blockingKeys = new Set(blocking.map(findingKey))
  const advisory = dedupe(findings.filter(
    f => f.blocking === false && !blockingKeys.has(findingKey(f))
  ))
  return { blocking, advisory, invalid }
}

function mergeAdvisories(advisories, blocking) {
  const blockingKeys = new Set(blocking.map(findingKey))
  return dedupe(advisories).filter(f => !blockingKeys.has(findingKey(f)))
}

// --- Pass 1: a single red team. A FAIL is trustworthy on its own. ---
phase('Red-team')
const first = await agent(redTeamPrompt(0), { label: 'red-team#1', phase: 'Red-team', schema: FINDINGS_SCHEMA, agentType: AGENT_TYPE })
if (!first) {
  return { converged: false, error: 'red-team#1 did not run — re-run the gate', openNodes: [], checks: 0, protocolVersion: PROTOCOL_VERSION }
}
if (!Array.isArray(first.findings)) {
  return { converged: false, error: 'red-team#1 returned no findings array — protocol-invalid; re-run', openNodes: [], checks: 1, protocolVersion: PROTOCOL_VERSION }
}
if (!matchesSchema(first, FINDINGS_SCHEMA)) {
  return { converged: false, error: 'red-team#1 response violates the declared findings schema — protocol-invalid; re-run', openNodes: [], checks: 1, protocolVersion: PROTOCOL_VERSION }
}
const firstSplit = splitBlocking(first.findings || [])
if (firstSplit.invalid.length > 0) {
  return {
    converged: false,
    error: 'red-team#1 returned findings that violate the declared schema or identity fields — protocol-invalid; re-run',
    openNodes: [],
    checks: 1,
    protocolVersion: PROTOCOL_VERSION,
  }
}
if (firstSplit.blocking.length > 0) {
  log(`pass 1 found ${firstSplit.blocking.length} blocking hole(s) (+${firstSplit.advisory.length} advisory) → NOT converged (cost: 1 red team)`)
  return {
    converged: false,
    openNodes: firstSplit.blocking,
    advisoryNodes: firstSplit.advisory,
    checks: 1,
    confirmation: CONFIRMATION,
    protocolVersion: PROTOCOL_VERSION,
    note: 'Blocking holes found by the first red team. Fold them into the artifact as OPEN and keep walking. Advisory findings never gate — return them to the calling skill for its own handling. A FAIL needs only 1 check — do NOT summon the user.',
  }
}

if (CONFIRMATION === 'single') {
  log('confirmation pass 1/1 blocking-clean → CONVERGED (cost: 1 red team)')
  return {
    converged: true,
    openNodes: [],
    advisoryNodes: firstSplit.advisory,
    checks: 1,
    confirmation: CONFIRMATION,
    protocolVersion: PROTOCOL_VERSION,
    note: 'CONVERGED: the signed single-confirmation route received one fresh blocking-clean pass. Continue to the next station that is ON; do not activate skipped stations or self-declare user sign-off.',
  }
}

// --- Signed double confirmation: pass 1 was clean → require a fresh SEQUENTIAL 2nd pass. ---
phase('Confirm')
const second = await agent(redTeamPrompt(1), { label: 'red-team#2 (confirm)', phase: 'Confirm', schema: FINDINGS_SCHEMA, agentType: AGENT_TYPE })
if (!second) {
  return { converged: false, error: 'first pass was clean but the confirm red team did not run — unconfirmed; re-run', openNodes: [], advisoryNodes: firstSplit.advisory, checks: 1, protocolVersion: PROTOCOL_VERSION }
}
if (!Array.isArray(second.findings)) {
  return { converged: false, error: 'red-team#2 returned no findings array — protocol-invalid; re-run', openNodes: [], advisoryNodes: firstSplit.advisory, checks: 2, protocolVersion: PROTOCOL_VERSION }
}
if (!matchesSchema(second, FINDINGS_SCHEMA)) {
  return { converged: false, error: 'red-team#2 response violates the declared findings schema — protocol-invalid; re-run', openNodes: [], advisoryNodes: firstSplit.advisory, checks: 2, protocolVersion: PROTOCOL_VERSION }
}
const secondSplit = splitBlocking(second.findings || [])
if (secondSplit.invalid.length > 0) {
  return {
    converged: false,
    error: 'red-team#2 returned findings that violate the declared schema or identity fields — protocol-invalid; re-run',
    openNodes: [],
    advisoryNodes: firstSplit.advisory,
    checks: 2,
    protocolVersion: PROTOCOL_VERSION,
  }
}
if (secondSplit.blocking.length > 0) {
  log(`pass 1 clean, but the independent confirm pass found ${secondSplit.blocking.length} blocking hole(s) (+${secondSplit.advisory.length} advisory) → NOT converged (cost: 2)`)
  return {
    converged: false,
    openNodes: secondSplit.blocking,
    advisoryNodes: mergeAdvisories(
      firstSplit.advisory.concat(secondSplit.advisory),
      secondSplit.blocking
    ),
    checks: 2,
    confirmation: CONFIRMATION,
    protocolVersion: PROTOCOL_VERSION,
    note: 'First pass was clean but the independent confirm pass found blocking holes. Fold as OPEN and keep walking. Advisory findings never gate. Do NOT summon the user.',
  }
}

log('confirmation pass 2/2 blocking-clean → CONVERGED (cost: 2 red teams)')
return {
  converged: true,
  openNodes: [],
  advisoryNodes: dedupe(firstSplit.advisory.concat(secondSplit.advisory)),
  checks: 2,
  confirmation: CONFIRMATION,
  protocolVersion: PROTOCOL_VERSION,
  note: 'CONVERGED: the signed double-confirmation route received two fresh sequential blocking-clean passes. Continue to the next station that is ON; do not activate skipped stations or self-declare user sign-off.',
}
