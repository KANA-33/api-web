# Release Checklist

Use this checklist for every commercial frontend release.

## Build Verification

- [ ] `bun install --frozen-lockfile` succeeds.
- [x] `bun run provenance` succeeds.
- [x] `bun run typecheck` succeeds.
- [x] `bun run lint` succeeds.
- [x] `bun run build` succeeds.

## Runtime Verification

- [ ] Login works with the target backend.
- [ ] Logout clears the session.
- [ ] Overview loads account, quota, usage, and status data.
- [ ] API Keys list, search, create, edit, reveal, and delete work.
- [ ] Wallet loads balance, top-up config, and billing records.
- [ ] Redemption code flow is tested in a non-production environment.
- [ ] Online payment provider redirects are tested with sandbox credentials.
- [ ] Usage, drawing, and task logs load with filters and pagination.
- [ ] Model list and model detail routes work.
- [ ] Playground can run a non-streaming request.
- [x] Admin smoke test in `docs/admin-mvp-smoke-test.md` passes for admin and
      root accounts.
- [x] Ordinary users are redirected away from `/admin`.
- [x] High-sensitivity admin features remain deferred or protected.

## Clean-Room Verification

- [ ] No AGPL frontend source was copied.
- [ ] No AGPL frontend styles or Tailwind class compositions were copied.
- [ ] No AGPL frontend translation tables were copied.
- [ ] No AGPL frontend generated route tree was copied.
- [ ] No AGPL frontend assets were copied.
- [ ] All implemented endpoints are documented in `docs/protocol-contract.md`.
- [ ] New UI copy was independently authored.

## Dependency Verification

- [ ] `docs/third-party-notices.md` lists runtime dependencies.
- [ ] Added packages have acceptable commercial licenses.
- [ ] Lockfile changes are reviewed.
