# Development Notes

## Current Product Boundary

This repository is the commercial user-facing console. It is not a continuation
of the AGPL frontend.

The current shell is intentionally minimal. It establishes:

- Independent app structure.
- Independent visual language.
- Independent route definitions.
- Independent API client boundary.
- Documentation-first protocol workflow.

## Next Engineering Tasks

1. Bind placeholder pages to typed API modules.
2. Add loading, empty, and error states for each page.
3. Add two-factor login UI after confirming final 2FA response payload.
4. Add Chinese and English copy from newly written product language.
5. Add release CI for typecheck, build, lint, and provenance review.

## Suggested Source Layout

```txt
src/
  app/
    router.tsx
  features/
    auth/
    api-keys/
    wallet/
    logs/
    models/
    playground/
  pages/
    overview/
    api-keys/
    wallet/
    logs/
    models/
    playground/
    profile/
  shared/
    api/
    lib/
    ui/
  widgets/
    app-shell/
```

Rules:

- `shared` must not import from `features`, `pages`, or `widgets`.
- `features` may import from `shared`.
- `pages` may compose `features`, `widgets`, and `shared`.
- `widgets` may import from `shared`, but should avoid importing business
  feature internals unless it is a deliberate shell-level integration.

## Phase 2 Runtime Notes

- Dashboard auth uses backend cookie/session and `credentials: include`.
- Bearer API keys are only used for read-only API-key endpoints when explicitly
  stored as `commercial_console_api_key`.
- API modules live under `src/features/*/api.ts` and map directly to
  `docs/protocol-contract.md`.
- Route guard calls `GET /api/user/self` before entering the authenticated app
  shell.
- Business errors from `{ success: false, message }` are normalized as
  `ApiError`.

## Admin Handling

The commercial user console should not include AGPL admin frontend source. Keep
admin as one of these options:

- Separate AGPL deployment that complies with AGPL.
- Separate clean-room commercial admin rewrite.
- Commercially licensed upstream frontend, if all rights are obtained.
