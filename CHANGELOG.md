# Changelog

All notable changes to `@ametie/vue-muza-use` will be documented here.

Format: [Semantic Versioning](https://semver.org/)

---

## [0.10.0] — 2025

### Added
- `select` option — transform response data before storing in `data`. Third generic `TSelected` on `UseApiOptions<T, D, TSelected>`.
- `staleWhileRevalidate` option — serve cached data instantly while revalidating in the background. Exposes `revalidating` ref.
- `withCredentials` option — per-request override of Axios credential behavior.
- `revalidating` ref in `UseApiReturn` — indicates background SWR revalidation in progress.

### Changed
- `UseApiReturn.response` type changed to `Ref<AxiosResponse<unknown> | null>` to decouple from response generic.
- Repository renamed from `vue-useApi` to `vue-muza-use`.

---

## [0.9.2] — 2025

### Added
- Full test coverage (100+ tests).
- Documentation rewrite.
- Claude Code skill for feature-scoped API layer pattern.

---

## [0.9.1] — 2025

### Fixed
- Cache documentation.

---

## [0.9.0] — 2025

### Added
- `cache` option — in-memory response cache with configurable TTL.
- `invalidateCache` option — bust related caches on mutation success.

---

## [0.8.0] — 2025

### Added
- `ignoreUpdates` — update watched refs without triggering a re-fetch.

---

## [0.7.0] — 2025

### Added
- Retry logic with configurable `retry` and `retryDelay`.

---

## [0.6.1] — 2025

### Changed
- Renamed `setData` to `mutate`.

---

## [0.6.0] — 2025

### Added
- Batch requests (`useApiBatch`) — parallel requests with combined loading state and progress tracking.

---

## [0.5.0] — 2025

### Added
- `mutate` (formerly `setData`) — manually set `data` value without a network request.

---

## [0.1.0] — 2025

### Added
- Auto-refetch on reactive dependency change (`watch` option).

---

## [0.0.4] — 2025

### Added
- Initial public release.
- `useApi`, `useApiGet`, `useApiPost`, `useApiPut`, `useApiPatch`, `useApiDelete`.
- Axios interceptor integration for auth token refresh.
- `immediate`, `debounce`, `poll` options.
- `execute`, `cancel` controls.
- Race condition prevention.
- Automatic cleanup on component unmount.
