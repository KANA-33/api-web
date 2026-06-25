# Commercial Frontend

Clean-room commercial frontend for a New API-compatible service.

This repository must not contain source code copied from the AGPL frontend.
Compatibility is limited to the backend communication protocol: HTTP routes,
request/response schemas, auth headers, status codes, and documented behavior.

## Stack

- React 19
- TypeScript
- Tailwind CSS v4
- Rsbuild
- TanStack Router

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run verify
```

## Clean-Room Rule

Before implementing a feature, document the protocol contract in
`docs/protocol-contract.md`. Implement UI, state, copy, styling, and file
structure independently.

## Key Documents

- `docs/clean-room-policy.md`: allowed and forbidden inputs.
- `docs/protocol-contract.md`: backend communication contract.
- `docs/feature-parity.md`: user-facing feature matrix.
- `docs/implementation-roadmap.md`: phased delivery plan.
- `docs/provenance-checklist.md`: merge-time source hygiene checklist.
- `docs/deployment.md`: deployment and environment guidance.
- `docs/release-checklist.md`: release gate checklist.
- `docs/integration-qa.md`: backend integration smoke-test guide.
- `docs/development-notes.md`: current engineering notes.
