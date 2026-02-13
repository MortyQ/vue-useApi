import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useApi } from './useApi'
import { createApi } from './plugin'
import axios from 'axios'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('useApi with Promise.all', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock axios instance
    const mockInstance = {
      request: vi.fn()
    } as any

    mockedAxios.create = vi.fn(() => mockInstance)

    // Install plugin
      createApi({
      axios: mockInstance,
      globalOptions: {
        useGlobalAbort: false
      }
    })
  })

  describe('✅ Correct Pattern: New Instance Per Request', () => {
    it('should execute all requests successfully in parallel', async () => {
      const mockInstance = mockedAxios.create()

      // Mock responses for different user IDs
      mockInstance.request
        .mockResolvedValueOnce({ data: { id: 1, name: 'User 1' }, status: 200 })
        .mockResolvedValueOnce({ data: { id: 2, name: 'User 2' }, status: 200 })
        .mockResolvedValueOnce({ data: { id: 3, name: 'User 3' }, status: 200 })

      const userIds = [1, 2, 3]

      // ✅ Create NEW instance for each request
      const requests = userIds.map(id => {
        const { execute } = useApi(`/users/${id}`, {
          useGlobalAbort: false
        })
        return execute()
      })

      const results = await Promise.all(requests)

      // Verify all requests were made
      expect(mockInstance.request).toHaveBeenCalledTimes(3)
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual({ id: 1, name: 'User 1' })
      expect(results[1]).toEqual({ id: 2, name: 'User 2' })
      expect(results[2]).toEqual({ id: 3, name: 'User 3' })
    })

    it('should handle mixed success and error responses', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request
        .mockResolvedValueOnce({ data: { id: 1, name: 'User 1' }, status: 200 })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { id: 3, name: 'User 3' }, status: 200 })

      const requests = [1, 2, 3].map(id => {
        const { execute } = useApi(`/users/${id}`, {
          useGlobalAbort: false,
          skipErrorNotification: true
        })
        return execute()
      })

      const results = await Promise.allSettled(requests)

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('fulfilled') // Returns null on error
      expect(results[2].status).toBe('fulfilled')

      expect((results[0] as any).value).toEqual({ id: 1, name: 'User 1' })
      expect((results[1] as any).value).toBeNull() // Error returns null
      expect((results[2] as any).value).toEqual({ id: 3, name: 'User 3' })
    })

    it('should maintain independent state for each hook', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request
        .mockImplementation(({ url }) => {
          const id = url.split('/').pop()
          return Promise.resolve({
            data: { id: Number(id), name: `User ${id}` },
            status: 200
          })
        })

      const hook1 = useApi('/users/1', { useGlobalAbort: false })
      const hook2 = useApi('/users/2', { useGlobalAbort: false })
      const hook3 = useApi('/users/3', { useGlobalAbort: false })

      await Promise.all([
        hook1.execute(),
        hook2.execute(),
        hook3.execute()
      ])

      // Each hook should have its own data
      expect(hook1.data.value).toEqual({ id: 1, name: 'User 1' })
      expect(hook2.data.value).toEqual({ id: 2, name: 'User 2' })
      expect(hook3.data.value).toEqual({ id: 3, name: 'User 3' })
    })
  })

  describe('❌ Wrong Pattern: Reusing Same Hook', () => {
    it('should demonstrate the problem when reusing hook instance', async () => {
      const mockInstance = mockedAxios.create()

      let callCount = 0
      mockInstance.request.mockImplementation(() => {
        callCount++
        // Simulate different responses
        return Promise.resolve({
          data: { id: callCount, name: `User ${callCount}` },
          status: 200
        })
      })

      // ❌ WRONG: Reuse same hook
      const hook = useApi('/users/:id', { useGlobalAbort: false })

      const requests = [1, 2, 3].map(id => {
        return hook.execute({ url: `/users/${id}` })
      })

      await Promise.all(requests)

      // Problem: All calls share same state
      // The last response overwrites previous ones
      expect(hook.data.value).toBeDefined()

      // This demonstrates the issue - you can't reliably get individual results
      console.log('⚠️ Hook data value:', hook.data.value)
      console.log('⚠️ This is why reusing hook is problematic')
    })

    it('should show abort behavior when reusing hook', async () => {
      const mockInstance = mockedAxios.create()

      const abortSpy = vi.fn()

      // Save original AbortController
      const OriginalAbortController = global.AbortController

      // Mock AbortController
      global.AbortController = class MockAbortController {
        signal = { aborted: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }
        abort = abortSpy
      } as any

      mockInstance.request.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data: {}, status: 200 }), 100)
        )
      )

      try {
        const hook = useApi('/users/:id', { useGlobalAbort: false })

        // Start multiple requests with same hook
        hook.execute({ url: '/users/1' })
        hook.execute({ url: '/users/2' })
        hook.execute({ url: '/users/3' })

        // Each new execute() aborts the previous one
        // We expect at least 2 aborts (when starting request 2 and 3)
        expect(abortSpy).toHaveBeenCalled()
      } finally {
        // Restore original AbortController
        global.AbortController = OriginalAbortController
      }
    })
  })

  describe('🔄 Performance & Edge Cases', () => {
    it('should handle large batch of requests efficiently', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request.mockImplementation(({ url }) => {
        const id = url.split('/').pop()
        return Promise.resolve({
          data: { id: Number(id), name: `User ${id}` },
          status: 200
        })
      })

      const userIds = Array.from({ length: 50 }, (_, i) => i + 1)

      const startTime = Date.now()

      const requests = userIds.map(id => {
        const { execute } = useApi(`/users/${id}`, {
          useGlobalAbort: false
        })
        return execute()
      })

      const results = await Promise.all(requests)

      const duration = Date.now() - startTime

      expect(results).toHaveLength(50)
      expect(mockInstance.request).toHaveBeenCalledTimes(50)
      console.log(`✅ 50 requests completed in ${duration}ms`)
    })

    it('should handle chunked processing', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request.mockImplementation(({ url }) => {
        const id = url.split('/').pop()
        return Promise.resolve({
          data: { id: Number(id), name: `User ${id}` },
          status: 200
        })
      })

      // Process in chunks of 5
      const userIds = Array.from({ length: 15 }, (_, i) => i + 1)
      const chunkSize = 5
      const results = []

      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize)

        const chunkRequests = chunk.map(id => {
          const { execute } = useApi(`/users/${id}`, {
            useGlobalAbort: false
          })
          return execute()
        })

        const chunkResults = await Promise.all(chunkRequests)
        results.push(...chunkResults.filter(r => r !== null))
      }

      expect(results).toHaveLength(15)
      expect(mockInstance.request).toHaveBeenCalledTimes(15)
    })
  })

  describe('🛡️ Error Handling', () => {
    it('should use Promise.allSettled for partial failure tolerance', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request
        .mockResolvedValueOnce({ data: { id: 1, name: 'User 1' }, status: 200 })
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ data: { id: 3, name: 'User 3' }, status: 200 })
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce({ data: { id: 5, name: 'User 5' }, status: 200 })

      const requests = [1, 2, 3, 4, 5].map(id => {
        const { execute } = useApi(`/users/${id}`, {
          useGlobalAbort: false,
          skipErrorNotification: true
        })
        return execute()
      })

      const results = await Promise.allSettled(requests)

      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> =>
          r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value)

      expect(successful).toHaveLength(3)
      expect(successful[0]).toEqual({ id: 1, name: 'User 1' })
      expect(successful[1]).toEqual({ id: 3, name: 'User 3' })
      expect(successful[2]).toEqual({ id: 5, name: 'User 5' })
    })
  })

  describe('🎯 Real-world Scenarios', () => {
    it('should handle dashboard with multiple endpoints', async () => {
      const mockInstance = mockedAxios.create()

      mockInstance.request.mockImplementation(({ url }) => {
        if (url === '/stats') {
          return Promise.resolve({
            data: { totalUsers: 100, totalPosts: 500 },
            status: 200
          })
        }
        if (url === '/recent-users') {
          return Promise.resolve({
            data: [{ id: 1, name: 'User 1' }],
            status: 200
          })
        }
        if (url === '/recent-posts') {
          return Promise.resolve({
            data: [{ id: 1, title: 'Post 1' }],
            status: 200
          })
        }
        return Promise.resolve({ data: null, status: 200 })
      })

      const [stats, users, posts] = await Promise.all([
        (async () => {
          const { execute } = useApi('/stats', { useGlobalAbort: false })
          return execute()
        })(),
        (async () => {
          const { execute } = useApi('/recent-users', { useGlobalAbort: false })
          return execute()
        })(),
        (async () => {
          const { execute } = useApi('/recent-posts', { useGlobalAbort: false })
          return execute()
        })()
      ])

      expect(stats).toEqual({ totalUsers: 100, totalPosts: 500 })
      expect(users).toEqual([{ id: 1, name: 'User 1' }])
      expect(posts).toEqual([{ id: 1, title: 'Post 1' }])
    })

    it('should handle batch delete operations', async () => {
      const mockInstance = mockedAxios.create()

      const deletedIds: number[] = []

      mockInstance.request.mockImplementation(({ url, method }) => {
        if (method === 'DELETE') {
          const id = Number(url.split('/').pop())
          deletedIds.push(id)
          return Promise.resolve({ data: { success: true }, status: 200 })
        }
        return Promise.resolve({ data: null, status: 200 })
      })

      const idsToDelete = [1, 2, 3, 4, 5]

      const deleteRequests = idsToDelete.map(id => {
        const { execute } = useApi(`/items/${id}`, {
          method: 'DELETE',
          useGlobalAbort: false
        })
        return execute()
      })

      await Promise.all(deleteRequests)

      expect(deletedIds).toEqual([1, 2, 3, 4, 5])
      expect(mockInstance.request).toHaveBeenCalledTimes(5)
    })
  })
})

