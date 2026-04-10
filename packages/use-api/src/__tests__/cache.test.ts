import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { useApi } from '../useApi';
import { createApi } from '../plugin';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref, type MaybeRefOrGetter } from 'vue';
import type { AxiosInstance } from 'axios';
import type { UseApiOptions, ApiPluginOptions, UseApiReturn } from '../types';
import { clearAllCache, invalidateCache } from '../features/cacheManager';

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
} as unknown as AxiosInstance;

function mountuseApi<T = unknown>(
    options: UseApiOptions<T> = {},
    apiOptions: Partial<ApiPluginOptions> = {},
    url?: MaybeRefOrGetter<string | undefined>,
) {
    let result: UseApiReturn<T, unknown>;

    const Comp = defineComponent({
        setup() {
            result = useApi(url ?? 'test-url', options);
            return () => null;
        },
    });

    const wrapper = mount(Comp, {
        global: {
            plugins: [
                createApi({
                    axios: mockAxios,
                    ...apiOptions,
                }),
            ],
        },
    });

    return { result: result!, wrapper };
}

describe('cache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        clearAllCache();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // =========================================================================
    // Cache READ behavior
    // =========================================================================

    describe('cache READ', () => {
        it('first execute() calls axios and returns data', async () => {
            const data = [{ id: 1, name: 'Category A' }];
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'categories' });
            const returned = await result.execute();

            expect(mockAxios.request).toHaveBeenCalledTimes(1);
            expect(returned).toEqual(data);
            expect(result.data.value).toEqual(data);
        });

        it('second execute() within staleTime returns cached data without calling axios', async () => {
            const data = [{ id: 1, name: 'Category A' }];
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'categories' });
            await result.execute();
            vi.clearAllMocks();

            const returned = await result.execute();

            expect(mockAxios.request).not.toHaveBeenCalled();
            expect(returned).toEqual(data);
            expect(result.data.value).toEqual(data);
        });

        it('second execute() AFTER staleTime expires calls axios again', async () => {
            const data = { name: 'fresh' };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: { id: 'categories', staleTime: 10_000 } });
            await result.execute();
            vi.clearAllMocks();

            // Advance time past the staleTime
            vi.advanceTimersByTime(10_001);
            await result.execute();

            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('respects custom staleTime from CacheOptions object', async () => {
            const data = { value: 42 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: { id: 'custom', staleTime: 5_000 } });
            await result.execute();
            vi.clearAllMocks();

            // Still valid — 4 seconds passed
            vi.advanceTimersByTime(4_000);
            await result.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();

            // Now expired — 5 more seconds
            vi.advanceTimersByTime(5_001);
            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('string shorthand uses DEFAULT_STALE_TIME (300_000ms)', async () => {
            const data = { value: 1 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'items' });
            await result.execute();
            vi.clearAllMocks();

            // 299_999ms — still valid
            vi.advanceTimersByTime(299_999);
            await result.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();

            // 300_001ms — expired
            vi.advanceTimersByTime(2);
            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('no cache option — axios is always called (no regression)', async () => {
            const data = { value: 1 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({});
            await result.execute();
            await result.execute();
            await result.execute();

            expect(mockAxios.request).toHaveBeenCalledTimes(3);
        });
    });

    // =========================================================================
    // Cache WRITE behavior
    // =========================================================================

    describe('cache WRITE', () => {
        it('successful response writes entry — subsequent call is served from cache', async () => {
            const data = { written: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'write-test' });
            await result.execute();
            vi.clearAllMocks();

            // Entry was written — this should hit cache
            const cached = await result.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();
            expect(cached).toEqual(data);
        });

        it('failed response (4xx) does NOT write cache entry', async () => {
            (mockAxios.request as unknown as Mock).mockRejectedValue({
                isAxiosError: true,
                response: { status: 404, data: {} },
                message: 'Not Found',
            });

            const { result } = mountuseApi({ cache: 'fail-test', skipErrorNotification: true });
            await result.execute();
            vi.clearAllMocks();

            // No cache was written — axios must be called again
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: { ok: true }, status: 200 });
            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('failed response (5xx) does NOT write cache entry', async () => {
            (mockAxios.request as unknown as Mock).mockRejectedValue({
                isAxiosError: true,
                response: { status: 500, data: {} },
                message: 'Server Error',
            });

            const { result } = mountuseApi({ cache: 'server-error-test', skipErrorNotification: true });
            await result.execute();
            vi.clearAllMocks();

            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: { ok: true }, status: 200 });
            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('aborted request does NOT write cache entry', async () => {
            (mockAxios.request as unknown as Mock).mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject({ isAxiosError: true, code: 'ERR_CANCELED', message: 'Aborted' }), 50),
                ),
            );

            const { result } = mountuseApi({ cache: 'abort-test' });
            const execPromise = result.execute();
            result.abort();
            // Advance fake timers to trigger the mock rejection
            await vi.advanceTimersByTimeAsync(100);
            await execPromise;
            vi.clearAllMocks();

            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: { ok: true }, status: 200 });
            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // invalidateCache option behavior
    // =========================================================================

    describe('invalidateCache option', () => {
        it('invalidateCache: string — deletes entry on 2xx, next execute() calls axios', async () => {
            const catData = { name: 'cats' };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: catData, status: 200 });

            // Populate cache for 'categories'
            const { result: reader } = mountuseApi({ cache: 'categories' });
            await reader.execute();

            // A POST that invalidates 'categories' on success
            const { result: writer } = mountuseApi({ invalidateCache: 'categories', method: 'POST' });
            await writer.execute();

            // 'categories' cache should be busted
            vi.clearAllMocks();
            await reader.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('invalidateCache: array — deletes all listed entries on 2xx', async () => {
            const data = { ok: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            // Populate caches
            const { result: r1 } = mountuseApi({ cache: 'products' });
            const { result: r2 } = mountuseApi({ cache: 'categories' });
            await r1.execute();
            await r2.execute();

            // Writer invalidates both
            const { result: writer } = mountuseApi({
                invalidateCache: ['products', 'categories'],
                method: 'POST',
            });
            await writer.execute();

            vi.clearAllMocks();
            await r1.execute();
            await r2.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(2);
        });

        it('invalidateCache does NOT fire on 4xx error', async () => {
            const catData = { name: 'cats' };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: catData, status: 200 });

            const { result: reader } = mountuseApi({ cache: 'categories' });
            await reader.execute();

            // Writer that fails
            (mockAxios.request as unknown as Mock).mockRejectedValue({
                isAxiosError: true,
                response: { status: 422, data: {} },
                message: 'Unprocessable',
            });
            const { result: writer } = mountuseApi({
                invalidateCache: 'categories',
                method: 'POST',
                skipErrorNotification: true,
            });
            await writer.execute();

            // Cache should still be valid — no axios call
            vi.clearAllMocks();
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: catData, status: 200 });
            await reader.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();
        });

        it('invalidateCache does NOT fire on 5xx error', async () => {
            const catData = { value: 1 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: catData, status: 200 });

            const { result: reader } = mountuseApi({ cache: 'categories' });
            await reader.execute();

            (mockAxios.request as unknown as Mock).mockRejectedValue({
                isAxiosError: true,
                response: { status: 503, data: {} },
                message: 'Service Unavailable',
            });
            const { result: writer } = mountuseApi({
                invalidateCache: 'categories',
                method: 'POST',
                skipErrorNotification: true,
            });
            await writer.execute();

            vi.clearAllMocks();
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data: catData, status: 200 });
            await reader.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();
        });

        it('invalidateCache without cache option on same request — valid use case (POST busts cache)', async () => {
            const data = { list: [1, 2, 3] };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            // GET caches the result
            const { result: getter } = mountuseApi({ cache: 'items' });
            await getter.execute();

            // POST does not cache itself, just busts 'items'
            const { result: poster } = mountuseApi({ invalidateCache: 'items', method: 'POST' });
            await poster.execute();

            vi.clearAllMocks();
            await getter.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });
    });

    // =========================================================================
    // Interaction with other features
    // =========================================================================

    describe('interactions', () => {
        it('cache + immediate: true — cache checked on mount', async () => {
            const data = { mounted: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            // First mount populates cache
            mountuseApi({ cache: 'mount-cache', immediate: true });
            await vi.runAllTimersAsync();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
            vi.clearAllMocks();

            // Second mount should hit cache — no axios
            mountuseApi({ cache: 'mount-cache', immediate: true });
            await vi.runAllTimersAsync();
            expect(mockAxios.request).not.toHaveBeenCalled();
        });

        it('cache hit keeps loading at false', async () => {
            const data = { value: 1 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'loading-test' });
            await result.execute(); // populates cache

            // Synchronously start second execute and immediately check loading
            const execPromise = result.execute();
            expect(result.loading.value).toBe(false); // cache hit — never set loading
            await execPromise;
            expect(result.loading.value).toBe(false);
        });

        it('cache + watch — watch triggers execute(), cache is checked first', async () => {
            const data = { count: 1 };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const trigger = ref(0);
            const { result } = mountuseApi({ cache: 'watch-cache', watch: trigger });

            await result.execute(); // populate cache
            vi.clearAllMocks();

            // Watch fires — should hit cache, not call axios
            trigger.value = 1;
            await nextTick();

            expect(mockAxios.request).not.toHaveBeenCalled();
            expect(result.data.value).toEqual(data);
        });

        it('cache + retry — cache is written after successful retry', async () => {
            (mockAxios.request as unknown as Mock)
                .mockRejectedValueOnce({ isAxiosError: true, response: { status: 500, data: {} }, message: 'err' })
                .mockResolvedValueOnce({ data: { retried: true }, status: 200 });

            const { result } = mountuseApi({
                cache: 'retry-cache',
                retry: 1,
                retryDelay: 100,
                skipErrorNotification: true,
            });

            const execPromise = result.execute();
            await vi.advanceTimersByTimeAsync(100);
            await execPromise;

            vi.clearAllMocks();

            // Cache should be populated from the successful retry
            await result.execute();
            expect(mockAxios.request).not.toHaveBeenCalled();
            expect(result.data.value).toEqual({ retried: true });
        });

        it('cache + debounce — cache checked after debounce resolves, before axios', async () => {
            const data = { debounced: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'debounce-cache', debounce: 200 });

            // First debounced execute — populates cache after debounce
            result.execute();
            await vi.advanceTimersByTimeAsync(200);
            await vi.runAllTimersAsync();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
            vi.clearAllMocks();

            // Second debounced execute — cache hit, no axios
            result.execute();
            await vi.advanceTimersByTimeAsync(200);
            await vi.runAllTimersAsync();
            expect(mockAxios.request).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // clearAllCache
    // =========================================================================

    describe('clearAllCache', () => {
        it('clears all entries — next execute() goes to axios', async () => {
            const data = { fresh: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result: r1 } = mountuseApi({ cache: 'key-a' });
            const { result: r2 } = mountuseApi({ cache: 'key-b' });
            await r1.execute();
            await r2.execute();
            vi.clearAllMocks();

            clearAllCache();

            await r1.execute();
            await r2.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // Imperative invalidateCache (exported from index)
    // =========================================================================

    describe('imperative invalidateCache', () => {
        it('calling invalidateCache() outside useApi deletes the entry', async () => {
            const data = { imperative: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result } = mountuseApi({ cache: 'imp-cache' });
            await result.execute(); // populates cache
            vi.clearAllMocks();

            // Imperative invalidation (as used outside a component, e.g. after login/logout)
            invalidateCache('imp-cache');

            await result.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(1);
        });

        it('invalidateCache() accepts an array of ids', async () => {
            const data = { ok: true };
            (mockAxios.request as unknown as Mock).mockResolvedValue({ data, status: 200 });

            const { result: r1 } = mountuseApi({ cache: 'arr-a' });
            const { result: r2 } = mountuseApi({ cache: 'arr-b' });
            await r1.execute();
            await r2.execute();
            vi.clearAllMocks();

            invalidateCache(['arr-a', 'arr-b']);

            await r1.execute();
            await r2.execute();
            expect(mockAxios.request).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // Stubs for future work
    // =========================================================================

    it.todo('cache: concurrent execute() calls — only one axios request fires (Request Deduplication is separate feature)');
    it.todo('cache: SSR — cacheStore is module-level, shared between requests in Node.js environment (document limitation)');
    it.todo('cache + useApiBatch — not supported, document explicitly');
});
