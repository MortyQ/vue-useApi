import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    shims: true,
    external: ['vue', 'axios'],
    outExtension({ format }) {
        return {
            js: format === 'cjs' ? '.cjs' : '.mjs',
        }
    },
})
