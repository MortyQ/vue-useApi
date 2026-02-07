import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { setupInterceptors } from './interceptors'
import { tokenManager } from './tokenManager'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

type MockAxiosInstance = AxiosInstance & Mock & {
    post: Mock;
    request: Mock;
    interceptors: {
        request: { use: Mock };
        response: { use: Mock };
    }
}

// Helper to create mocked axios instance
function createMockInstance(): MockAxiosInstance {
    const instance = {
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() }
        },
        defaults: { headers: { common: {} } },
        post: vi.fn(),
        // mock the call itself
        request: vi.fn()
    }
    // Make instance callable to simulate axios(config)
    const callable = vi.fn() as unknown as MockAxiosInstance
    Object.assign(callable, instance)
    return callable
}

describe('Interceptors', () => {
    let mockInstance: MockAxiosInstance
    let requestInterceptor: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
    let errorInterceptor: (error: unknown) => Promise<unknown>

    beforeEach(() => {
        vi.clearAllMocks()
        tokenManager.clearTokens()

        mockInstance = createMockInstance()
        setupInterceptors(mockInstance, { refreshUrl: '/refresh' })

        // Capture interceptors
        // request.use(success, error) - get the success handler (first arg)
        requestInterceptor = (mockInstance.interceptors.request.use as Mock).mock.calls[0][0]

        // response.use(success, error) - get the error handler (second arg)
        errorInterceptor = (mockInstance.interceptors.response.use as Mock).mock.calls[0][1]
    })

    it('should inject token into headers', () => {
        tokenManager.setTokens({ accessToken: 'valid-token' })

        const config = { headers: { set: vi.fn() } } as unknown as InternalAxiosRequestConfig

        requestInterceptor(config)

        expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer valid-token')
    })

    it('should NOT inject token if authMode is public', () => {
        tokenManager.setTokens({ accessToken: 'valid-token' })

        const config = { headers: { set: vi.fn() }, authMode: 'public' } as unknown as InternalAxiosRequestConfig

        requestInterceptor(config)

        expect(config.headers.set).not.toHaveBeenCalled()
    })

    it('should refresh token on 401', async () => {
        tokenManager.setTokens({ accessToken: 'expired' })

        const error = {
            config: { headers: { set: vi.fn() }, url: '/api', _retry: false },
            response: { status: 401 }
        }

        // Mock refresh success
        mockInstance.post.mockResolvedValue({
            data: { accessToken: 'new-token' }
        });

        // Setup mockInstance to return success on retry
        (mockInstance as unknown as Mock).mockResolvedValue('success')

        await errorInterceptor(error)

        expect(mockInstance.post).toHaveBeenCalledWith('/refresh', {}, expect.objectContaining({ authMode: 'public' }))
        expect(tokenManager.getAccessToken()).toBe('new-token')
        expect(mockInstance).toHaveBeenCalled() // The retry called
    })

    it('should queue requests while refreshing', async () => {
         tokenManager.setTokens({ accessToken: 'expired' })

         const error1 = {
             config: { headers: { set: vi.fn() }, url: '/api/1', _retry: false },
             response: { status: 401 }
         }
         const error2 = {
             config: { headers: { set: vi.fn() }, url: '/api/2', _retry: false },
             response: { status: 401 }
         }

         let resolveRefresh: (value: unknown) => void = () => {}
         const refreshPromise = new Promise(resolve => resolveRefresh = resolve)

         mockInstance.post.mockReturnValue(refreshPromise);
         (mockInstance as unknown as Mock).mockResolvedValue('success')

         // Trigger first 401 -> starts refresh
         const p1 = errorInterceptor(error1)

         // Trigger second 401 -> should be queued
         const p2 = errorInterceptor(error2)

         // Finish refresh
         resolveRefresh({ data: { accessToken: 'refreshed' } })

         await Promise.all([p1, p2])

         expect(mockInstance.post).toHaveBeenCalledTimes(1) // Only 1 refresh
         expect(mockInstance).toHaveBeenCalledTimes(2) // 2 retries
    })

    it('should logout on refresh failure', async () => {
        tokenManager.setTokens({ accessToken: 'expired' })

        const error = {
            config: { headers: { set: vi.fn() }, url: '/api', _retry: false },
            response: { status: 401 }
        }

        mockInstance.post.mockRejectedValue(new Error('Refresh failed'))
        const onRefreshFailed = vi.fn()

        // Re-setup to capture options
        vi.clearAllMocks()
        mockInstance = createMockInstance()
        setupInterceptors(mockInstance, {
            refreshUrl: '/refresh',
            onTokenRefreshFailed: onRefreshFailed
        })
        errorInterceptor = (mockInstance.interceptors.response.use as Mock).mock.calls[0][1]

        try {
            await errorInterceptor(error)
        } catch (e) {
            // expected
        }

        expect(tokenManager.getAccessToken()).toBeNull()
        expect(onRefreshFailed).toHaveBeenCalled()
    })
})

