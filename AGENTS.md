# Agentic Coding Guide

This file provides guidance for AI coding agents working in this repository.

## Repository Purpose

`setup-chrome` is a GitHub Action that installs Google Chrome, Chromium, and optionally ChromeDriver on GitHub Actions runners. It supports stable/beta/dev/canary channels, specific version numbers, commit positions (snapshot builds), and the latest snapshot.

## Commands

```bash
pnpm install --frozen-lockfile   # install dependencies
pnpm lint                        # lint with Biome (CI mode, no auto-fix)
pnpm lint:fix                    # lint with auto-fix
pnpm test                        # run all unit tests with Vitest
pnpm test -- --reporter=verbose  # verbose test output
npx vitest run __test__/<file>.test.ts  # run a single test file
pnpm build                       # compile TypeScript → dist/index.js
pnpm package                     # copy action.yml + README.md into dist/
```

## Project Layout

```
src/
  index.ts              # action entry point: reads inputs, selects installer, sets outputs
  installer.ts          # Installer interface (checkInstalled, download, install for browser+driver)
  version.ts            # version string parser → typed spec (latest | channel | snapshot | four-parts)
  platform.ts           # OS/arch detection → Platform struct
  latest_installer.ts   # installs the latest snapshot build
  snapshot_installer.ts # installs a specific snapshot by commit position
  version_installer.ts  # installs a known-good version via Chrome for Testing API
  channel_linux.ts      # channel installer for Linux (stable/beta/dev/canary)
  channel_macos.ts      # channel installer for macOS
  channel_windows.ts    # channel installer for Windows
  chrome_for_testing.ts # client for the Chrome for Testing JSON API
  snapshot_bucket.ts    # client for the Chromium snapshot GCS bucket
  cache.ts              # tool-cache helpers for caching installed binaries
  dependencies.ts       # install system dependencies on Linux (apt)
__test__/
  *.test.ts             # Vitest unit tests, one file per source module
  data/                 # JSON fixtures for API responses (excluded from linting)
action.yml              # action metadata: inputs, outputs, runs.using: node24
biome.json              # linter/formatter config (space indent; useLiteralKeys and noUselessElse off)
```

## Architecture

Version resolution follows a strategy pattern. `version.ts` parses the input string into one of four types, and `index.ts` selects the appropriate `Installer` implementation:

| Version spec        | Installer class               | Source                    |
|---------------------|-------------------------------|---------------------------|
| `latest`            | `LatestInstaller`             | Chromium snapshot bucket  |
| `stable/beta/dev/canary` | `*ChannelInstaller`      | Platform package manager  |
| `1295939` (commit)  | `SnapshotInstaller`           | Chromium snapshot bucket  |
| `120.0.6099.x`      | `KnownGoodVersionInstaller`   | Chrome for Testing API    |

All installer classes implement the `Installer` interface from `installer.ts`. Each provides methods for both browser and ChromeDriver installation.

The action uses `actions-swing` as a shared utility library — check there before adding new utility functions.

## Testing

Tests live in `__test__/` and use [Vitest](https://vitest.dev/). Test files mirror source file names (e.g., `version.test.ts` tests `version.ts`).

- JSON fixtures for mocked API responses are in `__test__/data/` — do not lint this directory.
- Tests mock network calls; no real HTTP requests are made.
- When adding a new installer or version format, add a corresponding test file.

## Conventions

- **TypeScript strict mode** — all types must be explicit; avoid `any`.
- **Linter:** Biome — run `pnpm lint` before committing. `useLiteralKeys` and `noUselessElse` rules are disabled.
- **Formatter:** Biome with space indentation.
- **Node.js ≥ 24** is required (specified in `package.json` engines and `action.yml`).
- **Conventional Commits** are required for all commits (`feat:`, `fix:`, `chore:`, etc.).
- **Never commit `dist/`** — it is built by CI and deployed to the `latest` branch on release.
- The `action.yml` `main` field points to `index.js` inside `dist/`, not the TypeScript source.
