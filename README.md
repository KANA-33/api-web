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
- API key list, search, creation, editing, reveal, and deletion. The create
  modal supports group selection, expiry, quantity, unlimited quota, and USD
  quota input mapped to backend quota units.
- Wallet balance, billing records, redemption, and payment entry points.
- Model list and model detail pages.
- Playground request runner with model and parameter controls.
- Logs page with usage logs, drawing logs, and task logs.
- Profile view, language/password updates, and email binding through backend
  verification code flow.
- Dynamic platform branding from `/api/status`, including system name, logo,
  and browser favicon.

### ~~Admin Console~~

- ~~Admin overview with platform statistics.~~
- ~~User management: list, search, create, edit, delete, role/status/quota actions.~~
- ~~Channel management: list, search, create, edit, delete, copy, test, balance,~~
  ~~batch actions, tag actions, upstream model fetch/detect/apply, root-only secret~~
  ~~reveal, and multi-key management.~~
- ~~Model management: list, search, create, edit, delete, status update, missing~~
  ~~model review, sync preview, official upstream sync, vendor CRUD, prefill group~~
  ~~CRUD, and io.net deployment operations.~~
- ~~Logs: usage logs, drawing logs, task logs, audit logs, and usage statistics.~~
- ~~Redemptions: list, search, batch generation, edit, status update, delete, and~~
  ~~invalid-code cleanup.~~
- ~~Billing: top-up records and manual top-up completion.~~
- ~~Settings: root-only option management and console content editing.~~

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
PUBLIC_LEGACY_ADMIN_URL=http://localhost:3000/channels
```

Common local backend examples:

- Frontend on `localhost:3001`, backend on `localhost:3000`:
  `DEV_BACKEND_ORIGIN=http://localhost:3000`
- Frontend deployed separately with a fixed API origin:
  `PUBLIC_API_BASE_URL=https://api.example.com`
- Admin button opens the original default admin UI at the API origin:
  `https://api.example.com/channels`
- Override the original admin UI only for special deployments:
  `PUBLIC_LEGACY_ADMIN_URL=https://api.example.com/channels`
- Do not set `PUBLIC_LEGACY_ADMIN_URL` to a `localhost` URL for production
  builds, because public environment values are baked into the built assets.

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

## Project Structure

```text
commercial-frontend/
  index.html                  Vite/Rsbuild HTML entry; React mounts into #root
  rsbuild.config.ts           Rsbuild config, dev proxy, and path aliases
  tsconfig.json               TypeScript strict mode and @app/@features aliases
  scripts/
    provenance-check.mjs      Clean-room source hygiene scan used by verify
  docs/                       Protocol, QA, release, and clean-room documents
  src/
    main.tsx                  React root bootstrap
    styles.css                Tailwind v4 import and global shell styles
    app/
      router.tsx              TanStack Router tree, route guards, title/favicon sync
    features/
      auth/                   Login, current user, email binding, auth store
      platform/               /api/status store used by branding and quota display
      overview/               Overview/status/usage protocol calls
      api-keys/               Token/API-key protocol calls
      wallet/                 Top-up, redemption, billing protocol calls
      logs/                   Usage, drawing, and task log protocol calls
      models/                 User model list and analytics support calls
      playground/             Session chat completion request runner
      admin/                  Clean-room admin protocol modules by domain
    pages/
      landing/                Public opening page
      login/                  Session login page
      overview/               User console overview
      api-keys/               API key inventory and modal flows
      wallet/                 Balance, billing, redemption, payment entry points
      logs/                   Usage/drawing/task logs and log detail modal
      models/                 Analytics dashboard and model detail route
      playground/             Chat-style API playground
      profile/                Account, email binding, password/language settings
      admin/                  Clean-room commercial admin rewrite pages
      error/ not-found/       Route error surfaces
    shared/
      api/                    Fetch client, response contracts, auth headers
      lib/                    Formatting, roles, async data, legacy admin URL
      ui/                     Buttons, cards, modals, brand, avatar, confirmations
    widgets/
      app-shell/              Authenticated user console shell
      admin-shell/            Commercial /admin shell
```

### Architecture Notes

- `shared` is the lowest layer. It must not import from `features`, `pages`, or
  `widgets`.
- `features` owns protocol-aware API modules and small domain stores. It may
  import from `shared`.
- `pages` compose feature APIs, stores, and shared UI into route-level screens.
- `widgets` hold shell-level layout used across route groups.
- `app/router.tsx` is the only route tree definition. It also synchronizes
  dynamic document title and favicon from platform status.
- The structure is intentionally shallow so editor context, Copilot completion,
  and cross-feature navigation stay predictable.

### Route Groups

- `/` public landing page.
- `/login` session login.
- Authenticated user console: `/overview`, `/playground`, `/models`,
  `/models/$modelId`, `/logs`, `/api-keys`, `/wallet`, `/profile`.
- Clean-room commercial admin rewrite: `/admin`, `/admin/users`,
  `/admin/channels`, `/admin/models`, `/admin/logs`, `/admin/redemptions`,
  `/admin/billing`, `/admin/settings`.
- The user-console top-right Admin link still hands off to the original
  default-theme admin UI through `PUBLIC_LEGACY_ADMIN_URL` or `/channels`.

## Key Documents

- Keep: `docs/clean-room-policy.md` defines the legal/engineering boundary.
- Keep and update with every protocol change: `docs/protocol-contract.md`.
- Keep and update after backend audits: `docs/backend-endpoint-inventory.md`.
- Keep and update after feature changes: `docs/feature-parity.md`.
- Keep and update after phase changes: `docs/implementation-roadmap.md`.
- Keep: `docs/development-notes.md` records architecture and data-truth rules.
- Keep: `docs/integration-qa.md` is the real-backend smoke-test guide.
- Keep: `docs/deployment.md` documents environment and proxy choices.
- Keep: `docs/release-checklist.md` is the release gate.
- Keep: `docs/provenance-checklist.md` is the merge-time clean-room checklist.
- Keep: `docs/third-party-notices.md` tracks dependency/license notes.
- Keep for targeted admin testing: `docs/admin-mvp-smoke-test.md`.
- Keep as deferred/completed admin ledger:
  `docs/post-mvp-admin-enhancements.md`.

Recently synchronized after current UI/protocol work:

- `docs/protocol-contract.md`: email verification/binding endpoints and
  API-key quantity behavior.
- `docs/backend-endpoint-inventory.md`: matching endpoint inventory rows.
- `docs/integration-qa.md`: smoke steps for dynamic favicon/branding, email
  binding, and the expanded API-key creation modal.
