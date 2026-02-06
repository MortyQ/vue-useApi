<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const userId = ref<number | undefined>(1)

const { data, loading, error } = useApi(() => `/todos/${userId.value}`, {
  immediate: true,
  watch: userId
})
</script>

<template>
  <div class="card">
     <h2>🔗 Dynamic URL Demo</h2>
     <div class="controls">
       <button @click="userId = 2">Select User 2</button>
       <button @click="userId = 3">Select User 3</button>
       <button @click="userId = 1">Clear</button>
     </div>

     <div v-if="loading">⏳ Loading...</div>
     <div v-else-if="error">❌ Error: {{ error.message }}</div>
     <pre v-else-if="data">{{ data }}</pre>
     <div v-else>ℹ️ No URL (Waiting for selection)</div>
  </div>

  <div class="debug">
     Current URL: {{ `/todos/${userId}` }}
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  padding: 20px;
  margin: 20px 0;
  border-radius: 8px;
}
.controls button {
  margin-right: 10px;
  padding: 5px 10px;
}
.debug {
  margin-top: 10px;
  color: #666;
  font-size: 0.8em;
}
</style>
