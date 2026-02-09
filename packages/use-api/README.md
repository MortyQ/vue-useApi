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

## 🚀 Quick Start

Get started in 2 minutes with minimal configuration.

### 1. Setup Plugin (`main.ts`)

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient } from '@ametie/vue-muza-use'
import App from './App.vue'

const app = createApp(App)

// Create API client with minimal config
const api = createApiClient({
  baseURL: 'https://api.example.com'
})

// Install plugin
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
  immediate: true  // Auto-fetch on mount
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

const searchQuery = ref('')

// 💡 Use a getter function for dynamic URLs
const { data, loading } = useApi(
  () => `/products/search?q=${searchQuery.value}`,
  {
    watch: searchQuery,  // Auto-refetch when query changes
    debounce: 500        // Wait 500ms after typing stops
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

**🎯 What just happened?**
- No race conditions — previous searches auto-cancel
- Debounce — waits for user to stop typing
- TypeScript — full type safety
- Clean code — no manual cleanup needed

---

## 📖 Basic Usage

### GET Requests

#### Manual Execution
```typescript
const { data, loading, error, execute } = useApi<User>('/users/1')

// Trigger manually (e.g., on button click)
await execute()
```

#### Auto-Fetch on Mount
```typescript
const { data } = useApi<User>('/users/1', {
  immediate: true  // Fetches automatically
})
```

#### With Query Parameters
```typescript
const filters = ref({
  status: 'active',
  limit: 20
})

const { data } = useApi('/users', {
  params: filters,    // Automatically unwrapped
  watch: filters,     // Re-fetch when filters change
  immediate: true
})
```

---

### POST/PUT/PATCH Requests

#### Simple Form Submission
```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const form = ref({
  email: '',
  password: ''
})

const { execute, loading, error } = useApi('/auth/login', {
  method: 'POST',
  data: form,  // Ref is auto-unwrapped
  onSuccess: (response) => {
    console.log('Logged in!', response.data)
  }
})
</script>

<template>
  <form @submit.prevent="execute">
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
const userId = ref(1)

const { data } = useApi(() => `/users/${userId.value}`, {
  watch: userId,
  immediate: true
})

// Change userId → automatic refetch
userId.value = 2
```

#### Multiple Dependencies
```typescript
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
const settings = ref({
  theme: 'dark',
  notifications: true
})

useApi('/user/settings', {
  method: 'PUT',
  data: settings,
  watch: settings,    // Deep watch by default
  debounce: 1000,     // Save 1s after changes stop
  onSuccess: () => toast.success('Saved!')
})
```

---

### Polling (Background Updates)

Keep data fresh with smart polling. Automatically pauses when browser tab is hidden.

#### Simple Polling
```typescript
const { data } = useApi('/notifications', {
  immediate: true,
  poll: 5000  // Fetch every 5 seconds
})
```

#### Dynamic Polling Control
```typescript
const pollInterval = ref(3000)

const { data } = useApi('/live-feed', {
  poll: pollInterval,
  immediate: true
})

// Stop polling
pollInterval.value = 0

// Resume with different interval
pollInterval.value = 5000
```

---

### Error Handling

#### Per-Request Error Handling
```typescript
const { error, execute } = useApi('/users', {
  onError: (error) => {
    if (error.status === 404) {
      toast.error('User not found')
    } else {
      toast.error('Something went wrong')
    }
  },
  skipErrorNotification: true  // Skip global handler
})
```

#### Retry on Failure
```typescript
useApi('/flaky-endpoint', {
  immediate: true,
  retry: 3,         // Retry 3 times
  retryDelay: 1000  // Wait 1s between retries
})
```

---

### Loading States

#### Per-Request Loading
```typescript
const { data: user, loading: userLoading } = useApi('/user')
const { data: posts, loading: postsLoading } = useApi('/posts')

// Each request tracks its own loading state
```

#### Lifecycle Hooks
```typescript
const { execute } = useApi('/analytics', {
  onBefore: () => {
    loadingBar.start()
  },
  onSuccess: (response) => {
    console.log('Success!', response.data)
  },
  onError: (error) => {
    console.error('Failed:', error.message)
  },
  onFinish: () => {
    loadingBar.finish()  // Always called
  }
})
```

---

## 📊 Real-World Examples

### Data Table with Pagination & Sorting
```vue
<script setup lang="ts">
const page = ref(1)
const sortBy = ref('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const params = computed(() => ({
  page: page.value,
  sort_by: sortBy.value,
  sort_order: sortOrder.value,
  per_page: 20
}))

const { data, loading } = useApi('/orders', {
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
        <td>${{ order.total }}</td>
      </tr>
    </tbody>
  </table>
  
  <Pagination v-model="page" :total="data?.total" />
</template>
```

### Optimistic UI Updates
```typescript
const { execute: updateProfile } = useApi('/user/profile', {
  method: 'PUT',
  onBefore: () => {
    // Show update immediately
    localProfile.value = { ...localProfile.value, ...changes }
  },
  onError: () => {
    // Rollback on error
    localProfile.value = originalProfile
    toast.error('Update failed')
  }
})
```

### Request Cancellation
```typescript
import { useAbortController } from '@ametie/vue-muza-use'

const { abortAll } = useAbortController()

// Multiple requests
const { data: products } = useApi('/products', { params: filters })
const { data: stats } = useApi('/stats', { params: filters })

// Cancel all when filters reset
const resetFilters = () => {
  abortAll()  // 🛑 Cancel both requests
  filters.value = { /* defaults */ }
}
```

---

## ⚙️ Advanced Configuration

### Custom Axios Instance

Full control over Axios configuration:

```typescript
import axios from 'axios'
import { createApi } from '@ametie/vue-muza-use'

const customAxios = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 30000,
  headers: { 'X-Custom-Header': 'value' }
})

// Add custom interceptors
customAxios.interceptors.request.use((config) => {
  // Your logic
  return config
})

app.use(createApi({ axios: customAxios }))
```

---

### Global Error Handler

Normalize errors from different backend formats:

```typescript
app.use(createApi({
  axios: api,
  
  // Global error handler
  onError: (error) => {
    toast.error(error.message)
  },
  
  // Error parser (normalize backend responses)
  errorParser: (error: any) => {
    const response = error.response?.data
    
    // Laravel validation errors
    if (response?.errors) {
      return {
        message: 'Validation Failed',
        status: error.response.status,
        code: 'VALIDATION_ERROR',
        errors: response.errors
      }
    }
    
    // Default format
    return {
      message: response?.message || error.message || 'Unknown error',
      status: error.response?.status || 500,
      details: error
    }
  }
}))
```

---

## 🔐 Authentication & Token Management

> **Note:** Authentication setup is optional. Only add this if your API requires JWT tokens.

### Basic Auth Setup

Add authentication to your API client:

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  withAuth: true,  // Enable automatic token injection
  authOptions: {
    refreshUrl: '/auth/refresh',
    onTokenRefreshFailed: () => {
      // Redirect to login when refresh fails
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

Simple setup for development or internal tools:

```typescript
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

---

#### Mode 2: httpOnly Cookies (Production)

Recommended for production apps with sensitive data:

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    refreshWithCredentials: true,  // 🔑 Send cookies for refresh
    onTokenRefreshFailed: () => router.push('/login')
  }
})
```

**Storage:** Only `accessToken` in localStorage, `refreshToken` in httpOnly cookie  
**Security:** 🔒 Protected from XSS attacks  
**Backend requirement:** Must set `Set-Cookie` with `HttpOnly; Secure; SameSite`

**Common Issues:**
- **Cookie not sent?** Check cookie domain and `SameSite` attribute
- **CORS error?** Backend must set `Access-Control-Allow-Credentials: true`
- **401 on refresh?** Verify cookie is included in request headers

---

### Saving Tokens After Login

```typescript
import { tokenManager } from '@ametie/vue-muza-use'

const { execute } = useApi('/auth/login', {
  method: 'POST',
  authMode: 'public',  // No auth for login endpoint
  onSuccess(response) {
    tokenManager.setTokens({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,  // Optional in cookie mode
      expiresIn: response.data.expiresIn
    })
    
    router.push('/dashboard')
  }
})
```

---

### Public Endpoints

Skip authentication for public endpoints:

```typescript
// Login (no auth needed)
useApi('/auth/login', {
  method: 'POST',
  authMode: 'public',
  data: credentials
})

// Public blog posts
useApi('/blog/posts', {
  authMode: 'public',
  immediate: true
})
```

---

### Advanced: Custom Refresh Payload

Send additional data with token refresh requests:

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    
    // ⚠️ Use function for dynamic data
    refreshPayload: () => ({
      refreshToken: tokenManager.getRefreshToken(),
      deviceId: getDeviceId(),
      timestamp: Date.now()
    })
  }
})
```

---

### Advanced: Token Refresh Callback

Handle additional data from refresh response:

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  authOptions: {
    refreshUrl: '/auth/refresh',
    
    // Called after successful token refresh
    onTokenRefreshed: (response) => {
      const { user, permissions } = response.data
      
      // Update app state
      store.commit('SET_USER', user)
      store.commit('SET_PERMISSIONS', permissions)
    },
    
    onTokenRefreshFailed: () => {
      localStorage.clear()
      window.location.href = '/login'
    }
  }
})
```

---

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


