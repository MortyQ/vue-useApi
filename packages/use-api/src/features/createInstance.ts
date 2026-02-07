import axios, { type AxiosInstance, type CreateAxiosDefaults } from "axios";
import { setupInterceptors, type InterceptorOptions } from "./interceptors";
import { tokenManager, LocalStorageTokenStorage } from "./tokenManager";

export interface CreateApiClientOptions extends CreateAxiosDefaults {
    withAuth?: boolean;
    authOptions?: InterceptorOptions;
}

export function createApiClient(options: CreateApiClientOptions = {}): AxiosInstance {
    const {
        withAuth = true,
        authOptions,
        ...axiosConfig
    } = options;

    // Configure token storage based on refreshWithCredentials
    //
    // Two modes:
    // 1. refreshWithCredentials: false (default) → storeRefreshToken: true
    //    - Both access & refresh tokens stored in localStorage
    //    - Use when: standard REST API without httpOnly cookies
    //
    // 2. refreshWithCredentials: true → storeRefreshToken: false
    //    - Only access token in localStorage
    //    - Refresh token sent via httpOnly cookie (more secure)
    //    - Use when: high security requirements
    //
    const storeRefreshToken = !authOptions?.refreshWithCredentials;

    tokenManager.setStorage(new LocalStorageTokenStorage({ storeRefreshToken }));

    const instance = axios.create({
        timeout: 60000,
        headers: { "Content-Type": "application/json" },
        ...axiosConfig,
    });

    if (withAuth) {
        setupInterceptors(instance, authOptions);
    }

    return instance;
}
