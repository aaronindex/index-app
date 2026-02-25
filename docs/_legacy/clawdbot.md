## Future idea: Clawdbot-like self-extending I/O layer (NOT NOW)

### Stance
- Product/use-case first. Pre-alpha focus = validate core INDEX value (import → reduce → decisions → return usage).
- Self-recursive agents are a *capability layer*, not the product.
- If/when we add this, it should live at the edges: **Ingress (inputs)** and **Egress (outputs)** — not in the sense-making / ontology / reduce logic.

### Why this matters (later)
- When INDEX hits “we need X data but no connector exists”, an agent could build the connector/tool and ingest results as Signals.
- When INDEX produces decisions/checklists, an agent could push them outward (email, Google Docs, etc.) via connectors.

### Roadmap shape
- Phase 0–1 (now): core model + opinionated workflows, minimal I/O, stable reduce/resume/export.
- Phase 2: hardcoded I/O v1/v2 (common connectors + exporters).
- Phase 3+: agent-assisted I/O (agent can *create/extend* connectors/tools), still governed by INDEX.

### Guardrails (non-negotiable)
- Agents **do not modify**:
  - ontology / memory model
  - reduce/decide logic
  - ranking/priority logic
- Agents **can**:
  - build or extend connectors (API wrappers, parsers, scrapers) in a sandbox
  - run bounded jobs with explicit scopes
  - return structured results that are indexed (Signals / imports / artifacts)

### Minimal future design
- UI: add “Agent Import” / “Agent Export” actions alongside existing Import/Export.
- Implementation: route to a capability interface:
  - v1 = hardcoded connectors
  - v2 = agent-assisted tool creation + registration
- Key concerns (when real): permissions, sandboxing, audit logs, reproducibility/versioning of tools.
