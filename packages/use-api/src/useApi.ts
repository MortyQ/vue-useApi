import { debounceFn } from "./utils/debounce";
import type {AxiosRequestConfig, AxiosResponse} from "axios";
import { ref, type Ref, getCurrentScope, onScopeDispose, toValue, watch } from "vue";

import type { UseApiOptions, UseApiReturn, ApiRequestConfig, ApiError } from "./types";
import { useApiConfig } from "./plugin"; // <--- INJECTION
import { parseApiError } from "./utils/errorParser";
import { useApiState } from "./composables/useApiState";
import { useAbortController } from "./composables/useAbortController";

export function useApi<T = unknown, D = unknown>(
    url: string | Ref<string>,
    options: UseApiOptions<T, D> = {},
): UseApiReturn<T, D> {
    const { axios, onError: globalErrorHandler, globalOptions } = useApiConfig();

    const {
        method = "GET",
        immediate = false,
        onSuccess,
        onError,
        onBefore,
        onFinish,
        initialData = null,
        debounce = 0,
        skipErrorNotification = false,
        retry = globalOptions?.retry ?? false,
        retryDelay = globalOptions?.retryDelay ?? 1000,
        authMode = "default",
        useGlobalAbort = globalOptions?.useGlobalAbort ?? true,
        initialLoading = false,
        ...axiosConfig
    } = options;

    const startLoading = initialLoading ?? immediate;
    const state = useApiState<T>(initialData as T | null, { initialLoading: startLoading });
    const abortController = ref<AbortController | null>(null);
    const globalAbort = useGlobalAbort ? useAbortController() : null;

    const executeRequest = async (config?: ApiRequestConfig<D>): Promise<T | null> => {
        const requestUrl = typeof url === "string" ? url : url.value;

        if (abortController.value) abortController.value.abort("Cancelled by new request");
        const controller = new AbortController();
        abortController.value = controller;

        // --- Global Abort Logic (Simplified for brevity, use your full version) ---
        let globalAbortHandler: (() => void) | null = null;
        let subscribedSignal: AbortSignal | null = null;
        if (globalAbort) {
            const gs = globalAbort.getSignal();
            if (!gs.aborted) {
                subscribedSignal = gs;
                const currentCount = globalAbort.abortCount.value;
                globalAbortHandler = () => {
                    if (globalAbort.abortCount.value === currentCount) controller.abort("Global filter change");
                };
                gs.addEventListener("abort", globalAbortHandler);
            }
        }
        // -------------------------------------------------------------------------

        onBefore?.();
        state.setLoading(true);
        state.setError(null);

        let wasCancelled = false;

        try {
            const rawData = config?.data !== undefined ? config.data : axiosConfig.data;
            const resolvedData = toValue(rawData);

            const response = await axios.request<T>({
                url: requestUrl,
                method,
                ...axiosConfig,
                ...config,
                data: resolvedData,
                signal: controller.signal,
                authMode: (config?.authMode || authMode) as any,
            } as AxiosRequestConfig);

            state.setData(response.data as T | null, response);
            state.setStatusCode(response.status);
            onSuccess?.(response);
            return response.data;

        } catch (err: unknown) {
            if (controller.signal.aborted || (err as any)?.code === "ERR_CANCELED") {
                wasCancelled = true;
                return null;
            }

            // Парсинг
            const apiError = parseApiError(err);

            // Глобальный хендлер (ТОСТЫ)
            if (!skipErrorNotification && globalErrorHandler) {
                globalErrorHandler(apiError, err);
            }

            state.setError(apiError);
            state.setStatusCode(apiError.status);
            onError?.(apiError);

            // Retry logic here (insert your retryRequest function)

            return null;
        } finally {
            if (globalAbortHandler && subscribedSignal) subscribedSignal.removeEventListener("abort", globalAbortHandler);
            if (!wasCancelled) {
                state.setLoading(false);
                onFinish?.();
            }
        }
    };

    const execute = debounce > 0 ? debounceFn(executeRequest, debounce) : executeRequest;

    const abort = (msg?: string) => {
        abortController.value?.abort(msg);
        abortController.value = null;
    };

    const reset = () => {
        abort();
        state.reset();
        state.setLoading(false);
    };

    if (options.watch) {
        watch(options.watch, () => {
             execute();
        }, { deep: true });
    }

    if (getCurrentScope()) {
        onScopeDispose(() => abort("Scope disposed"));
    }

    if (immediate) execute();

    return { ...state, execute, abort, reset };
}

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
export function useApiGet<T = unknown>(
    url: string | Ref<string>,
    options?: Omit<UseApiOptions<T>, "method">,
): UseApiReturn<T> {
    return useApi<T>(url, { ...options, method: "GET" });
}

/**
 * Helper for POST requests
 *
 * @example
 * ```ts
 * const { data, loading, execute } = useApiPost<User, CreateUserDto>('/users')
 * await execute({ data: { name: 'John' } })
 * ```
 */
export function useApiPost<T = unknown, D = unknown>(
    url: string | Ref<string>,
    options?: Omit<UseApiOptions<T, D>, "method">,
): UseApiReturn<T, D> {
    return useApi<T, D>(url, { ...options, method: "POST" });
}

/**
 * Helper for PUT requests
 *
 * @example
 * ```ts
 * const { execute } = useApiPut<User, UpdateUserDto>('/users/1')
 * await execute({ data: { name: 'John Doe' } })
 * ```
 */
export function useApiPut<T = unknown, D = unknown>(
    url: string | Ref<string>,
    options?: Omit<UseApiOptions<T, D>, "method">,
): UseApiReturn<T, D> {
    return useApi<T, D>(url, { ...options, method: "PUT" });
}

/**
 * Helper for PATCH requests
 *
 * @example
 * ```ts
 * const { execute } = useApiPatch<User, Partial<User>>('/users/1')
 * await execute({ data: { name: 'John' } })
 * ```
 */
export function useApiPatch<T = unknown, D = unknown>(
    url: string | Ref<string>,
    options?: Omit<UseApiOptions<T, D>, "method">,
): UseApiReturn<T, D> {
    return useApi<T, D>(url, { ...options, method: "PATCH" });
}

/**
 * Helper for DELETE requests
 *
 * @example
 * ```ts
 * const { execute } = useApiDelete('/users/1')
 * await execute()
 * ```
 */
export function useApiDelete<T = unknown>(
    url: string | Ref<string>,
    options?: Omit<UseApiOptions<T>, "method">,
): UseApiReturn<T> {
    return useApi<T>(url, { ...options, method: "DELETE" });
}
