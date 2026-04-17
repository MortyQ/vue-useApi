# Contributing to @ametie/vue-muza-use

Thanks for your interest in contributing. This is a focused library — contributions that fix real problems or add well-scoped features are welcome.

## Before You Start

- Check [existing issues](https://github.com/MortyQ/vue-muza-use/issues) to avoid duplicates.
- For large changes, open an issue first to discuss the approach.
- For bug fixes and small improvements, a PR is fine directly.

## Setup

```bash
git clone https://github.com/MortyQ/vue-muza-use.git
cd vue-muza-use
pnpm install
```

Run tests:

```bash
pnpm test
```

Build:

```bash
pnpm build
```

The library source is in `packages/use-api/src/`.

## Pull Request Guidelines

- One concern per PR — don't mix features with refactors.
- All tests must pass.
- New behavior must include tests.
- Keep the public API surface minimal — when in doubt, leave it out.
- Update `CHANGELOG.md` under an `[Unreleased]` section.

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add retry backoff strategy
fix: cancel pending request on unmount
docs: clarify ignoreUpdates behavior
test: add cache TTL expiry case
```

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) template. Include a minimal reproduction if possible.

## Suggesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template. Explain the use case, not just the solution.
