import { type App, type InjectionKey, inject } from "vue";
import type { ApiPluginOptions } from "./types";

export const API_INJECTION_KEY: InjectionKey<ApiPluginOptions> = Symbol("use-api-config");

export function createApi(options: ApiPluginOptions) {
    return {
        install(app: App) {
            app.provide(API_INJECTION_KEY, options);
        },
    };
}

export function useApiConfig() {
    const config = inject(API_INJECTION_KEY);
    if (!config) {
        throw new Error("API plugin not installed! Did you forget app.use(createApi(...))?");
    }
    return config;
}
