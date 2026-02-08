<script setup lang="ts">
import { ref } from 'vue'
import { useApi } from '@ametie/vue-muza-use'

const interval = ref(10000)
const pollWhenHidden = ref(false)
const lastUpdated = ref<string>('')
const requestCount = ref(0)

// We use a query param to ensure we can see requests in devtools,
// though for this demo we just care about the `onSuccess` trigger.
const { data, loading, error, execute, abort } = useApi('/lists', {
  immediate: true,
  // Reactive polling config
  poll: {
    interval,
    whenHidden: pollWhenHidden
  },
  onSuccess: () => {
    requestCount.value++
    lastUpdated.value = new Date().toLocaleTimeString()
  }
})

</script>

<template>
  <div class="card">
    <h2>🔄 Polling Demo</h2>

    <div class="controls">
      <div class="control-group">
        <label>Poll Interval (ms):</label>
        <select v-model="interval">
          <option :value="0">0 (Disabled)</option>
          <option :value="3000">3000ms</option>
          <option :value="5000">5000ms</option>
          <option :value="10000">10000ms</option>
        </select>
        <span>Current: {{ interval }}ms</span>
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" v-model="pollWhenHidden">
          Poll when hidden (change tabs to test)
        </label>
      </div>

      <div class="actions">
        <button @click="execute()">Manual Force Fetch</button>
        <button @click="abort()" class="danger">Abort/Stop</button>
      </div>
    </div>

    <div class="status-box" :class="{ loading }">
      <div class="metric">
        <span class="label">Status:</span>
        <span class="value">{{ loading ? '⏳ Fetching...' : '🟢 Idle' }}</span>
      </div>
      <div class="metric">
        <span class="label">Requests:</span>
        <span class="value">{{ requestCount }}</span>
      </div>
      <div class="metric">
        <span class="label">Last Update:</span>
        <span class="value">{{ lastUpdated || 'Never' }}</span>
      </div>
    </div>

    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>

    <div v-if="data" class="data-preview" >
      <h3>Data Preview:</h3>
      <pre>{{ data }}</pre>
    </div>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  margin: 20px auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #fff;
  color: #333;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

h2 {
  margin-top: 0;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.controls {
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: #f9f9f9;
  padding: 15px;
  border-radius: 6px;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

button {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background: #33a06f;
}

button.danger {
  background: #e53935;
}

button.danger:hover {
  background: #c62828;
}

.status-box {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: #f0f4f8;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  transition: background 0.3s;
}

.status-box.loading {
  background: #e3f2fd;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric .label {
  font-size: 0.8em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric .value {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
}

.data-preview {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 40vh;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}
</style>
