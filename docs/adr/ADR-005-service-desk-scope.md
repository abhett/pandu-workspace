# ADR-005: Service Desk Scope — Deferred to Phase 3

## Status
**Accepted** — 2026-08-15

## Context

catatan.docx includes a comprehensive Service Desk / Ticketing module addendum (paragraphs P2239–P2404) with:
- 16 additional database tables (tickets, ticket_types, ticket_statuses, ticket_priorities, SLA policies, escalations, approvals, customer portal, etc.)
- 7 ticket types (Incident, Service Request, Problem, Change Request, Bug Report, Access Request, General Support)
- Full ticket lifecycle workflow (New → Triage → Assigned → In Progress → Waiting → Resolved → Closed → Reopened)
- Ticket-to-task linking (separate entities, bidirectional relations)
- SLA response and resolution tracking
- Email-to-ticket channel
- Customer portal for status tracking
- AI classification, routing, and suggested responses
- CSAT/satisfaction surveys

implementationplan.docx does not mention service desk or ticketing at all.

### Analysis

catatan.docx itself explicitly places this module **after core work management is stable**:

> "Saya menyarankan ticketing menjadi modul setelah core work management stabil"
> - Phase 1: Organization, project, task, Kanban, sprint
> - Phase 2: Comments, files, notifications, audit, AI summary
> - **Phase 3: Service desk dan ticketing**
> - Phase 4: Email-to-ticket, SLA, customer portal, knowledge base
> - Phase 5: AI routing, suggested response, escalation prediction

## Decision

**Defer the Service Desk module to Phase 3** (approximately Sprint 23+ or R2). Do **not** include it in the MVP or R1 releases.

### Rationale

1. **Focus**: The MVP must prove the core work management thesis (task → Kanban → sprint → AI summary) before adding a second major product surface.
2. **Foundation reuse**: The ticket module can reuse existing architecture (workflow engine, custom fields, notifications, audit, AI gateway) once those are stable.
3. **Scope discipline**: Both documents warn against premature feature expansion. catatan.docx explicitly says: "Jangan mencoba mengalahkan Jira dan ClickUp dalam jumlah fitur pada rilis pertama."
4. **Risk**: Building 16 additional tables + customer portal + SLA engine during MVP would significantly delay the core product.

### Architectural Preparation

While the module is deferred, these architectural decisions enable future integration:

1. **Work item abstraction**: The `work_item_types` table (from implementationplan.docx) should be designed to support ticket types as well as task types. A "ticket" is a work item type with additional metadata.
2. **Workflow engine**: Build the workflow transition system (ADR already in implementationplan.docx) generically enough that ticket workflows can use the same engine.
3. **Custom fields**: The custom fields architecture (catatan.docx §4) should support both tasks and tickets as `entity_type`.
4. **Notification channels**: Design the notification system to support customer-facing notifications (email replies, portal updates) in addition to team notifications.
5. **AI capability registry**: Register ticket-related AI capabilities (classification, routing, suggested response) in the capability registry, but don't implement them yet.

### What to Include Now

- `work_item_types` table with a flexible type system that can accommodate ticket types later
- Generic workflow engine that doesn't assume "task" as the only entity
- Custom fields with polymorphic `entity_type`

### What to Defer

- All 16 service desk tables
- Customer portal
- SLA engine
- Email-to-ticket channel
- Ticket-specific AI agents (triage, suggested response)
- CSAT surveys

## Consequences

- **Positive**: Faster MVP; cleaner initial architecture; reduced risk of premature abstraction; focused team effort.
- **Negative**: Cannot onboard customers who primarily need a helpdesk immediately; must revisit schema design when building Phase 3.
- **Mitigation**: Architectural preparation ensures no blocking redesign is needed. The generic workflow engine and custom fields serve both domains.
