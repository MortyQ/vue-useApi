"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AuthEventType: () => AuthEventType,
  createApi: () => createApi,
  createApiClient: () => createApiClient,
  setAuthMonitor: () => setAuthMonitor,
  setupInterceptors: () => setupInterceptors,
  tokenManager: () => tokenManager,
  useAbortController: () => useAbortController,
  useApi: () => useApi,
  useApiConfig: () => useApiConfig,
  useApiDelete: () => useApiDelete,
  useApiGet: () => useApiGet,
  useApiPatch: () => useApiPatch,
  useApiPost: () => useApiPost,
  useApiPut: () => useApiPut,
  useApiState: () => useApiState
});
module.exports = __toCommonJS(index_exports);

// src/plugin.ts
var import_vue = require("vue");
var API_INJECTION_KEY = /* @__PURE__ */ Symbol("use-api-config");
function createApi(options) {
  return {
    install(app) {
      app.provide(API_INJECTION_KEY, options);
    }
  };
}
function useApiConfig() {
  const config = (0, import_vue.inject)(API_INJECTION_KEY);
  if (!config) {
    throw new Error("API plugin not installed! Did you forget app.use(createApi(...))?");
  }
  return config;
}

// src/utils/debounce.ts
function debounceFn(fn, delay) {
  let timeoutId = null;
  return function(...args) {
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

// src/useApi.ts
var import_vue4 = require("vue");

// src/utils/errorParser.ts
function parseApiError(error) {
  if (error && typeof error === "object" && "isAxiosError" in error && error.isAxiosError) {
    const axiosError = error;
    if (axiosError.response) {
      const { data, status } = axiosError.response;
      const message = data?.message || data?.error || axiosError.message || "Unknown Error";
      return {
        message,
        status,
        code: data?.code,
        errors: data?.errors,
        details: data
      };
    }
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    status: 0
  };
}

// src/composables/useApiState.ts
var import_vue2 = require("vue");
function useApiState(initialData = null, options = {}) {
  const { initialLoading = false } = options;
  const data = (0, import_vue2.ref)(initialData);
  const loading = (0, import_vue2.ref)(initialLoading);
  const error = (0, import_vue2.ref)(null);
  const statusCode = (0, import_vue2.ref)(null);
  const response = (0, import_vue2.ref)(null);
  const setData = (newData, fullResponse) => {
    data.value = newData;
    error.value = null;
    if (fullResponse) {
      response.value = fullResponse;
    }
  };
  const setError = (newError) => {
    error.value = newError;
  };
  const setLoading = (isLoading) => {
    loading.value = isLoading;
  };
  const setStatusCode = (code) => {
    statusCode.value = code;
  };
  const reset = () => {
    data.value = initialData;
    loading.value = false;
    error.value = null;
    statusCode.value = null;
    response.value = null;
  };
  return {
    data,
    loading,
    error,
    statusCode,
    response,
    setData,
    setError,
    setLoading,
    setStatusCode,
    reset
  };
}

// src/composables/useAbortController.ts
var import_vue3 = require("vue");
var abortController = new AbortController();
var abortCount = (0, import_vue3.ref)(0);
function useAbortController() {
  const signal = (0, import_vue3.readonly)((0, import_vue3.ref)(abortController.signal));
  const abort = () => {
    abortCount.value++;
    abortController.abort();
    abortController = new AbortController();
  };
  const getSignal = () => {
    return abortController.signal;
  };
  const isAbortError = (error) => {
    return error instanceof DOMException && error.name === "AbortError";
  };
  return {
    signal,
    abort,
    getSignal,
    isAbortError,
    abortCount: (0, import_vue3.readonly)(abortCount)
  };
}

// src/useApi.ts
function useApi(url, options = {}) {
  const { axios: axios2, onError: globalErrorHandler, globalOptions } = useApiConfig();
  const {
    method = "GET",
    immediate = false,
    onSuccess,
    onError,
    onBefore,
    onFinish,
    initialData = null,
    debounce = 0,
    skipErrorNotification = false,
    retry = globalOptions?.retry ?? false,
    retryDelay = globalOptions?.retryDelay ?? 1e3,
    authMode = "default",
    useGlobalAbort = globalOptions?.useGlobalAbort ?? true,
    initialLoading = false,
    ...axiosConfig
  } = options;
  const startLoading = initialLoading ?? immediate;
  const state = useApiState(initialData, { initialLoading: startLoading });
  const abortController2 = (0, import_vue4.ref)(null);
  const globalAbort = useGlobalAbort ? useAbortController() : null;
  const executeRequest = async (config) => {
    const requestUrl = typeof url === "string" ? url : url.value;
    if (abortController2.value) abortController2.value.abort("Cancelled by new request");
    const controller = new AbortController();
    abortController2.value = controller;
    let globalAbortHandler = null;
    let subscribedSignal = null;
    if (globalAbort) {
      const gs = globalAbort.getSignal();
      if (!gs.aborted) {
        subscribedSignal = gs;
        const currentCount = globalAbort.abortCount.value;
        globalAbortHandler = () => {
          if (globalAbort.abortCount.value === currentCount) controller.abort("Global filter change");
        };
        gs.addEventListener("abort", globalAbortHandler);
      }
    }
    onBefore?.();
    state.setLoading(true);
    state.setError(null);
    let wasCancelled = false;
    try {
      const rawData = config?.data !== void 0 ? config.data : axiosConfig.data;
      const resolvedData = (0, import_vue4.toValue)(rawData);
      const response = await axios2.request({
        url: requestUrl,
        method,
        ...axiosConfig,
        ...config,
        data: resolvedData,
        signal: controller.signal,
        authMode: config?.authMode || authMode
      });
      state.setData(response.data, response);
      state.setStatusCode(response.status);
      onSuccess?.(response);
      return response.data;
    } catch (err) {
      if (controller.signal.aborted || err?.code === "ERR_CANCELED") {
        wasCancelled = true;
        return null;
      }
      const apiError = parseApiError(err);
      if (!skipErrorNotification && globalErrorHandler) {
        globalErrorHandler(apiError, err);
      }
      state.setError(apiError);
      state.setStatusCode(apiError.status);
      onError?.(apiError);
      return null;
    } finally {
      if (globalAbortHandler && subscribedSignal) subscribedSignal.removeEventListener("abort", globalAbortHandler);
      if (!wasCancelled) {
        state.setLoading(false);
        onFinish?.();
      }
    }
  };
  const execute = debounce > 0 ? debounceFn(executeRequest, debounce) : executeRequest;
  const abort = (msg) => {
    abortController2.value?.abort(msg);
    abortController2.value = null;
  };
  const reset = () => {
    abort();
    state.reset();
    state.setLoading(false);
  };
  if ((0, import_vue4.getCurrentScope)()) {
    (0, import_vue4.onScopeDispose)(() => abort("Scope disposed"));
  }
  if (immediate) execute();
  return { ...state, execute, abort, reset };
}
function useApiGet(url, options) {
  return useApi(url, { ...options, method: "GET" });
}
function useApiPost(url, options) {
  return useApi(url, { ...options, method: "POST" });
}
function useApiPut(url, options) {
  return useApi(url, { ...options, method: "PUT" });
}
function useApiPatch(url, options) {
  return useApi(url, { ...options, method: "PATCH" });
}
function useApiDelete(url, options) {
  return useApi(url, { ...options, method: "DELETE" });
}

// src/features/createInstance.ts
var import_axios = __toESM(require("axios"), 1);

// src/features/monitor.ts
var import_meta = {};
var AuthEventType = /* @__PURE__ */ ((AuthEventType2) => {
  AuthEventType2["REFRESH_START"] = "AUTH_REFRESH_START";
  AuthEventType2["REQUEST_QUEUED"] = "AUTH_REQUEST_QUEUED";
  AuthEventType2["REFRESH_SUCCESS"] = "AUTH_REFRESH_SUCCESS";
  AuthEventType2["REFRESH_ERROR"] = "AUTH_REFRESH_ERROR";
  return AuthEventType2;
})(AuthEventType || {});
var defaultMonitor = (type, payload) => {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development" || import_meta?.env?.DEV;
  if (isDev) {
    console.debug(`[AuthMonitor] ${type}`, payload);
  }
};
var currentMonitor = defaultMonitor;
function setAuthMonitor(fn) {
  currentMonitor = fn;
}
function trackAuthEvent(type, payload = {}) {
  currentMonitor(type, { ...payload, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
}

// src/features/tokenManager.ts
var TOKEN_TYPE = "Bearer";
var ACCESS_TOKEN_KEY = "accessToken";
var TOKEN_EXPIRES_KEY = "tokenExpiresAt";
var LocalStorageTokenStorage = class {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  getRefreshToken() {
    return null;
  }
  setTokens(tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.expiresIn) {
      const expiresAt = Date.now() + tokens.expiresIn * 1e3;
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
    }
  }
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
  }
  getTokenExpiresAt() {
    const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  }
  isTokenExpired() {
    const expiresAt = this.getTokenExpiresAt();
    if (!expiresAt) return false;
    return Date.now() >= expiresAt - 5e3;
  }
};
var TokenManager = class {
  storage;
  refreshPromise = null;
  constructor(storage = new LocalStorageTokenStorage()) {
    this.storage = storage;
  }
  /**
   * Get access token
   */
  getAccessToken() {
    return this.storage.getAccessToken();
  }
  /**
   * Get refresh token
   */
  getRefreshToken() {
    return this.storage.getRefreshToken();
  }
  /**
   * Save tokens
   */
  setTokens(tokens) {
    this.storage.setTokens(tokens);
  }
  /**
   * Clear tokens
   */
  clearTokens() {
    this.storage.clearTokens();
    this.refreshPromise = null;
  }
  /**
   * Check if token is expired
   */
  isTokenExpired() {
    return this.storage.isTokenExpired();
  }
  /**
   * Get token expiration time
   */
  getTokenExpiresAt() {
    return this.storage.getTokenExpiresAt();
  }
  /**
   * Check if tokens exist
   */
  hasTokens() {
    return !!this.getAccessToken();
  }
  /**
   * Get Authorization header
   */
  getAuthHeader() {
    const token = this.getAccessToken();
    return token ? `${TOKEN_TYPE} ${token}` : null;
  }
  /**
   * Set token refresh promise (to prevent race conditions)
   */
  setRefreshPromise(promise) {
    this.refreshPromise = promise;
  }
  /**
   * Get token refresh promise
   */
  getRefreshPromise() {
    return this.refreshPromise;
  }
  /**
   * Clear token refresh promise
   */
  clearRefreshPromise() {
    this.refreshPromise = null;
  }
  /**
   * Set storage (useful for tests)
   */
  setStorage(storage) {
    this.storage = storage;
  }
};
var tokenManager = new TokenManager();

// src/features/interceptors.ts
var AUTH_HEADER = "Authorization";
var TOKEN_TYPE2 = "Bearer";
var failedQueue = [];
var isRefreshing = false;
function processQueue(error, token = null) {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else if (token) promise.resolve(token);
  });
  failedQueue = [];
}
function setupInterceptors(axiosInstance, options = {}) {
  const {
    refreshUrl = "/auth/refresh",
    onTokenRefreshFailed,
    extractTokens
  } = options;
  axiosInstance.interceptors.request.use(
    (config) => {
      const extendedConfig = config;
      if (extendedConfig.authMode === "public") return config;
      const token = tokenManager.getAccessToken();
      if (token) {
        config.headers.set(AUTH_HEADER, `${TOKEN_TYPE2} ${token}`);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
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
        trackAuthEvent("AUTH_REQUEST_QUEUED" /* REQUEST_QUEUED */, { url: originalRequest.url });
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.set(AUTH_HEADER, `${TOKEN_TYPE2} ${token}`);
              resolve(axiosInstance(originalRequest));
            },
            reject: (err) => reject(err)
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      trackAuthEvent("AUTH_REFRESH_START" /* REFRESH_START */, { url: originalRequest.url });
      try {
        const response = await axiosInstance.post(
          refreshUrl,
          {},
          {
            // @ts-expect-error
            authMode: "public",
            withCredentials: true
          }
        );
        let accessToken = "";
        if (extractTokens) {
          const tokens = extractTokens(response);
          accessToken = tokens.accessToken;
        } else {
          const data = response.data;
          accessToken = data.accessToken || data.access_token;
        }
        if (!accessToken) throw new Error("No access token in refresh response");
        tokenManager.setTokens({ accessToken });
        axiosInstance.defaults.headers.common[AUTH_HEADER] = `${TOKEN_TYPE2} ${accessToken}`;
        trackAuthEvent("AUTH_REFRESH_SUCCESS" /* REFRESH_SUCCESS */);
        processQueue(null, accessToken);
        originalRequest.headers.set(AUTH_HEADER, `${TOKEN_TYPE2} ${accessToken}`);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        trackAuthEvent("AUTH_REFRESH_ERROR" /* REFRESH_ERROR */, { error: refreshError });
        processQueue(refreshError, null);
        tokenManager.clearTokens();
        onTokenRefreshFailed?.();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
}

// src/features/createInstance.ts
function createApiClient(options = {}) {
  const {
    withAuth = true,
    authOptions,
    ...axiosConfig
  } = options;
  const instance = import_axios.default.create({
    timeout: 6e4,
    headers: { "Content-Type": "application/json" },
    ...axiosConfig
  });
  if (withAuth) {
    setupInterceptors(instance, authOptions);
  }
  return instance;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthEventType,
  createApi,
  createApiClient,
  setAuthMonitor,
  setupInterceptors,
  tokenManager,
  useAbortController,
  useApi,
  useApiConfig,
  useApiDelete,
  useApiGet,
  useApiPatch,
  useApiPost,
  useApiPut,
  useApiState
});
