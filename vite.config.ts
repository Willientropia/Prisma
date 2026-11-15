import { realpathSync } from 'node:fs';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

// Porta fixa: o Tauri aponta para ela (src-tauri/tauri.conf.json, devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] },
    // node_modules pode ser um atalho (junction) para outra pasta, como numa worktree: sem isto as fontes do MathLive não carregam
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), realpathSync('node_modules')] },
  },
  // app desktop carregado do disco: MathLive, math.js, TipTap e CodeMirror (~2,7 MB) não pesam como pesariam na web
  build: { chunkSizeWarningLimit: 3000 },
});
