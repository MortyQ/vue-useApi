# Design: Auto-Tracking Reactive Dependencies (v1.0)

**Date:** 2026-04-17
**Status:** Approved
**Version:** 1.0.0 (breaking change)

---

## Summary

Remove the explicit `watch` option from `UseApiOptions`. Instead, auto-track reactive dependencies in `url`, `params`, and `data` using Vue `computed()` wrappers + `watch`. When any tracked dep changes, the request re-fires automatically.

Introduce `lazy: boolean` as the opt-out for cases where auto-tracking is not desired (forms, manual mutations).

---

## Motivation

Illya Klymov's critique: explicit `watch` is redundant — `url`, `params`, and `data` are already reactive. Users should not need to repeat their reactive sources in a separate array. Auto-tracking is the natural Vue 3 pattern.

---

## Breaking Changes

- `watch` field removed from `UseApiOptions`
- `peerDependencies`: `vue` bumped from `^3.3.0` to `^3.5.0`

---

## Public API

### Removed

```ts
// UseApiOptions — field removed entirely
watch?: WatchSource | WatchSource[]
```

### Added

```ts
// UseApiOptions — new field
lazy?: boolean  // disables auto-tracking; request only fires via execute()
```

### Usage examples

```ts
// Before
useApi('/products', {
  params: () => ({ q: search.value }),
  watch: [search],
})

// After — auto-tracked, no watch needed
useApi('/products', {
  params: () => ({ q: search.value }),
})

// Form — disable auto-tracking
useApi('/products', {
  data: form,
  lazy: true,
})

// immediate is independent of lazy
useApi('/products', {
  data: form,
  lazy: true,
  immediate: true,  // fetches on mount, but NOT on form changes
})
```

---

## Internal Implementation

### Auto-tracking via computed wrappers

File: `packages/use-api/src/useApi.ts`

```ts
if (!lazy) {
  const trackingScope = effectScope()

  trackingScope.run(() => {
    const urlComputed    = computed(() => toValue(url))
    const paramsComputed = computed(() => toValue(options.params))
    const dataComputed   = computed(() => toValue(options.data))

    watch(
      [urlComputed, paramsComputed, dataComputed],
      () => debouncedExecute(),
      { flush: 'pre', deep: true },
    )
  })

  onScopeDispose(() => trackingScope.stop())
}
```

`effectScope` groups all 4 effects (3 computeds + watch) under a single lifecycle. One `trackingScope.stop()` cleans everything up — no need to track `watchHandle` separately.

**Why `computed()` over `watchEffect`:**
- Explicit tracking scope — only `url`, `params`, `data`. No accidental tracking of store reads inside `execute()`.
- `immediate` remains independent (no `isFirstRun` hack needed).
- `lazy` has a single clear meaning.

**Why `flush: 'pre'` over `flush: 'sync'`:**
- Two synchronous ref changes inside the same `params` getter fire only one request (Vue batches before component update).
- `flush: 'sync'` would fire one request per individual ref change — worse behavior.

**Static deps:** If `params` or `data` is a plain object (not reactive), the computed returns a static value. Vue does not schedule re-runs for it. No overhead.

### ignoreUpdates — migrated to pause/resume

Since `watchHandle` lives inside `effectScope`, we expose `pause/resume` via a ref:

```ts
let trackingScope: ReturnType<typeof effectScope> | undefined

if (!lazy) {
  trackingScope = effectScope()
  trackingScope.run(() => {
    // computeds + watch
  })
  onScopeDispose(() => trackingScope!.stop())
}

const ignoreUpdates = (updater: () => void) => {
  trackingScope?.pause()
  try { updater() }
  finally { trackingScope?.resume() }
}
```

- `ignoreFlag` boolean and all associated checks removed.
- `trackingScope.pause()` works correctly with `flush: 'pre'` — pending callbacks are discarded during pause.
- If `lazy: true`, `trackingScope` is undefined — `ignoreUpdates` becomes a safe no-op (updater still runs).

---

## What Does Not Change

| Feature | Status |
|---------|--------|
| `immediate` | Unchanged — independent of auto-tracking |
| `debounce` | Unchanged — wraps execute, triggered by watch |
| `poll` | Unchanged — separate interval mechanism |
| `cache` / `SWR` | Unchanged — inside execute() |
| `retry` | Unchanged — inside execute() |
| `select` | Unchanged — inside execute() |
| `ignoreUpdates` | Refactored internally, same external signature |
| `onSuccess / onError` | Unchanged |

---

## Test Plan

New file: `packages/use-api/src/useApi.autotrack.test.ts`

### Auto-tracking
- Reactive `params` getter change → request fires
- Reactive `url` change → request fires
- Reactive `data` change → request fires
- Two synchronous ref changes in same `params` getter → **one** request (flush: 'pre' batching)
- Static (non-reactive) `params` → no spurious requests

### `lazy: true`
- `lazy: true` — dep change → request does NOT fire
- `lazy: true` + `immediate: true` → fetches on mount, NOT on dep change
- `lazy: true` — `execute()` manually → works correctly

### `immediate` + auto-tracking
- `immediate: true` → fetch on mount + fetch on dep change
- `immediate: false` (default) → no fetch on mount, fetch on dep change

### `debounce` + auto-tracking
- Rapid `params` changes → debounce collapses into one request

### `ignoreUpdates` with pause/resume
- Change inside `ignoreUpdates` → request does NOT fire
- After `ignoreUpdates` → next change fires normally
- `lazy: true` + `ignoreUpdates` → updater runs, no error

### Migration: existing watch tests
- All tests using `watch: [...]` are rewritten using reactive getters in `params`/`data`/`url`
