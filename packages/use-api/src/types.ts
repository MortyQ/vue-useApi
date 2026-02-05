import type { AxiosRequestConfig, AxiosResponse, AxiosInstance } from "axios";
import type {MaybeRefOrGetter, Ref, WatchSource} from "vue";

export interface ApiError {
    message: string;
    status: number;
    code?: string;
    errors?: Record<string, string[]>;
    details?: unknown;
}

export type AuthMode = "default" | "public" | "optional";

export interface ApiState<T = unknown> {
    data: T | null
    loading: boolean
    error: ApiError | null
    statusCode: number | null
}

export interface ApiRequestConfig<D = unknown> extends Omit<AxiosRequestConfig<D>, "data"> {
    data?: MaybeRefOrGetter<D> | D;
    skipErrorNotification?: boolean;
    authMode?: AuthMode;
    retry?: boolean | number;
    retryDelay?: number;
}

export interface UseApiOptions<T = unknown, D = unknown> extends ApiRequestConfig<D> {
    immediate?: boolean;
    onSuccess?: (response: AxiosResponse<T>) => void;
    onError?: (error: ApiError) => void;
    onBefore?: () => void;
    onFinish?: () => void;
    initialData?: T;
    debounce?: number;
    useGlobalAbort?: boolean;
    initialLoading?: boolean;
    watch?: WatchSource | WatchSource[];
}

export interface UseApiReturn<T = unknown, D = unknown> {
    data: Ref<T | null>;
    loading: Ref<boolean>;
    error: Ref<ApiError | null>;
    statusCode: Ref<number | null>;
    response: Ref<AxiosResponse<T> | null>;
    execute: (config?: ApiRequestConfig<D>) => Promise<T | null | undefined>;
    abort: (message?: string) => void;
    reset: () => void;
}

export interface ApiPluginOptions {
    axios: AxiosInstance;
    onError?: (error: ApiError, originalError: any) => void;
    globalOptions?: {
        retry?: number | boolean;
        retryDelay?: number;
        useGlobalAbort?: boolean;
    };
}

export interface AuthTokens {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
}
