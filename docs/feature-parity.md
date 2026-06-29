# Feature Parity Matrix

This matrix tracks commercial frontend feature coverage without copying AGPL
frontend implementation details.

## Status Legend

| Status             | Meaning                                                     |
| ------------------ | ----------------------------------------------------------- |
| Planned            | Required, not started                                       |
| Protocol Needed    | Backend contract must be documented first                   |
| Protocol Extracted | Backend contract is documented and ready for typed API work |
| In Design          | Independent commercial UI design in progress                |
| In Build           | Implementation in this repository                           |
| Verified           | Built and checked against backend behavior                  |
| Deferred           | Not required for initial commercial release                 |
| Excluded           | Intentionally not part of commercial frontend               |

## User-Facing Features

| Area       | Feature                  | Status             | Protocol Section                     | Notes                                                                         |
| ---------- | ------------------------ | ------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| Auth       | Login                    | Protocol Extracted | Auth / Login                         | Required before real user data                                                |
| Auth       | Logout                   | Protocol Extracted | Auth / Logout                        | Must clear client state safely                                                |
| Auth       | Current user profile     | Protocol Extracted | Auth / Current User                  | Drives role and account display                                               |
| Overview   | Remaining balance        | In Build           | Wallet / Balance                     | Bound to current user quota                                                   |
| Overview   | Usage summary            | In Build           | User Console / Usage Summary         | Bound to quota, RPM, TPM                                                      |
| Overview   | Setup guide              | In Build           | User Console                         | Commercial UI defines new flow                                                |
| Overview   | Platform brief stream    | In Build           | User Console / Platform Status       | Bound to status flags and platform start time                                 |
| Models     | Model list               | In Build           | Models / User Model List             | Bound to current user model list                                              |
| Models     | Model detail             | In Build           | Models                               | Availability detail implemented; pricing contract pending                     |
| Logs       | Usage logs               | In Build           | Logs / Usage Logs                    | Bound to page tab 1 with filters and pagination                               |
| Logs       | Drawing logs             | In Build           | Logs / Drawing Logs                  | Bound to page tab 2 with filters and pagination                               |
| Logs       | Task logs                | In Build           | Logs / Task Logs                     | Bound to page tab 3 with filters and pagination                               |
| Playground | Text request runner      | In Build           | Playground / Session Chat Completion | Non-streaming `/pg/chat/completions` runner implemented                       |
| Playground | Model parameter controls | In Build           | Models                               | Model, system prompt, temperature, top P, max tokens implemented              |
| API Keys   | List keys                | In Build           | API Keys / List API Keys             | Search and pagination implemented                                             |
| API Keys   | Create key               | In Build           | API Keys / Create API Key            | Create form implemented                                                       |
| API Keys   | Update key               | In Build           | API Keys / Update API Key            | Edit form implemented                                                         |
| API Keys   | Delete or revoke key     | In Build           | API Keys / Delete API Key            | Delete action implemented                                                     |
| Wallet     | Balance                  | In Build           | Wallet / Balance                     | Bound to current user quota                                                   |
| Wallet     | Billing records          | In Build           | Wallet / Billing Records             | Bound to top-up records                                                       |
| Wallet     | Redeem or top up         | In Build           | Wallet / Redeem Or Top Up            | Redemption, EPay, Stripe, and Waffo implemented; Creem/Waffo Pancake deferred |
| Profile    | Display user info        | In Build           | Auth / Current User                  | Bound to auth store                                                           |
| Profile    | Update profile           | In Build           | Auth / Update Current User           | Bound to profile update endpoint                                              |
| Profile    | Language preference      | In Build           | Auth / Update Current User           | Bound to `language` update                                                    |

## Admin Strategy

| Area                       | Decision                   | Status   | Notes                                                                                          |
| -------------------------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Existing AGPL admin UI     | Keep separate deployment   | Deferred | Can remain available separately while commercial UI matures                                    |
| Commercial admin rewrite   | Clean-room MVP             | Verified | Independent admin surface implemented from backend protocol                                    |
| Shared auth with admin     | Session based              | Verified | Same backend session and `New-Api-User` header                                                 |
| Admin users                | Post-MVP users phase       | Verified | User CRUD, role/status/quota ops, OAuth bindings, binding cleanup, passkey, 2FA, subscriptions |
| Admin channels             | MVP coverage               | Verified | List, search, create, edit, delete, test, balance, copy                                        |
| Admin models               | Post-MVP models phase      | Verified | Model CRUD, official sync, conflict triage, vendor CRUD, prefills, deployments                 |
| Admin logs                 | Post-MVP logs complete     | Verified | Usage, audit, drawing, task logs, filters, usage stats, admin quota and flow data              |
| Admin redemptions          | MVP coverage               | Verified | List, search, batch generate, edit, status, cleanup                                            |
| Admin billing              | Post-MVP billing complete  | Verified | Top-up ledger, manual completion, subscription plans, and root payment gateway configuration   |
| Admin settings             | Post-MVP settings complete | Verified | Root-only settings, security editors, structured console content, and performance operations   |
| High-sensitivity admin ops | Post-MVP                   | Deferred | Advanced audit tooling                                                                         |

## Commercial Release Gate

| Gate                   | Requirement                                                                                    | Status   |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| Source provenance      | No AGPL frontend code, styles, assets, translations, route tree, or component structure copied | In Build |
| Protocol documentation | Every implemented endpoint documented in `protocol-contract.md`                                | Verified |
| Dependency review      | All third-party packages listed with license                                                   | Planned  |
| Feature parity review  | Required rows in this matrix marked Verified                                                   | Planned  |
| Build verification     | `typecheck`, `build`, and `lint` pass                                                          | Verified |
| Admin smoke test       | `docs/admin-mvp-smoke-test.md` completed against target backend                                | Verified |
