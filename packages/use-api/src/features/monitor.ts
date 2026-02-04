export enum AuthEventType {
    REFRESH_START = "AUTH_REFRESH_START",
    REQUEST_QUEUED = "AUTH_REQUEST_QUEUED",
    REFRESH_SUCCESS = "AUTH_REFRESH_SUCCESS",
    REFRESH_ERROR = "AUTH_REFRESH_ERROR",
}

export interface AuthEventPayload {
    url?: string;
    queueSize?: number;
    error?: unknown;
    timestamp?: string;
    requestId?: string;
    details?: Record<string, unknown>;
}

export type AuthMonitorFn = (type: AuthEventType, payload: AuthEventPayload) => void;

const defaultMonitor: AuthMonitorFn = (type, payload) => {
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ||
        (import.meta as any)?.env?.DEV;

    if (isDev) {
        console.debug(`[AuthMonitor] ${type}`, payload);
    }
};
let currentMonitor: AuthMonitorFn = defaultMonitor;

export function setAuthMonitor(fn: AuthMonitorFn) {
    currentMonitor = fn;
}

export function trackAuthEvent(type: AuthEventType, payload: AuthEventPayload = {}) {
    currentMonitor(type, { ...payload, timestamp: new Date().toISOString() });
}
