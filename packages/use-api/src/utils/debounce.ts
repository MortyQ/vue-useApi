export function debounceFn<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (...args: Parameters<T>) {
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
