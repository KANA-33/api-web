# Post-MVP Admin Enhancements

This file tracks admin features intentionally deferred until the Admin MVP is complete.

Maintenance rule:

- When a feature is deferred during implementation, add it here immediately.
- Keep each item under its owning admin module.
- Include route ownership, permission level, and implementation notes.
- Do not track clean-room implementation details copied from new-api source. Only track protocol-compatible product behavior.

## Completed Post-MVP Foundations

### Unified Sensitive Confirmation Dialog

- Owner: `shared/ui/sensitive-confirmation.tsx`
- Completed: 2026-06-26
- Notes: Replaced browser-native confirmations for current high-risk user/API-key/admin delete, disable, quota, cleanup, and manual top-up completion flows. Future audit-log integration can use the collected reason text.

### Management Audit Log

- Owner: `/admin/logs`
- Completed: 2026-06-26
- Notes: Added an Audit logs tab backed by admin `GET /api/log/` with `type=3`. The UI shows action, target params, operator metadata, route/request context, IP, and time when those structured fields are supplied by the backend.

### Enhanced Batch Channel Operations

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added selected-channel batch delete, selected-channel batch tag set/clear, tag-wide enable/disable, and delete-disabled maintenance actions. Destructive operations use the shared sensitive confirmation dialog and are visible through backend management audit logs.

### View Channel Secret

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added root-only channel secret reveal using `POST /api/channel/:id/key`. The UI requires sensitive confirmation with typed channel name and reason, displays the secret in a temporary read-only panel, and relies on backend secure verification plus management audit logging.

### Upstream Model Update Detection

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added per-channel upstream model fetch and pending-change detection through `GET /api/channel/fetch_models/:id` and `POST /api/channel/upstream_updates/detect`. Results are shown as structured JSON for review; apply/write operations remain deferred.

### Upstream Model Update Apply

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added single-channel apply for detected upstream model changes through `POST /api/channel/upstream_updates/apply`. The UI requires sensitive confirmation with typed channel name and reason before writing add/remove candidates to the channel model list.

### Fetch Upstream Models Into Channel

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added root-only form action that sends the currently typed provider key, channel type, and optional base URL to `POST /api/channel/fetch_models`, then fills the channel Models field from the returned upstream model names. The UI does not read stored secrets for this action.

### Multi-Key Management

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added multi-key edit support for append/replace and random/polling mode on multi-key channels. Added status panel through `POST /api/channel/multi_key/manage` with key previews, enabled/manual-disabled/auto-disabled counts, per-key enable/disable/delete, enable all, disable all, and delete auto-disabled actions.

### Channel Secret Risk Notices And Audit

- Owner: `/admin/channels`
- Completed: 2026-06-26
- Notes: Added explicit copy and download controls only after root-only secret reveal. Each copy/export action requires sensitive confirmation with typed channel name and reason; backend audit visibility is anchored to the preceding `channel.key_view` reveal audit entry.

### Vendor CRUD

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added same-page vendor management backed by `GET/POST/PUT/DELETE /api/vendors`. Admins can create, edit, enable/disable, delete, and refresh vendors used by model assignment and filtering.

### Upstream Model Sync Preview

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added a read-only sync preview panel that combines missing model references from `GET /api/models/missing` with current page matching metadata such as `matched_count` and `matched_models`. Missing entries can open the create-model form without writing automatically.

### Upstream Model Conflict Resolution

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added conflict triage inside the model sync preview using only confirmed model protocols. Missing references are grouped into uncovered items and items covered by existing matching rules; admins can create exact metadata via `POST /api/models/` or edit the covering rule via `PUT /api/models/`.

### Official Upstream Model Sync

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added official upstream preview/apply flow backed by `GET /api/models/sync_upstream/preview` and `POST /api/models/sync_upstream`. Admins can select locale, review missing models, select exact conflict fields to overwrite, and apply only selected updates.

### Model Deployment Management

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added io.net deployment management backed by `/api/deployments`. Admins can inspect settings, list/search deployments, create deployments from the documented JSON DTO, rename, extend, request termination, and inspect containers.

### Prefill Groups Management

- Owner: `/admin/models`
- Completed: 2026-06-26
- Notes: Added CRUD for model, tag, and endpoint prefill groups backed by `GET/POST/PUT/DELETE /api/prefill_group`.

### OAuth Binding View And Unbind

- Owner: `/admin/users`
- Completed: 2026-06-26
- Notes: Added user security panel backed by `GET /api/user/:id/oauth/bindings` and `DELETE /api/user/:id/oauth/bindings/:provider_id`.

### Clear User Bindings

- Owner: `/admin/users`
- Completed: 2026-06-26
- Notes: Added direct binding cleanup for email, GitHub, Discord, OIDC, WeChat, Telegram, and Linux.do through `DELETE /api/user/:id/bindings/:binding_type`.

### Reset Passkey

- Owner: `/admin/users`
- Completed: 2026-06-26
- Notes: Added high-sensitivity passkey reset through `DELETE /api/user/:id/reset_passkey`.

### Disable User 2FA

- Owner: `/admin/users`
- Completed: 2026-06-26
- Notes: Added 2FA stats and high-sensitivity forced disable through `GET /api/user/2fa/stats` and `DELETE /api/user/:id/2fa`.

### User Subscription View And Binding

- Owner: `/admin/users`
- Completed: 2026-06-26
- Notes: Added user subscription panel backed by admin subscription routes. Admins can view subscription records, bind a plan without payment, invalidate a subscription, and hard-delete a subscription.

### Admin Data Dashboard And Quota Flow

- Owner: `/admin/logs`
- Completed: 2026-06-26
- Notes: Added admin quota and flow inspection backed by `/api/data/`, `/api/data/users`, and `/api/data/flow`, with date and username filters.

### Subscription Plan Management

- Owner: `/admin/billing`
- Completed: 2026-06-26
- Notes: Added subscription plan list, create, edit, and enable/disable flows backed by `GET/POST/PUT/PATCH /api/subscription/admin/plans`.

### Full Payment Gateway Configuration

- Owner: `/admin/billing`
- Completed: 2026-06-26
- Notes: Added root-only payment gateway configuration for general top-up pricing, Stripe, Creem, Waffo, and Waffo Pancake through the backend option API, plus payment compliance confirmation through `POST /api/option/payment_compliance`.

### Root-Only Permission Isolation

- Owner: `shared/lib/roles.ts` and admin routes
- Completed: 2026-06-29
- Notes: Settings and operation tools are isolated behind root-user checks using the shared role helpers, with a root-required state for non-root admins.

### Sensitive Configuration Editors

- Owner: `/admin/settings`
- Completed: 2026-06-29
- Notes: Added root-only editors for SSRF fetch settings, sensitive words, model request rate limits, and stream cache queue length through the backend option API.

### Structured Console Content Editors

- Owner: `/admin/settings`
- Completed: 2026-06-29
- Notes: Replaced raw-only console JSON editing with structured list editors for API info, announcements, FAQ, and Uptime Kuma groups while still persisting through backend console option keys.

### Performance And Operations Tools

- Owner: `/admin/settings`
- Completed: 2026-06-29
- Notes: Added performance stats, GC, disk cache cleanup, stats reset, log file listing, and log cleanup backed by `/api/performance/*` root-only routes.

## Channels

No deferred Channel items remain.

## Models

No deferred Models items remain.

## Users

No deferred Users items remain.

## Logs / Audit

No deferred Logs / Audit items remain. Log cleanup and channel affinity panels are intentionally not part of the current commercial admin UI.

## Billing

No deferred Billing items remain.

## Settings / Operations

No deferred Settings / Operations items remain.
