import { debounceFn, DebounceCancelledError } from "./utils/debounce";
import { type AxiosRequestConfig, type AxiosResponse, isAxiosError } from "axios";
import { ref, computed, effectScope, getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from "vue";

import type {
    UseApiOptions,
    UseApiReturn,
    ApiRequestConfig,
    CacheOptions,
} from "./types";
import { useApiConfig } from "./plugin";
import { parseApiError } from "./utils/errorParser";
import { useApiState } from "./composables/useApiState";
import { useAbortController } from "./composables/useAbortController";
import { readCache, writeCache, invalidateCache as cacheInvalidate, DEFAULT_STALE_TIME } from "./features/cacheManager";
import { useRefetchTriggers } from "./composables/useRefetchTriggers";

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Normalise the `cache` option into a consistent shape with a guaranteed `staleTime` and `swr` flag.
 * Returns null if caching is not configured.
 */
function normalizeCacheOptions(
    cache: string | CacheOptions | undefined,
): { id: string; staleTime: number; swr: boolean } | null {
    if (!cache) return null;
    if (typeof cache === "string") {
        return { id: cache, staleTime: DEFAULT_STALE_TIME, swr: false };
    }
    return { id: cache.id, staleTime: cache.staleTime ?? DEFAULT_STALE_TIME, swr: cache.swr ?? false };
}

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

export function useApi<T = unknown, D = unknown, TSelected = T>(
    url: MaybeRefOrGetter<string | undefined>,
    options: UseApiOptions<T, D, TSelected> = {},
): UseApiReturn<TSelected, D> {
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
        // Explicitly excluded from axiosConfig — these are useApi-only options
        // and must not be forwarded to axios.request()
        cache: _cache,
        invalidateCache: _invalidateCache,
        lazy = false,
        refetchOnFocus: _refetchOnFocus,
        refetchOnReconnect: _refetchOnReconnect,
        select,
        ...axiosConfig
    } = options;

    const maxRetries = retry === false ? 0 : retry === true ? 3 : (retry as number);

    const applySelect = (raw: T): TSelected =>
        select ? select(raw) : (raw as unknown as TSelected);

    const startLoading = initialLoading ?? immediate;
    const state = useApiState<TSelected>(initialData as TSelected | null, { initialLoading: startLoading });
    const revalidating = ref(false);
    const abortController = ref<AbortController | null>(null);
    const globalAbort = useGlobalAbort ? useAbortController() : null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    // notifyFetched is reassigned after execute() is defined — see useRefetchTriggers wiring below
    let notifyFetched: () => void = () => {}

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

    const executeRequest = async (config?: ApiRequestConfig<D>): Promise<TSelected | null> => {
        /**
         * Cache hit behavior (cache.swr: false — default):
         * - mutate() called with cached data
         * - loading stays false
         * - onBefore / onSuccess / onFinish NOT called
         * - axios request NOT made
         *
         * Cache hit behavior (cache.swr: true — SWR):
         * - mutate() called with cached data immediately (no loading flash)
         * - revalidating set to true
         * - axios request IS made in the background
         * - on success: data updated silently, revalidating: false
         * - on error: error set, revalidating: false
         *
         * Cache write: only on HTTP 2xx success
         * Cache invalidation: only on HTTP 2xx success
         *
         * staleTime default: 300_000ms (5 minutes)
         * Expired entries are deleted on next read attempt
         *
         * The cache is module-level (singleton).
         * All useApi instances in the app share the same cache.
         * Use clearAllCache() on logout to prevent data leaks between users.
         */
        const cacheOpts = normalizeCacheOptions(options.cache);
        let isRevalidating = false;

        if (cacheOpts) {
            const cached = readCache<T>(cacheOpts.id);
            if (cached !== null) {
                state.mutate(applySelect(cached));
                if (!cacheOpts.swr) {
                    return applySelect(cached);
                }
                // SWR: serve cache immediately, continue to fetch fresh data in background
                isRevalidating = true;
                revalidating.value = true;
            }
        }

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
                // The event listener is already scoped to this specific signal instance —
                // no need to compare abortCount. The signal fires exactly once per abort() call.
                globalAbortHandler = () => { controller.abort("Cancelled by global abort"); };
                gs.addEventListener("abort", globalAbortHandler);
            }
        }
        // -------------------------------------------------------------------------

        // During revalidation we already have data — don't show loading spinner
        if (!isRevalidating) {
            onBefore?.();
            state.setLoading(true);
        }
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

                    const selected = applySelect(response.data);
                    // response is AxiosResponse<T>; state is typed TSelected — cast is safe
                    // because UseApiReturn.response is Ref<AxiosResponse<unknown>>
                    state.mutate(selected, response as unknown as AxiosResponse<TSelected>);
                    state.setStatusCode(response.status);

                    // Cache WRITE — only on 2xx success; always store raw data
                    if (cacheOpts) {
                        writeCache(cacheOpts.id, response.data, cacheOpts.staleTime);
                    }

                    // Cache INVALIDATION — only on 2xx success, never in catch/finally
                    if (options.invalidateCache) {
                        cacheInvalidate(options.invalidateCache);
                    }

                    onSuccess?.(response);
                    notifyFetched()
                    return selected;

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
            revalidating.value = false;
            if (!wasCancelled) {
                if (!isRevalidating) state.setLoading(false);
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

    // -------------------------------------------------------------------------
    // Refetch triggers — focus + reconnect
    // -------------------------------------------------------------------------
    const refetchOnFocus = _refetchOnFocus ?? globalOptions?.refetchOnFocus
    const refetchOnReconnect = _refetchOnReconnect ?? globalOptions?.refetchOnReconnect

    const { notifyFetched: _notifyFetched } = useRefetchTriggers({
        refetchOnFocus,
        refetchOnReconnect,
        loading: state.loading,
        onTrigger: () => execute(),
    })
    notifyFetched = _notifyFetched

    let trackingScope: ReturnType<typeof effectScope> | undefined

    const startAutoTracking = () => {
        trackingScope = effectScope()
        trackingScope.run(() => {
            const urlComputed    = computed(() => toValue(url))
            const paramsComputed = computed(() => toValue(options.params))
            const dataComputed   = computed(() => toValue(options.data))

            watch(
                [urlComputed, paramsComputed, dataComputed],
                () => execute(),
                { flush: 'pre', deep: true },
            )
        })
    }

    if (!lazy) {
        startAutoTracking()

        if (getCurrentScope()) {
            onScopeDispose(() => trackingScope!.stop())
        }
    }

    const ignoreUpdates = (updater: () => void): void => {
        trackingScope?.pause()
        try {
            updater()
        } finally {
            // resume() re-queues any effects dirtied during the pause.
            // We immediately stop the scope so those queued jobs are no-ops
            // (the job checks effect.flags & 1 before running), then restart
            // fresh tracking so subsequent dep changes fire normally.
            trackingScope?.resume()
            trackingScope?.stop()
            if (!lazy) startAutoTracking()
        }
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

    return { ...state, revalidating, execute, abort, reset, ignoreUpdates };
}
