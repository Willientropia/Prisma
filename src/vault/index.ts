// API do cofre. No app: comandos do Rust (src-tauri/src/vault.rs).
// No navegador (npm run dev sem Tauri): cofre em memória com resources/exemplos, para desenvolver a interface.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

export type Entry = { path: string; modified: number };
export type Recent = { vault: string; path: string; opened: number; modified: number | null };

export type VaultApi = {
  pick(): Promise<string | null>;
  open(root: string): Promise<Entry[]>;
  list(): Promise<Entry[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  recent(): Promise<Recent[]>;
  addRecent(vault: string, path: string): Promise<Recent[]>;
  onChange(cb: (paths: string[]) => void): void;
};

const tauriVault: VaultApi = {
  pick: async () => {
    const r = await openDialog({ directory: true, title: 'Abrir cofre' });
    return typeof r === 'string' ? r : null;
  },
  open: (path) => invoke('vault_open', { path }),
  list: () => invoke('vault_list'),
  read: (path) => invoke('vault_read', { path }),
  write: (path, content) => invoke('vault_write', { path, content }),
  recent: () => invoke('recent_list'),
  addRecent: (vault, path) => invoke('recent_add', { vault, path }),
  onChange: (cb) => { void listen<string[]>('vault-changed', (e) => cb(e.payload)); },
};

function memoryVault(): VaultApi {
  const PREFIX = '/resources/exemplos/';
  const ROOT = 'exemplos (navegador)';
  const src = import.meta.glob('/resources/exemplos/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = new Map(Object.entries(src).map(([k, v]) => [k.slice(PREFIX.length), { text: v, modified: Date.now() }]));
  const listeners: ((paths: string[]) => void)[] = [];
  let recents: Recent[] = [];
  const list = async () => [...files].map(([path, f]) => ({ path, modified: f.modified })).sort((a, b) => a.path.localeCompare(b.path));
  const put = (path: string, text: string) => files.set(path, { text, modified: Date.now() });

  // Simula edição externa pelo console: prismaDev.write('Sol Tech/Boa Vista/cabos-cc.caderno.md', '...')
  (window as unknown as { prismaDev: object }).prismaDev = {
    read: (p: string) => files.get(p)?.text,
    write: (p: string, t: string) => { put(p, t); listeners.forEach((l) => l([p])); },
  };

  return {
    pick: async () => ROOT,
    open: async () => list(),
    list,
    read: async (p) => { const f = files.get(p); if (!f) throw new Error(`Arquivo não encontrado: ${p}`); return f.text; },
    write: async (p, t) => { put(p, t); },
    recent: async () => recents,
    addRecent: async (vault, path) => {
      recents = [{ vault, path, opened: Date.now(), modified: files.get(path)?.modified ?? null }, ...recents.filter((r) => r.path !== path)].slice(0, 20);
      return recents;
    },
    onChange: (cb) => { listeners.push(cb); },
  };
}

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const vault: VaultApi = isTauri ? tauriVault : memoryVault();
