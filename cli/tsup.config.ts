import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs'],
  target: 'node20',
  bundle: true,
  clean: true,
  sourcemap: false,
  minify: false,
  shims: true,
})
