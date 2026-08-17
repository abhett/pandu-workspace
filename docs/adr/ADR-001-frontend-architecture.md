# ADR-001: Frontend Architecture — Inertia.js Server-Driven SPA

## Status
**Accepted** — 2026-08-15

## Context

The two specification documents propose conflicting frontend architectures:

- **catatan.docx** prescribes Inertia.js 3 with server-side routing, leveraging the Laravel React starter kit (React 19 + TypeScript + Inertia 3 + Tailwind 4 + shadcn/ui).
- **implementationplan.docx** prescribes a standalone React SPA with TanStack Query, React Router, Zustand, and a separate `web/` directory — communicating with the backend purely via REST API.

The existing project (`pandu-management`) was bootstrapped from the official Laravel React starter kit and already has:
- `@inertiajs/react` v3 and `@inertiajs/vite` v3 installed
- Inertia Vite plugin configured in `vite.config.ts`
- Wayfinder plugin for typed route generation
- Fortify for authentication backend
- Pages in `resources/js/pages/`
- Radix UI primitives and shadcn/ui component patterns

Switching to a standalone SPA would require:
- Removing Inertia entirely
- Adding TanStack Query, React Router, Zustand, Zod, React Hook Form
- Building a separate frontend build pipeline
- Losing server-driven page props, SSR via Vite, and Wayfinder route generation
- Rewriting all existing authentication flows

## Decision

**Use Inertia.js 3** as the frontend architecture. The project continues as a server-driven SPA using Laravel controllers that render Inertia pages.

Key implications:
1. **No TanStack Query** — Inertia handles data fetching via page props, deferred props, and polling. For standalone XHR calls, use Inertia v3's built-in `useHttp` hook.
2. **No React Router** — Routing is handled by Laravel (`routes/web.php`) with Inertia page resolution. Use `<Link>` and `router.visit()`.
3. **No Zustand** — Page-level state comes from Inertia props. Local component state uses React's built-in `useState`/`useReducer`. Shared client-side state (e.g., board optimistic state) uses React Context or a lightweight store if needed.
4. **Wayfinder** remains the primary way to reference routes from TypeScript.
5. **REST API** (`routes/api.php`) is built separately for mobile apps, external integrations, and webhooks — but the primary web UI uses Inertia routes.

## Consequences

- **Positive**: Zero migration cost; consistent with Laravel starter kit conventions; SSR works automatically via Inertia Vite plugin; typed routes via Wayfinder; simpler auth (session cookies, no token management in frontend).
- **Negative**: The Kanban board requires careful handling of real-time state alongside Inertia props (use Echo + local state reconciliation). Complex optimistic updates (drag-and-drop) may require a local state layer that diverges from Inertia's page-prop model.
- **Mitigation**: For the Kanban board specifically, the board data will be loaded via Inertia page props initially, then managed locally with Echo events for real-time updates. The `useHttp` hook handles move mutations without full page visits.
