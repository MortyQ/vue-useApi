import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApi } from './useApi'
import { createApi } from './plugin'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick, MaybeRefOrGetter } from 'vue'
import type { AxiosInstance } from 'axios'

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
    },
    defaults: { headers: { common: {} } }
} as unknown as AxiosInstance

// Helper to run useApi within an injection context
function mountuseApi<T = any>(options: any = {}, apiOptions: any = {}, url?: MaybeRefOrGetter<string | undefined>) {
    let result: any

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

    return { result, wrapper }
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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockRejectedValue(error)

        const { result } = mountuseApi({ immediate: true })

        await nextTick()
        await vi.runAllTimersAsync()

        expect(result.error.value).toBeTruthy()
        expect(result.loading.value).toBe(false)
    })

    it('should re-fetch when watched source changes', async () => {
        const filter = ref('initial')
        ;(mockAxios.request as any).mockResolvedValue({ data: {}, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: {}, status: 200 })
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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: responseData, status: 200 })

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
        ;(mockAxios.request as any).mockResolvedValue({ data: { id: 123 }, status: 200 })

        await result.execute()

        expect(mockAxios.request).toHaveBeenCalledWith(expect.objectContaining({
            url: "/users/123",
            method: "GET"
        }))
    });



})
