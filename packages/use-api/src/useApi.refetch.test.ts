/**
 * useApi — refetchOnFocus + refetchOnReconnect integration tests
 *
 * Tests end-to-end behavior through useApi, not the composable directly.
 * Browser events are dispatched via happy-dom's event system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import type { AxiosInstance } from 'axios'
import { useApi } from './useApi'
import { createApi } from './plugin'
import { clearAllCache } from './features/cacheManager'

enableAutoUnmount(afterEach)

// ---------------------------------------------------------------------------
// Shared mock
// ---------------------------------------------------------------------------

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
} as unknown as AxiosInstance

beforeEach(() => {
    vi.resetAllMocks()
    clearAllCache()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnyUseApiReturn = ReturnType<typeof useApi>

function mountApi(
    options: Parameters<typeof useApi>[1],
    globalOptions?: { refetchOnFocus?: boolean | { throttle?: number }; refetchOnReconnect?: boolean },
): AnyUseApiReturn {
    let api!: AnyUseApiReturn
    mount(
        defineComponent({
            setup() {
                api = useApi('/test', options)
                return () => null
            },
        }),
        {
            global: {
                plugins: [createApi({ axios: mockAxios, globalOptions })],
            },
        },
    )
    return api
}

function resolveWith(data: unknown, status = 200) {
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data, status })
}

function simulateFocus() {
    document.dispatchEvent(new Event('visibilitychange'))
}

function simulateOnline() {
    window.dispatchEvent(new Event('online'))
}

function flush(): Promise<void> {
    return new Promise(r => setTimeout(r, 0))
}

// ---------------------------------------------------------------------------
// refetchOnFocus
// ---------------------------------------------------------------------------

describe('useApi — refetchOnFocus', () => {
    it('re-fetches when tab becomes visible (throttle: 0)', async () => {
        resolveWith('first')
        const api = mountApi({ refetchOnFocus: { throttle: 0 }, immediate: true })
        await flush()

        expect(api.data.value).toBe('first')
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        resolveWith('second')
        simulateFocus()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(api.data.value).toBe('second')
    })

    it('does NOT re-fetch within throttle window after a successful request', async () => {
        // Default throttle is 60s — after an immediate request, focus should be suppressed
        resolveWith('first')
        const api = mountApi({ refetchOnFocus: true, immediate: true })
        await flush()

        vi.clearAllMocks()
        simulateFocus()
        await flush()

        expect(mockAxios.request).not.toHaveBeenCalled()
        expect(api.data.value).toBe('first')
    })

    it('works with lazy: true — focus triggers a fetch even without auto-tracking', async () => {
        resolveWith('first')
        const api = mountApi({ refetchOnFocus: { throttle: 0 }, lazy: true })
        await api.execute()

        resolveWith('second')
        simulateFocus()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(api.data.value).toBe('second')
    })

    it('works with cache + swr: true — instant stale data + background revalidation on focus', async () => {
        resolveWith('stale')
        const first = mountApi({ cache: 'shared', immediate: true })
        await flush()

        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'shared', swr: true }, refetchOnFocus: { throttle: 0 } })
        simulateFocus()

        // SWR: stale data immediately
        expect(second.data.value).toBe('stale')
        expect(second.revalidating.value).toBe(true)

        await flush()

        expect(second.data.value).toBe('fresh')
        expect(second.revalidating.value).toBe(false)
    })

    it('does NOT re-fetch if loading is already true when focus fires', async () => {
        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const api = mountApi({ refetchOnFocus: { throttle: 0 } })
        api.execute() // in-flight

        expect(api.loading.value).toBe(true)

        simulateFocus()
        await flush()

        // Only one request in-flight, focus was skipped
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        resolveHang({ data: 'done', status: 200 })
        await flush()
    })

    it('does NOT fire duplicate request when both poll and refetchOnFocus are active on tab focus', async () => {
        // Both poll's visibilitychange handler and useRefetchTriggers' handler fire on focus.
        // The !loading guard on useRefetchTriggers prevents duplicate requests.
        let resolveFirst!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveFirst = resolve }),
        )

        const api = mountApi({ refetchOnFocus: { throttle: 0 }, poll: 30_000 })
        api.execute() // in-flight

        expect(api.loading.value).toBe(true)

        // Tab becomes visible while request is in-flight
        simulateFocus()
        await flush()

        // Both handlers fired, but useRefetchTriggers blocked because loading: true
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        resolveFirst({ data: 'done', status: 200 })
        await flush()
    })
})

// ---------------------------------------------------------------------------
// refetchOnReconnect
// ---------------------------------------------------------------------------

describe('useApi — refetchOnReconnect', () => {
    it('re-fetches when network comes online', async () => {
        resolveWith('first')
        const api = mountApi({ refetchOnReconnect: true, immediate: true })
        await flush()

        resolveWith('second')
        simulateOnline()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
        expect(api.data.value).toBe('second')
    })

    it('does NOT re-fetch if loading is true when online fires', async () => {
        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const api = mountApi({ refetchOnReconnect: true })
        api.execute()

        expect(api.loading.value).toBe(true)

        simulateOnline()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        resolveHang({ data: 'done', status: 200 })
        await flush()
    })
})

// ---------------------------------------------------------------------------
// Global options
// ---------------------------------------------------------------------------

describe('useApi — global refetchOnFocus / refetchOnReconnect', () => {
    it('applies global refetchOnFocus to all instances', async () => {
        resolveWith('first')
        mountApi({ immediate: true }, { refetchOnFocus: { throttle: 0 } })
        await flush()

        resolveWith('second')
        simulateFocus()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('per-request refetchOnFocus: false overrides global true', async () => {
        resolveWith('first')
        mountApi(
            { refetchOnFocus: false, immediate: true },
            { refetchOnFocus: { throttle: 0 } },
        )
        await flush()

        vi.clearAllMocks()
        simulateFocus()
        await flush()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('applies global refetchOnReconnect to all instances', async () => {
        resolveWith('first')
        mountApi({ immediate: true }, { refetchOnReconnect: true })
        await flush()

        resolveWith('second')
        simulateOnline()
        await flush()

        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })
})
