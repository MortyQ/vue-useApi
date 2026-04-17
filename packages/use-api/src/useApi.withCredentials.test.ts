/**
 * withCredentials — per-request override
 *
 * withCredentials is inherited from AxiosRequestConfig and flows through
 * to axios.request() via the axiosConfig spread. These tests verify that
 * the value is forwarded correctly and that library-only options (cache,
 * invalidateCache, watch) are NOT passed to axios.
 *
 * Covers:
 *  - withCredentials: true is forwarded to axios
 *  - withCredentials: false is forwarded to axios
 *  - omitting withCredentials does not set it (axios uses instance default)
 *  - library-only options (cache, invalidateCache, watch) are NOT sent to axios
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import type { AxiosInstance } from 'axios'
import { useApi } from './useApi'
import { createApi } from './plugin'

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

beforeEach(() => vi.resetAllMocks())

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountAndExecute(options: Parameters<typeof useApi>[1]) {
    let capturedConfig: Record<string, unknown> | undefined
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockImplementationOnce((cfg: any) => {
        capturedConfig = cfg
        return Promise.resolve({ data: null, status: 200 })
    })

    let api!: ReturnType<typeof useApi>
    mount(
        defineComponent({
            setup() {
                api = useApi('/test', options)
                return () => null
            },
        }),
        { global: { plugins: [createApi({ axios: mockAxios })] } },
    )

    return api.execute().then(() => capturedConfig!)
}

// ---------------------------------------------------------------------------
// withCredentials forwarding
// ---------------------------------------------------------------------------

describe('useApi — withCredentials forwarding', () => {
    it('withCredentials: true is passed to axios.request()', async () => {
        const cfg = await mountAndExecute({ withCredentials: true })
        expect(cfg.withCredentials).toBe(true)
    })

    it('withCredentials: false is passed to axios.request()', async () => {
        const cfg = await mountAndExecute({ withCredentials: false })
        expect(cfg.withCredentials).toBe(false)
    })

    it('omitting withCredentials does not set it (axios uses instance default)', async () => {
        const cfg = await mountAndExecute({})
        expect(cfg.withCredentials).toBeUndefined()
    })

    it('withCredentials: true can be overridden per execute() call', async () => {
        let capturedConfig: Record<string, unknown> | undefined
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockImplementation((cfg: any) => {
            capturedConfig = cfg
            return Promise.resolve({ data: null, status: 200 })
        })

        let api!: ReturnType<typeof useApi>
        mount(
            defineComponent({
                setup() {
                    // Global option: withCredentials: true
                    api = useApi('/test', { withCredentials: true })
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )

        // Override per-call to false
        await api.execute({ withCredentials: false })
        expect(capturedConfig?.withCredentials).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Library-only options must NOT reach axios
// ---------------------------------------------------------------------------

describe('useApi — library options not forwarded to axios', () => {
    it('cache option is not sent to axios', async () => {
        const cfg = await mountAndExecute({ cache: 'my-cache-key' })
        expect(cfg).not.toHaveProperty('cache')
    })

    it('invalidateCache option is not sent to axios', async () => {
        const cfg = await mountAndExecute({ invalidateCache: 'my-cache-key' })
        expect(cfg).not.toHaveProperty('invalidateCache')
    })

    // Note: the `watch` option was removed in v1.0 (replaced by auto-tracking).
    // TypeScript prevents passing it — no runtime stripping needed.
})
