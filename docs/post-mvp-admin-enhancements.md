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

## Channels

No deferred Channel items remain.

## Models

### Vendor CRUD

- Owner: `/admin/models`
- Permission: Admin
- Notes: Vendor list, create, edit, delete, and status management.

### Upstream Model Sync Preview

- Owner: `/admin/models`
- Permission: Admin
- Notes: Display missing models and conflicts before applying sync.

### Upstream Model Conflict Resolution

- Owner: `/admin/models`
- Permission: Admin
- Notes: Select fields to overwrite and confirm writes.

### Model Deployment Management

- Owner: `/admin/models`
- Permission: Admin
- Notes: Deployments, containers, logs, extend, rename, update, and delete flows.

### Prefill Groups Management

- Owner: `/admin/models`
- Permission: Admin
- Notes: CRUD for model, tag, and endpoint prefill groups.

## Users

### OAuth Binding View And Unbind

- Owner: `/admin/users`
- Permission: Admin
- Notes: View a user's OAuth bindings and unbind providers.

### Clear User Bindings

- Owner: `/admin/users`
- Permission: Admin
- Notes: Clear email, GitHub, Discord, OIDC, WeChat, Telegram, and related bindings.

### Reset Passkey

- Owner: `/admin/users`
- Permission: Admin
- Notes: High-sensitivity operation. Requires confirmation.

### Disable User 2FA

- Owner: `/admin/users`
- Permission: Admin
- Notes: High-sensitivity operation. Requires confirmation.

### User Subscription View And Binding

- Owner: `/admin/users` or `/admin/billing`
- Permission: Admin
- Notes: User subscription list, create subscription, invalidate subscription, and delete subscription.

## Logs / Audit

### Log Cleanup System Task

- Owner: `/admin/logs`
- Permission: Root-only
- Notes: Use the system task endpoint and show task progress.

### Channel Affinity Usage Cache

- Owner: `/admin/logs` or `/admin/channels`
- Permission: Admin
- Notes: Show channel affinity cache statistics.

### Admin Data Dashboard And Quota Flow

- Owner: `/admin/logs` or a future `/admin/data`
- Permission: Admin
- Notes: Use `/api/data/`, `/api/data/users`, and `/api/data/flow` to show platform-wide quota dates, user quota dates, and flow data. Deferred from Phase 5 to keep the logs MVP focused.

## Billing

### Subscription Plan Management

- Owner: `/admin/billing`
- Permission: Admin
- Notes: Plan CRUD, plan status, and user subscription binding.

### Full Payment Gateway Configuration

- Owner: `/admin/billing` or `/admin/settings/billing`
- Permission: Root-only preferred
- Notes: EPay, Stripe, Creem, Waffo, and Waffo Pancake settings.

## Settings / Operations

### Root-Only Permission Isolation

- Owner: `shared/lib/roles.ts` and admin routes
- Permission: Root-only
- Notes: Centralize `isRootUser` decisions and avoid scattered route checks.

### Sensitive Configuration Editors

- Owner: `/admin/settings/security`
- Permission: Root-only
- Notes: SSRF protection, sensitive words, and request limits.

### Structured Console Content Editors

- Owner: `/admin/settings`
- Permission: Root-only
- Notes: Replace raw JSON textareas for API info, announcements, FAQ, and Uptime Kuma groups with add/edit/reorder item editors and schema-specific previews.

### Performance And Operations Tools

- Owner: `/admin/settings/operations`
- Permission: Root-only
- Notes: GC, disk cache, performance logs, and update checks.
