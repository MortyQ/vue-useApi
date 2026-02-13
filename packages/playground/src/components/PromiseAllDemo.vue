<script setup lang="ts">
import { useApiBatch } from  '@ametie/vue-muza-use'

interface User {
  id: number
  name: string
  email: string

}

// ✨ Example 1: Basic batch (settled by default)
const {
  successfulData: batchUsers,
  loading: loadingBatch,
  progress: batchProgress,
  execute: executeBatch,
  reset: resetBatch,
} = useApiBatch<User>([
  '/users/69493fa4b9a358cdfc0db248',
  '/users/698c74738e5e27e2d3d6779a',
  '/users/698c745e8e5e27e2d3d67793',
  '/users/697536f44260e0bb7f0af278',
  '/users/6962d0e91085cb4cdf3a0aa8'
], {
})

// ✨ Example 2: Batch with some failing URLs (error tolerant)
const {
  successfulData: settledUsers,
  loading: loadingSettled,
  progress: settledProgress,
  errors: settledErrors,
  data: settledResults,
  execute: executeSettled,
  reset: resetSettled,
} = useApiBatch<User>([
  '/users/69493fa4b9a358cdfc0db248',
  '/users/698c74738e5e27e2d3d6779a',
  '/users/698c745e8e5e27e2d3d67793',
  '/users/697536f44260e0bb7f0af278',
  '/users/6962d0e91085cb4cdf3a0aa8'
], {
  onProgress: (p) => console.log(`Progress: ${p.percentage}% (${p.succeeded} ok, ${p.failed} failed)`),
  onItemSuccess: (item) => console.log(`✅ Loaded: ${item.url}`),
  onItemError: (item) => console.log(`❌ Failed: ${item.url}`, item.error?.message),
})

/**
 * Fetch 5 users using useApiBatch
 */
async function fetchUsingBatchHelper() {
  resetBatch()
  await executeBatch()
  console.log('✅ useApiBatch completed:', batchUsers.value.length, 'users')
}

/**
 * Fetch mixed URLs (some will fail)
 */
async function fetchUsingBatchSettled() {
  resetSettled()
  await executeSettled()
  console.log(`✅ Settled completed - Success: ${settledProgress.value.succeeded}, Failed: ${settledProgress.value.failed}`)
}
</script>

<template>
  <div class="promise-all-demo">
    <h2>useApiBatch Demo - Parallel Requests with Reactive State</h2>

    <div class="section highlight">
      <h3>✨ Example 1: Basic Batch (5 Users)</h3>
      <p class="description">
        <strong>Feature:</strong> Reactive <code>loading</code>, <code>progress</code>, <code>successfulData</code> out of the box.
        <br>No manual state management needed!
      </p>

      <button
        @click="fetchUsingBatchHelper"
        :disabled="loadingBatch"
        class="btn-success"
      >
        {{ loadingBatch ? 'Loading...' : 'Fetch 5 Users (useApiBatch)' }}
      </button>

      <!-- Progress Bar -->
      <div v-if="loadingBatch" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: batchProgress.percentage + '%' }"></div>
        </div>
        <span>{{ batchProgress.completed }} / {{ batchProgress.total }} ({{ batchProgress.percentage }}%)</span>
      </div>

      <div v-if="batchUsers.length > 0" class="results">
        <h4>✅ Results ({{ batchUsers.length }} users loaded):</h4>

        <div class="comparison">
          <div class="code-block">
            <h5>❌ Old Way (Manual State):</h5>
            <pre><code>const users = ref([])
const loading = ref(false)

async function fetch() {
  loading.value = true
  const requests = ids.map(id => {
    const { execute } = useApi(`/users/${id}`)
    return execute()
  })
  users.value = await Promise.all(requests)
  loading.value = false
}</code></pre>
          </div>
          <div class="code-block">
            <h5>✅ New Way (Reactive):</h5>
            <pre><code>const {
  successfulData: users,
  loading,
  progress,
  execute
} = useApiBatch([
  '/users/1',
  '/users/2',
  '/users/3'
])

// That's it! ✨</code></pre>
          </div>
        </div>

        <div class="user-grid">
          <div v-for="user in batchUsers" :key="user.id" class="user-card">
            <div class="user-avatar">{{ user.name[0] }}</div>
            <div class="user-info">
              <strong>{{ user.name }}</strong>
              <small>{{ user.email }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section highlight">
      <h3>✨ Example 2: Batch with Errors (Error Tolerant)</h3>
      <p class="description">
        <strong>Feature:</strong> <code>settled: true</code> by default - failed requests don't break the batch.
        <br>Track individual errors via <code>errors</code> array and detailed <code>progress</code>.
      </p>

      <button
        @click="fetchUsingBatchSettled"
        :disabled="loadingSettled"
        class="btn-success"
      >
        {{ loadingSettled ? 'Loading...' : 'Fetch Mixed (with 2 failing URLs)' }}
      </button>

      <!-- Progress Bar -->
      <div v-if="loadingSettled" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: settledProgress.percentage + '%' }"></div>
        </div>
        <span>{{ settledProgress.completed }} / {{ settledProgress.total }} ({{ settledProgress.percentage }}%)</span>
      </div>

      <div v-if="settledResults.length > 0" class="results">
        <div class="stats">
          <div class="stat success">
            <strong>{{ settledProgress.succeeded }}</strong>
            <span>Successful</span>
          </div>
          <div class="stat failed">
            <strong>{{ settledProgress.failed }}</strong>
            <span>Failed</span>
          </div>
        </div>

        <div class="comparison">
          <div class="code-block">
            <h5>❌ Old Way (Manual):</h5>
            <pre><code>const requests = ids.map(id => {
  const { execute } = useApi(`/users/${id}`, {
    skipErrorNotification: true
  })
  return execute()
})
const results = await Promise.allSettled(requests)
const successful = results
  .filter(r => r.status === 'fulfilled' && r.value)
  .map(r => r.value)
const failed = results.filter(r =>
  r.status === 'rejected' || !r.value
).length</code></pre>
          </div>
          <div class="code-block">
            <h5>✅ New Way (Reactive):</h5>
            <pre><code>const {
  successfulData,
  errors,
  progress,
  execute
} = useApiBatch([
  '/users/1',
  '/users/999', // Will fail
  '/users/3'
])

// settled: true by default ✨</code></pre>
          </div>
        </div>

        <h4>✅ Successful Users ({{ settledUsers.length }}):</h4>
        <div class="user-grid" v-if="settledUsers.length > 0">
          <div v-for="user in settledUsers" :key="user.id" class="user-card">
            <div class="user-avatar">{{ user.name[0] }}</div>
            <div class="user-info">
              <strong>{{ user.name }}</strong>
              <small>{{ user.email }}</small>
            </div>
          </div>
        </div>

        <h4 v-if="settledErrors.length > 0">❌ Errors ({{ settledErrors.length }}):</h4>
        <ul v-if="settledErrors.length > 0" class="error-list">
          <li v-for="(err, idx) in settledErrors" :key="idx" class="error-item">
            <strong>{{ err.code || 'Error' }}</strong>: {{ err.message }} (status: {{ err.status }})
          </li>
        </ul>
      </div>
    </div>

  </div>
</template>


<style scoped>
.promise-all-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.section {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section.highlight {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 2px solid #667eea;
  box-shadow: 0 4px 6px rgba(102, 126, 234, 0.1);
}

.section h3 {
  margin-top: 0;
  color: #333;
}

.description {
  margin: 0.5rem 0 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
  font-size: 0.95rem;
  line-height: 1.6;
}

.description code {
  background: #667eea;
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #42b983;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #359268;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-secondary {
  background: #3498db;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-success {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.results {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.results.warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
}

.results h4 {
  margin-top: 0;
  color: #333;
}

.results ul {
  list-style: none;
  padding: 0;
}

.results li {
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: white;
  border-radius: 4px;
}

.error {
  margin-top: 1rem;
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c00;
}

.info {
  padding: 0.75rem;
  background: #e3f2fd;
  border-radius: 4px;
  color: #1976d2;
  margin: 0.5rem 0;
}

.progress-section {
  margin-top: 1rem;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #359268);
  transition: width 0.3s ease;
}

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-info strong {
  color: #333;
}

.user-info small {
  color: #666;
  font-size: 0.875rem;
}

.stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat {
  flex: 1;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.stat.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.stat.failed {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.stat strong {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.25rem;
}

.stat span {
  color: #666;
  font-size: 0.875rem;
}

.info-section {
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.takeaways {
  list-style: none;
  padding: 0;
}

.takeaways li {
  padding: 0.75rem;
  margin: 0.5rem 0;
  background: white;
  border-radius: 6px;
  border-left: 4px solid #4caf50;
}

.takeaways code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
}

@media (max-width: 768px) {
  .comparison {
    grid-template-columns: 1fr;
  }
}

.code-block {
  background: #282c34;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.code-block h5 {
  margin: 0 0 0.75rem 0;
  color: white;
  font-size: 0.9rem;
}

.code-block pre {
  margin: 0;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
}

.code-block code {
  color: #abb2bf;
  background: transparent;
  padding: 0;
}

.error-list {
  list-style: none;
  padding: 0;
  margin-top: 0.5rem;
}

.error-item {
  padding: 0.75rem;
  margin: 0.25rem 0;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c00;
  font-size: 0.9rem;
}
</style>

