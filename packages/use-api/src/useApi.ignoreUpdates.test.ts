/**
 * useApi — ignoreUpdates & useGlobalAbort
 *
 * ignoreUpdates covers:
 *  - suppresses auto-tracking when ref changes inside updater
 *  - the updater still executes (side effects happen)
 *  - after ignoreUpdates, subsequent dep changes trigger normally
 *  - multiple refs changed inside one ignoreUpdates → still suppressed
 *  - scope resumes even if updater throws
 *
 * useGlobalAbort covers:
 *  - when useGlobalAbort: true (default), a global abort() cancels the in-flight request
 *  - when useGlobalAbort: false, global abort() does NOT cancel the request
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { AxiosInstance } from 'axios'
import { useApi } from './useApi'
import { useAbortController } from './composables/useAbortController'
import { createApi } from './plugin'

const mockAxios = {
    request: vi.fn(),
    interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
} as unknown as AxiosInstance

beforeEach(() => vi.resetAllMocks())

type AnyUseApiReturn = ReturnType<typeof useApi>

function mountWithParams(filter: ReturnType<typeof ref>): AnyUseApiReturn {
    let api!: AnyUseApiReturn
    mount(
        defineComponent({
            setup() {
                api = useApi('/test', { params: () => ({ q: filter.value }) })
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
// ignoreUpdates
// ---------------------------------------------------------------------------

describe('useApi — ignoreUpdates', () => {
    it('ref change inside ignoreUpdates does NOT trigger a request', async () => {
        const filter = ref('a')
        const api = mountWithParams(filter)

        vi.clearAllMocks()
        api.ignoreUpdates(() => { filter.value = 'b' })
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('normal ref change outside ignoreUpdates triggers a request', async () => {
        const filter = ref('a')
        mountWithParams(filter)

        vi.clearAllMocks()
        successOnce()
        filter.value = 'c'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledOnce()
    })

    it('ignoreUpdates() still executes the updater function', () => {
        const filter = ref('original')
        const api = mountWithParams(filter)

        api.ignoreUpdates(() => { filter.value = 'mutated' })

        expect(filter.value).toBe('mutated')
    })

    it('after ignoreUpdates, subsequent ref changes trigger normally', async () => {
        const filter = ref('a')
        const api = mountWithParams(filter)

        api.ignoreUpdates(() => { filter.value = 'b' })
        vi.clearAllMocks()

        successOnce()
        filter.value = 'c'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledOnce()
    })

    it('multiple refs changed inside one ignoreUpdates are all suppressed', async () => {
        const a = ref(1)
        const b = ref(2)
        let api!: AnyUseApiReturn
        mount(
            defineComponent({
                setup() {
                    api = useApi('/test', { params: () => ({ a: a.value, b: b.value }) })
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )

        vi.clearAllMocks()
        api.ignoreUpdates(() => {
            a.value = 10
            b.value = 20
        })
        await nextTick()

        expect(mockAxios.request).not.toHaveBeenCalled()
    })

    it('ignoreUpdates is a no-op when lazy: true — updater still runs', () => {
        let api!: AnyUseApiReturn
        mount(
            defineComponent({
                setup() {
                    api = useApi('/test', { lazy: true })
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )

        expect(() => api.ignoreUpdates(() => {})).not.toThrow()
    })

    it('scope resumes even if updater throws — next change fires normally', async () => {
        const filter = ref('a')
        const api = mountWithParams(filter)

        expect(() => {
            api.ignoreUpdates(() => { throw new Error('updater error') })
        }).toThrow('updater error')

        vi.clearAllMocks()
        successOnce()
        filter.value = 'after-throw'
        await nextTick()

        expect(mockAxios.request).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// useGlobalAbort (unchanged)
// ---------------------------------------------------------------------------

describe('useApi — useGlobalAbort', () => {
    it('global abort() cancels a request with useGlobalAbort: true (default)', () => {
        const { abort, getSignal } = useAbortController()
        const globalSignal = getSignal()

        let capturedSignal: AbortSignal | undefined
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockImplementation((cfg: any) => {
            capturedSignal = cfg.signal
            return new Promise(() => {})
        })

        mount(
            defineComponent({
                setup() {
                    useApi('/test', { useGlobalAbort: true, immediate: true })
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )

        expect(capturedSignal).toBeDefined()
        expect(capturedSignal!.aborted).toBe(false)

        abort()

        expect(globalSignal.aborted).toBe(true)
        expect(capturedSignal!.aborted).toBe(true)
    })

    it('useGlobalAbort: false — global abort does NOT cancel the request', () => {
        const { abort } = useAbortController()

        let capturedSignal: AbortSignal | undefined
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockImplementation((cfg: any) => {
            capturedSignal = cfg.signal
            return new Promise(() => {})
        })

        let api!: AnyUseApiReturn
        mount(
            defineComponent({
                setup() {
                    api = useApi('/test', { useGlobalAbort: false })
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )

        api.execute()
        expect(capturedSignal).toBeDefined()
        abort()

        expect(capturedSignal!.aborted).toBe(false)
    })
})
