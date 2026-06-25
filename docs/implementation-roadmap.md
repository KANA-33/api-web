# Implementation Roadmap

This roadmap keeps the commercial frontend moving without crossing the
clean-room boundary.

## Phase 0: Clean-Room Foundation

Status: In Build

- Keep this repository independent from AGPL frontend source.
- Maintain `docs/clean-room-policy.md`.
- Maintain `docs/protocol-contract.md`.
- Maintain `docs/feature-parity.md`.
- Keep the first UI shell as independently authored commercial design.

Exit criteria:

- New repository builds independently.
- No copied source, assets, translations, route tree, or styles.
- Protocol documentation process is in place.

## Phase 1: Protocol Extraction

Status: In Build

- Collect backend API contracts from server routes, OpenAPI, or network traces.
- Fill endpoint methods, paths, headers, request schemas, response schemas, and
  error formats.
- Mark each feature row as ready for implementation only after its protocol
  contract is documented.

Exit criteria:

- Auth, current user, balance, usage summary, API keys, wallet, logs, and model
  list endpoints are documented.

Progress:

- Auth and current user endpoints extracted.
- API key/token CRUD endpoints extracted.
- Overview quota, usage stat, chart, status, notice, and uptime endpoints
  extracted.
- Wallet top-up info and billing record endpoints extracted.
- Usage, drawing, and task log endpoints extracted.
- User model list endpoint extracted.
- Payment and playground relay flows still need deeper review before build.

## Phase 2: Core Runtime

Status: In Build

- Implement typed API modules from the documented contract.
- Add auth store and session persistence.
- Add request error normalization.
- Add user role handling from documented numeric backend role values without
  importing AGPL constants.
- Add route guards.

Exit criteria:

- User can login, load current account, and see authenticated shell.
- Token/cookie handling matches backend behavior.

Progress:

- Session-aware API client implemented with `credentials: include`.
- Business envelope error normalization implemented.
- Typed API modules added for auth, overview, API keys, wallet, logs, and
  models.
- Auth store added with login, refresh, and logout actions.
- Login route and authenticated route guard added.
- App shell now displays the current session user and supports sign out.

## Phase 3: User Console

Status: In Build

- Bind overview metrics to real usage and wallet data.
- Bind platform brief stream to documented endpoints.
- Keep setup guide as a fresh commercial workflow.
- Add loading, empty, and error states.

Exit criteria:

- Overview is useful with real backend data.
- No implementation dependency on old frontend.

Progress:

- Overview now loads current quota, usage summary, and platform status.
- API Keys page now loads paginated token records.
- Wallet page now loads top-up configuration and billing records.
- Logs page now switches between usage, drawing, and task APIs.
- Models page now loads the current user's enabled model list.
- Profile page now updates user identity/language through `PUT /api/user/self`.
- Playground now uses the real model list, while request execution remains
  blocked until relay protocol extraction is completed.

## Phase 4: API Keys and Wallet

Status: In Build

- Implement API key list, create, update, revoke/delete.
- Implement wallet balance and billing records.
- Treat recharge, redeem, and payment provider flows as high-risk review items.

Exit criteria:

- User can manage credentials and inspect billing records.

Progress:

- API Keys page now supports search, pagination, create, edit, reveal, and
  delete operations.
- Logs page now supports tab-specific filtering, date ranges, refresh, and
  pagination for usage, drawing, and task records.
- Wallet remains read-oriented for Phase 4; payment execution stays blocked
  until exact request bodies and compliance behavior are reviewed.

## Phase 5: Logs, Models, Playground

Status: In Build

- Implement advanced usage, drawing, and task log detail views.
- Implement model browsing and model details.
- Implement playground request runner using documented API behavior.

Exit criteria:

- User can inspect activity, choose models, and test requests.

Progress:

- `/pg/chat/completions` session playground protocol extracted.
- Playground now runs non-streaming chat requests through the backend session
  endpoint.
- Playground supports model selection, system prompt, user prompt,
  temperature, top P, and max tokens.
- Model detail route added for current-user model availability.
- Direct `/v1` API-key relay routes are documented but not used for the
  ordinary user Playground.

## Phase 6: Wallet Payments

Status: In Build

- Implement redemption code flow.
- Implement amount quotes for supported payment providers.
- Implement payment redirect creation for providers with confirmed request and
  response contracts.
- Keep unconfirmed providers deferred.

Exit criteria:

- User can redeem codes and start confirmed online payment flows.

Progress:

- Redemption code flow implemented through `POST /api/user/topup`.
- EPay amount quote and payment redirect implemented.
- Stripe amount quote and Checkout redirect implemented.
- Waffo amount quote and payment redirect implemented.
- Creem and Waffo Pancake remain deferred until product-selection contracts are
  reviewed.

## Phase 7: Release Hardening

Status: In Build

- Complete third-party license review.
- Add environment documentation.
- Add CI checks.
- Add visual QA on desktop and mobile.
- Review every feature for provenance.

Exit criteria:

- Commercial frontend is ready for deployment as a separate product surface.

Progress:

- CI workflow added for provenance, typecheck, lint, and build.
- Deployment guidance added.
- Release checklist added.
- Third-party notice table expanded.
- Provenance text scan added as a lightweight automated guard.
- Route-level not-found and error pages added.
- Platform status preload added before entering the authenticated shell.
- Playground navigation is hidden when backend self-use mode is disabled.
- Integration QA guide added.
