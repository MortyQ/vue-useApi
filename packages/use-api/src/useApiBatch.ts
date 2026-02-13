import { ref, computed, getCurrentScope, onScopeDispose, toValue, watch, type Ref, type MaybeRefOrGetter } from "vue";
import { useApi } from "./useApi";
import type {
    UseApiBatchOptions,
    UseApiBatchReturn,
    BatchResultItem,
    BatchProgress,
    ApiError,
    ApiRequestConfig,
} from "./types";

/**
 * Execute multiple API requests in parallel with full reactive state
 *
 * Features:
 * - Reactive loading, data, error, progress states
 * - Reactive urls support (MaybeRefOrGetter)
 * - Error tolerance with `settled: true` (default)
 * - Concurrency limiting
 * - Abort support for all pending requests
 * - Detailed per-request results with URL mapping
 * - Progress tracking
 * - Watch option for auto re-execution
 *
 * @example
 * ```ts
 * // Basic usage - fetch multiple users
 * const { data, loading, progress, execute } = useApiBatch<User>([
 *   '/users/1',
 *   '/users/2',
 *   '/users/3'
 * ])
 *
 * await execute()
 * console.log(data.value) // BatchResultItem<User>[]
 *
 * // With reactive urls
 * const userIds = ref([1, 2, 3])
 * const urls = computed(() => userIds.value.map(id => `/users/${id}`))
 * const { successfulData } = useApiBatch<User>(urls, { immediate: true })
 *
 * // With options
 * const { successfulData, errors, progress } = useApiBatch<Post>(
 *   ['/posts/1', '/posts/2', '/posts/3'],
 *   {
 *     concurrency: 2,        // Max 2 parallel requests
 *     immediate: true,       // Execute on mount
 *     onProgress: (p) => console.log(`${p.percentage}%`)
 *   }
 * )
 *
 * // Strict mode - fail on first error
 * const { execute } = useApiBatch<User>(urls, { settled: false })
 *
 * // Auto re-execute when dependency changes
 * const filters = ref({ status: 'active' })
 * const { data } = useApiBatch<User>(urls, {
 *   watch: filters,
 *   immediate: true
 * })
 * ```
 */
export function useApiBatch<T = unknown>(
    urls: MaybeRefOrGetter<string[]>,
    options: UseApiBatchOptions<T> = {},
): UseApiBatchReturn<T> {
    const {
        settled = true,
        concurrency,
        immediate = false,
        skipErrorNotification = true,
        watch: watchSource,
        onItemSuccess,
        onItemError,
        onFinish,
        onProgress,
        ...apiOptions
    } = options;

    // Helper to get current urls value
    const getUrls = () => toValue(urls);

    // Reactive state
    const data = ref<BatchResultItem<T>[]>([]) as Ref<BatchResultItem<T>[]>;
    const loading = ref(false);
    const error = ref<ApiError | null>(null);
    const errors = ref<ApiError[]>([]) as Ref<ApiError[]>;
    const progress = ref<BatchProgress>({
        completed: 0,
        total: 0,
        percentage: 0,
        succeeded: 0,
        failed: 0,
    });

    // Computed: extract only successful data
    const successfulData = computed<T[]>(() =>
        data.value
            .filter(item => item.success && item.data !== null)
            .map(item => item.data as T)
    );

    // Abort controllers for all active requests
    const abortControllers = ref<AbortController[]>([]);
    let isAborted = false;

    const updateProgress = (succeeded: number, failed: number) => {
        const currentUrls = getUrls();
        const completed = succeeded + failed;
        const newProgress: BatchProgress = {
            completed,
            total: currentUrls.length,
            percentage: currentUrls.length > 0 ? Math.round((completed / currentUrls.length) * 100) : 0,
            succeeded,
            failed,
        };
        progress.value = newProgress;
        onProgress?.(newProgress);
    };

    const executeRequest = async (
        url: string,
        index: number,
        signal: AbortSignal
    ): Promise<BatchResultItem<T>> => {
        const { execute, error: reqError, statusCode } = useApi<T>(url, {
            ...apiOptions,
            useGlobalAbort: false,
            skipErrorNotification,
        });

        try {
            const result = await execute({ signal } as ApiRequestConfig<unknown>);

            if (signal.aborted) {
                return {
                    url,
                    index,
                    success: false,
                    data: null,
                    error: { message: 'Request aborted', status: 0, code: 'ABORTED' },
                    statusCode: null,
                };
            }

            const item: BatchResultItem<T> = {
                url,
                index,
                success: result !== null && result !== undefined,
                data: result ?? null,
                error: reqError.value,
                statusCode: statusCode.value,
            };

            if (item.success) {
                onItemSuccess?.(item, index);
            } else if (item.error) {
                onItemError?.(item, index);
            }

            return item;
        } catch (err) {
            const apiError: ApiError = {
                message: err instanceof Error ? err.message : 'Unknown error',
                status: 0,
                code: 'BATCH_ERROR',
            };

            const item: BatchResultItem<T> = {
                url,
                index,
                success: false,
                data: null,
                error: apiError,
                statusCode: null,
            };

            onItemError?.(item, index);
            return item;
        }
    };

    const executeWithConcurrency = async (
        urls: string[],
        limit?: number
    ): Promise<BatchResultItem<T>[]> => {
        const results: BatchResultItem<T>[] = new Array(urls.length);
        let succeededCount = 0;
        let failedCount = 0;

        if (!limit || limit >= urls.length) {
            // No limit - execute all in parallel
            const promises = urls.map((url, index) => {
                const controller = new AbortController();
                abortControllers.value.push(controller);

                return executeRequest(url, index, controller.signal).then(result => {
                    results[index] = result;
                    if (result.success) {
                        succeededCount++;
                    } else {
                        failedCount++;
                        if (result.error) {
                            errors.value.push(result.error);
                        }
                    }
                    updateProgress(succeededCount, failedCount);

                    // In non-settled mode, throw on first error
                    if (!settled && !result.success && result.error) {
                        throw result.error;
                    }

                    return result;
                });
            });

            if (settled) {
                await Promise.allSettled(promises);
            } else {
                await Promise.all(promises);
            }
        } else {
            // With concurrency limit
            let currentIndex = 0;

            const executeNext = async (): Promise<void> => {
                while (currentIndex < urls.length && !isAborted) {
                    const index = currentIndex++;
                    const url = urls[index];

                    const controller = new AbortController();
                    abortControllers.value.push(controller);

                    const result = await executeRequest(url, index, controller.signal);
                    results[index] = result;

                    if (result.success) {
                        succeededCount++;
                    } else {
                        failedCount++;
                        if (result.error) {
                            errors.value.push(result.error);
                        }
                    }
                    updateProgress(succeededCount, failedCount);

                    // In non-settled mode, abort remaining on first error
                    if (!settled && !result.success && result.error) {
                        abort('First request failed in non-settled mode');
                        throw result.error;
                    }
                }
            };

            // Start `limit` workers
            const workers = Array.from({ length: Math.min(limit, urls.length) }, () => executeNext());

            if (settled) {
                await Promise.allSettled(workers);
            } else {
                await Promise.all(workers);
            }
        }

        return results;
    };

    const execute = async (): Promise<BatchResultItem<T>[]> => {
        const currentUrls = getUrls();

        // Reset state
        isAborted = false;
        loading.value = true;
        error.value = null;
        errors.value = [];
        data.value = [];
        abortControllers.value = [];
        updateProgress(0, 0);

        try {
            const results = await executeWithConcurrency(currentUrls, concurrency);
            data.value = results;

            // Set aggregated error if all requests failed
            const allFailed = results.every(r => !r.success);
            if (allFailed && results.length > 0) {
                error.value = {
                    message: `All ${results.length} requests failed`,
                    status: 0,
                    code: 'BATCH_ALL_FAILED',
                };
            }

            onFinish?.(results);
            return results;
        } catch (err) {
            // This happens in non-settled mode when first request fails
            if (!settled) {
                error.value = err as ApiError;
            }
            throw err;
        } finally {
            loading.value = false;
            abortControllers.value = [];
        }
    };

    const abort = (message = 'Batch aborted') => {
        isAborted = true;
        for (const controller of abortControllers.value) {
            controller.abort(message);
        }
        abortControllers.value = [];
    };

    const reset = () => {
        abort();
        loading.value = false;
        error.value = null;
        errors.value = [];
        data.value = [];
        progress.value = {
            completed: 0,
            total: getUrls().length,
            percentage: 0,
            succeeded: 0,
            failed: 0,
        };
    };

    // Cleanup on scope dispose
    if (getCurrentScope()) {
        onScopeDispose(() => abort('Scope disposed'));
    }

    // Watch for changes and re-execute
    if (watchSource) {
        watch(watchSource, () => {
            execute();
        }, { deep: true });
    }

    // Execute immediately if requested
    if (immediate) {
        execute();
    }

    return {
        data,
        successfulData,
        loading,
        error,
        errors,
        progress,
        execute,
        abort,
        reset,
    };
}

