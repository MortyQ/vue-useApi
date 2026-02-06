import { debounceFn } from "./utils/debounce";
import type {AxiosRequestConfig} from "axios";
import { ref, getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

import type { UseApiOptions, UseApiReturn, ApiRequestConfig } from "./types";
import { useApiConfig } from "./plugin"; // <--- INJECTION
import { parseApiError } from "./utils/errorParser";
import { useApiState } from "./composables/useApiState";
import { useAbortController } from "./composables/useAbortController";

export function useApi<T = unknown, D = unknown>(
    url: MaybeRefOrGetter<string | undefined>,
    options: UseApiOptions<T, D> = {},
): UseApiReturn<T, D> {
    const { axios, onError: globalErrorHandler, globalOptions, errorParser } = useApiConfig();

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
        poll = 0,
        ...axiosConfig
    } = options;

    const startLoading = initialLoading ?? immediate;
    const state = useApiState<T>(initialData as T | null, { initialLoading: startLoading });
    const abortController = ref<AbortController | null>(null);
    const globalAbort = useGlobalAbort ? useAbortController() : null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    // Helper to resolve poll config
    const getPollConfig = () => {
        const val = toValue(poll);
        if (typeof val === "number") return { interval: val, whenHidden: false };
        if (val && typeof val === "object") {
            return {
                interval: toValue(val.interval),
                whenHidden: toValue(val.whenHidden) ?? false
            };
        }
        return { interval: 0, whenHidden: false };
    };

    const executeRequest = async (config?: ApiRequestConfig<D>): Promise<T | null> => {
        // Clear previous poll timer to avoid overlaps if manual execute happened
        if (pollTimer) clearTimeout(pollTimer);
        console.log("URL", url)
        const requestUrl = toValue(url);

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

            const rawParams = config?.params !== undefined ? config.params : axiosConfig.params;
            const resolvedParams = toValue(rawParams);

            if (!requestUrl) {
                throw new Error("Request URL is missing");
            }

            const response = await axios.request<T>({
                url: requestUrl,
                method,
                ...axiosConfig,
                ...config,
                data: resolvedData,
                params: resolvedParams,
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

            // Parse error using global parser if available, otherwise use default
            const apiError = errorParser ? errorParser(err) : parseApiError(err);

            // Global handler (Notifications/Toasts)
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

                // Polling Logic
                const { interval, whenHidden } = getPollConfig();
                if (interval > 0) {
                    const shouldPoll = whenHidden || (typeof document !== "undefined" && !document.hidden);
                    if (shouldPoll) {
                        pollTimer = setTimeout(() => {
                            pollTimer = null;
                            const { whenHidden: currentWhenHidden } = getPollConfig();
                            if (currentWhenHidden || (typeof document === "undefined" || !document.hidden)) {
                                execute();
                            }
                        }, interval);
                    }
                }
            }
        }
    };

    const execute = debounce > 0 ? debounceFn(executeRequest, debounce) : executeRequest;

    const abort = (msg?: string) => {
        if (pollTimer) clearTimeout(pollTimer);
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

    // Initial check for polling if immediate is false but pollInterval is set?
    // Usually polling requires one execution to start the loop in this logic.
    // If immediate=true, it starts.
    if (immediate) execute();

    // Visibility Handling for Polling
    if (typeof document !== "undefined") {
        const handleVisibility = () => {
            if (document.hidden) return;
            // On tab focus, if polling is enabled and no timer is running, resume/catch-up
            const { interval } = getPollConfig();
            if (interval > 0 && !pollTimer && !state.loading.value) {
                 execute();
            }
        };
        // We use a simple listener. In a real app, might want to use useEventListener from vueuse if available, but native is fine.
        document.addEventListener("visibilitychange", handleVisibility);

        if (getCurrentScope()) {
            onScopeDispose(() => document.removeEventListener("visibilitychange", handleVisibility));
        }
    }

    // Watch for dynamic poll changes
    if (poll) {
         watch(() => toValue(poll), () => {
             const { interval } = getPollConfig();

             if (interval > 0) {
                 // If timer is running, we want to restart with new interval
                 if (pollTimer) {
                     clearTimeout(pollTimer);
                     pollTimer = null;
                 }
                 // If we are idle (not loading), start immediately to apply new settings
                 if (!state.loading.value) {
                     execute();
                 }
             } else {
                 // If disabled, clear any pending timer
                 if (pollTimer) {
                     clearTimeout(pollTimer);
                     pollTimer = null;
                 }
             }
         }, { deep: true });
    }

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
    url: MaybeRefOrGetter<string | undefined>,
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
    url: MaybeRefOrGetter<string | undefined>,
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
    url: MaybeRefOrGetter<string | undefined>,
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
    url: MaybeRefOrGetter<string | undefined>,
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
    url: MaybeRefOrGetter<string | undefined>,
    options?: Omit<UseApiOptions<T>, "method">,
): UseApiReturn<T> {
    return useApi<T>(url, { ...options, method: "DELETE" });
}
