# Post-MVP Admin Enhancements

This file tracks admin features intentionally deferred until the Admin MVP is complete.

Maintenance rule:

- When a feature is deferred during implementation, add it here immediately.
- Keep each item under its owning admin module.
- Include route ownership, permission level, and implementation notes.
- Do not track clean-room implementation details copied from new-api source. Only track protocol-compatible product behavior.

## Channels

### View Channel Secret

- Owner: `/admin/channels`
- Permission: Root-only
- Notes: Requires secondary verification, sensitive-action confirmation, and audit visibility.

### Multi-Key Management

- Owner: `/admin/channels`
- Permission: Admin / Root, operation-specific
- Notes: Manage multi-key status, append or replace keys, key status list, disabled reasons, and polling mode.

### Enhanced Batch Channel Operations

- Owner: `/admin/channels`
- Permission: Admin
- Notes: Batch delete, batch tag updates, enable or disable by tag, and delete disabled channels.

### Ollama Model Operations

- Owner: `/admin/channels`
- Permission: Admin
- Notes: Pull models, stream pull progress, delete models, and query Ollama version. Show only for Ollama channels.

### Upstream Model Update Detection

- Owner: `/admin/channels`
- Permission: Admin
- Notes: Detect upstream model changes for one channel or all channels.

### Upstream Model Update Apply

- Owner: `/admin/channels`
- Permission: Admin / Root depending on backend endpoint
- Notes: Apply upstream model changes for one channel or all channels.

### Fetch Upstream Models Into Channel

- Owner: `/admin/channels`
- Permission: Root-only
- Notes: Backend endpoint is root-protected. Use a high-sensitivity flow.

### Codex Channel Usage

- Owner: `/admin/channels`
- Permission: Admin
- Notes: Show Codex channel usage, reset credits, and reset usage actions.

### Codex Credential Refresh

- Owner: `/admin/channels`
- Permission: Admin
- Notes: Refresh Codex OAuth channel credentials and show refresh metadata.

### Channel Secret Risk Notices And Audit

- Owner: `/admin/channels`
- Permission: Root-only
- Notes: Secret reveal, copy, and export actions must be visible in audit surfaces.

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

### Management Audit Log

- Owner: `/admin/logs`
- Permission: Admin / Root
- Notes: Show high-sensitivity operations such as secret reveal, deletion, and role changes.

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

### Unified Sensitive Confirmation Dialog

- Owner: `shared/ui` or `shared/admin`
- Permission: Caller-defined
- Notes: Require confirmation text, show impact scope, and collect a reason when needed.

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
