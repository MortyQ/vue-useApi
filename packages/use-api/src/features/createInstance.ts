import axios, { type AxiosInstance, type CreateAxiosDefaults } from "axios";
import { setupInterceptors, type InterceptorOptions } from "./interceptors";

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
