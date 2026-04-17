import type { AxiosRequestConfig, AxiosResponse, AxiosInstance } from "axios";
import type {MaybeRefOrGetter, Ref, WatchSource} from "vue";

export interface ApiError {
    message: string;
    status: number;
    code?: string;
    errors?: Record<string, string[]>;
    details?: unknown;
}

export type AuthMode = "default" | "public" | "optional";

export interface CacheOptions {
    id: string;
    /**
     * How long the cached entry is valid in milliseconds.
     * Default: 300_000 (5 minutes)
     */
    staleTime?: number;
    /**
     * Stale-while-revalidate: serve cached data instantly while revalidating in the background.
     * On a cache hit, data is set immediately (no loading state) and a fresh request runs silently.
     * The `revalidating` ref is `true` during the background fetch.
     *
     * On a cache miss the request behaves normally (loading: true).
     *
     * @example
     * ```ts
     * const { data, revalidating } = useApi('/users', {
     *   cache: { id: 'users', swr: true },
     *   immediate: true,
     * })
     * // Template: <span v-if="revalidating">↻</span>
     * ```
     */
    swr?: boolean;
}

export interface ApiState<T = unknown> {
    data: T | null
    loading: boolean
    error: ApiError | null
    statusCode: number | null
}

export interface ApiRequestConfig<D = unknown> extends Omit<AxiosRequestConfig<D>, "data" | "params"> {
    data?: MaybeRefOrGetter<D> | D;
    params?: MaybeRefOrGetter<D> | D;
    skipErrorNotification?: boolean;
    authMode?: AuthMode;
    retry?: boolean | number;
    retryDelay?: number;
    /**
     * Retry only when the response status code is in this list.
     * Default: [408, 429, 500, 502, 503, 504]
     * Empty array = retry on any error (network errors included).
     */
    retryStatusCodes?: number[];
    /**
     * Include credentials (cookies, Authorization headers) in cross-origin requests.
     *
     * Supports three auth strategies:
     *
     * **1. Bearer token (default)** — tokens in localStorage, no cookies needed:
     * ```ts
     * createApiClient({ baseURL: '/api' }) // withCredentials: false by default
     * ```
     *
     * **2. Full cookie-based auth** — server sets httpOnly cookies for both tokens:
     * ```ts
     * createApiClient({ baseURL: '/api', withCredentials: true })
     * ```
     *
     * **3. Hybrid** — Bearer access token + httpOnly refresh cookie:
     * ```ts
     * createApiClient({
     *   baseURL: '/api',
     *   authOptions: { refreshWithCredentials: true } // cookies only on /auth/refresh
     * })
     * ```
     *
     * **Per-request override** — override the global setting for a specific request:
     * ```ts
     * // Global: withCredentials: false, but this endpoint needs cookies
     * const { data } = useApi('/user/profile', { withCredentials: true })
     *
     * // Global: withCredentials: true, but skip cookies for public CDN
     * const { data } = useApi('https://cdn.example.com/config.json', {
     *   withCredentials: false,
     *   immediate: true
     * })
     * ```
     */
    withCredentials?: boolean;
}

export interface UseApiOptions<T = unknown, D = unknown, TSelected = T> extends ApiRequestConfig<D> {
    immediate?: boolean;
    onSuccess?: (response: AxiosResponse<T>) => void;
    onError?: (error: ApiError) => void;
    onBefore?: () => void;
    onFinish?: () => void;
    /**
     * Transform the raw response data before it is stored in `data`.
     * Applied on every successful response — including polling, SWR revalidation,
     * and watch-triggered re-fetches. The cache always stores the raw server data;
     * `select` is re-applied each time data is read from cache.
     *
     * The second generic parameter of `useApi` becomes the output type of `select`.
     *
     * @example
     * ```ts
     * // Extract nested field
     * const { data } = useApi<ApiResponse, User[]>('/users', {
     *   select: (res) => res.data,
     * })
     *
     * // Transform items
     * const { data } = useApi<RawUser[], User[]>('/users', {
     *   select: (users) => users.map(u => ({ ...u, fullName: `${u.first} ${u.last}` })),
     * })
     * ```
     */
    select?: (data: T) => TSelected;
    initialData?: TSelected;
    debounce?: number;
    useGlobalAbort?: boolean;
    initialLoading?: boolean;
    /**
     * Disable auto-tracking. When true, reactive changes to `url`, `params`,
     * and `data` will NOT trigger a re-fetch. Use for forms or manual mutations
     * where you want full control over when `execute()` is called.
     */
    lazy?: boolean;
    /**
     * Re-fetch when the browser tab regains focus (`visibilitychange` event).
     *
     * - `true` — use default throttle of 60 000ms (prevents rapid refetches on quick tab switches)
     * - `{ throttle: number }` — custom throttle in ms. Pass `0` to always refetch on focus.
     *
     * No refetch fires if a request is already in-flight (`loading: true`).
     * Compatible with `lazy: true` — focus is a browser trigger, not a reactive dep.
     * Compatible with `poll` — both register separate listeners; `!loading` guard prevents duplicates.
     *
     * Can be set globally via `createApiClient({ globalOptions: { refetchOnFocus: true } })`.
     * Per-request value takes precedence over global (including `false` to opt-out).
     */
    refetchOnFocus?: boolean | { throttle?: number };
    /**
     * Re-fetch when the browser regains network connectivity (`online` event).
     *
     * No throttle is applied — reconnect is already a rare event.
     * No refetch fires if a request is already in-flight (`loading: true`).
     *
     * Can be set globally via `createApiClient({ globalOptions: { refetchOnReconnect: true } })`.
     * Per-request value takes precedence over global (including `false` to opt-out).
     */
    refetchOnReconnect?: boolean;
    /**
     * Polling configuration.
     * - Pass a **number** (ms) for simple polling.
     * - Pass an **object** `{ interval: number, whenHidden?: boolean }` for advanced control.
     * Properties inside the object can also be Refs.
     */
    /**
     * Cache the response data by a string id.
     * - String shorthand: `cache: 'key'` uses DEFAULT_STALE_TIME (5 min)
     * - Object form: `cache: { id: 'key', staleTime: 10_000 }` for custom TTL
     *
     * On cache hit: mutate() is called with cached data, loading stays false,
     * onBefore/onSuccess/onFinish are NOT called, axios request is NOT made.
     * Cache is written only on HTTP 2xx success.
     */
    cache?: string | CacheOptions;
    /**
     * Invalidate one or more cache entries on HTTP 2xx success.
     * Fires only after a confirmed successful response — never in catch/finally.
     * Useful for POST/PUT/DELETE that should bust related GET caches.
     */
    invalidateCache?: string | string[];
    poll?: MaybeRefOrGetter<number | { interval: MaybeRefOrGetter<number>; whenHidden?: MaybeRefOrGetter<boolean> }>;
}

export interface UseApiReturn<T = unknown, D = unknown> {
    data: Ref<T | null>;
    loading: Ref<boolean>;
    error: Ref<ApiError | null>;
    statusCode: Ref<number | null>;
    response: Ref<AxiosResponse<unknown> | null>;
    /**
     * `true` while a background revalidation request is in-flight.
     * Only active when `cache: { swr: true }` is set and a cache hit occurred.
     * Use it to show a subtle refresh indicator without blocking the UI.
     */
    revalidating: Ref<boolean>;
    execute: (config?: ApiRequestConfig<D>) => Promise<T | null | undefined>;
    abort: (message?: string) => void;
    reset: () => void;
    /**
     * Run `updater` without triggering auto-tracked re-execution.
     *
     * Pauses the internal tracking scope for the duration of the updater,
     * so reactive changes to `url`, `params`, or `data` inside it do not
     * fire a request.
     *
     * **Synchronous only** — changes after an `await` inside the updater
     * will NOT be suppressed (the scope resumes after the sync portion).
     *
     * Safe to call when `lazy: true` — the updater still runs, no error is thrown.
     *
     * @example
     * ignoreUpdates(() => {
     *   filters.value.status = 'active'
     * })
     * // watch is suppressed — no request fires
     */
    ignoreUpdates: (updater: () => void) => void;
    /**
     * Manually mutate data. Supports direct value or updater function.
     * Clears any existing error when called.
     *
     * @example
     * // Direct value
     * mutate(newUsers)
     *
     * // Updater function (like React's setState)
     * mutate(prev => prev?.filter(u => u.active) ?? null)
     *
     * // Transform data after fetch
     * const { data, mutate } = useApi('/users', {
     *   onSuccess: ({ data }) => {
     *     mutate(data.map(user => ({ ...user, fullName: `${user.first} ${user.last}` })))
     *   }
     * })
     */
    mutate: (newData: T | null | ((prev: T | null) => T | null)) => void;
}

export interface ApiPluginOptions {
    axios: AxiosInstance;
    onError?: (error: ApiError, originalError: unknown) => void;
    /**
     * Custom error parser to transform backend errors into ApiError format.
     * Useful if your backend has a different error structure.
     */
    errorParser?: (error: unknown) => ApiError;
    globalOptions?: {
        retry?: number | boolean;
        retryDelay?: number;
        retryStatusCodes?: number[];
        useGlobalAbort?: boolean;
        /**
         * Apply `refetchOnFocus` to all `useApi` instances.
         * Per-request value (including `false`) takes precedence.
         */
        refetchOnFocus?: boolean | { throttle?: number };
        /**
         * Apply `refetchOnReconnect` to all `useApi` instances.
         * Per-request value (including `false`) takes precedence.
         */
        refetchOnReconnect?: boolean;
    };
}

export interface AuthTokens {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
}

// ============================================================================
// Batch API Types
// ============================================================================

/**
 * Per-request configuration for a single item in a batch operation.
 * String items in the batch array are automatically normalized to this shape
 * with method: 'GET' and no data/params/headers.
 */
export interface BatchRequestConfig<D = unknown> {
    /** The URL to request */
    url: string;
    /** HTTP method. Default: 'GET' */
    method?: string;
    /** Request body (for POST, PUT, PATCH) */
    data?: D;
    /** Query parameters */
    params?: D;
    /** Per-request headers that override global defaults for this request only */
    headers?: Record<string, string>;
}

/**
 * Result of a single request in a batch operation
 */
export interface BatchResultItem<T = unknown> {
    /** The URL that was requested */
    url: string;
    /** Index in the original urls array */
    index: number;
    /** Whether the request succeeded */
    success: boolean;
    /** The response data (null if failed) */
    data: T | null;
    /** Error details (null if succeeded) */
    error: ApiError | null;
    /** HTTP status code */
    statusCode: number | null;
    /** Full AxiosResponse (null if failed — headers, status, etc. accessible here) */
    response: AxiosResponse<T> | null;
    /** The original normalized request config that produced this result */
    request: BatchRequestConfig;
}

/**
 * Progress information for batch operations
 */
export interface BatchProgress {
    /** Number of completed requests (success + failed) */
    completed: number;
    /** Total number of requests */
    total: number;
    /** Completion percentage (0-100) */
    percentage: number;
    /** Number of successful requests */
    succeeded: number;
    /** Number of failed requests */
    failed: number;
}

/**
 * Options for useApiBatch
 */
export interface UseApiBatchOptions<T = unknown, D = unknown> extends Omit<ApiRequestConfig<D>, "url"> {
    /**
     * If true (default), failed requests don't stop the batch.
     * If false, first error will reject the entire batch.
     */
    settled?: boolean;
    /** Maximum concurrent requests. Default: unlimited */
    concurrency?: number;
    /** Execute immediately on mount */
    immediate?: boolean;
    /** Skip individual error notifications */
    skipErrorNotification?: boolean;
    /** Watch sources to trigger re-execution */
    watch?: WatchSource | WatchSource[];
    /** Callback when a single request succeeds */
    onItemSuccess?: (item: BatchResultItem<T>, index: number) => void;
    /** Callback when a single request fails */
    onItemError?: (item: BatchResultItem<T>, index: number) => void;
    /** Callback when all requests complete */
    onFinish?: (results: BatchResultItem<T>[]) => void;
    /** Callback when progress updates */
    onProgress?: (progress: BatchProgress) => void;
}

/**
 * Return type for useApiBatch
 */
export interface UseApiBatchReturn<T = unknown> {
    /** All results with their status */
    data: Ref<BatchResultItem<T>[]>;
    /** Only successful results' data */
    successfulData: Ref<T[]>;
    /** Whether any request is still loading */
    loading: Ref<boolean>;
    /** Aggregated error (set if all requests failed) */
    error: Ref<ApiError | null>;
    /** List of all errors from failed requests */
    errors: Ref<ApiError[]>;
    /** Progress tracking */
    progress: Ref<BatchProgress>;
    /** Execute the batch */
    execute: () => Promise<BatchResultItem<T>[]>;
    /** Abort all pending requests */
    abort: (message?: string) => void;
    /** Reset state to initial */
    reset: () => void;
}
