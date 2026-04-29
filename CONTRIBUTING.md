# Contributing to setup-chrome

Thank you for your interest in contributing!

## Development Setup

**Prerequisites:** Node.js ≥ 24, [pnpm](https://pnpm.io/)

```bash
# Install dependencies
pnpm install
```

## Development Workflow

```bash
# Lint (CI mode, no auto-fix)
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Run unit tests
pnpm test

# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run a single test file
npx vitest run __test__/<file>.test.ts

# Build (compiles TypeScript → dist/index.js via @vercel/ncc)
pnpm build

# Package (copies action.yml + README.md into dist/)
pnpm package
```

## Submitting Changes

1. Fork the repository and create a branch from `master`.
2. Make your changes with tests where applicable.
3. Run `pnpm lint` and `pnpm test` to verify everything passes.
4. Open a pull request against `master`.

**Important:** All commit messages must follow [Conventional Commits][] — this is required for the automated release process to correctly determine version bumps and generate changelog entries.

Examples:
- `fix: handle missing chromedriver binary on Windows`
- `feat: add support for chrome-version input alias`
- `chore: update dependencies`

## Release Process

Releases are automated with [Release Please](https://github.com/googleapis/release-please):

1. Merge changes to `master` following Conventional Commits.
2. Release Please opens or updates a release PR with version bumps and changelog updates.
3. Squash and merge the release PR.
4. CI builds `dist/`, pushes it to the `latest` branch, and creates signed `vX` and `vX.Y.Z` tags.

> **Note:** Never commit generated `dist/` files to the source branch — they are built and published automatically by CI.

[Conventional Commits]: https://www.conventionalcommits.org/en/v1.0.0/
