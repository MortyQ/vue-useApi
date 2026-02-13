<script setup lang="ts">
import {computed, reactive, ref} from "vue";
import { useApiPost, tokenManager } from "@ametie/vue-muza-use";
import PollingDemo from "./PollingDemo.vue";

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

const form = reactive({
  email: "",
  password: "",
})

const authToken = ref<string>("")

const { execute, loading } = useApiPost<LoginResponse>('/auth/login', {
  data:form,
  authMode: "public",
  onSuccess(response) {
    const accessToken = response.data?.accessToken
    const refreshToken = response.data?.refreshToken
    authToken.value = accessToken
    tokenManager.setTokens({
      accessToken,
      refreshToken
    });
  },
})

const submit = () => {
  execute()
};

const isAuth = computed(() => !!(tokenManager.getAccessToken()) || !!(authToken.value))

</script>

<template>
<section>
  <form @submit.prevent="submit">
    <input v-model="form.email" type="email" required placeholder="Email" />
    <input v-model="form.password" type="password" required placeholder="Password" />
    <button type="submit">Login</button>
    <div v-if="loading">Loading....</div>
  </form>
  <polling-demo v-if="isAuth"/>
</section>
</template>

<style scoped>

</style>