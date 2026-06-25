# Deployment

This commercial frontend can be deployed either on the same origin as the
backend or as a separate origin.

## Environment

| Variable              | Required | Description                                             |
| --------------------- | -------- | ------------------------------------------------------- |
| `PUBLIC_API_BASE_URL` | No       | Backend origin. Leave empty for same-origin deployment. |
| `DEV_BACKEND_ORIGIN`  | No       | Dev-only backend origin used by Rsbuild proxy.          |

Examples:

```env
# Same-origin deployment
PUBLIC_API_BASE_URL=
DEV_BACKEND_ORIGIN=http://localhost:3000

# Separate backend origin
PUBLIC_API_BASE_URL=https://api.example.com
```

## Local Dev Proxy

For local backend integration, prefer the dev proxy to avoid browser CORS and
cross-site cookie issues.

```env
PUBLIC_API_BASE_URL=
DEV_BACKEND_ORIGIN=http://localhost:3000
```

With this setup, the browser calls same-origin paths such as `/api/user/login`,
and Rsbuild proxies them to the backend.

## Same-Origin Deployment

Recommended when possible.

- Frontend serves from the same origin as backend.
- Session cookies work without special cross-site browser handling.
- `PUBLIC_API_BASE_URL` can remain empty.

## Cross-Origin Deployment

When frontend and backend are on different origins:

- Backend must allow the frontend origin in CORS.
- Backend cookies must be configured for cross-site usage when session auth is
  needed.
- HTTPS is required for secure cross-site cookies.
- The frontend uses `credentials: include` for dashboard requests.

## Build

```bash
bun install
bun run verify
```

The production output is written to `dist/`.

## Release Gate

Before deploying:

- `bun run provenance`
- `bun run typecheck`
- `bun run lint`
- `bun run build`
- Review `docs/provenance-checklist.md`.
- Update `docs/third-party-notices.md` if dependencies changed.
