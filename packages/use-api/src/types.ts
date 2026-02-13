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
}

export interface UseApiOptions<T = unknown, D = unknown> extends ApiRequestConfig<D> {
    immediate?: boolean;
    onSuccess?: (response: AxiosResponse<T>) => void;
    onError?: (error: ApiError) => void;
    onBefore?: () => void;
    onFinish?: () => void;
    initialData?: T;
    debounce?: number;
    useGlobalAbort?: boolean;
    initialLoading?: boolean;
    watch?: WatchSource | WatchSource[];
    /**
     * Polling configuration.
     * - Pass a **number** (ms) for simple polling.
     * - Pass an **object** `{ interval: number, whenHidden?: boolean }` for advanced control.
     * Properties inside the object can also be Refs.
     */
    poll?: MaybeRefOrGetter<number | { interval: MaybeRefOrGetter<number>; whenHidden?: MaybeRefOrGetter<boolean> }>;
}

export interface UseApiReturn<T = unknown, D = unknown> {
    data: Ref<T | null>;
    loading: Ref<boolean>;
    error: Ref<ApiError | null>;
    statusCode: Ref<number | null>;
    response: Ref<AxiosResponse<T> | null>;
    execute: (config?: ApiRequestConfig<D>) => Promise<T | null | undefined>;
    abort: (message?: string) => void;
    reset: () => void;
    /**
     * Manually update data. Supports direct value or updater function.
     * Clears any existing error when called.
     *
     * @example
     * // Direct value
     * setData(newUsers)
     *
     * // Updater function (like React's setState)
     * setData(prev => prev?.filter(u => u.active) ?? null)
     *
     * // Transform data after fetch
     * const { data, setData } = useApi('/users', {
     *   onSuccess: ({ data }) => {
     *     setData(data.map(user => ({ ...user, fullName: `${user.first} ${user.last}` })))
     *   }
     * })
     */
    setData: (newData: T | null | ((prev: T | null) => T | null)) => void;
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
        useGlobalAbort?: boolean;
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
