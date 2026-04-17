# Changelog

All notable changes to `@ametie/vue-muza-use` will be documented here.

Format: [Semantic Versioning](https://semver.org/)

> **Looking for pre-1.0 docs?** See the [v0.10.0 README](https://github.com/MortyQ/vue-muza-use/blob/v0.10.0/packages/use-api/README.md).

---

## [1.0.0] — 2026-04-17

### Breaking Changes
- **`watch` option removed** from `UseApiOptions`. `url`, `params`, and `data` are now auto-tracked — the request re-fires automatically when their reactive dependencies change. No explicit `watch` needed.
- **`staleWhileRevalidate` option removed** from `UseApiOptions`. Moved into `CacheOptions` as `swr: boolean`. Use `cache: { id: 'key', swr: true }` instead of `cache: 'key', staleWhileRevalidate: true`.
- **`peerDependencies`**: minimum Vue version bumped from `^3.3.0` to `^3.5.0` (required for `effectScope.pause/resume`).

### Added
- `lazy?: boolean` — opt-out of auto-tracking. When `true`, reactive changes to `url`, `params`, and `data` do NOT trigger a re-fetch. Use for forms and manual mutations where you call `execute()` yourself.
- `refetchOnFocus?: boolean | { throttle?: number }` — re-fetch when the browser tab regains focus. Default throttle: 60 000ms. Pass `{ throttle: 0 }` to always refetch. Configurable globally via `createApiClient({ globalOptions: { refetchOnFocus: true } })`.
- `refetchOnReconnect?: boolean` — re-fetch when the browser regains network connectivity (`online` event). No throttle applied. Configurable globally.
- `CacheOptions.swr?: boolean` — replaces the top-level `staleWhileRevalidate` option.

### Migration from 0.x

```ts
// watch → auto-tracking
// Before
useApi('/products', {
  params: () => ({ q: search.value }),
  watch: [search],
})
// After
useApi('/products', {
  params: () => ({ q: search.value }),
})

// staleWhileRevalidate → cache.swr
// Before
useApi('/users', { cache: 'users', staleWhileRevalidate: true })
// After
useApi('/users', { cache: { id: 'users', swr: true } })

// New: refetchOnFocus
useApi('/dashboard', { refetchOnFocus: true })

// New: global config
createApiClient({
  globalOptions: { refetchOnFocus: true, refetchOnReconnect: true }
})

// Form (opt-out of auto-tracking)
useApi('/products', {
  data: form,
  lazy: true,
})
```

### Changed
- `ignoreUpdates` internally migrated from a boolean flag to `effectScope.pause()/resume()`. External API is unchanged.

---

## [0.10.0] — 2026-04-16

### Added
- `select` option — transform response data before storing in `data`. Third generic `TSelected` on `UseApiOptions<T, D, TSelected>`.
- `staleWhileRevalidate` option — serve cached data instantly while revalidating in the background. Exposes `revalidating` ref.
- `withCredentials` option — per-request override of Axios credential behavior.
- `revalidating` ref in `UseApiReturn` — indicates background SWR revalidation in progress.

### Changed
- `UseApiReturn.response` type changed to `Ref<AxiosResponse<unknown> | null>` to decouple from response generic.
- Repository renamed from `vue-useApi` to `vue-muza-use`.

---

## [0.9.2] — 2026-04-16

### Added
- Full test coverage (100+ tests).
- Documentation rewrite.
- Claude Code skill for feature-scoped API layer pattern.

---

## [0.9.1] — 2026-04-10

### Fixed
- Cache documentation.

---

## [0.9.0] — 2026-04-10

### Added
- `cache` option — in-memory response cache with configurable TTL.
- `invalidateCache` option — bust related caches on mutation success.

---

## [0.8.0] — 2026-04-09

### Added
- `ignoreUpdates` — update watched refs without triggering a re-fetch.

---

## [0.7.0] — 2026-04-09

### Added
- Retry logic with configurable `retry` and `retryDelay`.

---

## [0.6.1] — 2026-03-15

### Changed
- Renamed `setData` to `mutate`.

---

## [0.6.0] — 2026-02-13

### Added
- Batch requests (`useApiBatch`) — parallel requests with combined loading state and progress tracking.

---

## [0.5.0] — 2026-02-11

### Added
- `mutate` (formerly `setData`) — manually set `data` value without a network request.

---

## [0.1.0] — 2026-02-05

### Added
- Auto-refetch on reactive dependency change (`watch` option).

---

## [0.0.4] — 2026-02-04

### Added
- Initial public release.
- `useApi`, `useApiGet`, `useApiPost`, `useApiPut`, `useApiPatch`, `useApiDelete`.
- Axios interceptor integration for auth token refresh.
- `immediate`, `debounce`, `poll` options.
- `execute`, `cancel` controls.
- Race condition prevention.
- Automatic cleanup on component unmount.
