import { type Ref, getCurrentScope, onScopeDispose } from 'vue'

const DEFAULT_FOCUS_THROTTLE = 60_000

export interface UseRefetchTriggersOptions {
    refetchOnFocus?: boolean | { throttle?: number }
    refetchOnReconnect?: boolean
    loading: Ref<boolean>
    onTrigger: () => void
}

export interface UseRefetchTriggersReturn {
    /** Call after each successful request to reset the focus throttle clock. */
    notifyFetched: () => void
}

export function useRefetchTriggers({
    refetchOnFocus,
    refetchOnReconnect,
    loading,
    onTrigger,
}: UseRefetchTriggersOptions): UseRefetchTriggersReturn {
    let lastFetchedAt = 0

    const notifyFetched = () => { lastFetchedAt = Date.now() }

    // -------------------------------------------------------------------------
    // refetchOnFocus — visibilitychange listener
    // -------------------------------------------------------------------------
    if (refetchOnFocus && typeof document !== 'undefined') {
        const throttle =
            typeof refetchOnFocus === 'object'
                ? (refetchOnFocus.throttle ?? DEFAULT_FOCUS_THROTTLE)
                : DEFAULT_FOCUS_THROTTLE

        const handleFocus = () => {
            if (document.hidden) return
            if (loading.value) return
            if (throttle > 0 && Date.now() - lastFetchedAt < throttle) return
            onTrigger()
        }

        document.addEventListener('visibilitychange', handleFocus)

        if (getCurrentScope()) {
            onScopeDispose(() => document.removeEventListener('visibilitychange', handleFocus))
        }
    }

    // -------------------------------------------------------------------------
    // refetchOnReconnect — online listener
    // -------------------------------------------------------------------------
    if (refetchOnReconnect && typeof window !== 'undefined') {
        const handleReconnect = () => {
            if (loading.value) return
            onTrigger()
        }

        window.addEventListener('online', handleReconnect)

        if (getCurrentScope()) {
            onScopeDispose(() => window.removeEventListener('online', handleReconnect))
        }
    }

    return { notifyFetched }
}
