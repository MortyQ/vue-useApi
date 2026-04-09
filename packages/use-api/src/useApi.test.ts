import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { useApi } from './useApi'
import { createApi } from './plugin'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick, MaybeRefOrGetter } from 'vue'
import type { AxiosInstance } from 'axios'
import type { UseApiOptions, ApiPluginOptions, UseApiReturn } from "./types";
import { DebounceCancelledError } from './utils/debounce'

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    },
    defaults: { headers: { common: {} } }
} as unknown as AxiosInstance

// Helper to run useApi within an injection context
function mountuseApi<T = unknown>(options: UseApiOptions<T> = {}, apiOptions: Partial<ApiPluginOptions> = {}, url?: MaybeRefOrGetter<string | undefined>) {
    let result: UseApiReturn<T, unknown>

    const Comp = defineComponent({
        setup() {
            result = useApi(url ?? 'test-url', options)
            return () => null
        }
    })

    const wrapper = mount(Comp, {
        global: {
            plugins: [
                createApi({
                    axios: mockAxios,
                    ...apiOptions
                })
            ]
        }
    })

    return { result: result!, wrapper }
}

describe('useApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        Object.defineProperty(document, 'hidden', { value: false, configurable: true })
        vi.clearAllMocks()
    })

    it('should fetch data immediately', async () => {
        const responseData = { id: 1, name: 'Test' }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        const { result } = mountuseApi({ immediate: true })

        expect(result.loading.value).toBe(true)

        await nextTick()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.data.value).toEqual(responseData)
        expect(result.loading.value).toBe(false)
    })

    it('should not fetch data if immediate is false', async () => {
        const { result } = mountuseApi({ immediate: false })

        expect(result.loading.value).toBe(false)
        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('should poll data with interval', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        mountuseApi({
            poll: 1000,
            immediate: true
        })

        await nextTick()
        // Wait for request execution (it's immediate, but async)
        // We use advanceTimersByTimeAsync(0) to flush microtasks and immediate timers without triggering the 1000ms poll
        await vi.advanceTimersByTimeAsync(0)

        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Advance time for poll
        await vi.advanceTimersByTimeAsync(1000)

        expect(mockAxios.request).toHaveBeenCalledTimes(2)

        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(3)
    })

    it('should respect poll configuration object', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        mountuseApi({
            poll: { interval: 2000, whenHidden: true },
            immediate: true
        })

        await nextTick()
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // 1000ms - no call
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // 2000ms - call
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('should stop polling when component unmounts', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        const { wrapper } = mountuseApi({
            poll: 1000,
            immediate: true
        })

        await nextTick()
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        wrapper.unmount()

        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(1) // No new calls
    })

    it('should handle errors correctly', async () => {
        const error = new Error('Network Error')
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(error)

        const { result } = mountuseApi({ immediate: true })

        await nextTick()
        await vi.runAllTimersAsync()

        expect(result.error.value).toBeTruthy()
        expect(result.loading.value).toBe(false)
    })

    it('should re-fetch when watched source changes', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        mountuseApi({
            immediate: true,
            watch: filter
        })

        await nextTick()
        await vi.runAllTimersAsync()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        filter.value = 'changed'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('should debounce requests', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const { result } = mountuseApi({
            debounce: 100,
            immediate: false
        })

        result.execute()
        result.execute()
        result.execute()

        await vi.advanceTimersByTimeAsync(50)
        expect(mockAxios.request).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(100)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('should pause polling when document is hidden (default behavior)', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        mountuseApi({
            poll: 1000,
            immediate: true
        })

        await nextTick()
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Mock document Hidden
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        // Trigger visibility change
        document.dispatchEvent(new Event('visibilitychange'))

        // Advance time
        await vi.advanceTimersByTimeAsync(2000)
        // Should NOT have called again because hidden
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Make visible
        Object.defineProperty(document, 'hidden', { value: false, configurable: true })
        document.dispatchEvent(new Event('visibilitychange'))

        // Should call immediately (resume)
        // Wait for next tick/microtask for the event listener to trigger execute()
        await vi.advanceTimersByTimeAsync(0)

        expect(mockAxios.request).toHaveBeenCalledTimes(2)

        // Continue polling
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(3)
    })

    it('should continue polling when hidden if configured', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        mountuseApi({
            poll: { interval: 1000, whenHidden: true },
            immediate: true
        })

        await nextTick()
        await vi.advanceTimersByTimeAsync(0)

        // Mock document Hidden
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        document.dispatchEvent(new Event('visibilitychange'))

        // Advance time
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('should restart polling when interval changes', async () => {
        const responseData = { count: 1 }
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: responseData, status: 200 })

        const interval = ref(5000)

        mountuseApi({
            poll: interval,
            immediate: true
        })

        await nextTick()
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Wait a bit (2000ms), still waiting for 5000ms
        await vi.advanceTimersByTimeAsync(2000)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Change interval to 100ms
        interval.value = 100
        await nextTick()

        // Watcher called execute(). 2nd request started.
        // We need to ensure the 2nd request FINISHES so it schedules the 100ms timer.
        // Since mock is resolved immediately, we just need to flush microtasks.
        await vi.advanceTimersByTimeAsync(0)

        expect(mockAxios.request).toHaveBeenCalledTimes(2)

        // Now the 100ms timer should be active.
        // 200ms is enough for 2 intervals of 100ms (assuming instant request resolution)
        await vi.advanceTimersByTimeAsync(200)
        expect(mockAxios.request).toHaveBeenCalledTimes(4)
    })

    it('should handle dynamic or undefined url', async () => {
        const id = ref<number | undefined>(undefined)
        // Helper to mimic usage: () => id.value ? `/users/${id.value}` : undefined
        // Note: For this to work dynamically with useApi, we need to pass a getter function for the URL.

        const { result } = mountuseApi({}, {}, () => {
            // Pass URL as a getter
            return id.value ? `/users/${id.value}` : undefined
        });

        // 1. Initial state: URL is undefined.
        // Calling execute should fail gracefully and set error
        await result.execute()

        expect(result.error.value).toBeTruthy()
        // The error might be wrapped, so check loosely or specifically if we know the structure
        expect(result.error.value?.message || result.error.value).toContain("Request URL is missing")

        // 2. Set ID
        id.value = 123
        await nextTick() // Reactivity update

        // Now URL resolves to /users/123
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: { id: 123 }, status: 200 })

        await result.execute()

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            url: "/users/123",
            method: "GET"
        }))
    });

    it('should handle reactive params', async () => {
        const params = ref({ sort: 'asc' })
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({
            params,
        })

        await result.execute()

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            params: { sort: 'asc' }
        }))

        // Update params ref
        params.value = { sort: 'desc' }
        await result.execute()

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            params: { sort: 'desc' }
        }))
    });

})

// ---------------------------------------------------------------------------
// Retry logic tests
// ---------------------------------------------------------------------------

/** Creates a minimal axios-compatible error that isAxiosError() recognises */
function createAxiosError(status: number, message = 'Server Error') {
    return Object.assign(new Error(message), {
        isAxiosError: true,
        response: { status, data: { message } },
        code: undefined as string | undefined,
    })
}

describe('retry logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('should retry specified number of times and set error after last attempt', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(500))

        const { result } = mountuseApi({ retry: 2, retryDelay: 1000 })

        const executePromise = result.execute()

        // Flush 1st rejection + enter sleep
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Advance past retryDelay → 2nd attempt fails → enter sleep
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(2)

        // Advance past retryDelay → 3rd attempt fails → no more retries
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockAxios.request).toHaveBeenCalledTimes(3)

        await executePromise

        expect(result.error.value).toBeTruthy()
        expect(result.error.value?.status).toBe(500)
        expect(result.loading.value).toBe(false)
    })

    it('should NOT retry when status code is not in retryStatusCodes', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(404))

        const { result } = mountuseApi({
            retry: 2,
            retryDelay: 1000,
            retryStatusCodes: [500, 503],
        })

        await result.execute()
        await vi.runAllTimersAsync()

        // Only 1 call — 404 is not in the list
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(404)
    })

    it('should succeed on retry after transient failure', async () => {
        const successData = { id: 1, name: 'User' }
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(503))
            .mockResolvedValueOnce({ data: successData, status: 200 })

        const { result } = mountuseApi({ retry: 1, retryDelay: 1000 })

        const executePromise = result.execute()

        // First attempt fails
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Advance past delay → second attempt succeeds
        await vi.advanceTimersByTimeAsync(1000)
        await executePromise

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual(successData)
        expect(result.error.value).toBeNull()
        expect(result.loading.value).toBe(false)
    })

    it('should cancel retry sleep when abort() is called', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(500))

        const { result } = mountuseApi({ retry: 2, retryDelay: 1000 })

        const executePromise = result.execute()

        // Flush first rejection → now sleeping for retryDelay
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // Abort mid-sleep (at 500ms)
        await vi.advanceTimersByTimeAsync(500)
        result.abort()

        await executePromise

        // No additional requests after abort
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.loading.value).toBe(false)
    })

    it('should not retry when retry: false', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(500))

        const { result } = mountuseApi({ retry: false })

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value).toBeTruthy()
    })

    it('should respect per-call retry over globalOptions.retry', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(500))

        // globalOptions.retry = 3, but specific call overrides with retry: 1
        const { result } = mountuseApi(
            { retry: 1, retryDelay: 500 },
            { globalOptions: { retry: 3, retryDelay: 500 } }
        )

        const executePromise = result.execute()

        // 1st attempt fails
        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        // 1 retry → 2nd attempt fails → done (retry:1 means max 1 retry = 2 total calls)
        await vi.advanceTimersByTimeAsync(500)
        await executePromise

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.error.value).toBeTruthy()
    })

    it('should retry on any error when retryStatusCodes is empty', async () => {
        const networkError = new Error('Network Error')
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        const { result } = mountuseApi({ retry: 1, retryDelay: 500, retryStatusCodes: [] })

        const executePromise = result.execute()

        await vi.advanceTimersByTimeAsync(0)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(500)
        await executePromise

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ ok: true })
        expect(result.error.value).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// retryStatusCodes — three-level priority chain
// ---------------------------------------------------------------------------

describe('retryStatusCodes priority chain', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    // --- Library fallback (no config at any level) ---

    it('uses library fallback [408,429,500,502,503,504] when retryStatusCodes is not set anywhere', async () => {
        // 500 IS in the fallback → should retry
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(500))
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        // No retryStatusCodes at either level
        const { result } = mountuseApi({ retry: 1, retryDelay: 500 })

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ ok: true })
    })

    it('does NOT retry when status is not in library fallback (e.g. 404)', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(404))

        // No retryStatusCodes at either level — 404 is NOT in [408,429,500,502,503,504]
        const { result } = mountuseApi({ retry: 2, retryDelay: 500 })

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(404)
    })

    // --- globalOptions level ---

    it('uses globalOptions.retryStatusCodes when per-request does not set it', async () => {
        // globalOptions says [503] — server returns 404 → should NOT retry
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(404))

        const { result } = mountuseApi(
            { retry: 2, retryDelay: 500 },
            { globalOptions: { retryStatusCodes: [503] } },
        )

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(404)
    })

    it('uses globalOptions.retryStatusCodes to allow retry on matching status', async () => {
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(503))
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        const { result } = mountuseApi(
            { retry: 1, retryDelay: 500 },
            { globalOptions: { retryStatusCodes: [503] } },
        )

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ ok: true })
    })

    it('globalOptions.retryStatusCodes: [] retries on any error (including non-retryable status)', async () => {
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(404))
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        const { result } = mountuseApi(
            { retry: 1, retryDelay: 500 },
            { globalOptions: { retryStatusCodes: [] } },
        )

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ ok: true })
    })

    // --- Per-request level overrides globalOptions ---

    it('per-request retryStatusCodes overrides globalOptions completely (no merge)', async () => {
        // globalOptions says [503], per-request says [500]
        // Server returns 503 → NOT in per-request [500] → should NOT retry
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(503))

        const { result } = mountuseApi(
            { retry: 2, retryDelay: 500, retryStatusCodes: [500] },
            { globalOptions: { retryStatusCodes: [503] } },
        )

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(503)
    })

    it('per-request retryStatusCodes: [] overrides globalOptions [500,503] — retries on any error', async () => {
        // globalOptions says [500, 503], per-request says [] (any error)
        // Server returns 404 → not in globalOptions but [] means any → should retry
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(404))
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        const { result } = mountuseApi(
            { retry: 1, retryDelay: 500, retryStatusCodes: [] },
            { globalOptions: { retryStatusCodes: [500, 503] } },
        )

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ ok: true })
    })

    // --- shouldRetry edge cases ---

    it('server returns 404, retryStatusCodes: [] → retries (empty = any status)', async () => {
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(404))
            .mockResolvedValueOnce({ data: { found: true }, status: 200 })

        const { result } = mountuseApi({ retry: 1, retryDelay: 500, retryStatusCodes: [] })

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ found: true })
    })

    it('network error (status 0) with retryStatusCodes: [] → retries', async () => {
        const networkError = new Error('Network Error')
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce({ data: { ok: true }, status: 200 })

        const { result } = mountuseApi({ retry: 1, retryDelay: 500, retryStatusCodes: [] })

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('network error (status 0) with non-empty retryStatusCodes → does NOT retry (0 not in list)', async () => {
        // parseApiError returns status: 0 for errors with no .response
        // 0 is not in [500, 503] → no retry
        const networkError = new Error('Network Error')
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(networkError)

        const { result } = mountuseApi({ retry: 2, retryDelay: 500, retryStatusCodes: [500, 503] })

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(0)
    })

    // --- Integration: retry count + retryStatusCodes ---

    it('retry:2, retryStatusCodes:[500], server always 503 → 1 call only', async () => {
        ;(mockAxios.request as unknown as Mock).mockRejectedValue(createAxiosError(503))

        const { result } = mountuseApi({ retry: 2, retryDelay: 500, retryStatusCodes: [500] })

        await result.execute()
        await vi.runAllTimersAsync()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        expect(result.error.value?.status).toBe(503)
    })

    it('retry:1, retryStatusCodes:[500], first attempt 500 then 200 → data set', async () => {
        ;(mockAxios.request as unknown as Mock)
            .mockRejectedValueOnce(createAxiosError(500))
            .mockResolvedValueOnce({ data: { user: 'Alice' }, status: 200 })

        const { result } = mountuseApi({ retry: 1, retryDelay: 500, retryStatusCodes: [500] })

        const p = result.execute()
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(500)
        await p

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(result.data.value).toEqual({ user: 'Alice' })
        expect(result.error.value).toBeNull()
    })
})

// ---------------------------------------------------------------------------
// debounce — DebounceCancelledError integration with useApi
// ---------------------------------------------------------------------------

describe('debounce — cancelled call side-effects', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('superseded execute() calls do NOT set error.value', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const { result } = mountuseApi({ debounce: 100, immediate: false })

        result.execute() // superseded
        result.execute() // superseded
        const last = result.execute()

        await vi.advanceTimersByTimeAsync(100)
        await last

        expect(result.error.value).toBeNull()
    })

    it('superseded execute() calls do NOT invoke the local onError callback', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const onError = vi.fn()
        const { result } = mountuseApi({ debounce: 100, immediate: false, onError })

        result.execute() // superseded
        const last = result.execute()

        await vi.advanceTimersByTimeAsync(100)
        await last

        expect(onError).not.toHaveBeenCalled()
    })

    it('superseded execute() calls do NOT invoke the global onError handler', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const globalOnError = vi.fn()
        const { result } = mountuseApi({ debounce: 100, immediate: false }, { onError: globalOnError })

        result.execute() // superseded
        const last = result.execute()

        await vi.advanceTimersByTimeAsync(100)
        await last

        expect(globalOnError).not.toHaveBeenCalled()
    })

    it('superseded execute() resolves with null (does not throw)', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const { result } = mountuseApi({ debounce: 100, immediate: false })

        const superseded = result.execute()
        result.execute() // supersedes the above

        await vi.advanceTimersByTimeAsync(100)
        await vi.advanceTimersByTimeAsync(0)

        // Must resolve with null — not throw DebounceCancelledError
        await expect(superseded).resolves.toBeNull()
    })

    it('loading is false after a superseded call (no request was made)', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })
        const { result } = mountuseApi({ debounce: 100, immediate: false })

        const superseded = result.execute()
        result.execute() // supersedes

        // Before the timer fires, the superseded call should already be settled
        await superseded

        expect(result.loading.value).toBe(false)
    })

    it('final execute() after debounce sets data correctly', async () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: { id: 99 }, status: 200 })
        const { result } = mountuseApi({ debounce: 100, immediate: false })

        result.execute() // superseded
        result.execute() // superseded
        const last = result.execute()

        await vi.advanceTimersByTimeAsync(100)
        await last

        expect(result.data.value).toEqual({ id: 99 })
        expect(result.error.value).toBeNull()
        expect(result.loading.value).toBe(false)
    })

    it.todo('debounce + polling — superseded debounce during active poll does not break poll timer')
    it.todo('debounce + watch — rapid ref changes produce single request; intermediate cancellation does not trigger watch error handler')
    it.todo('component unmount during debounce wait — no state updates after unmount (timer fires on unmounted component)')
})

describe('ignoreUpdates', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('suppresses watch-triggered execution when reactive ref changes inside ignoreUpdates', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: filter })

        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        result.ignoreUpdates(() => {
            filter.value = 'changed'
        })

        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('watch still triggers execute for changes made outside ignoreUpdates', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        mountuseApi({ watch: filter })

        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        filter.value = 'changed'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('actually runs the updater and applies reactive mutations', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: filter })

        result.ignoreUpdates(() => {
            filter.value = 'mutated'
        })

        expect(filter.value).toBe('mutated')
    })

    it('re-enables watch after ignoreUpdates completes', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: filter })

        result.ignoreUpdates(() => {
            filter.value = 'suppressed'
        })
        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        // Normal change after ignoreUpdates — should trigger execute
        filter.value = 'normal'
        await nextTick()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('suppresses multiple reactive changes in a single ignoreUpdates call', async () => {
        const page = ref(1)
        const search = ref('')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: [page, search] })

        result.ignoreUpdates(() => {
            page.value = 2
            search.value = 'john'
        })

        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('is safe to call when no watch option is configured — updater runs without error', () => {
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const sideEffect = ref(0)
        const { result } = mountuseApi({})

        expect(() => {
            result.ignoreUpdates(() => {
                sideEffect.value = 42
            })
        }).not.toThrow()

        expect(sideEffect.value).toBe(42)
    })

    it('resets the ignore flag even if the updater throws', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: filter })

        expect(() => {
            result.ignoreUpdates(() => {
                throw new Error('updater error')
            })
        }).toThrow('updater error')

        // Flag must be reset — subsequent watch changes should trigger execute
        filter.value = 'after-throw'
        await nextTick()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('allows manual execute() after ignoreUpdates to send a single request with new values', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as unknown as Mock).mockResolvedValue({ data: {}, status: 200 })

        const { result } = mountuseApi({ watch: filter })

        result.ignoreUpdates(() => {
            filter.value = 'batch-updated'
        })

        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        await result.execute()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})
