import { type App, type InjectionKey, inject } from "vue";
import type { ApiPluginOptions } from "./types";

export const API_INJECTION_KEY: InjectionKey<ApiPluginOptions> = Symbol("use-api-config");

// Global storage for plugin options (accessible outside Vue components)
let globalConfig: ApiPluginOptions | null = null;

export function createApi(options: ApiPluginOptions) {
    // Store config globally for use in Pinia stores and outside component setup
    globalConfig = options;

    return {
        install(app: App) {
            app.provide(API_INJECTION_KEY, options);
        },
    };
}

export function useApiConfig() {
    // Use global config if available (works everywhere: components, Pinia stores, etc.)
    if (globalConfig) {
        return globalConfig;
    }

    // Fallback to injection (for edge cases where global is not set yet)
    const config = inject(API_INJECTION_KEY, null);

    if (!config) {
        throw new Error(
            "API plugin not installed!\n\n" +
            "Make sure you have called app.use(createApi(...)) in your main.ts:\n\n" +
            "import { createApi, createApiClient } from '@ametie/vue-muza-use'\n\n" +
            "const api = createApiClient({ baseURL: '...' })\n\n" +
            "app.use(createApi({\n" +
            "  axios: api,\n" +
            "  onError: (error) => console.error(error)\n" +
            "}))"
        );
    }

    return config;
}
