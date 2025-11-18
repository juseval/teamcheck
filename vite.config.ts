
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
// FIX: Import 'cwd' from 'node:process' to provide proper typing and avoid errors with the global 'process' object.
import { cwd } from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode`, and merge with `process.env`
  // This ensures variables from the execution environment take precedence.
  const env = { ...loadEnv(mode, cwd(), ''), ...process.env };
  
  return {
    // vite config
    define: {
      // FIX: Explicitly define `process.env` variables to be exposed to the client.
      // This resolves the "Cannot read properties of undefined" error for env vars
      // by switching from `import.meta.env` to a more robust `process.env` injection.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    },
    plugins: [react()],
  }
})