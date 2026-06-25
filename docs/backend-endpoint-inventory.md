# Backend Endpoint Inventory

Phase 1 source: backend Go router/controller files and `docs/openapi/api.json`.
This inventory records protocol facts only.

## Response Envelope

Most dashboard APIs return:

```ts
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}
```

Some relay-compatible endpoints return OpenAI/Anthropic/Gemini shaped payloads
without this envelope.

## Authenticated Dashboard Header

After successful login, authenticated dashboard requests must include:

```http
New-Api-User: <current user id>
```

The backend checks this header against the session user id.

## Pagination

Pagination query parameters:

```ts
interface PageQuery {
  p?: number;
  page_size?: number;
  ps?: number;
  size?: number;
}
```

Paginated payload:

```ts
interface PageInfo<T> {
  page: number;
  page_size: number;
  total: number;
  items: T[];
}
```

The backend caps `page_size` at 100.

## User Auth And Account

| Capability         | Method | Path                    | Auth            | Notes                                               |
| ------------------ | ------ | ----------------------- | --------------- | --------------------------------------------------- |
| Login              | POST   | `/api/user/login`       | Anonymous       | Cookie/session login; may return `require_2fa`      |
| 2FA login          | POST   | `/api/user/login/2fa`   | Pending session | Completes password login when 2FA is required       |
| Logout             | GET    | `/api/user/logout`      | Session         | Clears server session                               |
| Register           | POST   | `/api/user/register`    | Anonymous       | May require email verification and Turnstile        |
| Current user       | GET    | `/api/user/self`        | User session    | Main account payload                                |
| Update profile     | PUT    | `/api/user/self`        | User session    | Supports profile fields, language, sidebar settings |
| Delete own account | DELETE | `/api/user/self`        | User session    | High-risk action                                    |
| User groups        | GET    | `/api/user/groups`      | Anonymous       | Public group options                                |
| Self groups        | GET    | `/api/user/self/groups` | User session    | Authenticated group options                         |
| User models        | GET    | `/api/user/models`      | User session    | Returns enabled model names for current user        |

## Platform And Overview

| Capability           | Method | Path                     | Auth               | Notes                                                           |
| -------------------- | ------ | ------------------------ | ------------------ | --------------------------------------------------------------- |
| Public status/config | GET    | `/api/status`            | Anonymous          | System flags, quota display config, OAuth config, panel content |
| Uptime Kuma status   | GET    | `/api/uptime/status`     | Anonymous          | Runtime status panel                                            |
| Notice               | GET    | `/api/notice`            | Anonymous          | Notice content                                                  |
| About                | GET    | `/api/about`             | Anonymous          | About content                                                   |
| Home content         | GET    | `/api/home_page_content` | Anonymous          | Public landing content                                          |
| Pricing              | GET    | `/api/pricing`           | Header module auth | Pricing page data                                               |
| User quota chart     | GET    | `/api/data/self`         | User session       | Usage over time, max range one month                            |
| User flow chart      | GET    | `/api/data/flow/self`    | User session       | Flow usage over time, max range one month                       |
| User log stats       | GET    | `/api/log/self/stat`     | User session       | Quota, RPM, TPM summary                                         |

## API Keys

Backend names API keys as tokens.

| Capability                | Method | Path                    | Auth           | Notes                                          |
| ------------------------- | ------ | ----------------------- | -------------- | ---------------------------------------------- |
| List keys                 | GET    | `/api/token/`           | User session   | Paginated                                      |
| Search keys               | GET    | `/api/token/search`     | User session   | `keyword`, `token`, pagination                 |
| Key detail                | GET    | `/api/token/:id`        | User session   | Masked key                                     |
| Reveal key                | POST   | `/api/token/:id/key`    | User session   | Returns full key                               |
| Create key                | POST   | `/api/token/`           | User session   | Creates generated secret                       |
| Update key                | PUT    | `/api/token/`           | User session   | Query `status_only` toggles status-only update |
| Delete key                | DELETE | `/api/token/:id`        | User session   | Deletes one key                                |
| Batch delete keys         | POST   | `/api/token/batch`      | User session   | Body `{ ids: number[] }`                       |
| Batch reveal keys         | POST   | `/api/token/batch/keys` | User session   | Body `{ ids: number[] }`, max 100              |
| Token usage by bearer key | GET    | `/api/usage/token/`     | Bearer API key | Read-only API-key usage endpoint               |

## Wallet And Payments

| Capability                 | Method | Path                             | Auth         | Notes                                         |
| -------------------------- | ------ | -------------------------------- | ------------ | --------------------------------------------- |
| Top-up config              | GET    | `/api/user/topup/info`           | User session | Payment methods, min amounts, discount config |
| Top-up records             | GET    | `/api/user/topup/self`           | User session | Paginated, optional `keyword`                 |
| Redeem code                | POST   | `/api/user/topup`                | User session | Redemption/top-up action                      |
| EPay amount quote          | POST   | `/api/user/amount`               | User session | Body includes `amount`                        |
| EPay request               | POST   | `/api/user/pay`                  | User session | Payment request                               |
| Stripe amount quote        | POST   | `/api/user/stripe/amount`        | User session | Stripe quote                                  |
| Stripe payment             | POST   | `/api/user/stripe/pay`           | User session | Stripe payment request                        |
| Creem payment              | POST   | `/api/user/creem/pay`            | User session | Creem payment request                         |
| Waffo amount quote         | POST   | `/api/user/waffo/amount`         | User session | Waffo quote                                   |
| Waffo payment              | POST   | `/api/user/waffo/pay`            | User session | Waffo payment request                         |
| Waffo Pancake amount quote | POST   | `/api/user/waffo-pancake/amount` | User session | Waffo Pancake quote                           |
| Waffo Pancake payment      | POST   | `/api/user/waffo-pancake/pay`    | User session | Waffo Pancake payment request                 |
| Affiliate transfer         | POST   | `/api/user/aff_transfer`         | User session | Transfer affiliate quota                      |

Payment flows are high-risk and need product/legal review before commercial UI
implementation.

Phase 6 implementation covers:

- Redemption code submission.
- EPay amount quote and payment redirect.
- Stripe amount quote and Checkout redirect.
- Waffo amount quote and payment redirect.

Still deferred:

- Creem product-based checkout.
- Waffo Pancake checkout.
- Provider-specific compliance screens beyond backend enablement flags.

## Logs

| Capability             | Method | Path                 | Auth           | Notes                            |
| ---------------------- | ------ | -------------------- | -------------- | -------------------------------- |
| Usage logs             | GET    | `/api/log/self`      | User session   | Paginated; filters listed below  |
| Usage log stats        | GET    | `/api/log/self/stat` | User session   | Summary fields                   |
| Drawing logs           | GET    | `/api/mj/self`       | User session   | Paginated Midjourney/image tasks |
| Task logs              | GET    | `/api/task/self`     | User session   | Paginated async task records     |
| Recent logs by API key | GET    | `/api/log/token`     | Bearer API key | Read-only API-key endpoint       |

Usage log filters:

```ts
interface UsageLogQuery extends PageQuery {
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

Drawing log filters:

```ts
interface DrawingLogQuery extends PageQuery {
  mj_id?: string;
  start_timestamp?: number;
  end_timestamp?: number;
}
```

Task log filters:

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

## Models

| Capability               | Method | Path               | Auth                            | Notes                                  |
| ------------------------ | ------ | ------------------ | ------------------------------- | -------------------------------------- |
| Current user model names | GET    | `/api/user/models` | User session                    | Returns `string[]`                     |
| Dashboard model map      | GET    | `/api/models`      | User session                    | Returns channel-type to model-list map |
| Public/relay model list  | GET    | `/v1/models`       | API key/session depending route | OpenAI-compatible shape                |

The commercial user console should use `/api/user/models` for user-facing model
availability unless a richer product requirement is documented.

## Playground And Relay

| Capability              | Method | Path                       | Auth           | Notes                                     |
| ----------------------- | ------ | -------------------------- | -------------- | ----------------------------------------- |
| Session playground chat | POST   | `/pg/chat/completions`     | User session   | OpenAI-compatible chat completion request |
| API-key chat completion | POST   | `/v1/chat/completions`     | Bearer API key | Direct relay endpoint                     |
| API-key text completion | POST   | `/v1/completions`          | Bearer API key | Direct relay endpoint                     |
| API-key responses       | POST   | `/v1/responses`            | Bearer API key | Direct relay endpoint                     |
| Image generation        | POST   | `/v1/images/generations`   | Bearer API key | Direct relay endpoint                     |
| Embeddings              | POST   | `/v1/embeddings`           | Bearer API key | Direct relay endpoint                     |
| Audio transcription     | POST   | `/v1/audio/transcriptions` | Bearer API key | Direct relay endpoint                     |

Commercial Playground should prefer `/pg/chat/completions` for ordinary users
because it uses the current browser session rather than requiring manual API-key
handling.

## Optional User Features

| Capability      | Method | Path                                    | Auth         | Notes                      |
| --------------- | ------ | --------------------------------------- | ------------ | -------------------------- |
| 2FA status      | GET    | `/api/user/2fa/status`                  | User session | Security settings          |
| 2FA setup       | POST   | `/api/user/2fa/setup`                   | User session | Returns setup data         |
| 2FA enable      | POST   | `/api/user/2fa/enable`                  | User session | Enable 2FA                 |
| 2FA disable     | POST   | `/api/user/2fa/disable`                 | User session | Disable 2FA                |
| Backup codes    | POST   | `/api/user/2fa/backup_codes`            | User session | Regenerate codes           |
| Check-in status | GET    | `/api/user/checkin`                     | User session | Optional reward flow       |
| Check in        | POST   | `/api/user/checkin`                     | User session | May require Turnstile      |
| OAuth bindings  | GET    | `/api/user/oauth/bindings`              | User session | Account connections        |
| Unbind OAuth    | DELETE | `/api/user/oauth/bindings/:provider_id` | User session | Account connection removal |

## Admin MVP

| Capability                 | Method | Path                              | Auth          | Notes                                     |
| -------------------------- | ------ | --------------------------------- | ------------- | ----------------------------------------- |
| Admin user list            | GET    | `/api/user/`                      | Admin session | Paginated                                 |
| Admin user search          | GET    | `/api/user/search`                | Admin session | Keyword, group, role, status filters      |
| Admin user create          | POST   | `/api/user/`                      | Admin session | Creates one account                       |
| Admin user update          | PUT    | `/api/user/`                      | Admin session | Updates profile, group, role, status      |
| Admin user delete          | DELETE | `/api/user/:id`                   | Admin session | Deletes one user                          |
| Admin user manage          | POST   | `/api/user/manage`                | Admin session | Quota and role/status helper actions      |
| Channel list               | GET    | `/api/channel/`                   | Admin session | Paginated                                 |
| Channel search             | GET    | `/api/channel/search`             | Admin session | Keyword, model, group, status, type       |
| Channel create             | POST   | `/api/channel/`                   | Admin session | Single-channel MVP                        |
| Channel update             | PUT    | `/api/channel/`                   | Admin session | Updates one channel                       |
| Channel delete             | DELETE | `/api/channel/:id`                | Admin session | Deletes one channel                       |
| Channel copy               | POST   | `/api/channel/copy/:id`           | Admin session | Duplicates one channel                    |
| Channel test               | GET    | `/api/channel/test/:id`           | Admin session | Optional model query                      |
| Channel balance            | GET    | `/api/channel/update_balance/:id` | Admin session | Provider balance refresh                  |
| Admin model list           | GET    | `/api/models/`                    | Admin session | Paginated                                 |
| Admin model search         | GET    | `/api/models/search`              | Admin session | Keyword and vendor filters                |
| Admin model create         | POST   | `/api/models/`                    | Admin session | Creates metadata record                   |
| Admin model update         | PUT    | `/api/models/`                    | Admin session | Status-only query supported               |
| Admin model delete         | DELETE | `/api/models/:id`                 | Admin session | Deletes one model                         |
| Missing models             | GET    | `/api/models/missing`             | Admin session | Review upstream-visible missing names     |
| Vendor list                | GET    | `/api/vendors/`                   | Admin session | Used for model assignment                 |
| Admin usage logs           | GET    | `/api/log/`                       | Admin session | Filtered list; no deprecated search route |
| Admin usage stats          | GET    | `/api/log/stat`                   | Admin session | Quota, RPM, TPM                           |
| Admin drawing logs         | GET    | `/api/mj/`                        | Admin session | Paginated image task records              |
| Admin task logs            | GET    | `/api/task/`                      | Admin session | Paginated async task records              |
| Redemption list            | GET    | `/api/redemption/`                | Admin session | Paginated                                 |
| Redemption search          | GET    | `/api/redemption/search`          | Admin session | Keyword or exact id behavior              |
| Redemption create          | POST   | `/api/redemption/`                | Admin session | Supports count, quota, expiration         |
| Redemption update          | PUT    | `/api/redemption/`                | Admin session | Status-only query supported               |
| Redemption delete          | DELETE | `/api/redemption/:id`             | Admin session | Deletes one code                          |
| Redemption invalid cleanup | DELETE | `/api/redemption/invalid`         | Admin session | Removes used, disabled, expired codes     |
| Admin top-up records       | GET    | `/api/user/topup`                 | Admin session | Paginated, optional keyword               |
| Manual top-up completion   | POST   | `/api/user/topup/complete`        | Admin session | Body `{ trade_no: string }`               |
| Root option list           | GET    | `/api/option/`                    | Root session  | Sensitive keys omitted by backend         |
| Root option update         | PUT    | `/api/option/`                    | Root session  | Body `{ key, value }`                     |
