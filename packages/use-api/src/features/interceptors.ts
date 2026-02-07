import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosRequestConfig } from "axios";
import type { AuthMode } from "../types";
import { trackAuthEvent, AuthEventType } from "./monitor";
import { tokenManager } from "./tokenManager";

export const AUTH_HEADER = "Authorization";
export const TOKEN_TYPE = "Bearer";

export interface InterceptorOptions {
    refreshUrl?: string;
    onTokenRefreshFailed?: () => void;
    extractTokens?: (response: AxiosResponse) => { accessToken: string, refreshToken?: string };
}

interface ExtendedInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
    authMode?: AuthMode;
    _retry?: boolean;
}

interface FailedRequestQueue {
    resolve: (value: string) => void;
    reject: (reason: unknown) => void;
}

let failedQueue: FailedRequestQueue[] = [];
let isRefreshing = false;

function processQueue(error: unknown, token: string | null = null): void {
    failedQueue.forEach((promise) => {
        if (error) promise.reject(error);
        else if (token) promise.resolve(token);
    });
    failedQueue = [];
}

export function setupInterceptors(
    axiosInstance: AxiosInstance,
    options: InterceptorOptions = {}
) {
    const {
        refreshUrl = "/auth/refresh",
        onTokenRefreshFailed,
        extractTokens
    } = options;

    axiosInstance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const extendedConfig = config as ExtendedInternalAxiosRequestConfig;
            if (extendedConfig.authMode === "public") return config;

            const token = tokenManager.getAccessToken();
            if (token) {
                config.headers.set(AUTH_HEADER, `${TOKEN_TYPE} ${token}`);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            const originalRequest = error.config as ExtendedInternalAxiosRequestConfig;

            if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
                return Promise.reject(error);
            }

            if (originalRequest.authMode === "public" || originalRequest.authMode === "optional") {
                return Promise.reject(error);
            }

            if (originalRequest.url?.includes(refreshUrl)) {
                isRefreshing = false;
                processQueue(error, null);
                tokenManager.clearTokens();
                onTokenRefreshFailed?.();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                trackAuthEvent(AuthEventType.REQUEST_QUEUED, { url: originalRequest.url });
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.set(AUTH_HEADER, `${TOKEN_TYPE} ${token}`);
                            resolve(axiosInstance(originalRequest));
                        },
                        reject: (err) => reject(err),
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;
            trackAuthEvent(AuthEventType.REFRESH_START, { url: originalRequest.url });

            try {
                const response = await axiosInstance.post<{ accessToken?: string, access_token?: string }>(
                    refreshUrl,
                    {},
                    {
                        authMode: "public",
                        withCredentials: true
                    } as AxiosRequestConfig & { authMode: AuthMode }
                );

                let accessToken: string | undefined;

                if (extractTokens) {
                    const tokens = extractTokens(response);
                    accessToken = tokens.accessToken;
                } else {
                    const data = response.data;
                    accessToken = data.accessToken || data.access_token;
                }

                if (!accessToken) throw new Error("No access token in refresh response");

                tokenManager.setTokens({ accessToken });

                axiosInstance.defaults.headers.common[AUTH_HEADER] = `${TOKEN_TYPE} ${accessToken}`;

                trackAuthEvent(AuthEventType.REFRESH_SUCCESS);
                processQueue(null, accessToken);

                originalRequest.headers.set(AUTH_HEADER, `${TOKEN_TYPE} ${accessToken}`);
                return axiosInstance(originalRequest);
            }
            catch (refreshError) {
                trackAuthEvent(AuthEventType.REFRESH_ERROR, { error: refreshError });
                processQueue(refreshError, null);
                tokenManager.clearTokens();
                onTokenRefreshFailed?.();
                return Promise.reject(refreshError);
            }
            finally {
                isRefreshing = false;
            }
        }
    );
}
