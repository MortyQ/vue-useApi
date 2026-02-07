import { createApp } from 'vue'
import App from './App.vue'
import { createApi, createApiClient, tokenManager} from '@ametie/vue-muza-use'
import { toast } from 'vue-sonner'

const app = createApp(App)

const myAxios = createApiClient({
    baseURL: import.meta.env.VITE_API_URL,
    authOptions: {
        refreshUrl: "/auth/refresh",
        refreshPayload: () => ({
            refreshToken: tokenManager.getRefreshToken()
        }),
        onTokenRefreshFailed: () => console.log("LOGOUT"),
    }
});
app.use(createApi({
    axios: myAxios,
    onError: (error) => {
        toast.error(error.message)
    }
}));

app.mount('#app')
