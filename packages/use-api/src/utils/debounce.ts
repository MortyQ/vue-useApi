export function debounceFn<A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    delay: number
): (...args: A) => Promise<R | undefined> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (...args: A) {
        return new Promise((resolve) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(async () => {
                const result = await fn(...args);
                resolve(result);
                timeoutId = null;
            }, delay);
        });
    };
}
