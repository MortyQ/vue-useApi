/**
 * useRefetchTriggers — unit tests
 *
 * Tests the composable in isolation without a full useApi setup.
 * Uses happy-dom's native event system to simulate browser events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useRefetchTriggers } from './useRefetchTriggers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate tab becoming visible (document.hidden = false by default in happy-dom) */
function simulateFocus() {
    document.dispatchEvent(new Event('visibilitychange'))
}

/** Simulate network reconnect */
function simulateOnline() {
    window.dispatchEvent(new Event('online'))
}

function mountTriggers(options: Parameters<typeof useRefetchTriggers>[0]) {
    let triggers!: ReturnType<typeof useRefetchTriggers>
    const wrapper = mount(
        defineComponent({
            setup() {
                triggers = useRefetchTriggers(options)
                return () => null
            },
        }),
    )
    return { triggers, wrapper }
}

// ---------------------------------------------------------------------------
// refetchOnFocus
// ---------------------------------------------------------------------------

describe('useRefetchTriggers — refetchOnFocus', () => {
    // happy-dom: document.hidden is false by default — no setup needed

    it('fires onTrigger on visibilitychange when throttle is 0', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnFocus: { throttle: 0 }, loading, onTrigger })

        simulateFocus()

        expect(onTrigger).toHaveBeenCalledOnce()
    })

    it('does NOT fire if throttle has not elapsed since last fetch', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        const { triggers } = mountTriggers({ refetchOnFocus: { throttle: 60_000 }, loading, onTrigger })

        triggers.notifyFetched() // marks a fetch as just completed

        simulateFocus()

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('fires when refetchOnFocus: true and no fetch has ever occurred', () => {
        // lastFetchedAt starts at 0 → Date.now() - 0 >> 60_000 → fires
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnFocus: true, loading, onTrigger })

        simulateFocus()

        expect(onTrigger).toHaveBeenCalledOnce()
    })

    it('does NOT fire if loading is true', () => {
        const onTrigger = vi.fn()
        const loading = ref(true)

        mountTriggers({ refetchOnFocus: { throttle: 0 }, loading, onTrigger })

        simulateFocus()

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('does not register listener when refetchOnFocus is false', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnFocus: false, loading, onTrigger })

        simulateFocus()

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('does NOT fire when visibilitychange fires but document is still hidden', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnFocus: { throttle: 0 }, loading, onTrigger })

        // Simulate tab switching AWAY (hidden: true) then the event fires
        Object.defineProperty(document, 'hidden', { value: true, configurable: true })
        simulateFocus()
        Object.defineProperty(document, 'hidden', { value: false, configurable: true })

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('removes visibilitychange listener on scope dispose', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        const { wrapper } = mountTriggers({ refetchOnFocus: { throttle: 0 }, loading, onTrigger })

        wrapper.unmount() // triggers onScopeDispose

        simulateFocus()

        expect(onTrigger).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// refetchOnReconnect
// ---------------------------------------------------------------------------

describe('useRefetchTriggers — refetchOnReconnect', () => {
    it('fires onTrigger on online event', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnReconnect: true, loading, onTrigger })

        simulateOnline()

        expect(onTrigger).toHaveBeenCalledOnce()
    })

    it('does NOT fire if loading is true', () => {
        const onTrigger = vi.fn()
        const loading = ref(true)

        mountTriggers({ refetchOnReconnect: true, loading, onTrigger })

        simulateOnline()

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('does not register listener when refetchOnReconnect is false', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        mountTriggers({ refetchOnReconnect: false, loading, onTrigger })

        simulateOnline()

        expect(onTrigger).not.toHaveBeenCalled()
    })

    it('removes online listener on scope dispose', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        const { wrapper } = mountTriggers({ refetchOnReconnect: true, loading, onTrigger })

        wrapper.unmount()

        simulateOnline()

        expect(onTrigger).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// notifyFetched
// ---------------------------------------------------------------------------

describe('useRefetchTriggers — notifyFetched', () => {
    it('notifyFetched records timestamp — subsequent focus is blocked until throttle elapses', () => {
        vi.useFakeTimers()

        const onTrigger = vi.fn()
        const loading = ref(false)
        const THROTTLE = 5_000

        const { triggers } = mountTriggers({ refetchOnFocus: { throttle: THROTTLE }, loading, onTrigger })

        triggers.notifyFetched() // records now as lastFetchedAt

        simulateFocus() // immediately after fetch — throttle not elapsed
        expect(onTrigger).not.toHaveBeenCalled()

        vi.advanceTimersByTime(THROTTLE + 1) // advance past throttle
        simulateFocus() // now throttle has elapsed
        expect(onTrigger).toHaveBeenCalledOnce()

        vi.useRealTimers()
    })

    it('is a no-op when refetchOnFocus is not set', () => {
        const onTrigger = vi.fn()
        const loading = ref(false)

        const { triggers } = mountTriggers({ loading, onTrigger })

        // Should not throw
        expect(() => triggers.notifyFetched()).not.toThrow()
    })
})
