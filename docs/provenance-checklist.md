# Provenance Checklist

Use this checklist before merging any feature into the commercial frontend.

## Author Confirmation

- [ ] The code was written directly in this repository.
- [ ] No AGPL frontend source file was copied or mechanically translated.
- [ ] No AGPL component layout was recreated as a near clone.
- [ ] No AGPL Tailwind class composition or CSS block was copied.
- [ ] No AGPL translation string set was copied.
- [ ] No AGPL route tree or file-based route structure was copied.
- [ ] No AGPL frontend image, logo, icon, or asset was copied.

## Protocol Confirmation

- [ ] Endpoint is documented in `docs/protocol-contract.md`.
- [ ] Request schema is documented.
- [ ] Response schema is documented.
- [ ] Error behavior is documented.
- [ ] Pagination and filtering behavior are documented when relevant.

## Product Confirmation

- [ ] Feature maps to a row in `docs/feature-parity.md`.
- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Chinese and English UI copy are independently authored when needed.

## Release Confirmation

- [ ] `bun run typecheck` passes.
- [ ] `bun run build` passes.
- [ ] `bun run lint` passes.
- [ ] Third-party dependency impact is recorded if a package was added.
