// Tauri simulado (ADENDO 03, C1): no navegador (npm run dev e testes), o app usa o mesmo código do
// desktop (src/platform.ts chama invoke/listen) e este módulo responde no lugar do Rust, com um disco
// em memória carregado de tests/fixtures e dos recursos de fábrica. Os nomes e erros seguem src-tauri/src.
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { emit } from '@tauri-apps/api/event';

export const DOCS = 'C:/Users/voce/Documents';
export const FACTORY = 'C:/Program Files/Prisma';
const APP_DOCS = `${DOCS}/Prisma`;
const EXT = /\.(prsm|prsf|prsl|prst|prsp|tex|bib|cls|sty|md|txt)$/i;

type File = { text: string; modified: number };
const disk = new Map<string, File>();
const norm = (p: string) => p.replace(/\\/g, '/');
const key = (p: string) => norm(p).toLowerCase();
const find = (p: string) => [...disk.keys()].find((k) => key(k) === key(p));
const dir = (p: string) => norm(p).replace(/\/[^/]*$/, '');
const base = (p: string) => norm(p).split('/').pop() ?? p;
let clock = Date.parse('2026-11-07T14:00:00-03:00'); // datas determinísticas
const tick = () => (clock += 1000);
const put = (p: string, text: string) => disk.set(find(p) ?? norm(p), { text, modified: tick() });

// arquivos de exemplo e de fábrica (os de fixtures entram sozinhos, inclusive novos)
const fixtures = import.meta.glob('/tests/fixtures/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
for (const [k, v] of Object.entries(fixtures)) {
  const rel = k.replace('/tests/fixtures/', '');
  put(rel.startsWith('usina-boa-vista/') ? `${DOCS}/Usina Boa Vista/${rel.slice('usina-boa-vista/'.length)}` : `${DOCS}/${rel}`, v);
}
const factory = import.meta.glob('/resources/{bibliotecas,modelos}/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
for (const [k, v] of Object.entries(factory)) put(`${FACTORY}/${k.replace('/resources/', '')}`, v);

const checked = (p: string) => {
  if (!/^([A-Za-z]:)?\//.test(norm(p))) throw `Caminho precisa ser absoluto: ${p}`;
  if (!EXT.test(p) && base(p) !== '.gitignore') throw `Tipo de arquivo não permitido: ${base(p)}`;
  return p;
};
const read = (p: string) => { const f = find(checked(p)); if (!f) throw `O sistema não pode encontrar o arquivo especificado: ${p}`; return disk.get(f)!.text; };

type Recent = { path: string; tipo: string; data: number };
let recents: Recent[] = [];
const recovery = new Map<string, File>();
const watched = new Set<string>();
/** Respostas para os diálogos de abrir/salvar (testes). Vazio: pergunta com window.prompt. */
const dialogAnswers: (string | string[] | null)[] = [];
/** Diálogos pedidos pelo app (testes conferem título, pasta e filtros). */
const dialogLog: { kind: 'open' | 'save'; options: unknown }[] = [];
const ask = (title: string, def?: string) => {
  if (dialogAnswers.length) return dialogAnswers.shift()!;
  const r = window.prompt(`${title} (caminho)\n\nArquivos:\n${[...disk.keys()].join('\n')}`, def ?? '');
  return r ? norm(r) : null;
};
const withMtime = (l: Recent[]) => l.map((r) => ({ ...r, modified: disk.get(find(r.path) ?? '')?.modified ?? null }));

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'projeto';

const handlers: Record<string, (a: Record<string, unknown>) => unknown> = {
  file_read: (a) => read(String(a.path)),
  file_write: (a) => { put(checked(String(a.path)), String(a.content)); return null; },
  file_stat: (a) => (a.paths as string[]).map((p) => disk.get(find(p) ?? '')?.modified ?? null),
  file_rename: (a) => {
    const from = find(checked(String(a.from)));
    if (!from) throw 'O sistema não pode encontrar o arquivo especificado';
    if (find(checked(String(a.to)))) throw `Já existe um arquivo com esse nome: ${a.to}`;
    disk.set(norm(String(a.to)), disk.get(from)!);
    disk.delete(from);
    return null;
  },
  dir_list: (a) => [...disk.keys()].filter((k) => key(dir(k)) === key(String(a.path))).map(base).sort(),
  watch_set: (a) => { watched.clear(); (a.paths as string[]).forEach((p) => watched.add(key(p))); return null; },
  project_create: (a) => {
    const chosen = norm(String(a.path));
    const name = base(chosen).replace(/\.prsp$/i, '');
    const root = `${dir(chosen)}/${name}`;
    const file = `${root}/${slug(name)}.prsp`;
    if (find(file)) throw `Já existe um projeto em ${file}`;
    put(`${root}/.gitignore`, '.prisma-cache/\n');
    put(file, `---\ntipo: projeto\nnome: ${JSON.stringify(name)}\narquivos: []\ndocumentos: []\nbibliotecas: []\nversao_formato: 1\n---\n`);
    return file;
  },
  app_paths: () => ({ docs: APP_DOCS, libraries: `${APP_DOCS}/Bibliotecas`, models: `${APP_DOCS}/Modelos`, skills: `${APP_DOCS}/Skills` }),
  config_read: () => '# Configuração do Prisma\nunidades: SI\ncasas_decimais: 2\nseparador_decimal: ","\nmotor_latex: tectonic\ntema: grafite-violeta\n',
  library_files: () => ({
    user: [...disk.keys()].filter((k) => key(dir(k)) === key(`${APP_DOCS}/Bibliotecas`) && /\.prsl$/i.test(k)).sort(),
    factory: [...disk.keys()].filter((k) => key(dir(k)) === key(`${FACTORY}/bibliotecas`) && /\.prsl$/i.test(k)).sort(),
  }),
  recovery_list: () => [...recovery].map(([name, f]) => ({ name, modified: f.modified })),
  recovery_read: (a) => recovery.get(String(a.name))?.text ?? '',
  recovery_write: (a) => { recovery.set(String(a.name), { text: String(a.content), modified: tick() }); return null; },
  recovery_delete: (a) => { recovery.delete(String(a.name)); return null; },
  startup_files: () => [],
  recent_list: () => withMtime(recents),
  recent_add: (a) => {
    recents = [{ path: String(a.path), tipo: String(a.tipo), data: tick() }, ...recents.filter((r) => r.path !== a.path)].slice(0, 30);
    return withMtime(recents);
  },
  recent_remove: (a) => { recents = recents.filter((r) => r.path !== a.path); return withMtime(recents); },
  'plugin:dialog|open': (a) => { dialogLog.push({ kind: 'open', options: a.options }); return ask('Abrir', (a.options as { defaultPath?: string })?.defaultPath); },
  'plugin:dialog|save': (a) => { dialogLog.push({ kind: 'save', options: a.options }); return ask('Salvar como', (a.options as { defaultPath?: string })?.defaultPath); },
  'plugin:opener|reveal_item_in_dir': () => null,
  'plugin:window|destroy': () => null,
};

mockWindows('main');
mockIPC((cmd, payload) => {
  const h = handlers[cmd];
  if (!h) return null; // outros comandos internos (janela, eventos já simulados pelo shouldMockEvents)
  return h((payload ?? {}) as Record<string, unknown>);
}, { shouldMockEvents: true });

/** Ganchos de teste e desenvolvimento no console (window.prismaDev). */
const changed = (p: string) => { if (watched.has(key(p))) void emit('file-changed', find(p) ?? norm(p)); };
Object.assign(window, {
  prismaDev: {
    disk,
    dialogAnswers,
    dialogLog,
    read: (p: string) => disk.get(find(p) ?? '')?.text,
    /** Grava como se fosse outro programa (Git, outro editor): avisa o app pelo evento file-changed. */
    write: (p: string, t: string) => { put(p, t); changed(p); },
    remove: (p: string) => { const f = find(p); if (f) disk.delete(f); changed(p); },
    /** Move uma pasta inteira (projeto portátil, A9-07). */
    moveDir: (from: string, to: string) => {
      for (const k of [...disk.keys()]) if (key(k).startsWith(key(from) + '/')) { disk.set(norm(to) + k.slice(from.length), disk.get(k)!); disk.delete(k); }
    },
    recoveryNames: () => [...recovery.keys()],
  },
});
