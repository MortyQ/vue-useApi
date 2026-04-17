# @ametie/vue-muza-use 🎹

[![npm version](https://img.shields.io/npm/v/@ametie/vue-muza-use.svg?style=flat-square)](https://www.npmjs.com/package/@ametie/vue-muza-use)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-green.svg?style=flat-square)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Included-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**TypeScript-first, feature-rich Axios wrapper for Vue 3 Composition API. Built for real-world business logic.**

A production-ready composable that eliminates boilerplate and solves the hard problems: race conditions, token refresh queues, automatic retries, and reactive request management. Write less code, ship faster, sleep better.

> [!IMPORTANT]
> ### 🤖 Claude Code — Built-in AI Skill
>
> This library ships with a skill that teaches Claude the feature wrapper pattern, naming conventions, and all `UseApiOptions`.
> Claude will generate correct, architecture-consistent API layer code out of the box — no extra prompting needed.
>
> 📄 **[View skill file →](https://github.com/MortyQ/vue-muza-use/blob/main/.claude/skills/use-api/SKILL.md)**

---

## ✨ Features

**Core Features** (Get started in minutes):
- 🎯 **TypeScript-first** — Full TypeScript support with strict typing for requests and responses
- 🔄 **Smart Reactivity** — Watch refs and automatically refetch when dependencies change
- ⏱️ **Built-in Debouncing** — Perfect for search inputs and auto-save forms
- 🛡️ **Race Condition Protection** — Global abort controller cancels stale requests automatically
- 📊 **Auto-Polling** — Built-in interval fetching with smart tab visibility detection
- 🚀 **Batch Requests** — Execute multiple requests in parallel with progress tracking
- 🧹 **Zero Memory Leaks** — Automatic cleanup of pending requests on component unmount
- 🔕 **ignoreUpdates** — Update watched refs without triggering a re-fetch
- 🗄️ **Response Caching** — In-memory cache with configurable TTL and manual invalidation
- ⚡ **Stale-While-Revalidate** — Serve cached data instantly while refreshing silently in the background
- 🔬 **select** — Transform or filter response data declaratively; re-applied on every fetch automatically

**Advanced Features** (When you need them):
- ♻️ **Intelligent Retries** — Lifecycle-aware retry logic with configurable status codes
- 🔐 **JWT Token Management** — Automatic token refresh with request queueing on 401 responses
- 🎛️ **Flexible Architecture** — Bring your own Axios instance with full configuration control
- 🍪 **withCredentials** — Per-request cookie and cross-origin credential control

---

## 🆚 How it compares

> Honest comparison. ✅ built-in · ⚠️ partial or plugin needed · ❌ not supported

| Feature | vue-muza-use | @vueuse/useFetch | TanStack Query | swrv |
|---------|:---:|:---:|:---:|:---:|
| **Axios-first** | ✅ | ❌ fetch | ⚠️ adapter | ❌ fetch |
| **JWT auto-refresh + queue** | ✅ | ❌ | ❌ | ❌ |
| **Race condition protection** | ✅ | ❌ | ✅ | ❌ |
| **ignoreUpdates** | ✅ | ❌ | ❌ | ❌ |
| **Built-in debounce** | ✅ | ❌ | ❌ | ❌ |
| **Batch requests** | ✅ | ❌ | ❌ | ❌ |
| **Built-in retry** | ✅ | ❌ | ✅ | ❌ |
| **Auto-polling** | ✅ | ❌ | ✅ | ✅ |
| **SWR (stale-while-revalidate)** | ✅ | ❌ | ✅ | ✅ |
| **select / transform** | ✅ | ❌ | ✅ | ❌ |
| **Response caching** | ✅ | ❌ | ✅ | ✅ |
| **TypeScript** | ✅ | ✅ | ✅ | ✅ |
| **SSR / Nuxt** | ❌ | ✅ | ✅ | ✅ |
| **DevTools** | ❌ | ❌ | ✅ | ❌ |

**Choose vue-muza-use if:** you build Vue 3 SPAs with Axios, need JWT token refresh out of the box, and want reactive request management without a heavyweight server-state solution.

**Choose TanStack Query if:** you need SSR, DevTools, or advanced server-state normalization.

**Choose @vueuse/useFetch if:** you want a minimal fetch wrapper with no opinions.

---

## 📖 Table of Contents

**Getting Started:**
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Basic Usage](#-basic-usage)

**Core Features:**
- [Watch & Auto-Refetch](#watch--auto-refetch)
  - [ignoreUpdates — Update Without Re-fetching](#ignoreupdates--update-without-re-fetching)
- [Response Caching](#response-caching)
  - [Stale-While-Revalidate (SWR)](#stale-while-revalidate-swr)
- [Polling (Background Updates)](#polling-background-updates)
- [Error Handling](#error-handling)
  - [retry — Automatic Request Retry](#retry--automatic-request-retry)
- [Loading States](#loading-states)
- [Manual Data Updates (mutate)](#manual-data-updates-mutate)
- [select — Declarative Data Transformation](#select--declarative-data-transformation)

**Real-World Examples:**
- [Data Table with Pagination](#data-table-with-pagination--sorting)
- [Request Cancellation](#request-cancellation)
- [Batch Requests](#batch-requests)

**Advanced:**
- [Advanced Configuration](#️-advanced-configuration)
- [Authentication & Token Management](#-authentication--token-management)
- [Error Handling Reference](#-error-handling-reference)
- [Utilities & Standalone Composables](#-utilities--standalone-composables)
- [API Reference](#-api-reference)
- [Common Patterns](#-common-patterns)
- [Troubleshooting](#-troubleshooting)

> 💡 **New to the library?** Start with [Quick Start](#-quick-start), then explore [Basic Usage](#-basic-usage). Skip authentication until you need it!

---

## 📦 Installation

```bash
# npm
npm install @ametie/vue-muza-use axios

# pnpm
pnpm add @ametie/vue-muza-use axios

# yarn
yarn add @ametie/vue-muza-use axios
```

Peer dependencies are packages you need to install separately — the library uses them but doesn't bundle them. You need `vue` (≥ 3.x) and `axios` (≥ 1.x) in your project.

---

## 🚀 Quick Start

Get started in 2 minutes with minimal configuration.

### 1. Setup Plugin (`main.ts`)

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient } from '@ametie/vue-muza-use'
import App from './App.vue'

const app = createApp(App)

const api = createApiClient({
  baseURL: 'https://api.example.com'
})

app.use(createApi({ axios: api }))

app.mount('#app')
```

> 💡 **That's it!** No auth configuration needed to get started. Add it later when you need it.

### 2. Your First Request

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
  email: string
}

const { data, loading, error } = useApi<User>('/users/1', {
  immediate: true
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">{{ error.message }}</div>
  <div v-else-if="data">
    <h1>{{ data.name }}</h1>
    <p>{{ data.email }}</p>
  </div>
</template>
```

### 3. Live Search with Debounce

This example shows the library's power: **automatic race condition handling** and **debouncing** built-in.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface Product {
  id: number
  name: string
  price: number
}

const searchQuery = ref('')

const { data, loading } = useApi<Product[]>(
  () => `/products/search?q=${searchQuery.value}`,
  {
    watch: searchQuery,
    debounce: 500
  }
)
</script>

<template>
  <input v-model="searchQuery" placeholder="Search products..." />

  <div v-if="loading">Searching...</div>
  <ul v-else-if="data?.length">
    <li v-for="product in data" :key="product.id">
      {{ product.name }} - ${{ product.price }}
    </li>
  </ul>
  <p v-else-if="searchQuery">No results found</p>
</template>
```

### 4. POST with Retry

Use `retry` to automatically re-attempt failed form submissions before showing an error.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface CreateOrderResponse {
  id: number
  status: string
}

const form = ref({ productId: 1, quantity: 2 })

const { execute, loading, error } = useApi<CreateOrderResponse>(
  '/orders',
  {
    method: 'POST',
    data: form,
    retry: 3,
    retryDelay: 1000,
    onSuccess: (response) => {
      console.log('Order created:', response.data.id)
    }
  }
)
</script>

<template>
  <button :disabled="loading" @click="execute()">
    {{ loading ? 'Placing order...' : 'Place Order' }}
  </button>
  <p v-if="error">{{ error.message }}</p>
</template>
```

---

## 📖 Basic Usage

### GET Requests

#### Manual Execution
```typescript
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

const { data, loading, error, execute } = useApi<User>('/users/1')

await execute()
```

#### Auto-Fetch on Mount
```typescript
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

const { data } = useApi<User>('/users/1', {
  immediate: true
})
```

#### With Query Parameters
```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const filters = ref({
  status: 'active',
  limit: 20
})

const { data } = useApi('/users', {
  params: filters,
  watch: filters,
  immediate: true
})
```

### Conditional Fetching

Pass a getter function that returns `undefined` to prevent a request from firing until a required value is available.

```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

const id = ref<number | null>(null)

const { data } = useApi<User>(
  () => id.value ? `/users/${id.value}` : undefined,
  { watch: id }
)

// No request fires until id.value is set
id.value = 42  // → triggers request to /users/42
```

> [!NOTE]
> When the URL getter returns `undefined`, the request throws internally with
> "Request URL is missing". This error is surfaced in `error.value` like any
> other request failure, so your error handling works as expected.

---

### POST/PUT/PATCH Requests

#### Simple Form Submission
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface LoginResponse {
  accessToken: string
  refreshToken: string
}

const form = ref({
  email: '',
  password: ''
})

const { execute, loading, error } = useApi<LoginResponse>(
  '/auth/login',
  {
    method: 'POST',
    data: form,
    authMode: 'public',
    onSuccess: (response) => {
      console.log('Logged in!', response.data.accessToken)
    }
  }
)
</script>

<template>
  <form @submit.prevent="execute()">
    <input v-model="form.email" type="email" />
    <input v-model="form.password" type="password" />
    <button :disabled="loading">
      {{ loading ? 'Signing in...' : 'Sign In' }}
    </button>
    <p v-if="error">{{ error.message }}</p>
  </form>
</template>
```

---

## 🎯 Core Features

### Watch & Auto-Refetch

Watch refs and automatically refetch when they change. Perfect for filters, search, and dynamic content.

#### Single Dependency
```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

const userId = ref(1)

const { data } = useApi<User>(
  () => `/users/${userId.value}`,
  { watch: userId, immediate: true }
)

userId.value = 2  // → automatic refetch
```

#### Multiple Dependencies
```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const searchQuery = ref('')
const category = ref('all')

const { data } = useApi(
  () => `/products?q=${searchQuery.value}&category=${category.value}`,
  {
    watch: [searchQuery, category],
    debounce: 500
  }
)
```

#### Auto-Save Form
```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const settings = ref({
  theme: 'dark',
  notifications: true
})

useApi('/user/settings', {
  method: 'PUT',
  data: settings,
  watch: settings,
  debounce: 1000,
  onSuccess: () => console.log('Saved!')
})
```

---

### ignoreUpdates — Update Without Re-fetching

**TL;DR: Update a watched ref without triggering the watcher.**

When `watch` is configured, any change to a watched ref fires a new request. `ignoreUpdates` lets you change those refs silently — the watcher is suppressed for the duration of the callback.

#### Example — clear search input without fetching

```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const search = ref('')

const { data, ignoreUpdates } = useApi('/products', {
  params: () => ({ q: search.value }),
  watch: [search],
  debounce: 300,
})

function clearSearch() {
  ignoreUpdates(() => {
    search.value = ''
  })
  // watch is suppressed — no request fires
}
```

The user types → watch fires → debounced request. Clicking "Clear" resets the input without triggering a fetch.

#### Safe to call without a watch option

If no `watch` option is configured, `ignoreUpdates` still runs the updater — it just has nothing to suppress.

```typescript
const { ignoreUpdates } = useApi('/data')

ignoreUpdates(() => {
  someRef.value = 42  // runs normally, nothing to suppress
})
```

> [!NOTE]
> `ignoreUpdates` is synchronous only. Changes made after an `await` inside the
> updater function will NOT be suppressed — the flag resets after the synchronous
> portion completes.

---

### Response Caching

**TL;DR: Pass `cache: 'key'` to serve repeated requests from memory instead of the network. Entries expire after 5 minutes by default.**

The cache is an in-memory `Map` shared across all `useApi` instances in the app.
It is intentionally simple: no reactive subscriptions, no persistence, no background timers.
Entries expire **lazily** — stale entries are removed the next time they are read.

#### Basic Usage — String Shorthand

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

const { data, loading } = useApi<Category[]>('/categories', {
  cache: 'categories', // uses DEFAULT_STALE_TIME (5 minutes)
  immediate: true,
})
</script>
```

The first call hits the network and caches the result under the key `'categories'`.
Every subsequent `execute()` within 5 minutes is served from cache instantly — `loading` never becomes `true` and no axios request is made.

#### Custom TTL — CacheOptions Object

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

const { data, execute } = useApi<Product[]>('/products', {
  cache: {
    id: 'products',
    staleTime: 60_000, // 1 minute
  },
  immediate: true,
})
</script>
```

#### Cache Hit Behavior

When a valid cache entry is found:

| Property / Hook | Cache Hit |
|---|---|
| `loading` | stays `false` — never set to `true` |
| `data` | updated immediately via `mutate()` |
| `onBefore` | **not called** |
| `onSuccess` | **not called** |
| `onFinish` | **not called** |
| axios request | **not made** |

This is intentional — a cache hit is silent. If you need to know when data comes from cache vs the network, track it with `onSuccess` (only fires on network hits).

#### invalidateCache — Bust Related Caches on Mutation

Use `invalidateCache` on a POST/PUT/DELETE to automatically clear caches when the mutation succeeds.

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

// GET — caches the list
const { data: products, execute: reload } = useApi<Product[]>('/products', {
  cache: 'products',
  immediate: true,
})

// POST — busts the list cache on success so the next GET hits the network
const { execute: createProduct, loading } = useApi('/products', {
  method: 'POST',
  invalidateCache: 'products',
})

async function submit(form: NewProduct) {
  await createProduct({ data: form })
  await reload() // cache is gone — fetches fresh data
}
</script>
```

`invalidateCache` fires **only on HTTP 2xx success**. It never runs in `catch` or `finally`.
Pass an array to bust multiple keys at once:

```typescript
const { execute } = useApi('/orders', {
  method: 'POST',
  invalidateCache: ['orders', 'products', 'inventory'],
})
```

#### Imperative Cache Control

Import `invalidateCache` or `clearAllCache` anywhere in your app — outside components, in Pinia stores, in route guards:

```typescript
import { invalidateCache, clearAllCache } from '@ametie/vue-muza-use'

// Bust a single key (e.g. after a WebSocket push)
invalidateCache('products')

// Bust multiple keys at once
invalidateCache(['products', 'categories'])

// Wipe everything — call on logout to prevent data leaks between users
clearAllCache()
```

#### cache + watch

When `watch` is configured, each watch-triggered `execute()` still checks the cache first:

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'
import { ref } from 'vue'

const categoryId = ref<number>(1)

const { data } = useApi<Product[]>(() => `/categories/${categoryId.value}/products`, {
  cache: { id: `products-cat-${categoryId.value}`, staleTime: 30_000 },
  watch: categoryId,
  immediate: true,
})
</script>
```

> [!NOTE]
> The cache `id` is evaluated once when `useApi` is called. To cache per category,
> use a computed or a dynamic key string derived from your reactive state.

#### cache + retry

Cache is written **after the final successful attempt**, not after the first.
If the first attempt fails and a retry succeeds, the retry's response is cached:

```typescript
const { data } = useApi('/reports', {
  cache: 'reports',
  retry: 2,
  retryStatusCodes: [500, 503],
  immediate: true,
})
```

#### Complete Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | `string \| CacheOptions` | `undefined` | Enable caching. String = `{ id, staleTime: 300_000 }` shorthand |
| `invalidateCache` | `string \| string[]` | `undefined` | Cache key(s) to delete on 2xx success |

**`CacheOptions`**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | — | Unique cache key |
| `staleTime` | `number` | `300_000` | TTL in milliseconds. Entry is deleted on next read after this time |

#### Out of Scope (by design)

The following are intentionally **not** supported in v1:

- 🚫 No reactive cache entries — the cache is a plain `Map`, not Vue refs
- 🚫 No `localStorage` / `sessionStorage` persistence
- 🚫 No background TTL timers — expiry is checked lazily on read
- 🚫 No cache for `useApiBatch` — batch requests manage their own state
- 🚫 No automatic refetch on cache invalidation — call `execute()` manually after invalidating
- 🚫 No request deduplication — concurrent calls for the same key each fire their own request

> [!WARNING]
> The cache store is **module-level** (a singleton). In SSR / Node.js environments it is
> shared between all incoming requests. Call `clearAllCache()` between requests or avoid
> using caching in SSR contexts.

---

### Stale-While-Revalidate (SWR)

**TL;DR: Return cached data instantly while fetching fresh data in the background. No loading spinner, no blank screen.**

Requires the `cache` option to be set. On a cache hit, the stale data is returned immediately (no `loading: true`, no spinner) while a silent background request runs. Use the `revalidating` ref to show a subtle refresh indicator if needed.

On a **cache miss** (first load), the request behaves exactly like a normal request — `loading: true`, no stale data.

#### Basic Usage

```vue
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

interface User { id: number; name: string }

const { data, revalidating } = useApi<User[]>('/users', {
  cache: 'users',
  staleWhileRevalidate: true,
  immediate: true,
})
</script>

<template>
  <!-- data renders immediately from cache — no blank screen -->
  <ul>
    <li v-for="user in data" :key="user.id">
      {{ user.name }}
      <span v-if="revalidating">↻</span>
    </li>
  </ul>
</template>
```

#### SWR vs Normal Cache Hit

| | Normal cache hit | SWR cache hit |
|---|---|---|
| `loading` | `false` | `false` |
| `data` | Stale data, no new request | Stale data → then fresh data |
| `revalidating` | `false` | `true` while fetching, then `false` |
| Axios request | **Not made** | **Made** (silent background fetch) |
| `onBefore` | Not called | **Not called** (silent) |
| `onSuccess` | Not called | **Called** with fresh response |
| `onFinish` | Not called | **Called** after background fetch |

#### Error Handling

If the background revalidation request fails:
- `revalidating` resets to `false`
- `error` is set
- The **stale data is preserved** — your UI doesn't go blank

```typescript
const { data, revalidating, error } = useApi('/dashboard', {
  cache: 'dashboard',
  staleWhileRevalidate: true,
  immediate: true,
})
// data.value stays the cached value even after a failed revalidation
```

---

### Polling (Background Updates)

**TL;DR: Keep data fresh with smart polling that automatically pauses when the browser tab is hidden.**

#### Simple Polling
```typescript
import { useApi } from '@ametie/vue-muza-use'

const { data } = useApi('/notifications', {
  immediate: true,
  poll: 5000
})
```

#### Dynamic Polling Control
```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const pollInterval = ref(3000)

const { data } = useApi('/live-feed', {
  poll: pollInterval,
  immediate: true
})

pollInterval.value = 0     // Stop polling
pollInterval.value = 5000  // Resume with new interval
```

#### Polling Object Syntax with Reactive Fields

Both `interval` and `whenHidden` can be reactive refs — change them at runtime without re-creating the composable.

```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const interval = ref(5000)
const whenHidden = ref(false)

const { data } = useApi('/status', {
  immediate: true,
  poll: { interval, whenHidden }
})

// Slow down polling
interval.value = 30000

// Allow polling even when tab is not visible
whenHidden.value = true

// Stop polling completely
interval.value = 0
```

> [!NOTE]
> By default `whenHidden: false` — polling pauses when the browser tab is hidden
> and resumes automatically when the user switches back. Set `whenHidden: true`
> for background jobs that must continue regardless of tab visibility.

---

### Error Handling

#### Per-Request Error Handling
```typescript
import { useApi } from '@ametie/vue-muza-use'

const { error, execute } = useApi('/users', {
  onError: (error) => {
    if (error.status === 404) {
      console.error('User not found')
    } else {
      console.error('Something went wrong')
    }
  },
  skipErrorNotification: true
})
```

---

### retry — Automatic Request Retry

**TL;DR: Automatically retry failed requests before showing an error.**

Retries fire only after the request fails. The `loading` state stays `true` during all attempts. `onError` is only called after the final failure.

#### retry option

| Value | Meaning |
|-------|---------|
| `false` | Never retry (default) |
| `true` | Retry up to 3 times |
| `3` | Retry exactly 3 times |

#### retryDelay

How many milliseconds to wait between retry attempts. Default: `1000` (1 second).

#### retryStatusCodes — The Priority Chain

`retryStatusCodes` controls which HTTP status codes should trigger a retry. The library uses a three-level priority chain:

```
Per-request retryStatusCodes
  ↓ (if not set)
globalOptions.retryStatusCodes
  ↓ (if not set)
Library default: [408, 429, 500, 502, 503, 504]
```

- **Per-request**: `retryStatusCodes` in `useApi()` options — highest priority, overrides everything
- **globalOptions**: `retryStatusCodes` in `createApi()` — applies to all requests that don't set their own
- **Library default**: `[408, 429, 500, 502, 503, 504]` — used when neither level is configured

> [!NOTE]
> `retryStatusCodes: []` means retry on ANY error — network errors, timeouts,
> and any non-2xx response. This is an explicit opt-in, not the default.

> [!WARNING]
> Retry does NOT fire on `AbortError` (cancelled requests) or when the component
> unmounts during a retry delay — the library cleans up safely in both cases.

#### Examples

Retry only on server errors (500, 503):

```typescript
import { useApi } from '@ametie/vue-muza-use'

const { data } = useApi('/reports', {
  immediate: true,
  retry: 3,
  retryDelay: 2000,
  retryStatusCodes: [500, 503]
})
```

Retry on any error including network failures:

```typescript
import { useApi } from '@ametie/vue-muza-use'

const { data } = useApi('/critical-data', {
  immediate: true,
  retry: 5,
  retryStatusCodes: []  // retry on any error
})
```

Global default with per-request override:

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient, useApi } from '@ametie/vue-muza-use'

// main.ts — global: retry 2 times on server errors
const api = createApiClient({ baseURL: 'https://api.example.com' })
createApp(App).use(createApi({
  axios: api,
  globalOptions: {
    retry: 2,
    retryStatusCodes: [500, 502, 503, 504]
  }
}))

// In a component — override: retry only once for this request
const { data } = useApi('/payments', {
  immediate: true,
  retry: 1,
  retryStatusCodes: [500]
})
```

---

### Loading States

#### Per-Request Loading
```typescript
import { useApi } from '@ametie/vue-muza-use'

const { data: user, loading: userLoading } = useApi('/user')
const { data: posts, loading: postsLoading } = useApi('/posts')
```

#### Lifecycle Hooks
```typescript
import { useApi } from '@ametie/vue-muza-use'

const { execute } = useApi('/analytics', {
  onBefore: () => {
    console.log('Request starting...')
  },
  onSuccess: (response) => {
    console.log('Success!', response.data)
  },
  onError: (error) => {
    console.error('Failed:', error.message)
  },
  onFinish: () => {
    console.log('Request finished (success or error)')
  }
})
```

---

### Manual Data Updates (mutate)

**TL;DR: Update local data optimistically or post-process fetched data without re-fetching.**

Use `mutate` to manually update the `data` ref. Supports direct values or updater functions (like React's `setState`). Calling `mutate` automatically clears any existing error.

#### Add/Remove/Update Items
```typescript
import { useApi } from '@ametie/vue-muza-use'

interface Todo {
  id: number
  title: string
  done: boolean
}

const { data, mutate } = useApi<Todo[]>('/todos', { immediate: true })

const addTodo = (newTodo: Todo) => {
  mutate(prev => prev ? [...prev, newTodo] : [newTodo])
}

const removeTodo = (id: number) => {
  mutate(prev => prev?.filter(t => t.id !== id) ?? null)
}

const toggleTodo = (id: number) => {
  mutate(prev =>
    prev?.map(t => t.id === id ? { ...t, done: !t.done } : t) ?? null
  )
}
```

#### Transform after fetch

Use `mutate` from the **same** `useApi` call to post-process data after it arrives:

```typescript
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  firstName: string
  lastName: string
  fullName?: string
}

const { data, mutate } = useApi<User[]>('/users', {
  immediate: true,
  onSuccess: ({ data: users }) => {
    mutate(users.map(u => ({
      ...u,
      fullName: `${u.firstName} ${u.lastName}`
    })))
  }
})
```

> [!TIP]
> If the same transformation runs on every fetch (including polling or watch re-triggers),
> use [`select`](#select--declarative-data-transformation) instead — it's applied automatically
> and keeps your options object clean.

---

### select — Declarative Data Transformation

**TL;DR: Transform, filter, or reshape response data once — it's re-applied automatically on every fetch, polling tick, and SWR revalidation.**

Use `select` when you want the same transformation applied every time the request fires. Unlike `mutate` (which you call manually), `select` is declared once and runs silently on each response.

The second generic parameter of `useApi` controls the output type of `select`.

#### Extract a Nested Field

APIs that wrap responses in `{ data: [...], meta: {...} }`:

```typescript
interface ApiResponse { data: User[]; meta: { total: number } }
interface User { id: number; name: string }

const { data } = useApi<ApiResponse, User[]>('/users', {
  immediate: true,
  select: (res) => res.data,
  // data.value is User[], not ApiResponse
})
```

#### Transform Items

```typescript
interface RawUser { id: number; firstName: string; lastName: string }
interface User { id: number; fullName: string }

const { data } = useApi<RawUser[], User[]>('/users', {
  immediate: true,
  select: (users) => users.map(u => ({
    id: u.id,
    fullName: `${u.firstName} ${u.lastName}`,
  })),
})
```

#### Filter Results

```typescript
const { data } = useApi<Task[]>('/tasks', {
  immediate: true,
  select: (tasks) => tasks.filter(t => t.status === 'active'),
})
```

#### select vs mutate

| | `select` | `mutate` |
|---|---|---|
| When it runs | On every successful response (auto) | When you call it manually |
| With polling | Re-applied on every tick | Need to call in `onSuccess` each time |
| With SWR | Re-applied on revalidation | Need to call in `onSuccess` |
| `onSuccess` receives | Raw `AxiosResponse<TRaw>` | — |

> [!NOTE]
> `onSuccess` always receives the **raw** `AxiosResponse` from the server, not the selected value.
> This lets you access headers, status, and the original shape if needed.

> [!NOTE]
> The cache always stores the **raw** server response, not the selected value.
> `select` is re-applied each time data is read from cache — including SWR cache hits.
> If you change your `select` function, the next cache hit will re-apply the new transformation.

---

## 📊 Real-World Examples

### Data Table with Pagination & Sorting
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface Order {
  id: number
  created_at: string
  total: number
}

interface OrdersResponse {
  data: Order[]
  total: number
}

const page = ref(1)
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const params = computed(() => ({
  page: page.value,
  sort_by: sortBy.value,
  sort_order: sortOrder.value,
  per_page: 20
}))

const { data, loading } = useApi<OrdersResponse>('/orders', {
  params,
  watch: params,
  immediate: true
})
</script>

<template>
  <table>
    <thead>
      <tr>
        <th @click="sortBy = 'id'">ID</th>
        <th @click="sortBy = 'created_at'">Date</th>
        <th @click="sortBy = 'total'">Total</th>
      </tr>
    </thead>
    <tbody v-if="!loading">
      <tr v-for="order in data?.data" :key="order.id">
        <td>{{ order.id }}</td>
        <td>{{ order.created_at }}</td>
        <td>\${{ order.total }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

---

### Request Cancellation
```typescript
import { useAbortController, useApi } from '@ametie/vue-muza-use'

const { abortAll } = useAbortController()

const { data: products } = useApi('/products')
const { data: stats } = useApi('/stats')

const resetFilters = () => {
  abortAll()
}
```

---

### Batch Requests

**TL;DR: Execute multiple API requests in parallel with full reactive state, progress tracking, and error tolerance.**

#### Basic Usage

```typescript
import { useApiBatch } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

const {
  successfulData,
  loading,
  progress,
  execute
} = useApiBatch<User>([
  '/users/1',
  '/users/2',
  '/users/3'
])

await execute()
console.log(successfulData.value)
console.log(progress.value)
```

#### Per-Request Config (BatchRequestConfig)

**TL;DR: Each request in the batch can have its own method, body, and headers.**

Pass objects instead of strings to specify per-request configuration. You can mix strings (simple GET) and config objects in the same array.

```typescript
import { useApiBatch } from '@ametie/vue-muza-use'

interface User { id: number; name: string }
interface Post { id: number; title: string }

const { data, execute } = useApiBatch([
  '/users/1',
  {
    url: '/users',
    method: 'POST',
    data: { name: 'Alice', email: 'alice@example.com' }
  },
  {
    url: '/posts',
    method: 'GET',
    params: { userId: 1 }
  },
  {
    url: '/analytics/track',
    method: 'POST',
    headers: { 'X-Source': 'dashboard' },
    data: { event: 'page_view' }
  }
])

await execute()
```

`BatchRequestConfig` interface:

```typescript
interface BatchRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'  // default: 'GET'
  data?: unknown
  params?: unknown
  headers?: Record<string, string>
}
```

#### BatchResultItem — What Each Result Contains

Every item returned in `data` has this shape:

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | The URL that was requested |
| `index` | `number` | Position in the original array |
| `success` | `boolean` | `true` if the request succeeded |
| `data` | `T \| null` | Response data (`null` if failed) |
| `error` | `ApiError \| null` | Error details (`null` if succeeded) |
| `statusCode` | `number \| null` | HTTP status code |
| `response` | `AxiosResponse<T> \| null` | Full Axios response — access headers here (`null` if failed) |
| `request` | `BatchRequestConfig` | The original normalized request config |

Accessing response headers from a batch result:

```typescript
import { useApiBatch } from '@ametie/vue-muza-use'

const { data, execute } = useApiBatch(['/users/1', '/users/2'])

await execute()

for (const item of data.value) {
  if (item.response) {
    const rateLimit = item.response.headers['x-ratelimit-remaining']
    console.log(`${item.url} — rate limit remaining: ${rateLimit}`)
  }
  if (item.error) {
    console.error(`${item.url} — failed: ${item.error.message}`)
  }
}
```

> [!WARNING]
> `response` and `request` are new fields. If you were serializing
> `BatchResultItem` to JSON or storing it in a database, update your
> serialization logic to handle these new fields.

#### Error Tolerance (Default)

By default, `useApiBatch` uses `settled: true` — failed requests don't stop the batch.

```typescript
import { useApiBatch } from '@ametie/vue-muza-use'

interface User { id: number; name: string }

const {
  successfulData,
  errors,
  progress,
  execute
} = useApiBatch<User>([
  '/users/1',
  '/users/999',
  '/users/3'
])

await execute()

console.log(successfulData.value.length)  // 2
console.log(errors.value.length)          // 1
```

#### With Progress Tracking

```vue
<script setup lang="ts">
import { useApiBatch } from '@ametie/vue-muza-use'

const urls = ['/users/1', '/users/2', '/users/3', '/users/4']

const { loading, progress, execute } = useApiBatch(urls, {
  onProgress: (p) => {
    console.log(`${p.percentage}% (${p.succeeded} ok, ${p.failed} failed)`)
  }
})
</script>

<template>
  <div v-if="loading">
    <div class="progress-bar">
      <div :style="{ width: progress.percentage + '%' }"></div>
    </div>
    <span>{{ progress.completed }} / {{ progress.total }}</span>
  </div>
</template>
```

---

## ⚙️ Advanced Configuration

### Custom Axios Instance

**TL;DR: Pass any pre-configured Axios instance — interceptors, timeouts, headers all work.**

```typescript
import axios from 'axios'
import { createApi } from '@ametie/vue-muza-use'

const customAxios = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: { 'X-Custom-Header': 'value' }
})

customAxios.interceptors.request.use((config) => {
  config.headers['X-Request-ID'] = crypto.randomUUID()
  return config
})

app.use(createApi({ axios: customAxios }))
```

---

### Global Error Handler

**TL;DR: Normalize errors from different backend formats in one place.**

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient } from '@ametie/vue-muza-use'
import App from './App.vue'

const api = createApiClient({ baseURL: 'https://api.example.com' })

createApp(App).use(createApi({
  axios: api,

  onError: (error) => {
    console.error(`[API Error] ${error.status}: ${error.message}`)
  },

  errorParser: (error: unknown) => {
    const axiosError = error as {
      response?: { data?: { message?: string; errors?: Record<string, string[]> }; status?: number }
      message?: string
    }
    const response = axiosError.response?.data

    if (response?.errors) {
      return {
        message: 'Validation Failed',
        status: axiosError.response?.status ?? 422,
        code: 'VALIDATION_ERROR',
        errors: response.errors
      }
    }

    return {
      message: response?.message ?? axiosError.message ?? 'Unknown error',
      status: axiosError.response?.status ?? 500,
      details: error
    }
  },

  globalOptions: {
    retry: 2,
    retryDelay: 1000,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    useGlobalAbort: true
  }
}))
```

`globalOptions` reference:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retry` | `false \| boolean \| number` | `false` | Default retry setting applied to all requests that don't specify their own |
| `retryDelay` | `number` | `1000` | How many milliseconds to wait between retry attempts for all requests |
| `retryStatusCodes` | `number[]` | `[408,429,500,502,503,504]` | Default HTTP status codes that trigger a retry across all requests |
| `useGlobalAbort` | `boolean` | `true` | When `true`, all requests subscribe to the global abort controller |

---

## 🔐 Authentication & Token Management

> **Note:** Authentication setup is optional. Only add this if your API requires JWT tokens.

### Basic Auth Setup

**TL;DR: Add `withAuth: true` and a `refreshUrl` to get automatic token injection and refresh.**

```typescript
import { createApiClient } from '@ametie/vue-muza-use'

const api = createApiClient({
  baseURL: 'https://api.example.com',
  withAuth: true,
  authOptions: {
    refreshUrl: '/auth/refresh',
    onTokenRefreshFailed: () => {
      window.location.href = '/login'
    }
  }
})
```

The library automatically:
- Injects `Authorization: Bearer <token>` header
- Refreshes expired tokens
- Queues requests during token refresh
- Retries failed requests after refresh

---

### Token Management Modes

#### Mode 1: localStorage (Default)

```typescript
import { createApiClient } from '@ametie/vue-muza-use'

const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```

**Storage:** Both `accessToken` and `refreshToken` in localStorage
**Security:** ⚠️ Vulnerable to XSS attacks
**Use case:** Development, internal tools

#### Mode 2: httpOnly Cookies (Production)

```typescript
import { createApiClient } from '@ametie/vue-muza-use'

const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: true,
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```

**Storage:** Only `accessToken` in localStorage, `refreshToken` in httpOnly cookie
**Security:** 🔒 Protected from XSS attacks
**Backend requirement:** Must set `Set-Cookie` with `HttpOnly; Secure; SameSite`

---

### withCredentials — Per-Request Cookie Control

**TL;DR: Override the Axios instance default for a single request without changing global settings.**

`withCredentials` controls whether cookies and other credentials are included in cross-origin requests (CORS). Set it globally in `createApiClient` and override it per request when needed.

```typescript
// Global: withCredentials: false (Bearer token auth, no cookies)
const api = createApiClient({ baseURL: '/api' })

// Override: this specific endpoint needs cookies
const { data } = useApi('/user/session', {
  withCredentials: true,
  immediate: true,
})
```

```typescript
// Global: withCredentials: true (full cookie-based auth)
const api = createApiClient({ baseURL: '/api', withCredentials: true })

// Override: skip cookies for a public CDN request
const { data } = useApi('https://cdn.example.com/config.json', {
  withCredentials: false,
  immediate: true,
})
```

Omitting `withCredentials` in `useApi` options means the Axios instance default is used — no override applied.

---

### Saving Tokens After Login

```typescript
import { useApi, tokenManager } from '@ametie/vue-muza-use'
import { useRouter } from 'vue-router'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const router = useRouter()

const { execute } = useApi<LoginResponse>('/auth/login', {
  method: 'POST',
  authMode: 'public',
  onSuccess(response) {
    tokenManager.setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn
    })

    router.push('/dashboard')
  }
})
```

---

### authMode — Controlling Auth Per Request

**TL;DR: Control whether a request includes auth tokens and whether it retries on 401.**

| Value | Token sent? | Retries on 401? | Use case |
|-------|-------------|-----------------|----------|
| `'default'` | ✅ Always | ✅ Yes | Protected endpoints (most requests) |
| `'public'` | ❌ Never | ❌ No | Login, registration, public content |
| `'optional'` | ✅ If available | ❌ No | Content that works for guests and logged-in users |

```typescript
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface Credentials { email: string; password: string }
interface Post { id: number; title: string }

const credentials = ref<Credentials>({ email: '', password: '' })

// Login — never send a token here
const { execute: login } = useApi('/auth/login', {
  method: 'POST',
  authMode: 'public',
  data: credentials
})

// Public blog that shows extra content when logged in
const { data: posts } = useApi<Post[]>('/posts', {
  authMode: 'optional',
  immediate: true
})
```

---

### tokenManager — Manual Token Control

**TL;DR: Use this when you need to read, set, or clear tokens from outside a request.**

The library manages tokens automatically. You only need `tokenManager` directly for:
1. Saving tokens after login
2. Clearing tokens on logout
3. Checking if the user is currently logged in

Full API reference:

| Method | Returns | What it does |
|--------|---------|--------------|
| `getAccessToken()` | `string \| null` | The current access token, or `null` if not set |
| `getRefreshToken()` | `string \| null` | The refresh token, or `null` if using httpOnly cookies |
| `setTokens({ accessToken, refreshToken?, expiresIn? })` | `void` | Save new tokens after a successful login |
| `clearTokens()` | `void` | Remove all tokens (call on logout) |
| `hasTokens()` | `boolean` | `true` if an access token exists |
| `isTokenExpired()` | `boolean` | `true` if the token has expired (5-second safety buffer applied) |
| `getTokenExpiresAt()` | `number \| null` | Unix timestamp (ms) when the current token expires |
| `getAuthHeader()` | `string \| null` | `"Bearer <token>"` string ready for use in headers, or `null` |

After login — save tokens:

```typescript
import { tokenManager } from '@ametie/vue-muza-use'
import { useRouter } from 'vue-router'

const router = useRouter()

function onLoginSuccess(response: {
  accessToken: string
  refreshToken: string
  expiresIn: number
}) {
  tokenManager.setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresIn: response.expiresIn
  })
  router.push('/dashboard')
}
```

On logout — clear tokens:

```typescript
import { tokenManager } from '@ametie/vue-muza-use'
import { useRouter } from 'vue-router'

const router = useRouter()

function logout() {
  tokenManager.clearTokens()
  router.push('/login')
}
```

Router guard — check before navigating:

```typescript
import { tokenManager } from '@ametie/vue-muza-use'
import { createRouter } from 'vue-router'

const router = createRouter({ /* routes */ } as never)

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !tokenManager.hasTokens()) {
    return '/login'
  }
})
```

---

### Advanced: extractTokens

**TL;DR: Use this when your API uses non-standard field names for tokens.**

By default the library looks for `accessToken`/`access_token` and `refreshToken`/`refresh_token` in the refresh response. If your API uses different names, provide this function.

```typescript
import { createApiClient } from '@ametie/vue-muza-use'

const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    extractTokens: (response) => ({
      accessToken: response.data.jwt,
      refreshToken: response.data.refresh_jwt
    }),
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```

---

### Advanced: AuthMonitor — Observing Token Lifecycle Events

**TL;DR: Hook into token refresh events for logging, analytics, or error tracking.**

Use `setAuthMonitor` to observe every stage of the token refresh lifecycle. This is useful for Sentry integration, analytics, or debugging auth issues in production.

```typescript
import {
  setAuthMonitor,
  AuthEventType
} from '@ametie/vue-muza-use'

setAuthMonitor((type, payload) => {
  switch (type) {
    case AuthEventType.REFRESH_START:
      console.log('Token refresh started')
      break
    case AuthEventType.REFRESH_SUCCESS:
      console.log('Token refreshed successfully')
      break
    case AuthEventType.REFRESH_ERROR:
      // payload.error contains the failure reason
      console.error('Token refresh failed', payload.error)
      break
    case AuthEventType.REQUEST_QUEUED:
      console.log(
        `${payload.queueSize} request(s) waiting for refresh`
      )
      break
  }
})
```

`AuthEventType` reference:

| Event | When it fires |
|-------|---------------|
| `REFRESH_START` | A token refresh request has been sent to the server |
| `REQUEST_QUEUED` | An API request was queued because a refresh is already in progress |
| `REFRESH_SUCCESS` | The token was refreshed successfully |
| `REFRESH_ERROR` | The token refresh failed (triggers `onTokenRefreshFailed`) |

> [!TIP]
> In development mode, the default monitor already logs all auth events to
> the browser console via `console.debug`. You only need to call `setAuthMonitor`
> if you want custom behavior (e.g., sending events to Sentry).

---

## 🛑 Error Handling Reference

### ApiError Shape

Every error surfaces as an `ApiError` object — in `error.value`, `onError`, and the global error handler.

| Field | Type | Always present? | What it contains |
|-------|------|-----------------|------------------|
| `message` | `string` | ✅ Yes | Human-readable error description |
| `status` | `number` | ✅ Yes | HTTP status code (`0` for network errors) |
| `code` | `string \| undefined` | When backend sends it | Machine-readable error code from the backend |
| `errors` | `Record<string, string[]> \| undefined` | For validation errors | Field-level validation messages (Laravel, Rails, etc.) |
| `details` | `unknown` | When available | Raw response data from the backend |

---

### DebounceCancelledError

**TL;DR: This error is thrown when a debounced call is cancelled — catch it to avoid console noise.**

When `debounce` is active and a new call arrives before the delay expires, the previous call is cancelled. If you `await`ed that call, it will throw `DebounceCancelledError`. This is not a real error — it just means the call was replaced by a newer one.

```typescript
import { useApi, DebounceCancelledError } from '@ametie/vue-muza-use'

const { execute } = useApi('/search', { debounce: 300 })

async function search() {
  try {
    await execute()
  } catch (err) {
    if (err instanceof DebounceCancelledError) {
      return  // Expected — a newer call replaced this one
    }
    throw err  // Re-throw unexpected errors
  }
}
```

> [!TIP]
> If you use `onError` instead of awaiting `execute()`, `DebounceCancelledError`
> is NOT passed to `onError` — it is filtered out automatically.
> You only need to handle it if you `await execute()` directly.

---

## 🔧 Utilities & Standalone Composables

### useApiState — Standalone Reactive State

**TL;DR: Use this to build custom composables with the same state shape as useApi.**

If you're writing your own composable that wraps `useApi` — or something similar — you can use `useApiState` to get the same `data / loading / error / mutate` pattern without any HTTP logic attached.

```typescript
import { useApiState } from '@ametie/vue-muza-use'
import type { ApiError } from '@ametie/vue-muza-use'

function useMyCustomComposable<T>(fetchFn: () => Promise<T>) {
  const {
    data,
    loading,
    error,
    mutate,
    setLoading,
    setError,
    reset
  } = useApiState<T>()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      mutate(result)
    } catch (err) {
      const apiError: ApiError = {
        message: String(err),
        status: 0
      }
      setError(apiError)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, load, reset }
}
```

---

## 📚 API Reference

### `useApi<TRaw, D, TSelected>(url, options)`

Three type parameters — all optional with defaults:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `TRaw` | `unknown` | Shape of the raw response data from the server |
| `D` | `unknown` | Shape of the request body / params |
| `TSelected` | `TRaw` | Shape of `data.value` after `select` is applied. Equals `TRaw` when `select` is not used |

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `url` | `MaybeRefOrGetter<string \| undefined>` | API endpoint. String, ref, or getter function. Returning `undefined` prevents the request. |
| `options` | `UseApiOptions<TRaw, D, TSelected>` | Configuration object (see below). |

---

#### UseApiOptions — Complete Reference

**Request Configuration:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'GET'` | HTTP method to use for the request |
| `data` | `MaybeRefOrGetter<D>` | `undefined` | Request body — automatically unwrapped if a ref |
| `params` | `MaybeRefOrGetter<any>` | `undefined` | URL query parameters — automatically unwrapped if a ref |
| `headers` | `Record<string, string>` | `undefined` | Custom request headers added on top of defaults |
| `authMode` | `'default' \| 'public' \| 'optional'` | `'default'` | Controls token injection and 401 retry behaviour |

**Reactivity & Auto-Execution:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `immediate` | `boolean` | `false` | When `true`, executes the request automatically when the composable is created |
| `watch` | `WatchSource \| WatchSource[]` | `undefined` | One or more refs to watch — request re-fires when any of them change |
| `debounce` | `number` | `0` | Milliseconds to wait after the last watch change before firing the request |

**Caching:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | `string \| CacheOptions` | `undefined` | Cache the response in memory. String shorthand uses default 5-min TTL. See [Response Caching](#response-caching) |
| `invalidateCache` | `string \| string[]` | `undefined` | Cache key(s) to delete on 2xx success. Never fires on error |
| `staleWhileRevalidate` | `boolean` | `false` | When `true` and a cache hit occurs, return stale data immediately and revalidate in the background. `revalidating` is `true` during the background fetch. See [SWR](#stale-while-revalidate-swr) |

**Polling:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `poll` | `number \| { interval: MaybeRefOrGetter<number>, whenHidden?: MaybeRefOrGetter<boolean> } \| Ref<number>` | `0` | Polling interval in ms. `0` disables polling. Object form allows reactive fields. |

**Retry:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retry` | `false \| boolean \| number` | `false` | Number of retry attempts on failure. `true` = 3 retries |
| `retryDelay` | `number` | `1000` | How many milliseconds to wait between retry attempts |
| `retryStatusCodes` | `number[]` | `[408,429,500,502,503,504]` | HTTP status codes that trigger a retry. `[]` means retry on any error |

**Data Transformation:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `select` | `(data: TRaw) => TSelected` | `undefined` | Transform response data before it is stored in `data`. Re-applied on every fetch, polling tick, and SWR revalidation. Cache always stores raw data. See [select](#select--declarative-data-transformation) |

**State Initialization:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialData` | `TSelected` | `null` | Initial value for `data` before the first request completes |
| `initialLoading` | `boolean` | `false` | Initial value for `loading` — set `true` to show a spinner before the first request fires |

**Lifecycle Hooks:**

| Option | Type | Description |
|--------|------|-------------|
| `onBefore` | `() => void` | Called immediately before the request starts |
| `onSuccess` | `(response: AxiosResponse<T>) => void` | Called on a successful 2xx response |
| `onError` | `(error: ApiError) => void` | Called after the final failure (after all retries are exhausted) |
| `onFinish` | `() => void` | Called after the request completes, whether success or error |

**Error Control:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipErrorNotification` | `boolean` | `false` | When `true`, the global `onError` handler is NOT called for this request |

**Credentials:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `withCredentials` | `boolean` | `undefined` | Override the Axios instance default for this request only. `true` = send cookies/credentials, `false` = omit them. Omitting uses the instance default set in `createApiClient` |

**Advanced:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useGlobalAbort` | `boolean` | `true` | When `true`, this request participates in the global abort controller |

---

#### UseApiReturn — Complete Reference

| Name | Type | Description |
|------|------|-------------|
| `data` | `Ref<TSelected \| null>` | Response data from the last successful request (transformed by `select` if provided) |
| `loading` | `Ref<boolean>` | `true` while a request is in flight (including retry delays) |
| `error` | `Ref<ApiError \| null>` | Error from the last failed request; `null` on success |
| `statusCode` | `Ref<number \| null>` | HTTP status code from the last completed request |
| `response` | `Ref<AxiosResponse<unknown> \| null>` | Full Axios response object including headers (raw, before `select`) |
| `revalidating` | `Ref<boolean>` | `true` while a background SWR revalidation is in flight. Always `false` when `staleWhileRevalidate` is not set |
| `execute(config?)` | `(config?: ApiRequestConfig<D>) => Promise<TSelected \| null>` | Manually trigger the request, optionally overriding options |
| `mutate(newData)` | `(newData: TSelected \| null \| ((prev: TSelected \| null) => TSelected \| null)) => void` | Update `data` locally without a network request; clears `error` |
| `abort(msg?)` | `(message?: string) => void` | Cancel the current in-flight request |
| `reset()` | `() => void` | Cancel the request and reset all state to initial values |
| `ignoreUpdates(fn)` | `(updater: () => void) => void` | Run `updater` without triggering watch-based re-execution |

#### `execute(config?)`

Manually trigger the request. Pass a config object to override options for this call only.

```typescript
import { useApi } from '@ametie/vue-muza-use'

const { execute } = useApi<{ id: number }>('/users')

// Default execution
await execute()

// Override data and params for this call only
await execute({
  data: { name: 'John' },
  params: { notify: true }
})

// Override authMode for this call only
await execute({ authMode: 'public' })
```

---

### `createApi(options)`

Vue plugin factory. Call this once in `main.ts` to provide global configuration.

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient } from '@ametie/vue-muza-use'
import App from './App.vue'

const api = createApiClient({ baseURL: 'https://api.example.com' })

createApp(App).use(createApi({
  axios: api,
  onError: (error) => {
    console.error(error.message)
  },
  globalOptions: {
    retry: 2,
    retryDelay: 1000,
    retryStatusCodes: [500, 502, 503, 504],
    useGlobalAbort: true
  }
}))
```

**Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `axios` | `AxiosInstance` | ✅ Yes | The Axios instance to use for all requests |
| `onError` | `(error: ApiError, original: unknown) => void` | No | Global error handler called for every failed request (unless `skipErrorNotification: true`) |
| `errorParser` | `(error: unknown) => ApiError` | No | Custom function to convert raw Axios errors into `ApiError` format |
| `globalOptions` | `object` | No | Default options applied to every `useApi()` call (see globalOptions table above) |

---

### `createApiClient(options)`

Factory function that creates a configured Axios instance with built-in JWT auth features.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseURL` | `string` | `undefined` | Base URL prepended to all request paths |
| `timeout` | `number` | `60000` | Request timeout in milliseconds |
| `withCredentials` | `boolean` | `false` | When `true`, all requests include cookies (needed for CORS with cookies) |
| `withAuth` | `boolean` | `true` | Enable automatic token injection and refresh |
| `authOptions.refreshUrl` | `string` | `'/auth/refresh'` | Endpoint used to refresh an expired access token |
| `authOptions.refreshWithCredentials` | `boolean` | `false` | Send cookies on the refresh request only (use with httpOnly refresh tokens) |
| `authOptions.onTokenRefreshFailed` | `() => void` | `undefined` | Called when token refresh fails — typically redirect to login |
| `authOptions.onTokenRefreshed` | `(response: AxiosResponse) => void \| Promise<void>` | `undefined` | Called after a successful refresh — use to sync user state |
| `authOptions.extractTokens` | `(response: AxiosResponse) => { accessToken: string, refreshToken?: string }` | `undefined` | Override token field names from the refresh response |
| `authOptions.refreshPayload` | `Record<string, unknown> \| (() => Record<string, unknown>)` | `undefined` | Extra data to send with the refresh request (device ID, etc.) |

> [!WARNING]
> If you create two `createApiClient()` instances in the same app, they share the
> module-level `isRefreshing` flag and `failedQueue`. This can cause unexpected
> behaviour when both instances handle 401 refresh at the same time. Use a single
> `createApiClient` per app, and route different API domains through it using
> interceptors or `baseURL` overrides on individual requests.

---

### `useApiBatch<T>(urls, options)`

Execute multiple API requests in parallel with full reactive state.

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `urls` | `MaybeRefOrGetter<BatchInput[]>` | Array of URLs (strings) or `BatchRequestConfig` objects, or a ref/getter of that array |
| `options` | `UseApiBatchOptions<T>` | Configuration object |

`BatchInput` type:
```typescript
type BatchInput = string | BatchRequestConfig
```

**UseApiBatchOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `settled` | `boolean` | `true` | When `true`, all requests run even if some fail. When `false`, the first error stops the batch |
| `concurrency` | `number` | unlimited | Maximum number of requests that run in parallel at once |
| `immediate` | `boolean` | `false` | Execute the batch automatically when the composable is created |
| `skipErrorNotification` | `boolean` | `true` | Suppress global error handler for individual item failures |
| `watch` | `WatchSource \| WatchSource[]` | `undefined` | Re-execute the batch when these sources change |
| `onItemSuccess` | `(item: BatchResultItem<T>, index: number) => void` | `undefined` | Called each time a single request in the batch succeeds |
| `onItemError` | `(item: BatchResultItem<T>, index: number) => void` | `undefined` | Called each time a single request in the batch fails |
| `onProgress` | `(progress: BatchProgress) => void` | `undefined` | Called after each request completes with updated progress |
| `onFinish` | `(results: BatchResultItem<T>[]) => void` | `undefined` | Called once when all requests have completed |

**UseApiBatchReturn:**

| Name | Type | Description |
|------|------|-------------|
| `data` | `Ref<BatchResultItem<T>[]>` | All results with full metadata |
| `successfulData` | `Ref<T[]>` | Only the data from successful requests |
| `loading` | `Ref<boolean>` | `true` while any request is still in flight |
| `error` | `Ref<ApiError \| null>` | Set only if ALL requests in the batch failed |
| `errors` | `Ref<ApiError[]>` | All individual errors from failed requests |
| `progress` | `Ref<BatchProgress>` | Current progress tracking object |
| `execute` | `() => Promise<BatchResultItem<T>[]>` | Start the batch |
| `abort` | `(message?: string) => void` | Cancel all pending requests |
| `reset` | `() => void` | Reset all state to initial values |

**BatchResultItem<T>:**

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | The URL that was requested |
| `index` | `number` | Position in the original array |
| `success` | `boolean` | `true` if the request succeeded |
| `data` | `T \| null` | Response data (`null` if failed) |
| `error` | `ApiError \| null` | Error details (`null` if succeeded) |
| `statusCode` | `number \| null` | HTTP status code |
| `response` | `AxiosResponse<T> \| null` | Full Axios response (`null` if failed) |
| `request` | `BatchRequestConfig` | The original normalized request config |

---

### `useAbortController()`

**TL;DR: Manually cancel all active requests at once — useful when navigating away or resetting filters.**

```typescript
import { useAbortController } from '@ametie/vue-muza-use'

const { abortAll, getSignal, abortCount } = useAbortController()

abortAll('Filter reset')
```

**Returns:**

| Name | Type | Description |
|------|------|-------------|
| `abortAll` | `(reason?: string) => void` | Cancel all requests currently subscribed to this controller |
| `getSignal` | `() => AbortSignal` | Get the current AbortSignal to attach to manual fetch calls |
| `abortCount` | `Ref<number>` | Increments each time `abortAll` is called |

---

### `tokenManager`

See the full [tokenManager section](#tokenmanager--manual-token-control) above.

Quick import:
```typescript
import { tokenManager } from '@ametie/vue-muza-use'

tokenManager.setTokens({ accessToken: '...', expiresIn: 3600 })
tokenManager.clearTokens()
const isLoggedIn = tokenManager.hasTokens()
```

---

### `useApiState<T>()`

See the full [useApiState section](#useapistate--standalone-reactive-state) above.

Quick import:
```typescript
import { useApiState } from '@ametie/vue-muza-use'

const { data, loading, error, mutate, setLoading, setError, reset } =
  useApiState<MyType>()
```

---

### `invalidateCache(id)` / `clearAllCache()`

**TL;DR: Imperatively delete one, many, or all cache entries from anywhere in your app.**

```typescript
import { invalidateCache, clearAllCache } from '@ametie/vue-muza-use'
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `invalidateCache` | `(id: string \| string[]) => void` | Delete one or more cache entries by key |
| `clearAllCache` | `() => void` | Wipe the entire cache — use on logout |

**Example — bust cache after a WebSocket push:**

```typescript
// pinia store or composable outside a component
import { invalidateCache } from '@ametie/vue-muza-use'

socket.on('products:updated', () => {
  invalidateCache('products')
})
```

**Example — clear all on logout:**

```typescript
import { clearAllCache } from '@ametie/vue-muza-use'
import { tokenManager } from '@ametie/vue-muza-use'

function logout() {
  tokenManager.clearTokens()
  clearAllCache() // prevent stale data from leaking to the next user session
  router.push('/login')
}
```

---

## 🧩 Common Patterns

### 1. Search with Debounce and Reset

Debounced search input. Typing triggers a request; "Clear" resets the input silently without fetching.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
  email: string
}

const search = ref('')

const { data, loading, ignoreUpdates } = useApi<User[]>('/users', {
  params: () => ({ q: search.value }),
  watch: [search],
  debounce: 400,
  immediate: true,
})

function clearSearch() {
  ignoreUpdates(() => {
    search.value = ''
  })
  // watch is suppressed — no request fires on clear
}
</script>

<template>
  <div>
    <input v-model="search" placeholder="Search users..." />
    <button @click="clearSearch">Clear</button>

    <div v-if="loading">Searching...</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">
        {{ user.name }} — {{ user.email }}
      </li>
    </ul>
  </div>
</template>
```

---

### 2. Paginated List with Filter Reset

When the user changes a filter, also reset the page to 1. Vue batches synchronous ref changes, so the watcher fires once — no `ignoreUpdates` needed here.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface Post {
  id: number
  title: string
  status: string
}

const page = ref(1)
const status = ref('all')

const { data, loading } = useApi<Post[]>('/posts', {
  params: () => ({ status: status.value, page: page.value }),
  watch: [status, page],
  immediate: true,
})

function changeStatus(newStatus: string) {
  status.value = newStatus
  page.value = 1
  // Vue batches these sync changes — watch fires once, one request
}
</script>

<template>
  <div>
    <button @click="changeStatus('all')">All</button>
    <button @click="changeStatus('published')">Published</button>
    <button @click="changeStatus('draft')">Drafts</button>

    <div v-if="loading">Loading...</div>
    <ul v-else>
      <li v-for="post in data" :key="post.id">
        [{{ post.status }}] {{ post.title }}
      </li>
    </ul>

    <button :disabled="page <= 1" @click="page--">Prev</button>
    <span>Page {{ page }}</span>
    <button @click="page++">Next</button>
  </div>
</template>
```

---

### 3. Form Submit with Loading, Error Display, and Retry

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi, DebounceCancelledError } from '@ametie/vue-muza-use'

interface CreatePostDto {
  title: string
  body: string
}

interface Post {
  id: number
  title: string
}

const form = ref<CreatePostDto>({ title: '', body: '' })

const { execute, loading, error } = useApi<Post, CreatePostDto>(
  '/posts',
  {
    method: 'POST',
    data: form,
    retry: 2,
    retryDelay: 1500,
    retryStatusCodes: [500, 502, 503]
  }
)

async function submit() {
  try {
    const result = await execute()
    if (result) {
      console.log('Post created with id:', result.id)
    }
  } catch (err) {
    if (err instanceof DebounceCancelledError) return
    throw err
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.title" placeholder="Title" required />
    <textarea v-model="form.body" placeholder="Body" required />
    <p v-if="error" class="error">{{ error.message }}</p>
    <button type="submit" :disabled="loading">
      {{ loading ? 'Saving...' : 'Create Post' }}
    </button>
  </form>
</template>
```

---

### 4. Dashboard with Parallel Requests (useApiBatch)

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useApiBatch } from '@ametie/vue-muza-use'
import type { BatchRequestConfig } from '@ametie/vue-muza-use'

interface Stats { totalUsers: number; revenue: number }
interface Order { id: number; total: number }
interface Notification { id: number; text: string }

const requests: BatchRequestConfig[] = [
  { url: '/api/stats' },
  { url: '/api/recent-orders', params: { limit: 5 } },
  { url: '/api/notifications' }
]

const {
  data: results,
  loading,
  progress,
  execute
} = useApiBatch(requests, { immediate: true })

const stats = computed(
  () => results.value.find(r => r.url.includes('stats'))?.data as Stats | undefined
)
const orders = computed(
  () => results.value.find(r => r.url.includes('orders'))?.data as Order[] | undefined
)
const notifications = computed(
  () => results.value.find(r => r.url.includes('notifications'))?.data as Notification[] | undefined
)
</script>

<template>
  <div v-if="loading">
    Loading dashboard... {{ progress.percentage }}%
  </div>
  <div v-else>
    <div v-if="stats">
      <p>Total users: {{ stats.totalUsers }}</p>
      <p>Revenue: \${{ stats.revenue }}</p>
    </div>
    <ul v-if="orders">
      <li v-for="order in orders" :key="order.id">\${{ order.total }}</li>
    </ul>
    <ul v-if="notifications">
      <li v-for="n in notifications" :key="n.id">{{ n.text }}</li>
    </ul>
  </div>
</template>
```

---

### 5. Login + Token Save + Logout

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi, tokenManager } from '@ametie/vue-muza-use'
import { useRouter } from 'vue-router'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const router = useRouter()
const credentials = ref({ email: '', password: '' })

const { execute: login, loading, error } = useApi<LoginResponse>(
  '/auth/login',
  {
    method: 'POST',
    authMode: 'public',
    data: credentials,
    onSuccess(response) {
      tokenManager.setTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        expiresIn: response.data.expiresIn
      })
      router.push('/dashboard')
    }
  }
)

function logout() {
  tokenManager.clearTokens()
  router.push('/login')
}
</script>

<template>
  <form @submit.prevent="login()">
    <input v-model="credentials.email" type="email" placeholder="Email" />
    <input
      v-model="credentials.password"
      type="password"
      placeholder="Password"
    />
    <p v-if="error">{{ error.message }}</p>
    <button :disabled="loading">
      {{ loading ? 'Signing in...' : 'Login' }}
    </button>
  </form>
</template>
```

---

### 6. Polling Status Until Done

Start polling every 2 seconds and stop automatically when the job reaches a terminal status.

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { useApi } from '@ametie/vue-muza-use'

  interface JobStatus {
    id: string
    status: 'pending' | 'processing' | 'complete' | 'failed'
    progress: number
  }

  const jobId = ref<string | null>(null)
  const pollInterval = ref(0)

  const { data: job, error } = useApi<JobStatus>(
          () => jobId.value ? `/jobs/${jobId.value}` : undefined,
          {
            watch: jobId,
            poll: { interval: pollInterval },
            onSuccess(response) {
              const { status } = response.data
              if (status === 'complete' || status === 'failed') {
                pollInterval.value = 0  // Stop polling
              }
            }
          }
  )

  function startJob(id: string) {
    jobId.value = id
    pollInterval.value = 2000  // Start polling every 2s
  }
</script>

<template>
  <div>
    <button @click="startJob('job-123')">Start Job</button>
    <div v-if="job">
      Status: {{ job.status }} — {{ job.progress }}%
    </div>
    <p v-if="error">{{ error.message }}</p>
  </div>
</template>
```

---

## 🔍 Troubleshooting

| Problem | Likely Cause | Fix |
|---------|--------------|-----|
| `"createApi config not found"` | `createApi()` not called | Call `app.use(createApi(...))` in `main.ts` before mounting |
| Request fires twice on mount | `immediate: true` AND `watch` on a ref both trigger on setup | Use only `immediate` OR `watch` for the first load — not both |
| `retry` option does nothing | Default is `retry: false` | Set `retry: true` or `retry: 3` |
| ALL errors trigger retry, not just some | `retryStatusCodes` not set — uses library default | Specify exact codes or use `retryStatusCodes: []` to retry on any error |
| `ignoreUpdates` still triggers a request | Updater function contains an `await` | `ignoreUpdates` is sync-only — move async logic outside the updater |
| `DebounceCancelledError` in console | Not handling cancelled debounce calls | Catch `DebounceCancelledError` when you `await execute()` directly |
| 401 not refreshing token | `authMode: 'public'` or `'optional'` set on the request | Change to `authMode: 'default'` for endpoints that require auth |
| Token not sent on requests | `withAuth: false` in `createApiClient` | Remove `withAuth: false` — it defaults to `true` |
| Cookie not sent on refresh request | `refreshWithCredentials` not set | Set `refreshWithCredentials: true` in `authOptions` |
| Batch request not sending body | URL passed as a plain string | Use `BatchRequestConfig` object: `{ url, method: 'POST', data }` |
| `useApi` outside a component throws | Missing Vue provide context | `createApi` uses global config — should work anywhere after `app.use()` |
| Two Axios instances break token refresh | `isRefreshing` is module-level state | Use one `createApiClient` per app; multiple instances share internal state |

---

## 📄 Changelog / Migration

See [GitHub Releases](https://github.com/ametie/vue-muza-use/releases) for version history.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © [Ametie](https://github.com/ametie)

---

## 🙏 Acknowledgments

Built with ❤️ for the Vue.js community. Inspired by real-world challenges in modern web applications.
