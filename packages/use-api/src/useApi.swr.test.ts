/**
 * SWR (stale-while-revalidate via CacheOptions.swr) — full coverage
 *
 * Covers:
 *  - cache hit + swr: stale data returned immediately, revalidating: true
 *  - cache hit + swr: fresh data set when request resolves, revalidating: false
 *  - cache hit + swr: loading stays false throughout (no spinner)
 *  - cache hit + swr: onBefore is NOT called (silent background fetch)
 *  - cache hit + swr: onFinish IS called after background fetch
 *  - cache miss + swr: behaves like normal request (loading: true)
 *  - cache hit + swr disabled: returns stale data, no request (original behavior)
 *  - SWR error: revalidating resets to false, error is set
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import type { AxiosInstance } from 'axios'
import { useApi } from './useApi'
import { createApi } from './plugin'
import { clearAllCache } from './features/cacheManager'

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

type AnyUseApiReturn = ReturnType<typeof useApi>

function mountApi(options: Parameters<typeof useApi>[1]): AnyUseApiReturn {
    let api!: AnyUseApiReturn
    mount(
        defineComponent({
            setup() {
                api = useApi('/test', options)
                return () => null
            },
        }),
        { global: { plugins: [createApi({ axios: mockAxios })] } },
    )
    return api
}

function resolveWith(data: unknown, status = 200) {
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data, status })
}

function rejectWith(status: number, message: string) {
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        Object.assign(new Error(message), {
            isAxiosError: true,
            response: { status, data: { message } },
        }),
    )
}

describe('SWR (cache.swr: true) — cache hit', () => {
    it('returns stale data immediately without waiting for the request', async () => {
        resolveWith({ name: 'stale' })
        const first = mountApi({ cache: 'test', immediate: true })
        await first.execute()
        expect(first.data.value).toEqual({ name: 'stale' })

        resolveWith({ name: 'fresh' })
        const second = mountApi({ cache: { id: 'test', swr: true } })

        second.execute()

        expect(second.data.value).toEqual({ name: 'stale' })
    })

    it('revalidating is true while background request is in-flight', async () => {
        resolveWith('stale')
        const first = mountApi({ cache: 'test', immediate: true })
        await first.execute()

        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const second = mountApi({ cache: { id: 'test', swr: true } })
        second.execute()

        expect(second.revalidating.value).toBe(true)

        resolveHang({ data: 'fresh', status: 200 })
        await new Promise(r => setTimeout(r, 0))

        expect(second.revalidating.value).toBe(false)
    })

    it('loading stays false during revalidation (no spinner)', async () => {
        resolveWith('stale')
        const first = mountApi({ cache: 'test', immediate: true })
        await first.execute()

        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const second = mountApi({ cache: { id: 'test', swr: true } })
        second.execute()

        expect(second.loading.value).toBe(false)

        resolveHang({ data: 'fresh', status: 200 })
        await new Promise(r => setTimeout(r, 0))

        expect(second.loading.value).toBe(false)
    })

    it('data is updated to fresh value when background request completes', async () => {
        resolveWith('stale')
        const first = mountApi({ cache: 'test', immediate: true })
        await first.execute()

        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'test', swr: true } })
        await second.execute()

        expect(second.data.value).toBe('fresh')
    })

    it('revalidating is false after the background request completes', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'test', swr: true } })
        await second.execute()

        expect(second.revalidating.value).toBe(false)
    })

    it('onBefore is NOT called during revalidation (silent background fetch)', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        const onBefore = vi.fn()
        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'test', swr: true }, onBefore })
        await second.execute()

        expect(onBefore).not.toHaveBeenCalled()
    })

    it('onSuccess IS called with the fresh response', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        const onSuccess = vi.fn()
        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'test', swr: true }, onSuccess })
        await second.execute()

        expect(onSuccess).toHaveBeenCalledOnce()
        expect(onSuccess.mock.calls[0][0].data).toBe('fresh')
    })

    it('onFinish IS called after the background request completes', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        const onFinish = vi.fn()
        resolveWith('fresh')
        const second = mountApi({ cache: { id: 'test', swr: true }, onFinish })
        await second.execute()

        expect(onFinish).toHaveBeenCalledOnce()
    })
})

describe('SWR (cache.swr: true) — cache miss', () => {
    it('no cache entry: loading is true (normal request behavior)', async () => {
        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const api = mountApi({ cache: { id: 'test', swr: true } })
        api.execute()

        expect(api.loading.value).toBe(true)
        expect(api.revalidating.value).toBe(false)

        resolveHang({ data: 'fresh', status: 200 })
        await new Promise(r => setTimeout(r, 0))
    })

    it('no cache entry: onBefore IS called (normal request)', async () => {
        const onBefore = vi.fn()
        resolveWith('data')
        const api = mountApi({ cache: { id: 'test', swr: true }, onBefore })
        await api.execute()

        expect(onBefore).toHaveBeenCalledOnce()
    })
})

describe('SWR disabled (default)', () => {
    it('cache hit returns stale data and makes NO axios request', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        vi.resetAllMocks()

        const second = mountApi({ cache: 'test' }) // swr: false by default
        await second.execute()

        expect(mockAxios.request).not.toHaveBeenCalled()
        expect(second.data.value).toBe('stale')
    })

    it('revalidating is always false when SWR is disabled', async () => {
        resolveWith('stale')
        const api = mountApi({ cache: 'test', immediate: true })
        await api.execute()

        expect(api.revalidating.value).toBe(false)
    })
})

describe('SWR — error during revalidation', () => {
    it('revalidating resets to false when the background request fails', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        rejectWith(500, 'Server Error')
        const second = mountApi({ cache: { id: 'test', swr: true } })
        await second.execute()

        expect(second.revalidating.value).toBe(false)
    })

    it('stale data is preserved when revalidation fails', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        rejectWith(500, 'Server Error')
        const second = mountApi({ cache: { id: 'test', swr: true } })
        await second.execute()

        expect(second.data.value).toBe('stale')
    })

    it('error is set when revalidation fails', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        rejectWith(503, 'Unavailable')
        const second = mountApi({
            cache: { id: 'test', swr: true },
            skipErrorNotification: true,
        })
        await second.execute()

        expect(second.error.value).not.toBeNull()
        expect(second.error.value?.status).toBe(503)
    })

    it('loading stays false when revalidation fails', async () => {
        resolveWith('stale')
        await mountApi({ cache: 'test', immediate: true }).execute()

        rejectWith(500, 'Error')
        const second = mountApi({ cache: { id: 'test', swr: true }, skipErrorNotification: true })
        await second.execute()

        expect(second.loading.value).toBe(false)
    })
})
