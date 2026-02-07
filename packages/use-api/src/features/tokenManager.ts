/**
 * Token Manager
 *
 * Centralized authorization token management
 * Solves problems:
 * - Tight coupling with localStorage
 * - Easy to mock in tests
 * - Single point of access to tokens
 */

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}

export interface TokenStorage {
    getAccessToken(): string | null;
    getRefreshToken(): string | null;
    setTokens(tokens: AuthTokens): void;
    clearTokens(): void;
    getTokenExpiresAt(): number | null
    isTokenExpired(): boolean
}

export const TOKEN_TYPE = "Bearer";
export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const TOKEN_EXPIRES_KEY = "tokenExpiresAt";


/**
 * LocalStorage implementation of token storage
 *
 * Supports two modes:
 * 1. storeRefreshToken: true (default) - Both tokens in localStorage
 * 2. storeRefreshToken: false - Only accessToken in localStorage, refreshToken via httpOnly cookies
 */
class LocalStorageTokenStorage implements TokenStorage {
    private storeRefreshToken: boolean;

    constructor(options: { storeRefreshToken?: boolean } = {}) {
        this.storeRefreshToken = options.storeRefreshToken ?? true;  // Default: store in localStorage
    }

    getAccessToken(): string | null {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }

    getRefreshToken(): string | null {
        if (!this.storeRefreshToken) {
            return null; // Refresh token is stored in httpOnly cookie
        }
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    setTokens(tokens: AuthTokens): void {
        if (!tokens.accessToken) {
            return;
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

        if (this.storeRefreshToken) {
            if (tokens.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
            }
        }

        if (tokens.expiresIn) {
            const expiresAt = Date.now() + tokens.expiresIn * 1000;
            localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
        }
    }

    clearTokens(): void {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        if (this.storeRefreshToken) {
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
        localStorage.removeItem(TOKEN_EXPIRES_KEY);
    }

    getTokenExpiresAt(): number | null {
        const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
        return expiresAt ? parseInt(expiresAt, 10) : null;
    }

    isTokenExpired(): boolean {
        const expiresAt = this.getTokenExpiresAt();
        if (!expiresAt) return false;

        // Add 5 seconds buffer to prevent race conditions
        return Date.now() >= expiresAt - 5000;
    }
}

/**
 * Token Manager class
 * Singleton for token management
 */
class TokenManager {
    private storage: TokenStorage;
    private refreshPromise: Promise<string | null> | null = null;

    constructor(storage: TokenStorage = new LocalStorageTokenStorage()) {
        this.storage = storage;
    }

    /**
     * Get access token
     */
    getAccessToken(): string | null {
        return this.storage.getAccessToken();
    }

    /**
     * Get refresh token
     */
    getRefreshToken(): string | null {
        return this.storage.getRefreshToken();
    }

    /**
     * Save tokens
     */
    setTokens(tokens: AuthTokens): void {
        this.storage.setTokens(tokens);
    }

    /**
     * Clear tokens
     */
    clearTokens(): void {
        this.storage.clearTokens();
        this.refreshPromise = null;
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(): boolean {
        return this.storage.isTokenExpired();
    }

    /**
     * Get token expiration time
     */
    getTokenExpiresAt(): number | null {
        return this.storage.getTokenExpiresAt();
    }

    /**
     * Check if tokens exist
     */
    hasTokens(): boolean {
        // We only check for access token because refresh token is in HttpOnly cookie
        return !!this.getAccessToken();
    }

    /**
     * Get Authorization header
     */
    getAuthHeader(): string | null {
        const token = this.getAccessToken();
        return token ? `${TOKEN_TYPE} ${token}` : null;
    }

    /**
     * Set token refresh promise (to prevent race conditions)
     */
    setRefreshPromise(promise: Promise<string | null>): void {
        this.refreshPromise = promise;
    }

    /**
     * Get token refresh promise
     */
    getRefreshPromise(): Promise<string | null> | null {
        return this.refreshPromise;
    }

    /**
     * Clear token refresh promise
     */
    clearRefreshPromise(): void {
        this.refreshPromise = null;
    }

    /**
     * Set storage (useful for tests and configuration)
     */
    setStorage(storage: TokenStorage): void {
        this.storage = storage;
    }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export class for configuration and tests
export { TokenManager, LocalStorageTokenStorage };

