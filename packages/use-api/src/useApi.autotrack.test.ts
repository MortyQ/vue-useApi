/**
 * useApi — auto-tracking
 *
 * When url/params/data contain reactive dependencies, useApi automatically
 * re-fetches when those deps change. No explicit `watch` option needed.
 *
 * Covers:
 *  - reactive params getter → triggers re-fetch on dep change
 *  - reactive url getter → triggers re-fetch on dep change
 *  - reactive data getter → triggers re-fetch on dep change
 *  - two synchronous ref changes in same getter → one request (flush: 'pre' batching)
 *  - static (non-reactive) params → no spurious re-fetches
 *  - lazy: true → dep changes do NOT trigger re-fetch
 *  - lazy: true + immediate: true → fetches on mount, NOT on dep changes
 *  - lazy: true — execute() manually still works
 *  - immediate: true → fetch on mount + fetch on dep change
 *  - immediate: false (default) → no fetch on mount, fetch on dep change
 *  - debounce + auto-tracking → rapid changes collapse into one request
 *  - ignoreUpdates pauses tracking scope → no request fires
 *  - after ignoreUpdates → next change fires normally
 *  - lazy: true + ignoreUpdates → updater runs, no error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { AxiosInstance } from 'axios'
import { useApi } from './useApi'
import { createApi } from './plugin'
import type { UseApiOptions } from './types'

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
} as unknown as AxiosInstance

beforeEach(() => vi.resetAllMocks())

type AnyReturn = ReturnType<typeof useApi>

function mountApi(options: UseApiOptions = {}): AnyReturn {
    let api!: AnyReturn
    mount(
        defineComponent({
            setup() {
                api = useApi('test-url', options)
                return () => null
            },
        }),
        { global: { plugins: [createApi({ axios: mockAxios })] } },
    )
    return api
}

function mountApiWithUrl(url: Parameters<typeof useApi>[0], options: UseApiOptions = {}): AnyReturn {
    let api!: AnyReturn
    mount(
        defineComponent({
            setup() {
                api = useApi(url, options)
                return () => null
            },
        }),
        { global: { plugins: [createApi({ axios: mockAxios })] } },
    )
    return api
}

function successOnce() {
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: 'ok', status: 200 })
}

// ---------------------------------------------------------------------------
// Auto-tracking: params
// ---------------------------------------------------------------------------

describe('useApi — auto-tracking via params', () => {
    it('re-fetches when a reactive param dep changes', async () => {
        const search = ref('a')
        successOnce()
        mountApi({ params: () => ({ q: search.value }) })

        vi.clearAllMocks()
        successOnce()
        search.value = 'b'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('two synchronous ref changes in same params getter fire ONE request (flush: pre batching)', async () => {
        const a = ref(1)
        const b = ref(2)
        successOnce()
        mountApi({ params: () => ({ a: a.value, b: b.value }) })

        vi.clearAllMocks()
        successOnce()
        a.value = 10
        b.value = 20
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('static (non-reactive) params do not cause spurious re-fetches', async () => {
        mountApi({ params: { q: 'static' } })

        vi.clearAllMocks()
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// Auto-tracking: url
// ---------------------------------------------------------------------------

describe('useApi — auto-tracking via url', () => {
    it('re-fetches when reactive url dep changes', async () => {
        const id = ref(1)
        successOnce()
        mountApiWithUrl(() => `/items/${id.value}`)

        vi.clearAllMocks()
        successOnce()
        id.value = 2
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// Auto-tracking: data
// ---------------------------------------------------------------------------

describe('useApi — auto-tracking via data', () => {
    it('re-fetches when a reactive data dep changes', async () => {
        const payload = ref({ name: 'Alice' })
        successOnce()
        mountApi({ method: 'POST', data: () => payload.value })

        vi.clearAllMocks()
        successOnce()
        payload.value = { name: 'Bob' }
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// lazy: true
// ---------------------------------------------------------------------------

describe('useApi — lazy: true', () => {
    it('dep change does NOT trigger a request', async () => {
        const search = ref('a')
        mountApi({ params: () => ({ q: search.value }), lazy: true })

        vi.clearAllMocks()
        search.value = 'b'
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('immediate: true fetches on mount but NOT on dep change', async () => {
        const search = ref('a')
        successOnce()
        mountApi({ params: () => ({ q: search.value }), lazy: true, immediate: true })
        await nextTick()

        vi.clearAllMocks()
        search.value = 'b'
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('execute() still works manually', async () => {
        const api = mountApi({ lazy: true })

        successOnce()
        await api.execute()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// immediate + auto-tracking
// ---------------------------------------------------------------------------

describe('useApi — immediate + auto-tracking', () => {
    it('immediate: true fetches on mount AND on dep change', async () => {
        const search = ref('a')
        successOnce()
        mountApi({ params: () => ({ q: search.value }), immediate: true })
        await nextTick()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)

        successOnce()
        search.value = 'b'
        await nextTick()
        expect(mockAxios.request).toHaveBeenCalledTimes(2)
    })

    it('immediate: false (default) — no fetch on mount, fetches on dep change', async () => {
        const search = ref('a')
        mountApi({ params: () => ({ q: search.value }) })
        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        successOnce()
        search.value = 'b'
        await nextTick()
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// debounce + auto-tracking
// ---------------------------------------------------------------------------

describe('useApi — debounce + auto-tracking', () => {
    it('rapid param changes are collapsed into one request by debounce', async () => {
        vi.useFakeTimers()
        const search = ref('a')
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'ok', status: 200 })
        mountApi({ params: () => ({ q: search.value }), debounce: 100 })

        search.value = 'b'
        search.value = 'c'
        search.value = 'd'
        await nextTick()
        expect(mockAxios.request).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(150)
        expect(mockAxios.request).toHaveBeenCalledTimes(1)
        vi.useRealTimers()
    })
})

// ---------------------------------------------------------------------------
// ignoreUpdates with effectScope.pause/resume
// ---------------------------------------------------------------------------

describe('useApi — ignoreUpdates (auto-tracking)', () => {
    it('change inside ignoreUpdates does NOT trigger a request', async () => {
        const search = ref('a')
        const api = mountApi({ params: () => ({ q: search.value }) })

        vi.clearAllMocks()
        api.ignoreUpdates(() => { search.value = 'b' })
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('updater still executes (side effects happen)', () => {
        const search = ref('a')
        const api = mountApi({ params: () => ({ q: search.value }) })

        api.ignoreUpdates(() => { search.value = 'mutated' })

        expect(search.value).toBe('mutated')
    })

    it('after ignoreUpdates, subsequent dep change fires normally', async () => {
        const search = ref('a')
        const api = mountApi({ params: () => ({ q: search.value }) })

        api.ignoreUpdates(() => { search.value = 'b' })
        vi.clearAllMocks()

        successOnce()
        search.value = 'c'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('scope resumes even if updater throws', async () => {
        const search = ref('a')
        const api = mountApi({ params: () => ({ q: search.value }) })

        expect(() => {
            api.ignoreUpdates(() => { throw new Error('boom') })
        }).toThrow('boom')

        vi.clearAllMocks()
        successOnce()
        search.value = 'c'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })

    it('lazy: true + ignoreUpdates — updater runs, no error', () => {
        const search = ref('a')
        const api = mountApi({ params: () => ({ q: search.value }), lazy: true })

        expect(() => api.ignoreUpdates(() => { search.value = 'b' })).not.toThrow()
        expect(search.value).toBe('b')
    })
})
