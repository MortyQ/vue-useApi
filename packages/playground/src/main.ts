import { createApp } from 'vue'
import App from './App.vue'
import { createApi, createApiClient, tokenManager} from '@ametie/vue-muza-use'
import { toast } from 'vue-sonner'

const app = createApp(App)

// Example 1: localStorage mode (both tokens in localStorage)
const myAxios = createApiClient({
    baseURL: import.meta.env.VITE_API_URL,
    authOptions: {
        refreshUrl: "/auth/refresh",
        onTokenRefreshed: (response) => console.log("TOKEN REFRESHED", response),
        refreshPayload: () => ({
            refreshToken: tokenManager.getRefreshToken()
        }),
        onTokenRefreshFailed: () => console.log("LOGOUT"),
    }
});

// Example 2: httpOnly cookie mode (only accessToken in localStorage, refreshToken in cookie)
// Uncomment to use:
/*
const myAxios = createApiClient({
    baseURL: import.meta.env.VITE_API_URL,
    authOptions: {
        refreshUrl: "/auth/refresh",
        refreshWithCredentials: true,  // Enable cookie mode
        refreshTokenCookieName: 'refreshToken', // Optional: specify cookie name (default: 'refreshToken')
        onTokenRefreshed: (response) => console.log("TOKEN REFRESHED", response),
        onTokenRefreshFailed: () => {
            console.log("LOGOUT");
            tokenManager.clearTokens();
        },
    }
});
*/

app.use(createApi({
    axios: myAxios,
    onError: (error) => {
        toast.error(error.message)
    }
}));

app.mount('#app')
