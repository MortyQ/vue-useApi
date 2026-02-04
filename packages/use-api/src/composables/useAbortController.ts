import { ref, readonly } from "vue";

/**
 * Global abort controller for cancelling API requests when filters change
 *
 * @example
 * // In API call:
 * const { signal } = useAbortController();
 * await axios.get('/api/data', { signal: signal.value });
 *
 * // When filters change:
 * const { abort } = useAbortController();
 * abort(); // Cancels all pending requests
 */

// Singleton instance
let abortController = new AbortController();
const abortCount = ref(0);

export function useAbortController() {
  /**
     * Get current abort signal for API requests
     */
  const signal = readonly(ref(abortController.signal));

  /**
     * Abort all pending requests and create new controller
     * Call this when global filters change
     */
  const abort = () => {
    // IMPORTANT: Increment count BEFORE aborting, so handlers see the new value
    abortCount.value++;
    abortController.abort();
    abortController = new AbortController();
  };

  /**
     * Get fresh signal (use this in API calls)
     * Returns the current AbortSignal
     */
  const getSignal = (): AbortSignal => {
    return abortController.signal;
  };

  /**
     * Check if error is an abort error
     */
  const isAbortError = (error: unknown): boolean => {
    return error instanceof DOMException && error.name === "AbortError";
  };

  return {
    signal,
    abort,
    getSignal,
    isAbortError,
    abortCount: readonly(abortCount),
  };
}
