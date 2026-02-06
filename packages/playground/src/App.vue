<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use';
import {Toaster} from "vue-sonner";
import PollingDemo from "./components/PollingDemo.vue";
import DynamicUrlDemo from "./components/DynamicUrlDemo.vue";

const { data, loading, error, execute } = useApi('/todos/1', {
  immediate: true
});
</script>

<template>
  <div>
    <PollingDemo />
    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />

    <DynamicUrlDemo />
    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />

    <h1>Legacy Test</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <pre v-else>{{ data }}</pre>

    <button @click="execute()">Refetch</button>
  </div>
  <Toaster/>
</template>
