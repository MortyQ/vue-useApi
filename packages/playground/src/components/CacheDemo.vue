<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useApi, invalidateCache, clearAllCache } from '@ametie/vue-muza-use'

const STALE_TIME = 15_000 // 15 seconds — short enough to demo in browser

const requestCount = ref(0)
const lastSource = ref<'network' | 'cache' | null>(null)
const lastFetchedAt = ref<string | null>(null)

// Tracks seconds until cache expires
const ttlSeconds = ref(0)
let ttlTimer: ReturnType<typeof setInterval> | null = null

function startTtlCountdown() {
  if (ttlTimer) clearInterval(ttlTimer)
  ttlSeconds.value = Math.round(STALE_TIME / 1000)
  ttlTimer = setInterval(() => {
    if (ttlSeconds.value > 0) {
      ttlSeconds.value--
    } else {
      if (ttlTimer) clearInterval(ttlTimer)
    }
  }, 1000)
}

onUnmounted(() => {
  if (ttlTimer) clearInterval(ttlTimer)
})

const { data, loading, error, execute } = useApi<{ id: number; title: string }[]>('/lists', {
  cache: { id: 'demo-lists', staleTime: STALE_TIME },
  onSuccess: () => {
    requestCount.value++
    lastSource.value = 'network'
    lastFetchedAt.value = new Date().toLocaleTimeString()
    startTtlCountdown()
  },
})

// Execute on mount and capture whether it was a cache hit
async function fetchData() {
  const prevCount = requestCount.value
  await execute()
  // If requestCount didn't change, the response came from cache
  if (requestCount.value === prevCount && data.value) {
    lastSource.value = 'cache'
  }
}

fetchData()

function forceRefetch() {
  clearAllCache()
  fetchData()
}

function bustCache() {
  invalidateCache('demo-lists')
  fetchData()
}
</script>

<template>
  <div class="card">
    <h2>🗄️ Cache Demo</h2>
    <p class="description">
      Responses are cached for <strong>{{ STALE_TIME / 1000 }}s</strong>.
      Click <em>Refetch</em> to call <code>execute()</code> — the second call within the TTL
      is served instantly from cache without hitting the network.
    </p>

    <div class="controls">
      <button @click="fetchData" :disabled="loading">
        {{ loading ? '⏳ Loading…' : '🔄 Refetch' }}
      </button>
      <button @click="forceRefetch" :disabled="loading" class="secondary">
        ⚡ Force Network (clearAllCache)
      </button>
      <button @click="bustCache" :disabled="loading" class="secondary">
        🗑️ Invalidate Cache
      </button>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="label">Source</span>
        <span
          class="value badge"
          :class="lastSource === 'cache' ? 'badge-cache' : 'badge-network'"
        >
          {{ lastSource === 'cache' ? '⚡ Cache' : lastSource === 'network' ? '🌐 Network' : '—' }}
        </span>
      </div>
      <div class="stat">
        <span class="label">Network requests</span>
        <span class="value">{{ requestCount }}</span>
      </div>
      <div class="stat">
        <span class="label">Last fetched</span>
        <span class="value">{{ lastFetchedAt ?? '—' }}</span>
      </div>
      <div class="stat">
        <span class="label">Cache expires in</span>
        <span class="value" :class="{ dimmed: ttlSeconds === 0 }">
          {{ ttlSeconds > 0 ? `${ttlSeconds}s` : 'Expired' }}
        </span>
      </div>
    </div>

    <div v-if="error" class="error">Error: {{ error.message }}</div>

    <div v-if="data && data.length" class="data-preview">
      <h3>Data ({{ data.length }} items)</h3>
      <ul>
        <li v-for="item in data.slice(0, 5)" :key="item.id">
          <strong>#{{ item.id }}</strong> {{ item.title }}
        </li>
        <li v-if="data.length > 5" class="more">…and {{ data.length - 5 }} more</li>
      </ul>
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.description {
  color: #555;
  font-size: 0.9em;
  margin-bottom: 16px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

button {
  padding: 8px 16px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 0.9em;
}

button:hover:not(:disabled) {
  background: #33a06f;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.secondary {
  background: #607d8b;
}

button.secondary:hover:not(:disabled) {
  background: #455a64;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  background: #f7f9fb;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
}

.value {
  font-size: 1.1em;
  font-weight: bold;
  color: #2c3e50;
}

.value.dimmed {
  color: #aaa;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.9em;
}

.badge-cache {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-network {
  background: #e3f2fd;
  color: #1565c0;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.data-preview {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px 16px;
}

.data-preview h3 {
  margin: 0 0 8px;
  font-size: 0.9em;
  color: #555;
}

ul {
  margin: 0;
  padding-left: 18px;
}

li {
  margin-bottom: 4px;
  font-size: 0.9em;
}

li.more {
  color: #888;
  list-style: none;
  margin-top: 4px;
}
</style>
