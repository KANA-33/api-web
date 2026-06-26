# Protocol Contract

This document is the only allowed bridge between the commercial frontend and a
New API-compatible backend. It describes communication behavior only:
endpoints, methods, headers, request bodies, response bodies, status codes, and
error shapes.

Do not record frontend source structure, component names, visual hierarchy,
translation strings, table definitions, or implementation details from any
AGPL frontend.

## Phase 1 Status

| Area             | Status    | Source Type                       | Notes                                  |
| ---------------- | --------- | --------------------------------- | -------------------------------------- |
| Auth             | Extracted | Backend router/controller/OpenAPI | Cookie/session dashboard auth          |
| User Console     | Extracted | Backend router/controller/OpenAPI | Quota, status, usage stats, charts     |
| API Keys         | Extracted | Backend router/controller/OpenAPI | Backend calls them tokens              |
| Wallet           | Extracted | Backend router/controller/OpenAPI | Payment flows require extra review     |
| Logs             | Extracted | Backend router/controller/OpenAPI | Usage, drawing, and task logs          |
| Models           | Extracted | Backend router/controller/OpenAPI | User model names are available         |
| Platform Notices | Extracted | Backend router/controller/OpenAPI | Status endpoint includes panel content |
| Admin MVP        | Extracted | Backend router/controller         | Users, channels, models, logs, billing |

Detailed route inventory lives in `docs/backend-endpoint-inventory.md`.

## Global Contract

| Topic             | Behavior                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Base URL          | `PUBLIC_API_BASE_URL` points to backend origin; dashboard paths are under `/api`                        |
| Auth transport    | Browser dashboard uses server cookie/session; API-key read-only endpoints use Bearer key                |
| User header       | Authenticated dashboard requests must include `New-Api-User` with current user id                       |
| Response envelope | Most dashboard APIs return `{ success, message, data }`                                                 |
| Error format      | Most business errors return HTTP 200 with `success: false` and `message`                                |
| Pagination        | `p`, `page_size`, compatibility aliases `ps` and `size`; response `page`, `page_size`, `total`, `items` |
| Time filters      | Dashboard filters use Unix timestamps in seconds                                                        |
| Locale            | `PUT /api/user/self` can update `language`                                                              |

```ts
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PageQuery {
  p?: number;
  page_size?: number;
  ps?: number;
  size?: number;
}

interface PageInfo<T> {
  page: number;
  page_size: number;
  total: number;
  items: T[];
}
```

## Auth

### Login

- Method: `POST`
- Path: `/api/user/login`
- Auth: anonymous
- Request Body:

```ts
interface LoginRequest {
  username: string;
  password: string;
}
```

- Success Response:

```ts
type LoginResponse = ApiEnvelope<{
  id?: number;
  username?: string;
  display_name?: string;
  role?: number;
  status?: number;
  group?: string;
  require_2fa?: boolean;
}>;
```

- Notes: Successful password login creates a server session. If 2FA is enabled,
  response data contains `require_2fa: true` and login continues through
  `POST /api/user/login/2fa`.

### Current User

- Method: `GET`
- Path: `/api/user/self`
- Auth: user session
- Success Response:

```ts
interface CurrentUser {
  id: number;
  username: string;
  display_name?: string;
  role: number;
  status: number;
  email?: string;
  github_id?: string;
  discord_id?: string;
  oidc_id?: string;
  wechat_id?: string;
  telegram_id?: string;
  group?: string;
  quota: number;
  used_quota: number;
  request_count: number;
  aff_code?: string;
  aff_count?: number;
  aff_quota?: number;
  aff_history_quota?: number;
  inviter_id?: number;
  setting?: string;
  stripe_customer?: string;
  sidebar_modules?: string;
  permissions?: Record<string, unknown>;
}
```

- Notes: Balance display derives from `quota`, `used_quota`, and quota display
  settings returned by `/api/status`.

### Update Current User

- Method: `PUT`
- Path: `/api/user/self`
- Auth: user session
- Request Body:

```ts
interface UpdateCurrentUserRequest {
  username?: string;
  display_name?: string;
  password?: string;
  original_password?: string;
  language?: string;
  sidebar_modules?: string;
}
```

- Success Response: `ApiEnvelope<unknown>`
- Notes: Language/sidebar update paths are handled specially by backend.

### Logout

- Method: `GET`
- Path: `/api/user/logout`
- Auth: session
- Success Response: `{ success: boolean, message: string }`
- Notes: Server clears session.

## User Console

### Platform Status

- Method: `GET`
- Path: `/api/status`
- Auth: anonymous
- Success Response:

```ts
interface PlatformStatus {
  version: string;
  start_time: number;
  system_name: string;
  logo?: string;
  quota_per_unit: number;
  display_in_currency: boolean;
  quota_display_type: string;
  custom_currency_symbol?: string;
  custom_currency_exchange_rate?: number;
  enable_drawing: boolean;
  enable_task: boolean;
  register_enabled: boolean;
  password_login_enabled: boolean;
  password_register_enabled: boolean;
  api_info_enabled: boolean;
  uptime_kuma_enabled: boolean;
  announcements_enabled: boolean;
  faq_enabled: boolean;
  api_info?: unknown;
  announcements?: unknown;
  faq?: unknown;
}
```

- Notes: This endpoint feeds platform brief, feature flags, quota formatting,
  OAuth options, and optional panel content.

### Usage Summary

- Method: `GET`
- Path: `/api/log/self/stat`
- Auth: user session
- Query:

```ts
interface UsageSummaryQuery {
  type?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  token_name?: string;
  model_name?: string;
  channel?: number;
  group?: string;
}
```

- Success Response:

```ts
type UsageSummaryResponse = ApiEnvelope<{
  quota: number;
  rpm: number;
  tpm: number;
}>;
```

### Usage Chart

- Method: `GET`
- Path: `/api/data/self`
- Auth: user session
- Query:

```ts
interface UsageChartQuery {
  start_timestamp: number;
  end_timestamp: number;
}
```

- Success Response: `ApiEnvelope<unknown>`
- Notes: Time range cannot exceed one month.

### Flow Chart

- Method: `GET`
- Path: `/api/data/flow/self`
- Auth: user session
- Query: same as `UsageChartQuery`
- Success Response: `ApiEnvelope<unknown>`
- Notes: Time range cannot exceed one month.

## API Keys

Backend names API keys as tokens.

```ts
interface ApiKeyRecord {
  id: number;
  user_id: number;
  key: string;
  status: number;
  name: string;
  created_time: number;
  accessed_time: number;
  expired_time: number;
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled: boolean;
  model_limits?: string;
  allow_ips?: string | null;
  used_quota: number;
  group?: string;
  cross_group_retry?: boolean;
}
```

### List API Keys

- Method: `GET`
- Path: `/api/token/`
- Auth: user session
- Query: `PageQuery`
- Success Response: `ApiEnvelope<PageInfo<ApiKeyRecord>>`
- Notes: `key` is masked.

### Search API Keys

- Method: `GET`
- Path: `/api/token/search`
- Auth: user session
- Query:

```ts
interface SearchApiKeysQuery extends PageQuery {
  keyword?: string;
  token?: string;
}
```

- Success Response: `ApiEnvelope<PageInfo<ApiKeyRecord>>`

### Create API Key

- Method: `POST`
- Path: `/api/token/`
- Auth: user session
- Request Body:

```ts
interface CreateApiKeyRequest {
  name: string;
  expired_time: number;
  remain_quota: number;
  unlimited_quota: boolean;
  model_limits_enabled?: boolean;
  model_limits?: string;
  allow_ips?: string | null;
  group?: string;
  cross_group_retry?: boolean;
}
```

- Success Response: `{ success: boolean, message: string }`

### Update API Key

- Method: `PUT`
- Path: `/api/token/`
- Auth: user session
- Query:

```ts
interface UpdateApiKeyQuery {
  status_only?: string;
}
```

- Request Body:

```ts
interface UpdateApiKeyRequest extends Partial<CreateApiKeyRequest> {
  id: number;
  status?: number;
}
```

- Success Response: `ApiEnvelope<ApiKeyRecord>`

### Delete API Key

- Method: `DELETE`
- Path: `/api/token/:id`
- Auth: user session
- Success Response: `{ success: boolean, message: string }`

### Reveal API Key

- Method: `POST`
- Path: `/api/token/:id/key`
- Auth: user session
- Success Response:

```ts
type RevealApiKeyResponse = ApiEnvelope<{ key: string }>;
```

## Wallet

### Balance

- Method: `GET`
- Path: `/api/user/self`
- Auth: user session
- Success Fields: `quota`, `used_quota`
- Notes: Use `/api/status` quota settings for display conversion.

### Top-Up Config

- Method: `GET`
- Path: `/api/user/topup/info`
- Auth: user session
- Success Response: `ApiEnvelope<TopUpInfo>`

```ts
interface TopUpInfo {
  enable_online_topup: boolean;
  enable_stripe_topup: boolean;
  enable_creem_topup: boolean;
  enable_waffo_topup: boolean;
  enable_waffo_pancake_topup: boolean;
  enable_redemption: boolean;
  payment_compliance_confirmed: boolean;
  payment_compliance_terms_version?: string;
  pay_methods?: Array<Record<string, string>>;
  min_topup?: number;
  stripe_min_topup?: number;
  waffo_min_topup?: number;
  waffo_pancake_min_topup?: number;
  amount_options?: unknown;
  discount?: unknown;
}
```

### Billing Records

- Method: `GET`
- Path: `/api/user/topup/self`
- Auth: user session
- Query:

```ts
interface BillingRecordsQuery extends PageQuery {
  keyword?: string;
}
```

- Success Response: `ApiEnvelope<PageInfo<BillingRecord>>`

```ts
interface BillingRecord {
  id: number;
  user_id: number;
  amount: number;
  money: number;
  trade_no: string;
  payment_method: string;
  payment_provider: string;
  create_time: number;
  complete_time: number;
  status: string;
}
```

### Redeem Or Top Up

- Method: `POST`
- Path: `/api/user/topup`
- Auth: user session
- Request Body:

```ts
interface RedeemRequest {
  key: string;
}
```

- Success Response: `ApiEnvelope<number>`
- Notes: Response data is redeemed quota.

### EPay Amount Quote

- Method: `POST`
- Path: `/api/user/amount`
- Auth: user session
- Request Body: `{ amount: number }`
- Success Response: `{ message: 'success' | 'error', data: string }`

### EPay Payment Request

- Method: `POST`
- Path: `/api/user/pay`
- Auth: user session
- Request Body:

```ts
interface EpayRequest {
  amount: number;
  payment_method: string;
}
```

- Success Response: `{ message: 'success', data: Record<string, string>, url: string }`
- Notes: Client redirects to `url` with returned payment parameters appended.

### Stripe Amount Quote And Payment Request

- Method: `POST`
- Paths: `/api/user/stripe/amount`, `/api/user/stripe/pay`
- Auth: user session
- Request Body:

```ts
interface StripePayRequest {
  amount: number;
  payment_method: "stripe";
  success_url?: string;
  cancel_url?: string;
}
```

- Payment Success Response: `{ message: 'success', data: { pay_link: string } }`

### Waffo Amount Quote And Payment Request

- Method: `POST`
- Paths: `/api/user/waffo/amount`, `/api/user/waffo/pay`
- Auth: user session
- Request Body:

```ts
interface WaffoPayRequest {
  amount: number;
  pay_method_index?: number;
}
```

- Payment Success Response:
  `{ message: 'success', data: { payment_url: string, order_id: string } }`
- Notes: Creem and Waffo Pancake require deeper product selection review before
  commercial UI implementation.

## Logs

### Usage Logs

- Method: `GET`
- Path: `/api/log/self`
- Auth: user session
- Query:

```ts
interface UsageLogsQuery extends PageQuery {
  type?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  token_name?: string;
  model_name?: string;
  group?: string;
  request_id?: string;
  upstream_request_id?: string;
}
```

- Success Response: `ApiEnvelope<PageInfo<UsageLogRecord>>`

```ts
interface UsageLogRecord {
  id: number;
  user_id: number;
  created_at: number;
  type: number;
  content: string;
  username?: string;
  token_name?: string;
  model_name?: string;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  use_time: number;
  is_stream: boolean;
  channel: number;
  channel_name?: string;
  token_id?: number;
  group?: string;
  ip?: string;
  request_id?: string;
  upstream_request_id?: string;
  other?: string;
}
```

### Drawing Logs

- Method: `GET`
- Path: `/api/mj/self`
- Auth: user session
- Query:

```ts
interface DrawingLogQuery extends PageQuery {
  mj_id?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}
```

- Success Response: `ApiEnvelope<PageInfo<MidjourneyTaskRecord>>`
- Notes: Exact record shape should be narrowed during implementation.

### Task Logs

- Method: `GET`
- Path: `/api/task/self`
- Auth: user session
- Query:

```ts
interface TaskLogQuery extends PageQuery {
  platform?: string;
  task_id?: string;
  status?: string;
  action?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}
```

- Success Response: `ApiEnvelope<PageInfo<TaskLogRecord>>`
- Notes: Exact DTO shape should be narrowed during implementation.

## Models

### User Model List

- Method: `GET`
- Path: `/api/user/models`
- Auth: user session
- Success Response: `ApiEnvelope<string[]>`

### Dashboard Model Map

- Method: `GET`
- Path: `/api/models`
- Auth: user session
- Success Response: `ApiEnvelope<Record<string, string[]>>`
- Notes: Use only if the commercial model page needs channel model grouping.

## Playground

### Session Chat Completion

- Method: `POST`
- Path: `/pg/chat/completions`
- Auth: user session
- Request Body:

```ts
interface PlaygroundChatRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}
```

- Success Response: OpenAI-compatible chat completion payload.
- Error Response: `{ error: { message, type, code } }`
- Notes: This route is intended for the web playground and uses the current
  user session. Direct `/v1/chat/completions` remains API-key based.

## Admin MVP

Admin dashboard requests use the same session transport and `New-Api-User`
header as ordinary dashboard requests. Admin routes require backend admin
authorization. Root-only routes require root authorization.

### Admin Users

- Methods and Paths:
  - `GET /api/user/`
  - `GET /api/user/search`
  - `POST /api/user/`
  - `PUT /api/user/`
  - `DELETE /api/user/:id`
  - `POST /api/user/manage`
- Auth: admin session
- Query: `PageQuery`; search accepts `keyword`, `group`, `role`, `status`
- Notes: manage actions include enable, disable, promote, demote, delete, and
  quota adjustment modes.

### Admin Channels

- Methods and Paths:
  - `GET /api/channel/`
  - `GET /api/channel/search`
  - `POST /api/channel/`
  - `PUT /api/channel/`
  - `DELETE /api/channel/:id`
  - `POST /api/channel/batch`
  - `DELETE /api/channel/disabled`
  - `POST /api/channel/tag/enabled`
  - `POST /api/channel/tag/disabled`
  - `POST /api/channel/batch/tag`
  - `POST /api/channel/:id/key`
  - `GET /api/channel/fetch_models/:id`
  - `POST /api/channel/fetch_models`
  - `POST /api/channel/upstream_updates/detect`
  - `POST /api/channel/upstream_updates/apply`
  - `POST /api/channel/multi_key/manage`
  - `POST /api/channel/copy/:id`
  - `GET /api/channel/test/:id`
  - `GET /api/channel/update_balance/:id`
- Auth: admin session
- Query: `PageQuery`; search accepts keyword, group, model, status, type, and
  sort options where backend supports them.
- Notes: `POST /api/channel/batch` accepts `{ ids: number[] }`.
  `POST /api/channel/batch/tag` accepts `{ ids: number[], tag?: string | null }`.
  Tag-wide status endpoints accept `{ tag: string }`. `POST /api/channel/:id/key`
  is root-only and may require backend secure verification; success returns
  `ApiEnvelope<{ key: string }>`. `GET /api/channel/fetch_models/:id` returns
  `ApiEnvelope<string[]>`; root-only `POST /api/channel/fetch_models` accepts
  `{ base_url?: string, type: number, key: string }` and returns
  `ApiEnvelope<string[]>`. Single-channel upstream detection accepts
  `{ id: number }` and returns pending add/remove model candidates. Single-channel
  upstream apply accepts `{ id, add_models, remove_models, ignore_models }` and
  returns added, removed, ignored, remaining, and current model-list fields.
  Multi-key channel updates can pass
  `key_mode: "append" | "replace"` and `multi_key_mode: "random" | "polling"`
  with the normal channel update body. `POST /api/channel/multi_key/manage`
  accepts `{ channel_id, action, key_index?, page?, page_size?, status? }`.

### Admin Models

- Methods and Paths:
  - `GET /api/models/`
  - `GET /api/models/search`
  - `POST /api/models/`
  - `PUT /api/models/`
  - `DELETE /api/models/:id`
  - `GET /api/models/sync_upstream/preview`
  - `POST /api/models/sync_upstream`
  - `GET /api/models/missing`
  - `GET /api/vendors/`
  - `POST /api/vendors/`
  - `PUT /api/vendors/`
  - `DELETE /api/vendors/:id`
  - `GET /api/prefill_group/`
  - `POST /api/prefill_group/`
  - `PUT /api/prefill_group/`
  - `DELETE /api/prefill_group/:id`
- Auth: admin session
- Notes: model status-only updates use `PUT /api/models/?status_only=true`.
  Vendor status-only updates use `PUT /api/vendors/?status_only=true`.
  Upstream sync preview accepts optional `locale` query and returns
  `{ missing, conflicts, source }`; conflicts contain `model_name` and field
  differences with `{ field, local, upstream }`. Upstream sync accepts
  `{ locale?, overwrite?: { model_name, fields }[] }` and returns created,
  updated, skipped, and source metadata. Prefill groups accept
  `{ id?, name, type, items, description? }`; `GET /api/prefill_group/` accepts
  optional `type` query and returns an array. Model conflict resolution may use
  the official sync endpoint or existing model writes.

### Admin Model Deployments

- Methods and Paths:
  - `GET /api/deployments/settings`
  - `POST /api/deployments/settings/test-connection`
  - `GET /api/deployments/`
  - `GET /api/deployments/search`
  - `GET /api/deployments/:id`
  - `POST /api/deployments/`
  - `PUT /api/deployments/:id`
  - `PUT /api/deployments/:id/name`
  - `POST /api/deployments/:id/extend`
  - `DELETE /api/deployments/:id`
  - `GET /api/deployments/:id/logs`
  - `GET /api/deployments/:id/containers`
  - `GET /api/deployments/:id/containers/:container_id`
  - `GET /api/deployments/hardware-types`
  - `GET /api/deployments/locations`
  - `GET /api/deployments/available-replicas`
  - `POST /api/deployments/price-estimation`
  - `GET /api/deployments/check-name`
- Auth: admin session
- Notes: deployment provider is currently `io.net`. Settings response includes
  `{ provider, enabled, configured, can_connect }`. List/search return paginated
  deployment records and optional status counts. Create accepts
  `{ resource_private_name, duration_hours, gpus_per_container, hardware_id,
location_ids, container_config, registry_config }`. Update accepts mutable
  container configuration such as env variables, image URL, entrypoint,
  traffic port, args, and registry credentials. Extend accepts
  `{ duration_hours }`. Logs require `container_id` query and optional level,
  stream, cursor, limit, follow, start_time, and end_time.

### Admin Logs

- Methods and Paths:
  - `GET /api/log/`
  - `GET /api/log/stat`
  - `GET /api/mj/`
  - `GET /api/task/`
- Auth: admin session
- Notes: `/api/log/search` is deprecated for this frontend; filters are sent to
  `GET /api/log/`. Management audit logs are admin usage logs queried with
  `type=3`; structured audit context may be present in `other.op`,
  `other.admin_info`, and `other.audit_info`.

### Admin Redemptions

- Methods and Paths:
  - `GET /api/redemption/`
  - `GET /api/redemption/search`
  - `POST /api/redemption/`
  - `PUT /api/redemption/`
  - `DELETE /api/redemption/:id`
  - `DELETE /api/redemption/invalid`
- Auth: admin session
- Notes: create supports `name`, raw `quota`, `count`, and `expired_time`.
  Status-only updates use `PUT /api/redemption/?status_only=true`.

### Admin Billing

- Methods and Paths:
  - `GET /api/user/topup`
  - `POST /api/user/topup/complete`
- Auth: admin session
- Notes: manual completion uses body `{ trade_no: string }`.

### Admin Settings

- Methods and Paths:
  - `GET /api/option/`
  - `PUT /api/option/`
- Auth: root session
- Notes: sensitive keys are not returned by `GET /api/option/`. The MVP edits
  low-risk option values and backend-validated console JSON fields only.
