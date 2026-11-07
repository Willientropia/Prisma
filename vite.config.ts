import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Porta fixa: o Tauri aponta para ela (src-tauri/tauri.conf.json, devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  // app desktop carregado do disco: o math.js (~600 kB) no pacote principal não pesa como pesaria na web
  build: { chunkSizeWarningLimit: 1500 },
});
