// Acesso ao sistema. No app: comandos do Rust (src-tauri/src). No navegador (npm run dev sem Tauri):
// um disco em memória com os exemplos de resources/, para desenvolver e testar a interface.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { basename, dirname, normPath, samePath } from './format/display';

export type RecentItem = { path: string; tipo: string; data: number; modified: number | null };
export type AppPaths = { docs: string; libraries: string; models: string; skills: string };
export type Recovered = { name: string; modified: number };
export type Filter = { name: string; extensions: string[] };

export type Platform = {
  openDialog(filters: Filter[], multiple: boolean, defaultPath?: string): Promise<string[]>;
  saveDialog(defaultPath: string, filters: Filter[]): Promise<string | null>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  stat(paths: string[]): Promise<(number | null)[]>;
  listDir(dir: string): Promise<string[]>;
  rename(from: string, to: string): Promise<void>;
  watch(paths: string[]): Promise<void>;
  onFileChanged(cb: (path: string) => void): void;
  recent(): Promise<RecentItem[]>;
  addRecent(path: string, tipo: string): Promise<RecentItem[]>;
  removeRecent(path: string): Promise<RecentItem[]>;
  paths(): Promise<AppPaths>;
  config(): Promise<string>;
  libraryFiles(): Promise<{ user: string[]; factory: string[] }>;
  createProject(chosenPath: string): Promise<string>;
  recoveryList(): Promise<Recovered[]>;
  recoveryRead(name: string): Promise<string>;
  recoveryWrite(name: string, content: string): Promise<void>;
  recoveryDelete(name: string): Promise<void>;
  startupFiles(): Promise<string[]>;
  onOpenFiles(cb: (paths: string[]) => void): void;
  reveal(path: string): Promise<void>;
};

const many = (r: string | string[] | null) => (r === null ? [] : Array.isArray(r) ? r : [r]).map(normPath);

const tauriPlatform: Platform = {
  openDialog: async (filters, multiple, defaultPath) => many(await openDialog({ filters, multiple, defaultPath, title: 'Abrir' })),
  saveDialog: async (defaultPath, filters) => { const r = await saveDialog({ defaultPath, filters, title: 'Salvar como' }); return r ? normPath(r) : null; },
  read: (path) => invoke('file_read', { path }),
  write: (path, content) => invoke('file_write', { path, content }),
  stat: (paths) => invoke('file_stat', { paths }),
  listDir: (path) => invoke('dir_list', { path }),
  rename: (from, to) => invoke('file_rename', { from, to }),
  watch: (paths) => invoke('watch_set', { paths }),
  onFileChanged: (cb) => { void listen<string>('file-changed', (e) => cb(e.payload)); },
  recent: () => invoke('recent_list'),
  addRecent: (path, tipo) => invoke('recent_add', { path, tipo }),
  removeRecent: (path) => invoke('recent_remove', { path }),
  paths: () => invoke('app_paths'),
  config: () => invoke('config_read'),
  libraryFiles: () => invoke('library_files'),
  createProject: (path) => invoke('project_create', { path }),
  recoveryList: () => invoke('recovery_list'),
  recoveryRead: (name) => invoke('recovery_read', { name }),
  recoveryWrite: (name, content) => invoke('recovery_write', { name, content }),
  recoveryDelete: (name) => invoke('recovery_delete', { name }),
  startupFiles: async () => many(await invoke<string[]>('startup_files')),
  onOpenFiles: (cb) => { void listen<string[]>('open-files', (e) => cb(many(e.payload))); },
  reveal: (path) => revealItemInDir(path),
};

/** Navegador: disco em memória. Diálogos viram prompt(); prismaDev.write(caminho, texto) simula edição externa. */
function memoryPlatform(): Platform {
  const DOCS = 'C:/Users/voce/Documents/Prisma';
  const FACTORY = 'C:/Program Files/Prisma';
  const disk = new Map<string, { text: string; modified: number }>();
  const put = (p: string, text: string) => disk.set(normPath(p), { text, modified: Date.now() });
  const src = import.meta.glob('/resources/{exemplos,bibliotecas,modelos}/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  for (const [k, v] of Object.entries(src)) {
    const rel = k.replace('/resources/', '');
    put(rel.startsWith('exemplos/') ? `C:/Users/voce/Documents/${rel.slice(9)}` : `${FACTORY}/${rel}`, v);
  }
  const find = (p: string) => [...disk.keys()].find((k) => samePath(k, p));
  const listeners: ((p: string) => void)[] = [];
  let recents: RecentItem[] = [];
  const recovery = new Map<string, { text: string; modified: number }>();
  const ask = (msg: string, def: string) => { const r = window.prompt(`${msg}\n\nArquivos:\n${[...disk.keys()].join('\n')}`, def); return r ? normPath(r) : null; };

  (window as unknown as { prismaDev: object }).prismaDev = {
    disk,
    read: (p: string) => disk.get(find(p) ?? p)?.text,
    write: (p: string, t: string) => { put(find(p) ?? p, t); listeners.forEach((l) => l(find(p) ?? p)); },
    remove: (p: string) => { disk.delete(find(p) ?? p); listeners.forEach((l) => l(p)); },
  };

  const withMtime = (l: RecentItem[]) => l.map((r) => ({ ...r, modified: disk.get(find(r.path) ?? '')?.modified ?? null }));
  return {
    openDialog: async (_f, _m, def) => { const r = ask('Abrir arquivo (caminho):', def ?? ''); return r ? [r] : []; },
    saveDialog: async (def) => ask('Salvar como (caminho):', def),
    read: async (p) => { const f = find(p); if (!f) throw new Error(`Arquivo não encontrado: ${p}`); return disk.get(f)!.text; },
    write: async (p, t) => { put(find(p) ?? p, t); },
    stat: async (ps) => ps.map((p) => disk.get(find(p) ?? '')?.modified ?? null),
    listDir: async (d) => [...disk.keys()].filter((k) => samePath(dirname(k), d)).map(basename),
    rename: async (a, b) => { const f = find(a); if (!f) throw new Error('não encontrado'); if (find(b)) throw new Error('já existe'); disk.set(normPath(b), disk.get(f)!); disk.delete(f); },
    watch: async () => {},
    onFileChanged: (cb) => { listeners.push(cb); },
    recent: async () => withMtime(recents),
    addRecent: async (path, tipo) => { recents = [{ path, tipo, data: Date.now(), modified: null }, ...recents.filter((r) => r.path !== path)].slice(0, 30); return withMtime(recents); },
    removeRecent: async (path) => { recents = recents.filter((r) => r.path !== path); return withMtime(recents); },
    paths: async () => ({ docs: DOCS, libraries: `${DOCS}/Bibliotecas`, models: `${DOCS}/Modelos`, skills: `${DOCS}/Skills` }),
    config: async () => 'unidades: SI\ncasas_decimais: 2\nseparador_decimal: ","\n',
    libraryFiles: async () => ({
      user: [...disk.keys()].filter((k) => k.startsWith(`${DOCS}/Bibliotecas/`) && k.endsWith('.prsl')),
      factory: [...disk.keys()].filter((k) => k.startsWith(`${FACTORY}/bibliotecas/`) && k.endsWith('.prsl')),
    }),
    createProject: async (chosen) => {
      const name = basename(chosen).replace(/\.prsp$/i, '');
      const file = `${dirname(chosen)}/${name}/${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projeto'}.prsp`;
      if (find(file)) throw new Error('Já existe um projeto aí');
      put(`${dirname(file)}/.gitignore`, '.prisma-cache/\n');
      put(file, `---\ntipo: projeto\nnome: ${JSON.stringify(name)}\narquivos: []\ndocumentos: []\nbibliotecas: []\nversao_formato: 1\n---\n`);
      return file;
    },
    recoveryList: async () => [...recovery].map(([name, f]) => ({ name, modified: f.modified })),
    recoveryRead: async (n) => recovery.get(n)?.text ?? '',
    recoveryWrite: async (n, t) => { recovery.set(n, { text: t, modified: Date.now() }); },
    recoveryDelete: async (n) => { recovery.delete(n); },
    startupFiles: async () => [],
    onOpenFiles: () => {},
    reveal: async (p) => { window.alert(`Mostrar no Explorador: ${p}`); },
  };
}

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const platform: Platform = isTauri ? tauriPlatform : memoryPlatform();
