import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd } from 'node:process';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, cwd(), ''), ...process.env };

  return {
    // ── CRÍTICO para Electron ─────────────────────────────────────────────────
    // Vite por defecto genera rutas absolutas (/assets/...) que el navegador
    // web resuelve bien, pero Electron carga archivos desde disco y necesita
    // rutas relativas (./assets/...).  Sin esto el .exe queda en blanco.
    base: './',

    define: {
      'process.env.API_KEY':                          JSON.stringify(env.API_KEY),
      'process.env.VITE_FIREBASE_API_KEY':            JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN':        JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'process.env.VITE_FIREBASE_PROJECT_ID':         JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET':     JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID':JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'process.env.VITE_FIREBASE_APP_ID':             JSON.stringify(env.VITE_FIREBASE_APP_ID),
    },
    plugins: [react()],
  }
})