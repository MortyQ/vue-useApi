import { debounceFn, DebounceCancelledError } from "./utils/debounce";
import { type AxiosRequestConfig, isAxiosError } from "axios";
import { ref, getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

import type {
    UseApiOptions,
    UseApiReturn,
    ApiRequestConfig,
} from "./types";
import { useApiConfig } from "./plugin";
import { parseApiError } from "./utils/errorParser";
import { useApiState } from "./composables/useApiState";
import { useAbortController } from "./composables/useAbortController";

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Cancellable sleep — resolves `true` if aborted before delay elapsed, `false` otherwise.
 */
function cancellableSleep(ms: number, signal: AbortSignal): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        if (signal.aborted) { resolve(true); return; }
        const timer = setTimeout(() => { cleanup(); resolve(false); }, ms);
        const onAbort = () => { clearTimeout(timer); cleanup(); resolve(true); };
        const cleanup = () => signal.removeEventListener("abort", onAbort);
        signal.addEventListener("abort", onAbort, { once: true });
    });
}

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
        retryStatusCodes = globalOptions?.retryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES,
        authMode = "default",
        useGlobalAbort = globalOptions?.useGlobalAbort ?? true,
        initialLoading = false,
        poll = 0,
        ...axiosConfig
    } = options;

    const maxRetries = retry === false ? 0 : retry === true ? 3 : (retry as number);

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
        const requestUrl = toValue(url);

        if (abortController.value) abortController.value.abort("Cancelled by new request");
        const controller = new AbortController();
        abortController.value = controller;

        // --- Global Abort Logic ---
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
        let retryCount = 0;

        try {
            if (!requestUrl) {
                throw new Error("Request URL is missing");
            }

            const rawData = config?.data !== undefined ? config.data : axiosConfig.data;
            const resolvedData = toValue(rawData);

            const rawParams = config?.params !== undefined ? config.params : axiosConfig.params;
            const resolvedParams = toValue(rawParams);

            // eslint-disable-next-line no-constant-condition
            while (true) {
                try {
                    const response = await axios.request<T>({
                        url: requestUrl,
                        method,
                        ...axiosConfig,
                        ...config,
                        data: resolvedData,
                        params: resolvedParams,
                        signal: controller.signal,
                        ...({ authMode: config?.authMode || authMode } as unknown as AxiosRequestConfig),
                    } as AxiosRequestConfig);

                    state.mutate(response.data as T | null, response);
                    state.setStatusCode(response.status);
                    onSuccess?.(response);
                    return response.data;

                } catch (err: unknown) {
                    // Abort / cancel — bail out silently
                    if (controller.signal.aborted || (isAxiosError(err) && err.code === "ERR_CANCELED")) {
                        wasCancelled = true;
                        return null;
                    }

                    const apiError = errorParser ? errorParser(err) : parseApiError(err);

                    const canRetry =
                        retryCount < maxRetries &&
                        (retryStatusCodes.length === 0 || retryStatusCodes.includes(apiError.status));

                    if (canRetry) {
                        retryCount++;
                        const aborted = await cancellableSleep(retryDelay, controller.signal);
                        if (aborted) {
                            // Explicitly reset loading — abort during sleep leaves no in-flight request
                            wasCancelled = true;
                            state.setLoading(false);
                            return null;
                        }
                        continue;
                    }

                    // All retries exhausted (or retry disabled) — surface the error
                    if (!skipErrorNotification && globalErrorHandler) {
                        globalErrorHandler(apiError, err);
                    }
                    state.setError(apiError);
                    state.setStatusCode(apiError.status);
                    onError?.(apiError);
                    return null;
                }
            }
        } catch (err: unknown) {
            // Handles "Request URL is missing" and unexpected setup errors (not retried)
            if (controller.signal.aborted || (isAxiosError(err) && err.code === "ERR_CANCELED")) {
                wasCancelled = true;
                return null;
            }
            const apiError = errorParser ? errorParser(err) : parseApiError(err);
            if (!skipErrorNotification && globalErrorHandler) {
                globalErrorHandler(apiError, err);
            }
            state.setError(apiError);
            state.setStatusCode(apiError.status);
            onError?.(apiError);
            return null;
        } finally {
            if (globalAbortHandler && subscribedSignal) subscribedSignal.removeEventListener("abort", globalAbortHandler);
            if (!wasCancelled) {
                state.setLoading(false);
                onFinish?.();

                // Polling Logic — starts only after the final result (success or all retries exhausted)
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

    // When debounce is active, superseded calls are rejected with DebounceCancelledError.
    // Swallow it here so callers of execute() always get null (not an unhandled rejection).
    const _debounced = debounce > 0 ? debounceFn(executeRequest, debounce) : null;
    const execute: typeof executeRequest = _debounced
        ? (config?) => _debounced(config).catch((err) => {
            if (err instanceof DebounceCancelledError) return null;
            throw err;
        })
        : executeRequest;

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

    // Flag used by ignoreUpdates() to temporarily suppress watch-triggered execution.
    let ignoreFlag = false;

    /**
     * Run `updater` without triggering the watch-based auto re-execution.
     * Synchronous only — reactive changes made after an `await` inside the
     * updater will NOT be suppressed (the flag resets after the sync portion).
     * Safe to call when no `watch` option is configured (no-op, updater still runs).
     */
    const ignoreUpdates = (updater: () => void): void => {
        ignoreFlag = true;
        try {
            updater();
        } finally {
            ignoreFlag = false;
        }
    };

    if (options.watch) {
        watch(options.watch, () => {
            if (ignoreFlag) return;
            execute();
        }, { deep: true, flush: 'sync' });
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

    return { ...state, execute, abort, reset, ignoreUpdates };
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


