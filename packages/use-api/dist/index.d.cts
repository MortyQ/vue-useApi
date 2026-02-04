import * as vue from 'vue';
import { MaybeRefOrGetter, Ref, App } from 'vue';
import { AxiosInstance, AxiosRequestConfig, AxiosResponse, CreateAxiosDefaults } from 'axios';

interface ApiError {
    message: string;
    status: number;
    code?: string;
    errors?: Record<string, string[]>;
    details?: unknown;
}
type AuthMode = "default" | "public" | "optional";
interface ApiState<T = unknown> {
    data: T | null;
    loading: boolean;
    error: ApiError | null;
    statusCode: number | null;
}
interface ApiRequestConfig<D = unknown> extends Omit<AxiosRequestConfig<D>, "data"> {
    data?: MaybeRefOrGetter<D> | D;
    skipErrorNotification?: boolean;
    authMode?: AuthMode;
    retry?: boolean | number;
    retryDelay?: number;
}
interface UseApiOptions<T = unknown, D = unknown> extends ApiRequestConfig<D> {
    immediate?: boolean;
    onSuccess?: (response: AxiosResponse<T>) => void;
    onError?: (error: ApiError) => void;
    onBefore?: () => void;
    onFinish?: () => void;
    initialData?: T;
    debounce?: number;
    useGlobalAbort?: boolean;
    initialLoading?: boolean;
}
interface UseApiReturn<T = unknown, D = unknown> {
    data: Ref<T | null>;
    loading: Ref<boolean>;
    error: Ref<ApiError | null>;
    statusCode: Ref<number | null>;
    response: Ref<AxiosResponse<T> | null>;
    execute: (config?: ApiRequestConfig<D>) => Promise<T | null | undefined>;
    abort: (message?: string) => void;
    reset: () => void;
}
interface ApiPluginOptions {
    axios: AxiosInstance;
    onError?: (error: ApiError, originalError: any) => void;
    globalOptions?: {
        retry?: number | boolean;
        retryDelay?: number;
        useGlobalAbort?: boolean;
    };
}
interface AuthTokens$1 {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}

declare function createApi(options: ApiPluginOptions): {
    install(app: App): void;
};
declare function useApiConfig(): ApiPluginOptions;

declare function useApi<T = unknown, D = unknown>(url: string | Ref<string>, options?: UseApiOptions<T, D>): UseApiReturn<T, D>;
/**
 * Helper for GET requests
 *
 * @example
 * ```ts
 * const { data, loading, error } = useApiGet<User[]>('/users', {
 *   immediate: true
 * })
 * ```
 */
declare function useApiGet<T = unknown>(url: string | Ref<string>, options?: Omit<UseApiOptions<T>, "method">): UseApiReturn<T>;
/**
 * Helper for POST requests
 *
 * @example
 * ```ts
 * const { data, loading, execute } = useApiPost<User, CreateUserDto>('/users')
 * await execute({ data: { name: 'John' } })
 * ```
 */
declare function useApiPost<T = unknown, D = unknown>(url: string | Ref<string>, options?: Omit<UseApiOptions<T, D>, "method">): UseApiReturn<T, D>;
/**
 * Helper for PUT requests
 *
 * @example
 * ```ts
 * const { execute } = useApiPut<User, UpdateUserDto>('/users/1')
 * await execute({ data: { name: 'John Doe' } })
 * ```
 */
declare function useApiPut<T = unknown, D = unknown>(url: string | Ref<string>, options?: Omit<UseApiOptions<T, D>, "method">): UseApiReturn<T, D>;
/**
 * Helper for PATCH requests
 *
 * @example
 * ```ts
 * const { execute } = useApiPatch<User, Partial<User>>('/users/1')
 * await execute({ data: { name: 'John' } })
 * ```
 */
declare function useApiPatch<T = unknown, D = unknown>(url: string | Ref<string>, options?: Omit<UseApiOptions<T, D>, "method">): UseApiReturn<T, D>;
/**
 * Helper for DELETE requests
 *
 * @example
 * ```ts
 * const { execute } = useApiDelete('/users/1')
 * await execute()
 * ```
 */
declare function useApiDelete<T = unknown>(url: string | Ref<string>, options?: Omit<UseApiOptions<T>, "method">): UseApiReturn<T>;

/**
 * API State Composable
 *
 * Managing API request state with minimal, essential properties
 *
 * Design principles:
 * - Keep it simple: only data, loading, error, statusCode
 * - No computed helpers: use raw state directly (more explicit, less magic)
 * - No status enum: state can be derived from loading/error/data
 *
 * State derivation:
 * - loading === true → request in progress
 * - error !== null → request failed
 * - data !== null && !error && !loading → request succeeded
 * - !data && !error && !loading → idle
 */

interface UseApiStateReturn<T = unknown> {
    /** Response data */
    data: Ref<T | null>;
    /** Loading flag - true while request is in progress */
    loading: Ref<boolean>;
    /** Error object - null if no error */
    error: Ref<ApiError | null>;
    /** HTTP status code - useful for handling specific codes (404, 403, etc) */
    statusCode: Ref<number | null>;
    /** Full Axios response - includes headers, status, config, etc (optional, for advanced use cases) */
    response: Ref<AxiosResponse<T> | null>;
    /** Set data and clear error */
    setData: (newData: T | null, fullResponse?: AxiosResponse<T> | null) => void;
    /** Set error */
    setError: (newError: ApiError | null) => void;
    /** Set loading state */
    setLoading: (isLoading: boolean) => void;
    /** Set HTTP status code */
    setStatusCode: (code: number | null) => void;
    /** Reset to initial state */
    reset: () => void;
}
/**
 * Composable for API state management
 *
 * Simple, explicit state management without magic computed properties
 * Use raw state directly in your components for clarity
 *
 * @example Basic usage (most common)
 * ```ts
 * const state = useApiState<User[]>();
 *
 * // Check states explicitly (no magic):
 * if (state.loading.value) { ... }
 * if (state.error.value) { ... }
 * if (state.data.value) { ... }
 * if (state.data.value?.length === 0) { ... } // Empty array check
 * ```
 *
 * @example Advanced usage with full response
 * ```ts
 * const state = useApiState<User[]>();
 *
 * // Access response headers, status, etc:
 * if (state.response.value) {
 *   console.log('Headers:', state.response.value.headers)
 *   console.log('Status:', state.response.value.status)
 *   console.log('Status Text:', state.response.value.statusText)
 *   console.log('Config:', state.response.value.config)
 *
 *   // Example: Check rate limit headers
 *   const rateLimit = state.response.value.headers['x-ratelimit-remaining']
 *   if (rateLimit && parseInt(rateLimit) < 10) {
 *     console.warn('Low rate limit!')
 *   }
 * }
 * ```
 */
interface UseApiStateOptions {
    initialLoading?: boolean;
}
declare function useApiState<T = unknown>(initialData?: T | null, options?: UseApiStateOptions): UseApiStateReturn<T>;

declare function useAbortController(): {
    signal: Readonly<vue.Ref<{
        readonly aborted: boolean;
        readonly onabort: ((this: AbortSignal, ev: Event) => any) | null;
        readonly reason: any;
        readonly throwIfAborted: () => void;
        readonly addEventListener: {
            <K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
        };
        readonly removeEventListener: {
            <K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
        };
        readonly dispatchEvent: (event: Event) => boolean;
    }, {
        readonly aborted: boolean;
        readonly onabort: ((this: AbortSignal, ev: Event) => any) | null;
        readonly reason: any;
        readonly throwIfAborted: () => void;
        readonly addEventListener: {
            <K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
        };
        readonly removeEventListener: {
            <K extends keyof AbortSignalEventMap>(type: K, listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
            (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
        };
        readonly dispatchEvent: (event: Event) => boolean;
    }>>;
    abort: () => void;
    getSignal: () => AbortSignal;
    isAbortError: (error: unknown) => boolean;
    abortCount: Readonly<vue.Ref<number, number>>;
};

interface InterceptorOptions {
    refreshUrl?: string;
    onTokenRefreshFailed?: () => void;
    extractTokens?: (response: AxiosResponse) => {
        accessToken: string;
        refreshToken?: string;
    };
}
declare function setupInterceptors(axiosInstance: AxiosInstance, options?: InterceptorOptions): void;

interface CreateApiClientOptions extends CreateAxiosDefaults {
    withAuth?: boolean;
    authOptions?: InterceptorOptions;
}
declare function createApiClient(options?: CreateApiClientOptions): AxiosInstance;

/**
 * Token Manager
 *
 * Centralized authorization token management
 * Solves problems:
 * - Tight coupling with localStorage
 * - Easy to mock in tests
 * - Single point of access to tokens
 */
interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}
interface TokenStorage {
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    setTokens(tokens: AuthTokens): void;
    clearTokens(): void;
    getTokenExpiresAt(): number | null;
    isTokenExpired(): boolean;
}
/**
 * Token Manager class
 * Singleton for token management
 */
declare class TokenManager {
    private storage;
    private refreshPromise;
    constructor(storage?: TokenStorage);
    /**
     * Get access token
     */
    getAccessToken(): string | null;
    /**
     * Get refresh token
     */
    getRefreshToken(): string | null;
    /**
     * Save tokens
     */
    setTokens(tokens: AuthTokens): void;
    /**
     * Clear tokens
     */
    clearTokens(): void;
    /**
     * Check if token is expired
     */
    isTokenExpired(): boolean;
    /**
     * Get token expiration time
     */
    getTokenExpiresAt(): number | null;
    /**
     * Check if tokens exist
     */
    hasTokens(): boolean;
    /**
     * Get Authorization header
     */
    getAuthHeader(): string | null;
    /**
     * Set token refresh promise (to prevent race conditions)
     */
    setRefreshPromise(promise: Promise<string | null>): void;
    /**
     * Get token refresh promise
     */
    getRefreshPromise(): Promise<string | null> | null;
    /**
     * Clear token refresh promise
     */
    clearRefreshPromise(): void;
    /**
     * Set storage (useful for tests)
     */
    setStorage(storage: TokenStorage): void;
}
declare const tokenManager: TokenManager;

declare enum AuthEventType {
    REFRESH_START = "AUTH_REFRESH_START",
    REQUEST_QUEUED = "AUTH_REQUEST_QUEUED",
    REFRESH_SUCCESS = "AUTH_REFRESH_SUCCESS",
    REFRESH_ERROR = "AUTH_REFRESH_ERROR"
}
interface AuthEventPayload {
    url?: string;
    queueSize?: number;
    error?: unknown;
    timestamp?: string;
    requestId?: string;
    details?: Record<string, unknown>;
}
type AuthMonitorFn = (type: AuthEventType, payload: AuthEventPayload) => void;
declare function setAuthMonitor(fn: AuthMonitorFn): void;

export { type ApiError, type ApiPluginOptions, type ApiRequestConfig, type ApiState, type AuthEventPayload, AuthEventType, type AuthMode, type AuthMonitorFn, type AuthTokens$1 as AuthTokens, type UseApiOptions, type UseApiReturn, createApi, createApiClient, setAuthMonitor, setupInterceptors, tokenManager, useAbortController, useApi, useApiConfig, useApiDelete, useApiGet, useApiPatch, useApiPost, useApiPut, useApiState };
