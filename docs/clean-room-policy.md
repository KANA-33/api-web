# Clean-Room Policy

This project exists to replace an AGPL-derived frontend with an independently
authored commercial frontend.

## Allowed Inputs

- Public backend API documentation.
- OpenAPI or equivalent protocol specifications.
- Network traces that describe endpoints, methods, headers, request bodies,
  response bodies, and status codes.
- Product requirements written without copying AGPL frontend source text.
- Independently created brand, UI, and interaction specifications.

## Forbidden Inputs

- Copying frontend source files, hooks, stores, route files, components, CSS,
  Tailwind class compositions, translations, table definitions, dashboard
  logic, assets, icons, or generated route trees from the AGPL frontend.
- Porting code by renaming variables or rearranging files.
- Reusing screenshots as pixel-perfect implementation references.
- Reusing distinctive layout hierarchy, wording, or visual composition from the
  AGPL frontend.

## Engineering Process

1. Record each backend capability in `docs/protocol-contract.md`.
2. Build a fresh UI and state model from product requirements.
3. Keep dependencies and licenses listed in `docs/third-party-notices.md`.
4. Review every new feature for provenance before release.
