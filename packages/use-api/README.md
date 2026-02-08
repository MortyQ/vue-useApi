# Vue Muza Use 🎹

[![npm version](https://img.shields.io/npm/v/@ametie/vue-muza-use.svg?style=flat-square)](https://www.npmjs.com/package/@ametie/vue-muza-use)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-green.svg?style=flat-square)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Included-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**Type-safe, feature-rich Axios wrapper for Vue 3 Composition API. Built for real-world business logic.**

A production-ready composable that eliminates boilerplate and solves the hard problems: race conditions, token refresh queues, automatic retries, and reactive request management. Write less code, ship faster, sleep better.

---

## ✨ Features

- 🎯 **Fully Type-Safe** — End-to-end TypeScript support with strict typing for requests and responses
- 🔄 **Smart Reactivity** — Watch refs and automatically refetch when dependencies change
- ⏱️ **Built-in Debouncing** — Perfect for search inputs and auto-save forms
- 🛡️ **Race Condition Protection** — Global abort controller cancels stale requests automatically
- 🔐 **JWT Token Management** — Automatic token refresh with request queueing on 401 responses
- ♻️ **Intelligent Retries** — Lifecycle-aware retry logic that respects component unmounting
- 📊 **Auto-Polling** — Built-in interval fetching with smart tab visibility detection
- 🧹 **Zero Memory Leaks** — Automatic cleanup of pending requests on component unmount
- 🎛️ **Flexible Architecture** — Bring your own Axios instance with full configuration control

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

---

## 🔐 Token Management

The library supports **automatic token refresh** with two security modes:

### Mode 1: localStorage (Default)
```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: false, // or omit (default)
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```
- ✅ Both `accessToken` and `refreshToken` stored in localStorage
- ⚠️ Less secure (vulnerable to XSS), but easier to implement

### Mode 2: httpOnly Cookies (Recommended for Production)
```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: true, // 🔑 Key parameter!
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```
- ✅ Only `accessToken` in localStorage
- 🔒 `refreshToken` sent via httpOnly cookie (XSS protection)
- 📡 Backend must set: `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=None` (for cross-origin)
- 🎯 **Smart Auto-Detection**: If no `refreshToken` in localStorage, `withCredentials: true` is automatically enabled

**⚠️ Common Issues & Solutions:**

1. **Cookie not sent to backend?**
   - Check: Browser DevTools → Application → Cookies
   - Cookie must have: `HttpOnly`, `Secure` (for HTTPS), `SameSite=None` (for cross-origin)
   - Cookie domain must match your request domain

2. **CORS errors?**
   - Backend must set: `Access-Control-Allow-Credentials: true`
   - Backend must set specific origin (NOT `*`): `Access-Control-Allow-Origin: https://your-frontend.com`
   - Frontend baseURL must match backend domain

3. **401 on refresh?**
   - Check Network tab → Refresh request → Headers
   - Verify "Cookie" header includes your refresh token
   - Backend logs: does it receive the cookie?

### Custom Refresh Payload
Send additional data with refresh requests:

**⚠️ IMPORTANT:** Use functions for dynamic data (like tokens from storage):

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    // ❌ WRONG - computed once at app start
    // refreshPayload: { refreshToken: tokenManager.getRefreshToken() }
    
    // ✅ CORRECT - computed on each refresh
    refreshPayload: () => ({
      refreshToken: tokenManager.getRefreshToken(),
      timestamp: Date.now()
    })
  }
})
```

Static payload (for constants only):
```typescript
refreshPayload: {
  deviceId: 'mobile-v1',
  platform: 'ios' // constants that don't change
}
```

Dynamic function:
```typescript
refreshPayload: () => ({
  timestamp: Date.now(),
  sessionId: getSessionId() // reads current value
})
```

### Saving Tokens After Login
```typescript
import { tokenManager } from '@ametie/vue-muza-use'

const { execute } = useApiPost<AuthResponse>('/auth/login', {
  authMode: 'public',
  onSuccess(response) {
    tokenManager.setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken, // optional in cookie mode
      expiresIn: response.data.expiresIn
    })
  }
})
```
---

## 🚀 Quick Start

### 1. Setup Plugin (`main.ts`)

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient } from '@ametie/vue-muza-use'
import App from './App.vue'

const app = createApp(App)

// Create configured Axios instance
const api = createApiClient({
  baseURL: 'https://api.example.com',
  withAuth: true, // Automatic token injection
  authOptions: {
    refreshUrl: '/auth/refresh',
    onTokenRefreshFailed: () => {
      window.location.href = '/login'
    }
  }
})

// Install plugin
app.use(createApi({
  axios: api,
  onError: (error) => {
    console.error('API Error:', error.message)
  }
}))

app.mount('#app')
```

### 2. Simple GET Request

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

### 3. Real-World Example: Live Search

This is where the library shines. Use a **getter function** for dynamic URLs, watch a ref, debounce input, and handle race conditions automatically:

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

// 💡 Pass a getter function - no need for computed!
const { data, loading } = useApi<Product[]>(
  () => `/products/search?q=${searchQuery.value}`,
  {
    watch: searchQuery,    // ⚡️ Auto-refetch when query changes
    debounce: 500          // ⏱️ Wait 500ms after typing stops
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

---

## 📖 Core Usage

### GET Requests

#### Basic Fetch
```typescript
const { data, loading, error, execute } = useApi<User>('/users/1')

// Manually trigger
await execute()
```

#### Auto-Fetch on Mount
```typescript
useApi<User>('/users/1', {
  immediate: true,
  retry: 3,           // Retry 3 times on network failure
  retryDelay: 1000    // Wait 1s between retries
})
```

#### Dynamic URLs
Use a **getter function** for reactive URLs - simple and efficient:

```typescript
const userId = ref(1)

// ✅ Preferred: Getter function (no computed needed!)
const { data } = useApi(() => `/users/${userId.value}`, {
  watch: userId,
  immediate: true
})

// Also works: computed ref
const url = computed(() => `/users/${userId.value}`)
const { data } = useApi(url, { watch: userId, immediate: true })
```

#### Query Parameters
Pass `params` as static object or reactive ref:

```typescript
const filters = ref({
  status: 'active',
  sort: 'name',
  limit: 20
})

const { data } = useApi('/users', {
  params: filters,        // Automatically unwrapped
  watch: filters,         // Re-fetch when filters change
  debounce: 300
})

// URL becomes: /users?status=active&sort=name&limit=20
```

---

### POST/PUT/PATCH Requests

#### Form Submission with Loading State
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

interface LoginForm {
  email: string
  password: string
}

interface LoginResponse {
  token: string
  user: { id: number; name: string }
}

const form = ref<LoginForm>({
  email: '',
  password: ''
})

const { execute, loading, error } = useApi<LoginResponse>('/auth/login', {
  method: 'POST',
  authMode: 'public',     // 👈 Skip token injection for login
  data: form,             // Ref is auto-unwrapped
  onSuccess: (response) => {
    localStorage.setItem('token', response.data.token)
    router.push('/dashboard')
  }
})

const handleSubmit = async () => {
  await execute()
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="form.email" type="email" :disabled="loading" />
    <input v-model="form.password" type="password" :disabled="loading" />
    
    <button type="submit" :disabled="loading">
      {{ loading ? 'Signing in...' : 'Sign In' }}
    </button>
    
    <p v-if="error" class="error">{{ error.message }}</p>
  </form>
</template>
```

#### Update with Optimistic UI
```typescript
const { execute: updateProfile } = useApi('/user/profile', {
  method: 'PUT',
  onBefore: () => {
    // Show optimistic update
    localProfile.value = { ...localProfile.value, ...changes }
  },
  onSuccess: (response) => {
    toast.success('Profile updated!')
  },
  onError: () => {
    // Rollback on error
    localProfile.value = originalProfile
  }
})
```

---

### Auto-Refetching with Watch

Watch reactive dependencies and auto-refetch when they change. Perfect for filters, search, and dynamic content.

#### Live Search (Debounced)
```vue
<script setup lang="ts">
const searchQuery = ref('')
const category = ref('all')

// Use getter function for dynamic URL construction
const { data, loading } = useApi<Product[]>(
  () => `/products?q=${searchQuery.value}&category=${category.value}`,
  {
    watch: [searchQuery, category],  // Watch multiple refs
    debounce: 500                    // Debounce search input
  }
)
</script>

<template>
  <input v-model="searchQuery" placeholder="Search..." />
  <select v-model="category">
    <option value="all">All</option>
    <option value="electronics">Electronics</option>
  </select>
  
  <ProductList :products="data" :loading="loading" />
</template>
```

#### Data Table with Pagination & Sorting
```vue
<script setup lang="ts">
interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
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

const { data, loading } = useApi<PaginatedResponse<Order>>('/orders', {
  params,
  watch: params,      // Auto-refetch when any param changes
  immediate: true
})

const handleSort = (column: string) => {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = 'desc'
  }
}
</script>

<template>
  <table>
    <thead>
      <tr>
        <th @click="handleSort('id')">ID</th>
        <th @click="handleSort('created_at')">Date</th>
        <th @click="handleSort('total')">Total</th>
      </tr>
    </thead>
    <tbody v-if="!loading">
      <tr v-for="order in data?.data" :key="order.id">
        <td>{{ order.id }}</td>
        <td>{{ order.created_at }}</td>
        <td>${{ order.total }}</td>
      </tr>
    </tbody>
  </table>
  
  <Pagination 
    v-model="page" 
    :total="data?.total"
    :loading="loading"
  />
</template>
```

#### Auto-Save Form
```typescript
const settings = ref({
  theme: 'dark',
  notifications: true,
  language: 'en'
})

useApi('/user/settings', {
  method: 'PUT',
  data: settings,
  watch: settings,        // Deep watch by default
  debounce: 1000,         // Save 1s after changes stop
  onSuccess: () => {
    toast.success('Settings saved')
  }
})
```

---

### Auto-Polling (Background Updates)

Keep data fresh with intelligent polling. Automatically pauses when tab is hidden (configurable).

#### Simple Polling
```typescript
// Fetch notifications every 5 seconds
const { data } = useApi<Notification[]>('/notifications', {
  immediate: true,
  poll: 5000
})
```

#### Smart Polling with Controls
```typescript
const { data, loading } = useApi('/stock-prices', {
  immediate: true,
  poll: {
    interval: 1000,
    whenHidden: false    // ⚠️ Pause when tab is hidden (default)
  }
})
```

#### Dynamic Polling Control
```typescript
const pollInterval = ref(3000)

// Start/stop polling by changing the ref
const { data } = useApi('/live-feed', {
  poll: pollInterval,
  immediate: true
})

// Stop polling
const stopPolling = () => pollInterval.value = 0

// Resume with 5s interval
const startPolling = () => pollInterval.value = 5000
```

---

### Race Condition Prevention

#### Global Abort Controller
Cancel all pending requests in a scope when filters change. By default, all requests subscribe to the global abort controller:

```vue
<script setup lang="ts">
import { useAbortController } from '@ametie/vue-muza-use'

const filters = ref({ category: 'all', priceMin: 0, priceMax: 1000 })

// 💡 useGlobalAbort: true by default - automatically subscribed
const { data: products } = useApi('/products', {
  params: filters
})

const { data: stats } = useApi('/products/stats', {
  params: filters
})

const { abortAll } = useAbortController()

const resetFilters = () => {
  abortAll()    // 🛑 Cancel both pending requests
  filters.value = { category: 'all', priceMin: 0, priceMax: 1000 }
}

// To opt-out of global abort:
const { data: independent } = useApi('/independent-request', {
  useGlobalAbort: false  // This request won't be cancelled by abortAll()
})
</script>
```

#### Per-Request Abort
```typescript
const { execute, abort } = useApi('/long-running-task')

// Start
execute()

// Cancel if needed
setTimeout(() => abort('User cancelled'), 5000)
```

## ⚙️ Advanced Configuration

### Custom Axios Instance

If you need full control over Axios configuration, create your own instance:

```typescript
import axios from 'axios'
import { createApi } from '@ametie/vue-muza-use'

const customAxios = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: {
    'X-Custom-Header': 'value'
  }
})

// Add your own interceptors
customAxios.interceptors.request.use((config) => {
  // Custom logic
  return config
})

app.use(createApi({ axios: customAxios }))
```

---

### Error Handling

#### Custom Error Parser

Every backend returns errors differently. Normalize them into a standard format:

```typescript
import { createApi } from '@ametie/vue-muza-use'

app.use(createApi({
  axios: api,
  errorParser: (error: any) => {
    const response = error.response?.data
    
    // Laravel/Rails validation errors
    if (response?.errors) {
      return {
        message: 'Validation Failed',
        status: error.response.status,
        code: 'VALIDATION_ERROR',
        errors: response.errors // { email: ['Invalid email format'] }
      }
    }
    
    // Custom API format
    if (response?.error?.message) {
      return {
        message: response.error.message,
        status: error.response?.status || 500,
        code: response.error.code
      }
    }
    
    // Default fallback
    return {
      message: error.message || 'An unexpected error occurred',
      status: error.response?.status || 500,
      details: error
    }
  }
}))
```

#### Using Errors in Components

```vue
<script setup lang="ts">
const { data, error, execute } = useApi('/users', {
  skipErrorNotification: true  // Skip global error handler
})

// Access structured error
if (error.value) {
  console.log(error.value.message)  // User-friendly message
  console.log(error.value.status)   // HTTP status code
  console.log(error.value.code)     // Custom error code
  console.log(error.value.errors)   // Validation errors
}
</script>

<template>
  <div v-if="error" class="error-banner">
    {{ error.message }}
    
    <!-- Display validation errors -->
    <ul v-if="error.errors">
      <li v-for="(msgs, field) in error.errors" :key="field">
        <strong>{{ field }}:</strong> {{ msgs.join(', ') }}
      </li>
    </ul>
  </div>
</template>
```

---

### Authentication & Token Management

#### How Token Refresh Works

The library implements a **request queue pattern** to handle token expiration gracefully:

```
1. Request fails with 401 Unauthorized
   ↓
2. Add request to queue & pause all new requests
   ↓
3. Attempt token refresh (POST to refreshUrl)
   ↓
4. Success? → Replay all queued requests with new token
   Failure? → Call onTokenRefreshFailed() & reject queue
```

This happens **transparently** — your components just wait a bit longer for the response.

#### Configuration

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  withAuth: true,
  authOptions: {
    refreshUrl: '/auth/refresh',      // Default: '/auth/refresh'
    
    // ✨ NEW: Handle successful refresh response
    onTokenRefreshed: (response) => {
      // Extract additional data from refresh response
      const { user, permissions } = response.data
      
      // Update app state
      store.commit('SET_USER', user)
      store.commit('SET_PERMISSIONS', permissions)
      
      // Analytics
      analytics.track('token_refreshed', { userId: user.id })
    },
    
    onTokenRefreshFailed: () => {
      // Called when refresh fails (expired refresh token)
      localStorage.clear()
      window.location.href = '/login'
    }
  }
})
```

#### Token Storage

The library expects you to manage token storage. Implement these utilities:

```typescript
// utils/auth.ts
export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token')
}

export const setAccessToken = (token: string): void => {
  localStorage.setItem('access_token', token)
}

export const clearTokens = (): void => {
  localStorage.removeItem('access_token')
}
```

The `createApiClient` automatically injects `Authorization: Bearer <token>` on every request.

#### Public Endpoints

For endpoints that don't require authentication (login, register, public data):

```typescript
useApi('/auth/login', {
  method: 'POST',
  authMode: 'public',  // 👈 Skips Authorization header
  data: credentials
})
```

#### Monitoring Auth Events

Track authentication events for debugging or analytics:

```typescript
import { setAuthMonitor } from '@ametie/vue-muza-use'

setAuthMonitor((event, payload) => {
  console.log(`[Auth Event] ${event}`, payload)
  
  // Events: 'token_refresh_start', 'token_refresh_success', 
  //         'token_refresh_failed', 'token_injected'
})
```

---

### Lifecycle Hooks

Fine-grained control over request lifecycle:

```typescript
const { execute } = useApi('/analytics', {
  onBefore: () => {
    console.log('Request starting...')
    loadingBar.start()
  },
  onSuccess: (response) => {
    console.log('Success!', response.data)
    analytics.track('api_success', { endpoint: '/analytics' })
  },
  onError: (error) => {
    console.error('Failed:', error.message)
    sentry.captureException(error)
  },
  onFinish: () => {
    console.log('Request finished (success or error)')
    loadingBar.finish()
  }
})
```

**Hook Execution Order:**
1. `onBefore`
2. Request execution
3. `onSuccess` OR `onError`
4. `onFinish` (always runs)

---

### Retry Logic

Intelligent retries with lifecycle awareness — retries stop if component unmounts:

```typescript
useApi('/flaky-endpoint', {
  retry: 3,           // Retry up to 3 times
  retryDelay: 1000,   // Wait 1s between attempts
  onError: (error, attempt) => {
    console.log(`Attempt ${attempt} failed`)
  }
})
```

**When retries happen:**
- Network errors (timeouts, connection refused)
- 5xx server errors
- Configurable via axios retry interceptor

**When retries DON'T happen:**
- 4xx client errors (bad request, unauthorized, etc.)
- Component is unmounted (automatic cleanup)

---

### Global vs Local Loading States

#### Local Loading (Per Request)
```typescript
const { data: user, loading: userLoading } = useApi('/user')
const { data: posts, loading: postsLoading } = useApi('/posts')

// Each request has its own loading state
```

#### Global Loading (Shared)
```typescript
const globalLoading = ref(false)

useApi('/user', {
  onBefore: () => globalLoading.value = true,
  onFinish: () => globalLoading.value = false
})

useApi('/posts', {
  onBefore: () => globalLoading.value = true,
  onFinish: () => globalLoading.value = false
})
```

#### Smart Loading (Debounced)
Prevent loading flicker for fast responses:

```typescript
import { ref, watch } from 'vue'

const loading = ref(false)
const showLoading = ref(false)
let timeout: ReturnType<typeof setTimeout>

watch(loading, (val) => {
  if (val) {
    // Show loading after 200ms (skip if request is fast)
    timeout = setTimeout(() => {
      showLoading.value = true
    }, 200)
  } else {
    clearTimeout(timeout)
    showLoading.value = false
  }
})
```

## 📚 API Reference

### `useApi<T, D>(url, options)`

The main composable for making HTTP requests.

**Type Parameters:**
- `T` — Response data type
- `D` — Request body type (for POST/PUT/PATCH)

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `url` | `MaybeRefOrGetter<string>` | API endpoint. Can be a string, ref, or getter function. |
| `options` | `UseApiOptions<T, D>` | Configuration object (see below). |

---

### Configuration Options

#### Request Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | `'GET'` | HTTP method. |
| `data` | `MaybeRefOrGetter<D>` | `undefined` | Request body (auto-unwrapped if ref). |
| `params` | `MaybeRefOrGetter<any>` | `undefined` | URL query parameters (auto-unwrapped). |
| `headers` | `Record<string, string>` | `undefined` | Custom headers. |
| `authMode` | `'default' \| 'public'` | `'default'` | Set to `'public'` to skip token injection. |

#### Reactivity & Auto-Execution

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `immediate` | `boolean` | `false` | Auto-execute on component mount. |
| `watch` | `WatchSource \| WatchSource[]` | `undefined` | Refs to watch for auto-refetch. |
| `debounce` | `number` | `0` | Debounce delay in ms (for watch). |

#### Polling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `poll` | `number \| { interval: number, whenHidden?: boolean } \| Ref<number>` | `0` | Polling interval in ms. Set to `0` to disable. |

**Polling Behavior:**
- **Number**: Simple interval (pauses when tab hidden)
- **Object**: `{ interval, whenHidden }` — control pause behavior
- **Ref**: Dynamic control — change ref to update interval

#### Retry & Error Handling

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `retry` | `boolean \| number` | `false` | Number of retry attempts on failure. |
| `retryDelay` | `number` | `1000` | Delay between retries in ms. |
| `skipErrorNotification` | `boolean` | `false` | Skip global error handler. |

#### State Management

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialData` | `T` | `null` | Initial value for `data` ref. |
| `initialLoading` | `boolean` | `false` | Initial value for `loading` ref. |

#### Lifecycle Hooks

| Option | Type | Description |
|--------|------|-------------|
| `onBefore` | `() => void` | Called before request starts. |
| `onSuccess` | `(response: AxiosResponse<T>) => void` | Called on 2xx response. |
| `onError` | `(error: ApiError) => void` | Called on error. |
| `onFinish` | `() => void` | Called after request completes (success or error). |

#### Advanced

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useGlobalAbort` | `boolean` | `true` | Subscribe to global abort controller. |

---

### Return Values

```typescript
{
  // State
  data: Ref<T | null>              // Response data
  loading: Ref<boolean>            // Loading state
  error: Ref<ApiError | null>      // Error object
  response: Ref<AxiosResponse<T>>  // Full Axios response
  
  // Methods
  execute: (config?: AxiosRequestConfig) => Promise<T | null>
  abort: (reason?: string) => void
}
```

#### `execute(config?)`
Manually trigger the request. Optionally override configuration:

```typescript
const { execute } = useApi('/users')

// Default execution
await execute()

// Override config
await execute({ params: { page: 2 } })
```

#### `abort(reason?)`
Cancel the current request:

```typescript
const { execute, abort } = useApi('/long-task')

execute()

// Cancel after 5 seconds
setTimeout(() => abort('Timeout'), 5000)
```

---

### `createApiClient(options)`

Factory function to create a configured Axios instance with built-in auth features.

**Options:**

```typescript
interface CreateApiClientOptions extends AxiosRequestConfig {
  // Standard Axios config
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  withCredentials?: boolean          // Default: false
  
  // Auth features
  withAuth?: boolean                 // Default: true
  authOptions?: {
    refreshUrl?: string              // Default: '/auth/refresh'
    refreshWithCredentials?: boolean // Default: false (set true for httpOnly cookies)
    onTokenRefreshFailed?: () => void
    onTokenRefreshed?: (response: AxiosResponse) => void | Promise<void> // ✨ NEW: Handle refresh response
    extractTokens?: (response: AxiosResponse) => { accessToken: string, refreshToken?: string }
    refreshPayload?: Record<string, unknown> | (() => Record<string, unknown> | Promise<Record<string, unknown>>)
  }
}
```

**Default Configuration:**

The library comes with sensible defaults:
- `timeout: 60000` (60 seconds)
- `headers: { "Content-Type": "application/json" }`
- `withCredentials: false`
- `refreshWithCredentials: false`

**Example:**

```typescript
// Standard setup (tokens in localStorage)
const api = createApiClient({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  withAuth: true,
  authOptions: {
    refreshUrl: '/auth/refresh',
    onTokenRefreshFailed: () => {
      router.push('/login')
    }
  }
})

// With httpOnly cookies for refresh token only
const apiWithCookies = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: true,  // 🍪 Send cookies only for refresh request
    onTokenRefreshFailed: () => router.push('/login')
  }
})

// With cookies for ALL requests (use with caution - CSRF risk)
const apiWithAllCookies = createApiClient({
  baseURL: 'https://api.example.com',
  withCredentials: true,  // ⚠️ All requests will send cookies
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: true
  }
})
```

> 🔒 **Security Note:** Only enable `withCredentials` when necessary. Using it globally can expose you to CSRF attacks. Prefer `refreshWithCredentials: true` if you only need cookies for token refresh.
```

---

### `createApi(options)`

Vue plugin factory for global configuration.

**Options:**

```typescript
interface CreateApiOptions {
  axios: AxiosInstance              // Required: Axios instance
  onError?: (error: ApiError) => void
  errorParser?: (error: any) => ApiError
}
```

**Example:**

```typescript
app.use(createApi({
  axios: api,
  onError: (error) => {
    toast.error(error.message)
  },
  errorParser: (error) => {
    // Custom error transformation
    return {
      message: error.response?.data?.message || error.message,
      status: error.response?.status,
      code: error.response?.data?.code
    }
  }
}))
```

---

### `useAbortController()`

Access the global abort controller for cancelling multiple requests.

**Returns:**

```typescript
{
  abortAll: (reason?: string) => void  // Cancel all subscribed requests
  signal: Ref<AbortSignal>             // Current abort signal
}
```

**Example:**

```typescript
import { useAbortController } from '@ametie/vue-muza-use'

const { abortAll } = useAbortController()

const resetFilters = () => {
  abortAll('Filter reset')
  // ... reset logic
}
```

---

### Type Definitions

#### `ApiError`

```typescript
interface ApiError {
  message: string                    // User-friendly error message
  status?: number                    // HTTP status code
  code?: string                      // Custom error code
  errors?: Record<string, string[]>  // Validation errors
  details?: any                      // Original error object
}
```

#### `MaybeRefOrGetter<T>`

```typescript
type MaybeRefOrGetter<T> = T | Ref<T> | (() => T)
```

Accepts a value, a ref, or a getter function. Automatically unwrapped by the library.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © [Ametie](https://github.com/ametie)

---

## 🙏 Acknowledgments

Built with ❤️ for the Vue.js community. Inspired by real-world challenges in modern web applications.


