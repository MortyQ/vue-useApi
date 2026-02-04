import { createApp } from 'vue'
import App from './App.vue'
import { createApi, createApiClient,
    setAuthMonitor, AuthEventType} from '@my-lib/use-api'
import { toast } from 'vue-sonner'

const app = createApp(App)

setAuthMonitor((type, payload) => {
    console.log(`📡 [Monitor] ${type}`, payload);
    if (type === AuthEventType.REFRESH_START) {
        console.log('🔄 Refresh process started!');
    }
    if (type === AuthEventType.REFRESH_SUCCESS) {
        console.log('✅ Token refreshed successfully!');
    }
    if (type === AuthEventType.REFRESH_ERROR) {
        console.log('❌ Refresh failed!', payload.error);
    }
});

const myAxios = createApiClient({
    baseURL: "https://jsonplaceholder.typicode.com/",
    authOptions: {
        refreshUrl: "/posts/1",
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
