# Integration QA

Use this guide when connecting the commercial frontend to a real backend.

## Preflight

- Confirm backend is reachable from the browser.
- For local development, prefer `PUBLIC_API_BASE_URL=` and
  `DEV_BACKEND_ORIGIN=http://localhost:3000` so Rsbuild proxies `/api`, `/pg`,
  `/v1`, and `/mj`.
- In dev proxy mode, `PUBLIC_API_BASE_URL` must be empty. If it points directly
  to the backend, login may succeed while `/api/user/self` returns 401 because
  the session cookie belongs to a different origin.
- Use direct `PUBLIC_API_BASE_URL` only when backend CORS and cross-site cookies
  are already configured correctly.

## Login 200 But `/api/user/self` 401

This means the username/password passed, but the session cookie did not come
back on the next request.

Check:

- Request URL in DevTools should be `/api/user/login`, not
  `http://backend-origin/api/user/login`.
- `.env` should contain `PUBLIC_API_BASE_URL=` when using dev proxy.
- `.env` should contain the backend only in `DEV_BACKEND_ORIGIN`.
- Restart `bun run dev` after editing `.env`.
- The `/api/user/login` response should include `Set-Cookie: session=...`.
- The `/api/user/self` request should include `Cookie: session=...`.
- Confirm dashboard session cookies work with `credentials: include`.
- Confirm backend CORS allows the frontend origin for cross-origin deployment.

## Smoke Test

1. Open `/login`.
2. Sign in with a test user.
3. Confirm `/overview` loads account quota and platform status.
4. Open `/api-keys` and list keys.
5. Create a test key, reveal it, edit it, then delete it.
6. Open `/wallet` and confirm balance, payment availability, and records load.
7. Test redemption in a non-production environment.
8. Test payment redirects only with sandbox provider credentials.
9. Open `/logs` and switch usage, drawing, and task tabs.
10. Apply and clear log filters.
11. Open `/models`, then a model detail route.
12. Open `/playground` and run a non-streaming request.
13. Sign out and confirm protected routes redirect to `/login`.

## Admin Smoke Test

Use `docs/admin-mvp-smoke-test.md` with an admin account and a root account.

- Normal users should be redirected away from `/admin`.
- Admin users should reach users, channels, models, logs, redemptions, and
  billing.
- Root users should reach settings.
- Non-root admins should see the settings root-access notice.
- Run destructive actions only against disposable test data.

## Module Visibility

The app shell reads `/api/status` before entering the authenticated shell.

- `self_use_mode_enabled: false` hides Playground.
- Additional module visibility should be wired only from backend status or user
  permission contracts.

## Known Deferred Items

- Creem checkout.
- Waffo Pancake checkout.
- 2FA login completion UI.
- OAuth login buttons.
- Registration and password reset pages.
- Streaming Playground responses.
- High-sensitivity admin operations such as payment gateway configuration,
  secret reveal, security editors, and audit tooling.
