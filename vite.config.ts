import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'supabase-vendor',
              test: /node_modules[\\/]@supabase/,
              priority: 20,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|react-router)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
