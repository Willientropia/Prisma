// Acesso ao sistema: comandos do Rust (src-tauri/src). No navegador (npm run dev e testes) o Tauri é
// simulado por src/dev/tauri-mock.ts, então este é o único caminho de código.
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { normPath } from './format/display';

export type RecentItem = { path: string; tipo: string; data: number; modified: number | null };
export type AppPaths = { docs: string; libraries: string; models: string; skills: string; factory: string };
export type Recovered = { name: string; modified: number };
export type Filter = { name: string; extensions: string[] };

export type Platform = {
  openDialog(filters: Filter[], multiple: boolean, defaultPath?: string): Promise<string[]>;
  saveDialog(defaultPath: string, filters: Filter[]): Promise<string | null>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  writeBase64(path: string, data: string): Promise<void>; // imagem extraída de um .sm
  readBase64(path: string): Promise<string>;
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
  writeBase64: (path, data) => invoke('file_write_base64', { path, data }),
  readBase64: (path) => invoke('file_read_base64', { path }),
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

export const platform: Platform = tauriPlatform;
