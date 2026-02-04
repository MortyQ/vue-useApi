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

import type { AxiosResponse } from "axios";
import { ref, type Ref } from "vue";

import type { ApiState, ApiError } from "../types";

export interface UseApiStateReturn<T = unknown> {
  /** Response data */
  data: Ref<T | null>
  /** Loading flag - true while request is in progress */
  loading: Ref<boolean>
  /** Error object - null if no error */
  error: Ref<ApiError | null>
  /** HTTP status code - useful for handling specific codes (404, 403, etc) */
  statusCode: Ref<number | null>
  /** Full Axios response - includes headers, status, config, etc (optional, for advanced use cases) */
  response: Ref<AxiosResponse<T> | null>
  /** Set data and clear error */
  setData: (newData: T | null, fullResponse?: AxiosResponse<T> | null) => void
  /** Set error */
  setError: (newError: ApiError | null) => void
  /** Set loading state */
  setLoading: (isLoading: boolean) => void
  /** Set HTTP status code */
  setStatusCode: (code: number | null) => void
  /** Reset to initial state */
  reset: () => void
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
export interface UseApiStateOptions {
  initialLoading?: boolean
}

export function useApiState<T = unknown>(
  initialData: T | null = null,
  options: UseApiStateOptions = {},
): UseApiStateReturn<T> {
  const { initialLoading = false } = options;
  // State - simple and explicit
  const data = ref<T | null>(initialData) as Ref<T | null>;
  const loading = ref(initialLoading);
  const error = ref<ApiError | null>(null);
  const statusCode = ref<number | null>(null);
  const response = ref<AxiosResponse<T> | null>(null) as Ref<AxiosResponse<T> | null>;

  // Methods
  const setData = (newData: T | null, fullResponse?: AxiosResponse<T> | null) => {
    data.value = newData;
    error.value = null; // Clear error on successful data set
    if (fullResponse) {
      response.value = fullResponse;
    }
  };

  const setError = (newError: ApiError | null) => {
    error.value = newError;
  };

  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  const setStatusCode = (code: number | null) => {
    statusCode.value = code;
  };

  const reset = () => {
    data.value = initialData;
    loading.value = false;
    error.value = null;
    statusCode.value = null;
    response.value = null;
  };

  return {
    data,
    loading,
    error,
    statusCode,
    response,
    setData,
    setError,
    setLoading,
    setStatusCode,
    reset,
  };
}

/**
 * Create initial API state
 */
export function createInitialApiState<T = unknown>(initialData: T | null = null): ApiState<T> {
  return {
    data: initialData,
    loading: false,
    error: null,
    statusCode: null,
  };
}
