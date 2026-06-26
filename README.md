# Commercial Frontend - API Panel

Clean-room commercial React frontend for a New API-compatible service.

This project is a commercial frontend rewrite. It must not contain source code,
styles, assets, translations, component structure, or route-tree output copied
from the original AGPL frontend. Compatibility is limited to the backend
communication protocol: HTTP routes, request/response schemas, auth headers,
status codes, and documented behavior.

## Current Scope

### User Console

- Sign in, sign out, and current-user session recovery.
- Overview dashboard with balance, usage, setup guidance, platform information,
  announcements, uptime, and FAQ content.
- API key list, search, creation, editing, and deletion.
- Wallet balance, billing records, redemption, and payment entry points.
- Model list and model detail pages.
- Playground request runner with model and parameter controls.
- Logs page with usage logs, drawing logs, and task logs.
- Profile view and profile update flow.

### Admin Console

- Admin overview with platform statistics.
- User management: list, search, create, edit, delete, role/status/quota actions.
- Channel management: list, search, create, edit, delete, copy, test, balance,
  batch actions, tag actions, upstream model fetch/detect/apply, root-only secret
  reveal, and multi-key management.
- Model management: list, search, create, edit, delete, status update, missing
  model review, sync preview, official upstream sync, vendor CRUD, prefill group
  CRUD, and io.net deployment operations.
- Logs: usage logs, drawing logs, task logs, audit logs, and usage statistics.
- Redemptions: list, search, batch generation, edit, status update, delete, and
  invalid-code cleanup.
- Billing: top-up records and manual top-up completion.
- Settings: root-only option management and console content editing.

## Stack

- React 19
- TypeScript
- Tailwind CSS v4
- Rsbuild
- TanStack Router
- Zustand
- oxlint / oxfmt

## Getting Started

```bash
bun install
bun run dev
```

By default, the development server proxies API requests to
`DEV_BACKEND_ORIGIN`.

Create `.env` from `.env.example` when connecting to a real backend:

```bash
PUBLIC_API_BASE_URL=
DEV_BACKEND_ORIGIN=http://localhost:3000
```

Common local backend examples:

- Frontend on `localhost:3001`, backend on `localhost:3000`:
  `DEV_BACKEND_ORIGIN=http://localhost:3000`
- Frontend deployed separately with a fixed API origin:
  `PUBLIC_API_BASE_URL=https://api.example.com`

## Commands

```bash
bun run dev
bun run format
bun run lint
bun run typecheck
bun run build
bun run verify
```

`bun run verify` runs the provenance scan, TypeScript, oxlint, and production
build.

## Clean-Room Rule

Before implementing or changing a feature, document the backend protocol in
`docs/protocol-contract.md`. Implement UI, state, copy, styling, routing, and
file structure independently.

Allowed inputs:

- Backend route names and protocol behavior.
- Request and response schemas observed from backend behavior.
- Product requirements written independently.

Forbidden inputs:

- AGPL frontend source files.
- AGPL frontend styles, layout structure, translated strings, assets, generated
  route trees, or component hierarchy.

## Project Layout

```text
src/
  app/              Router setup
  features/         Protocol-aware feature API modules and stores
  pages/            User and admin route pages
  shared/           API client, formatting, roles, and reusable UI primitives
  widgets/          App shell and admin shell
```

The structure is intentionally shallow so editor context, Copilot completion,
and cross-feature navigation stay predictable.

## Key Documents

- `docs/clean-room-policy.md`: allowed and forbidden source inputs.
- `docs/protocol-contract.md`: backend communication contract.
- `docs/backend-endpoint-inventory.md`: endpoint inventory and coverage notes.
- `docs/feature-parity.md`: user/admin feature matrix.
- `docs/post-mvp-admin-enhancements.md`: completed and deferred admin work.
- `docs/admin-mvp-smoke-test.md`: admin MVP smoke-test checklist.
- `docs/integration-qa.md`: backend integration smoke-test guide.
- `docs/deployment.md`: deployment and environment guidance.
- `docs/provenance-checklist.md`: merge-time source hygiene checklist.
- `docs/release-checklist.md`: release gate checklist.
- `docs/third-party-notices.md`: dependency/license notes.
