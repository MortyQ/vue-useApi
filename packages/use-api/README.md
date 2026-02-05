# Vue Muza Use 🎹

[![npm version](https://img.shields.io/npm/v/@ametie/vue-muza-use.svg?style=flat-square)](https://www.npmjs.com/package/@ametie/vue-muza-use)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-green.svg?style=flat-square)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Included-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**The Enterprise-Ready API Composable for Vue 3.**

`vue-muza-use` is a powerful, framework-agnostic wrapper around **Axios** designed to solve the most common headaches in modern frontend development: race conditions, token refreshing, request cancellation, and strict typing.

---




## 🚀 Why is this cool?

*   🛡 **Zombie Retry Protection**
    Smart retries that respect component lifecycle. If your component is unmounted, the retries stop immediately. No more memory leaks or errors trying to update dead components.

*   💉 **Dependency Injection**
    Fully decoupled architecture. You inject your own Axios instance via the Vue plugin system (`app.use`). This means you keep full control over your HTTP client configuration.

*   🔄 **Smart Auth Refresh**
    Built-in (but optional) **Interceptor Queue**. If your Access Token expires (`401`), the library pauses all outgoing requests, refreshes the token once, replays the queue, and then resumes normal operation.

*   ⚡ **Developer Experience**
    *   **Auto-Cleanup**: Aborts pending requests automatically when the component unmounts.
    *   **Global Abort**: Cancel all previous pending requests when filters change (race condition killer).
    *   **Debounce**: Built-in debouncing for search inputs.
    *   **TypeScript First**: strict typing for Request/Response definitions.

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

## ⚡ Quick Start

### 1. Setup in `main.ts`

Use `createApiClient` for a "batteries-included" setup, or bring your own Axios instance.

```typescript
import { createApp } from 'vue'
import { createApi, createApiClient, setAuthMonitor } from '@ametie/vue-muza-use'
import App from './App.vue'

const app = createApp(App)

// 1. Create Axios instance with Auth features
const api = createApiClient({
  baseURL: 'https://api.example.com',
  withAuth: true, // Enable automatic token injection
  authOptions: {
    refreshUrl: '/auth/refresh', // Endpoint for refreshing tokens
    onTokenRefreshFailed: () => {
      window.location.href = '/login' // Redirect on session expiry
    }
  }
})

// 2. Install Plugin
app.use(createApi({
  axios: api,
  // Global Error Handler (e.g., Toast notifications)
  onError: (error) => {
    console.error('Global API Error:', error.message)
    // toast.error(error.message)
  }
}))

// Optional: Monitor Auth Events (Debug or Analytics)
setAuthMonitor((event, payload) => {
  console.log(`[Auth] ${event}`, payload)
})

app.mount('#app')
```

### 2. Basic Usage (Component)

```typescript
<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
}

// GET request
const { data, loading, error, execute } = useApi<User>('/users/1', {
  immediate: true, // Fetch on mount
  retry: 3         // Retry 3 times on failure
})
</script>

<template>
  <div v-if="loading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <div v-else-if="data">Hello, {{ data.name }}</div>
</template>
```

---

## 🛠 Usage Examples

### Reactive POST Request
Typically used for forms. Pass a `ref` as `data`, and it automatically unwraps current values.

```typescript
<script setup lang="ts">
import { ref } from 'vue'
import { useApiPost } from '@ametie/vue-muza-use'

const formData = ref({ email: '', password: '' })

const { execute, loading } = useApiPost('/auth/login', {
    authMode: 'public', // 👈 Important for Login/Register to skip token injection
    // Data can be a static object or a Ref
    data: formData, 
    onSuccess: (res) => console.log('Logged in!', res.data)
})
</script>

<button @click="execute()" :disabled="loading">Login</button>
```

### Public Endpoints (No Auth)
For endpoints that don't require authentication (like Registration, Forgot Password, or Public Data), explicitly set `authMode: 'public'`.

```typescript
const { execute } = useApiPost('/auth/register', {
  authMode: 'public', // 👈 Prevents Authorization header injection
  data: registrationForm
})
```

### 🔄 Auto-Refetching (Watch & Debounce)
You can automatically trigger the request whenever specific Refs change. This is perfect for **Live Search** or **Auto-Save** forms.

> **💡 Pro Tip:** When watching text inputs (like search), **always** use `debounce` to prevent flooding your server with requests on every keystroke.

#### Live Search
```typescript
const searchQuery = ref('')
// Use a computed URL so it updates when execute() is triggered
const url = computed(() => `/search?q=${searchQuery.value}`)

const { data, loading } = useApi(url, {
  method: 'GET',
  watch: searchQuery, // 👀 Auto-execute when this ref changes
  debounce: 500,      // ⏳ Wait 500ms after user stops typing
  abortPrevious: true // Kill previous request if it's still running
})
```

#### Filters (Immediate Refetch)
For inputs like Selects, Toggles, or Tabs where you want instant updates without delay. `watch` accepts an array of Refs.

```typescript
const category = ref('all')
const inStock = ref(true)

// URL updates reactively
const url = computed(() => 
  `/products?cat=${category.value}&stock=${inStock.value}`
)

const { data } = useApi(url, {
  watch: [category, inStock], // 👀 Re-fetch instantly when any filter changes
  // default debounce is 0
})
```

#### Auto-Save Form
```typescript
const settings = ref({ theme: 'dark', notifications: true })

useApiPost('/user/settings', {
  data: settings,     // Passing ref: library automatically unwraps it
  watch: settings,    // Watch the form for changes (deep watch supported)
  debounce: 1000,     // Save after 1 second of inactivity
  onSuccess: () => console.log('Settings saved!')
})
```

### Global Abort (Race Condition Killer)
Useful for complex filters where changing one filter should invalidate all pending requests on the page (or scope).

```typescript
import { useAbortController } from '@ametie/vue-muza-use'

// In your specific composable or component
const { execute } = useApi('/heavy-report', {
  useGlobalAbort: true // Subscribe to global abort signal
})

// Somewhere else (e.g. "Clear Filters" button)
const { abortAll } = useAbortController()
// abortAll() will cancel the '/heavy-report' request if it's pending
```

---

## 🚨 Advanced Error Handling

By default, the library attempts to normalize errors into a standard `ApiError` format. However, every backend is different. You can fully customize how errors are parsed globally.

### Default Behavior
If you don't provide a parser, we extract the message from `error.response.data.message` or `error.message`.

### Custom Error Parser
Inject your own logic to transform your backend's specific error format into our uniform structure.

```typescript
// main.ts
app.use(createApi({
  axios: api,
  // 👇 Define how to parse errors from your specific API
  errorParser: (error: any) => {
    const data = error.response?.data
    
    // Example: Laravel/Rails style validation errors
    if (data?.errors) {
       return {
          message: 'Validation Failed',
          status: error.response.status,
          code: 'VALIDATION_ERROR',
          errors: data.errors // { email: ['Invalid email'] }
       }
    }

    // Example: Custom wrap format { success: false, error: { msg: "..." } }
    if (data?.error?.msg) {
        return {
            message: data.error.msg,
            status: error.response.status,
            code: data.error.code
        }
    }

    // Fallback to default behavior
    return {
       message: error.message || 'Unknown error',
       status: error.response?.status || 500,
       details: error
    }
  }
}))
```

---

## 📚 API Reference

### `useApi<T, D>(url, options)`

The main composable.

**Arguments:**

| Argument | Type | Description |
|---|---|---|
| `url` | `string | Ref<string>` | The API endpoint URL. |
| `options` | `UseApiOptions` | Configuration object (see below). |

**Options (`options`):**

| Option | Type | Default | Description |
|---|---|---|---|
| `method` | `'GET' \| 'POST' ...` | `'GET'` | HTTP method. |
| `data` | `Ref<D> \| D` | `undefined` | Request body. |
| `immediate` | `boolean` | `false` | Trigger request automatically on creation. |
| `retry` | `boolean \| number` | `false` | Number of retries on failure. |
| `debounce` | `number` | `0` | Debounce time in ms. |
| `watch` | `WatchSource \| WatchSource[]` | `undefined` | Ref(s) to watch for auto-execution. |
| `authMode` | `'default' \| 'public'` | `'default'` | `'public'` skips token injection. |
| `initialData` | `T` | `null` | Initial value for `data` ref. |
| `onSuccess` | `(res) => void` | - | Callback on 2xx response. |
| `onError` | `(err) => void` | - | Callback on error. |
| `skipErrorNotification`| `boolean` | `false` | Prevents triggering the global `onError`. |

**Return Values:**

```typescript
{
  data: Ref<T | null>          // The response data
  loading: Ref<boolean>        // Loading state
  error: Ref<ApiError | null>  // Typed error object
  execute: (config?) => Promise<T | null> // Manual trigger
  abort: (msg?) => void        // Cancel current request
  response: Ref<AxiosResponse> // Full axios response object
}
```

### `createApiClient(options)`

Factory function to create a configured Axios instance.

```typescript
interface CreateApiClientOptions {
  // Standard Axios config (baseURL, timeout, etc.)
  baseURL?: string;
  timeout?: number;
  
  // Custom auth features
  withAuth?: boolean; // Default: true. Inject Authorization header?
  authOptions?: {
    refreshUrl?: string; // Default: '/auth/refresh'
    onTokenRefreshFailed?: () => void;
  };
}
```

---


## 🔐 Auth & Refresh Logic

`vue-muza-use` implements a robust **Interceptor Queue** pattern for handling JWTs.

1.  **Request Flow**: Every request automatically gets the `Authorization: Bearer ...` header if `withAuth` is enabled.
2.  **401 Detection**: If a request fails with `401 Unauthorized`, it is **caught** by the interceptor.
3.  **Queueing**: The failed request is added to a `failedQueue`. Any subsequent requests that happen while refreshing are also paused and added to this queue.
4.  **Reference Refresh**: The system triggers a call to `refreshUrl` (e.g., sends a `refresh_token` HTTP-only cookie).
5.  **Retry**:
    *   **Success**: The system gets a new Access Token, updates the store, and **replays** all queued requests with the new token.
    *   **Failure**: If the refresh fails, `onTokenRefreshFailed` is called (use this to logout user) and all queued requests are rejected.

This happens transparently to your components. They just "wait" a bit longer for the response.

---

