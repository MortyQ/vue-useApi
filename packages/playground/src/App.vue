<script setup lang="ts">
import { useApi } from '@ametie/vue-muza-use';
import {Toaster} from "vue-sonner";

const { data, loading, error, execute } = useApi('/todos/1', {
  immediate: true
});
</script>

<template>
  <div>
    <h1>Testing My Lib</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <pre v-else>{{ data }}</pre>

    <button @click="execute()">Refetch</button>
  </div>
  <Toaster/>
</template>
