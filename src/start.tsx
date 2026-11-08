import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';
import './commands/app';
import './commands/library';
import { App } from './App';
import { RECOVERY_MS, useWorkspace } from './store/workspace';
import { platform } from './platform';
import { joinPath } from './format/display';
import { recalc } from './engine/run';

const ws = useWorkspace.getState;

// arquivo mudou fora do app (Git, outra IA, outro editor)
platform.onFileChanged((path) => {
  void ws().externalChange(path).then(() => { if (path.toLowerCase().endsWith('.prsl')) void recalc(ws().active); });
});
// segundo duplo clique no Explorador: abre em aba na janela que já está aberta
platform.onOpenFiles((paths) => void ws().openPaths(paths));

// observa os arquivos abertos e os do projeto
let watched = '';
useWorkspace.subscribe((s) => {
  const p = s.project;
  const paths = [...s.openDocs.flatMap((d) => (d.path ? [d.path] : [])), ...(p ? [p.path, ...Object.values(p.lists).flat().map((r) => joinPath(p.dir, r))] : [])];
  const key = [...new Set(paths)].sort().join('\n');
  if (key !== watched) { watched = key; void platform.watch(key ? key.split('\n') : []).catch(() => {}); }
});

// documentos novos com alterações vão para a recuperação a cada 30 s
window.setInterval(() => void ws().writeRecovery(), RECOVERY_MS);

// fechar a janela com alterações: pergunta Salvar / Não salvar / Cancelar para cada documento
const win = getCurrentWindow();
void win.onCloseRequested(async (e) => {
  if (!ws().openDocs.some((d) => d.dirty)) return;
  e.preventDefault();
  if (await ws().closeAll()) await win.destroy();
});

// Tauri simulado (navegador e testes): ganchos para abrir arquivo e ler o documento ativo
const dev = (window as unknown as { prismaDev?: Record<string, unknown> }).prismaDev;
if (dev) {
  Object.assign(dev, {
    open: (p: string) => ws().openPaths([p]),
    newDoc: (t: 'caderno' | 'folha' | 'tex' | 'lib') => ws().newDoc(t).id,
    text: () => ws().openDocs.find((d) => d.id === ws().active)?.text,
    state: () => ws(),
  });
}

void ws().init();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
