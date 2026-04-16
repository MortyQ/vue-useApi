/**
 * select option — full coverage
 *
 * Covers:
 *  - select transforms data before storing in data.value
 *  - execute() return value is the selected value
 *  - select is applied on every re-fetch (polling / watch / manual)
 *  - select is applied to cache-hit data (raw is stored, selected is returned)
 *  - select is applied to SWR background revalidation result
 *  - without select, data.value equals raw response data
 *  - onSuccess receives the raw AxiosResponse, not the selected value
 *  - select does not affect loading / error / revalidating state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { useApi } from './useApi'
import type { UseApiOptions } from './types'
import { createApi } from './plugin'
import { clearAllCache } from './features/cacheManager'

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

type RawUser = { id: number; first: string; last: string }
type User = { id: number; fullName: string }

function resolveWith(data: unknown, status = 200) {
    ;(mockAxios.request as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data, status })
}

function mountSelect<T, TSelected>(
    selectFn: (data: T) => TSelected,
    extra: Omit<NonNullable<Parameters<typeof useApi>[1]>, 'select'> = {},
) {
    let api!: ReturnType<typeof useApi<T, unknown, TSelected>>
    mount(
        defineComponent({
            setup() {
                api = useApi<T, unknown, TSelected>('/test', { select: selectFn, ...extra } as UseApiOptions<T, unknown, TSelected>)
                return () => null
            },
        }),
        { global: { plugins: [createApi({ axios: mockAxios })] } },
    )
    return api
}

// ---------------------------------------------------------------------------
// Basic transformation
// ---------------------------------------------------------------------------

describe('select — basic transformation', () => {
    it('data.value contains the selected value, not the raw response', async () => {
        const raw: RawUser[] = [{ id: 1, first: 'John', last: 'Doe' }]
        resolveWith(raw)

        const api = mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
        )
        await api.execute()

        expect(api.data.value).toEqual([{ id: 1, fullName: 'John Doe' }])
    })

    it('execute() returns the selected value', async () => {
        resolveWith([1, 2, 3])
        const api = mountSelect<number[], number>((arr) => arr.length)
        const result = await api.execute()

        expect(result).toBe(3)
    })

    it('without select, data.value equals raw response data', async () => {
        resolveWith({ name: 'Alice' })
        let api!: ReturnType<typeof useApi>
        mount(
            defineComponent({
                setup() {
                    api = useApi('/test')
                    return () => null
                },
            }),
            { global: { plugins: [createApi({ axios: mockAxios })] } },
        )
        await api.execute()

        expect(api.data.value).toEqual({ name: 'Alice' })
    })

    it('select extracting a nested field', async () => {
        resolveWith({ data: [1, 2, 3], meta: { total: 3 } })
        const api = mountSelect<{ data: number[]; meta: { total: number } }, number[]>(
            (res) => res.data,
        )
        await api.execute()

        expect(api.data.value).toEqual([1, 2, 3])
    })

    it('select returning a single item from a list', async () => {
        resolveWith([{ id: 1 }, { id: 2 }, { id: 3 }])
        const api = mountSelect<{ id: number }[], { id: number } | null>(
            (items) => items.find(i => i.id === 2) ?? null,
        )
        await api.execute()

        expect(api.data.value).toEqual({ id: 2 })
    })
})

// ---------------------------------------------------------------------------
// select is re-applied on every fetch
// ---------------------------------------------------------------------------

describe('select — applied on every re-fetch', () => {
    it('select is applied on the second execute() call', async () => {
        const selectFn = vi.fn((n: number) => n * 10)

        resolveWith(5)
        const api = mountSelect<number, number>(selectFn)
        await api.execute()
        expect(api.data.value).toBe(50)

        resolveWith(7)
        await api.execute()
        expect(api.data.value).toBe(70)

        expect(selectFn).toHaveBeenCalledTimes(2)
    })
})

// ---------------------------------------------------------------------------
// onSuccess receives raw response
// ---------------------------------------------------------------------------

describe('select — onSuccess receives raw AxiosResponse', () => {
    it('onSuccess is called with the raw response, not the selected value', async () => {
        const raw = [{ id: 1, first: 'A', last: 'B' }]
        resolveWith(raw)

        let capturedResponse!: AxiosResponse<RawUser[]>
        const api = mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
            {
                onSuccess: (res) => {
                    capturedResponse = res as AxiosResponse<RawUser[]>
                },
            },
        )
        await api.execute()

        expect(capturedResponse.data).toEqual(raw)
    })
})

// ---------------------------------------------------------------------------
// select + cache: raw is stored, selected is returned
// ---------------------------------------------------------------------------

describe('select — cache stores raw, select is re-applied on cache hit', () => {
    it('cache hit: select is applied to the cached raw data', async () => {
        const raw: RawUser[] = [{ id: 1, first: 'Jane', last: 'Smith' }]
        resolveWith(raw)

        // First request — populates cache with raw data
        const first = mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
            { cache: 'users' },
        )
        await first.execute()

        vi.resetAllMocks()

        // Second request — cache hit, no axios call, select re-applied
        const second = mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
            { cache: 'users' },
        )
        await second.execute()

        expect(mockAxios.request).not.toHaveBeenCalled()
        expect(second.data.value).toEqual([{ id: 1, fullName: 'Jane Smith' }])
    })

    it('cache hit + SWR: stale selected data returned immediately, then fresh selected data', async () => {
        const staleRaw: RawUser[] = [{ id: 1, first: 'Old', last: 'Name' }]
        const freshRaw: RawUser[] = [{ id: 1, first: 'New', last: 'Name' }]

        resolveWith(staleRaw)
        await mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
            { cache: 'users', immediate: true },
        ).execute()

        resolveWith(freshRaw)
        const second = mountSelect<RawUser[], User[]>(
            (users) => users.map(u => ({ id: u.id, fullName: `${u.first} ${u.last}` })),
            { cache: 'users', staleWhileRevalidate: true },
        )

        second.execute()

        // Synchronously: stale selected data
        expect(second.data.value).toEqual([{ id: 1, fullName: 'Old Name' }])

        await new Promise(r => setTimeout(r, 0))

        // After revalidation: fresh selected data
        expect(second.data.value).toEqual([{ id: 1, fullName: 'New Name' }])
    })
})

// ---------------------------------------------------------------------------
// select does not affect error / loading state
// ---------------------------------------------------------------------------

describe('select — does not affect loading or error state', () => {
    it('loading transitions are unchanged when select is provided', async () => {
        let resolveHang!: (v: unknown) => void
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockReturnValueOnce(
            new Promise(resolve => { resolveHang = resolve }),
        )

        const api = mountSelect<number, string>((n) => String(n))
        api.execute()

        expect(api.loading.value).toBe(true)

        resolveHang({ data: 42, status: 200 })
        await new Promise(r => setTimeout(r, 0))

        expect(api.loading.value).toBe(false)
        expect(api.data.value).toBe('42')
    })

    it('error state is set normally when select is provided and request fails', async () => {
        ;(mockAxios.request as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            Object.assign(new Error('fail'), {
                isAxiosError: true,
                response: { status: 500, data: { message: 'fail' } },
            }),
        )

        const api = mountSelect<number, string>((n) => String(n), { skipErrorNotification: true })
        await api.execute()

        expect(api.error.value).not.toBeNull()
        expect(api.error.value?.status).toBe(500)
        expect(api.data.value).toBeNull()
    })
})
