import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@ametie/vue-muza-use': resolve(__dirname, '../use-api/src/index.ts')
    }
  },
  server: {
    port: 5174,
    host: true,
  },
})
