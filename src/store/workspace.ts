// Workspace: abas, documento ativo, projeto ativo (opcional). Comportamento de programa CAD (ADENDO 01, A4).
import { create } from 'zustand';
import { parse as parseYaml, parseDocument } from 'yaml';
import { APP_NAME, type DocType } from '../constants';
import { lines, normalizeForSave, parse, serialize } from '../format/doc';
import { classifyFile, EDITOR_TIPO, extOf, TIPO_EXT, tipoByExt, type Tipo } from '../format/views';
import { basename, dirname, joinPath, normPath, relativePath, samePath, stem } from '../format/display';
import { platform, type AppPaths, type Recovered, type RecentItem, type Filter } from '../platform';
import type { RibbonTab } from '../shell/ribbons';
import type { EvalResult } from '../engine/evaluate';
import { importSm } from '../format/smath';
import { appFormat, stampFormat } from '../engine/prepare';

export type OpenDoc = {
  id: string; // caminho do arquivo, ou "novo:Caderno1" enquanto não foi salvo
  path: string | null;
  name: string; // "cabos-cc.prsm" ou "Caderno1"
  ext: string;
  type: DocType; // editor
  text: string;
  dirty: boolean;
  readOnly: boolean;
  factory?: boolean; // arquivo de fábrica (recursos do programa): nunca é gravado
  recovery?: string; // arquivo em %LOCALAPPDATA%\Prisma\recuperacao
  addToProject?: boolean; // criado por "Novo arquivo no projeto": entra no .prsp ao salvar
};

export type ProjectList = 'arquivos' | 'documentos' | 'bibliotecas';
export type Project = { path: string; dir: string; nome: string; lists: Record<ProjectList, string[]>; exists: Record<string, boolean> };

/** Diálogo de formato do resultado: padrão do app (Configurações), do documento ou de uma região (F-CONFIG). */
type FormatDialogTarget = { scope: 'app' } | { scope: 'doc'; docId: string } | { scope: 'region'; docId: string; regionId: string };

export type DialogButton = { id: string; label: string; primary?: boolean };
/** compare: definição antiga e nova lado a lado (Salvar na biblioteca, Fase 4). */
export type DialogSpec = { title: string; message: string; buttons: DialogButton[]; input?: string; compare?: { before: string; after: string } };
type OpenDialogState = DialogSpec & { resolve: (r: { id: string; value: string }) => void };

type State = {
  paths: AppPaths | null;
  config: Record<string, unknown>;
  recents: RecentItem[];
  recovered: Recovered[];
  project: Project | null;
  dirFiles: Record<string, string[]>; // arquivos de cada pasta já listada (para [[links]])
  openDocs: OpenDoc[];
  active: string; // 'home' ou id do documento
  ribbonTab: RibbonTab;
  menuOpen: boolean;
  exportOpen: boolean;
  fnSearchOpen: boolean; // busca de função (Ctrl+K, Inserir função)
  formatDialog: FormatDialogTarget | null; // F-CONFIG
  libsVersion: number; // sobe a cada gravação de biblioteca (rótulos de função do caderno se atualizam)
  showSource: boolean; // Exibir > Código-fonte (ADENDO 02, B1)
  status: string | null;
  results: Record<string, EvalResult>;
  calculating: boolean;
  dialog: OpenDialogState | null;

  set: (patch: Partial<State>) => void;
  ask: (d: DialogSpec) => Promise<{ id: string; value: string }>;
  init: () => Promise<void>;
  activate: (id: string) => void;
  newDoc: (type: DocType, opts?: { addToProject?: boolean }) => OpenDoc;
  openPaths: (paths: string[]) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openWithDialog: (kind: 'tudo' | 'projeto') => Promise<void>;
  edit: (id: string, start: number, end: number, insert: string) => void;
  save: (id?: string, quiet?: boolean) => Promise<boolean>;
  saveAs: (id?: string) => Promise<boolean>;
  close: (id: string) => Promise<boolean>;
  closeAll: () => Promise<boolean>;
  externalChange: (path: string) => Promise<void>;
  writeRecovery: () => Promise<void>;
  openRecovered: (name: string) => Promise<void>;
  discardRecovered: (name: string) => Promise<void>;
  removeRecent: (path: string) => Promise<void>;
  loadDir: (dir: string) => Promise<void>;
  resolveLink: (target: string, fromPath: string | null) => string | null;
  // projeto
  newProject: () => Promise<void>;
  openProject: (path: string) => Promise<void>;
  refreshProject: () => Promise<void>;
  closeProject: () => void;
  isFactory: (path: string | null) => boolean; // arquivo dos recursos do programa (somente leitura)
  projectPathOf: (path: string | null) => string | null; // relativo, se o arquivo está no projeto
  projectAdd: (paths: string[]) => Promise<void>;
  projectAddExisting: () => Promise<void>;
  projectNewFile: (type: DocType) => Promise<void>;
  projectRemove: (rel: string) => Promise<void>;
  projectLocate: (rel: string) => Promise<void>;
  projectRename: (rel: string) => Promise<void>;
};

/** Bibliotecas e modelos de fábrica nunca são gravados (Fase 4): as funções do usuário vão para a extensão. */
export const FACTORY_MSG = 'Arquivo de fábrica: somente leitura. Suas funções vão para a extensão em Documentos';
export const FACTORY_COPY_MSG = 'Arquivo de fábrica é somente leitura. Salve uma cópia.';
export const AUTOSAVE_MS = 2000;
export const RECOVERY_MS = 30000;
const autosave = new Map<string, number>();
const SESSION = String(Date.now());
const counters: Record<DocType, number> = { caderno: 0, folha: 0, lib: 0, tex: 0 };
const NEW_NAME: Record<DocType, string> = { caderno: 'Caderno', folha: 'Folha', lib: 'Biblioteca', tex: 'Documento' };
const today = () => new Date().toISOString().slice(0, 10);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const TEMPLATES: Record<DocType, (nome: string) => string> = {
  caderno: (t) => `---\ntipo: caderno\ntitulo: ${t}\nbibliotecas: []\nunidades: SI\ncriado: ${today()}\nversao_formato: 1\n---\n\n# ${t}\n`,
  folha: (t) => `---\ntipo: folha\ntitulo: ${t}\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\ncriado: ${today()}\nversao_formato: 1\n---\n`,
  lib: (t) => `---\ntipo: biblioteca\nnome: ${t}\nid: ${t.toLowerCase()}\nversao: 0.1\nconstantes: {}\nversao_formato: 1\n---\n`,
  tex: () => `\\documentclass[12pt]{article}\n\\usepackage{prisma}\n\n\\begin{document}\n\n\\section{Introdução}\n\n\\end{document}\n`,
};

const LABEL: Record<Tipo, string> = { caderno: 'Caderno Prisma', folha: 'Folha livre Prisma', biblioteca: 'Biblioteca Prisma', modelo: 'Modelo Prisma', projeto: 'Projeto Prisma', tex: 'Documento LaTeX' };
export const OPEN_FILTERS: Filter[] = [
  { name: 'Arquivos Prisma (*.prsm, *.prsf, *.prsl, *.prst, *.prsp)', extensions: ['prsm', 'prsf', 'prsl', 'prst', 'prsp'] },
  ...(['caderno', 'folha', 'biblioteca', 'modelo', 'projeto'] as Tipo[]).map((t) => ({ name: `${LABEL[t]} (*.${TIPO_EXT[t]})`, extensions: [TIPO_EXT[t]] })),
  { name: 'Documentos LaTeX (*.tex)', extensions: ['tex'] },
  { name: 'SMath Studio (*.sm)', extensions: ['sm'] }, // importado para folha livre (ADENDO 05, E7)
  { name: 'Todos os arquivos (*.*)', extensions: ['*'] },
];
const isPrisma = (ext: string) => /^prs[mflpt]$/.test(ext);
/** Grupo do .prsp onde o arquivo entra, pela extensão. */
const listFor = (path: string): ProjectList => (extOf(path) === 'tex' ? 'documentos' : extOf(path) === 'prsl' ? 'bibliotecas' : 'arquivos');
/** Pasta sugerida dentro do projeto para cada tipo novo. */
const SUBDIR: Record<DocType, string> = { caderno: 'calculos', folha: 'calculos', tex: 'memorial', lib: 'bibliotecas' };

/** Reescreve só o cabeçalho YAML (para editar as listas do .prsp), mantendo o corpo como está. */
export function rewriteFrontmatter(text: string, fn: (y: ReturnType<typeof parseDocument>) => void): string {
  const d = parse(text);
  const fm = lines(d.frontmatterRaw.replace(/^﻿/, ''));
  const y = parseDocument(fm.slice(1, -1).join(''));
  fn(y);
  return normalizeForSave(`---\n${y.toString()}---\n${d.segments.map((s) => s.raw).join('')}`);
}

export const useWorkspace = create<State>((set, get) => {
  const say = (status: string) => set({ status });
  const updateDoc = (id: string, patch: Partial<OpenDoc>) => set({ openDocs: get().openDocs.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
  const recent = async (path: string, tipo: string) => { try { set({ recents: await platform.addRecent(path, tipo) }); } catch { /* recentes não são críticos */ } };

  const readProject = async (path: string): Promise<Project> => {
    const meta = parse(await platform.read(path)).meta;
    const list = (k: ProjectList) => (Array.isArray(meta[k]) ? (meta[k] as unknown[]).map(String) : []);
    const lists = { arquivos: list('arquivos'), documentos: list('documentos'), bibliotecas: list('bibliotecas') };
    const dir = dirname(path);
    const all = Object.values(lists).flat();
    const st = await platform.stat(all.map((r) => joinPath(dir, r)));
    return { path, dir, nome: String(meta.nome ?? stem(path)), lists, exists: Object.fromEntries(all.map((r, i) => [r, st[i] !== null])) };
  };

  /**
   * .sm do SMath Studio (ADENDO 05, E7): converte para <nome>.prsf na mesma pasta, extrai as imagens para
   * <nome>_arquivos/ e abre a folha. O .sm só é lido. Se o .prsf já existe, pergunta antes de sobrescrever.
   */
  const importSmath = async (path: string) => {
    const nome = stem(path);
    const target = joinPath(dirname(path), `${nome}.prsf`);
    try {
      const r = importSm(await platform.read(path), nome);
      const [exists] = await platform.stat([target]);
      if (exists !== null) {
        const q = await get().ask({ title: 'Importar do SMath', message: `Já existe ${nome}.prsf nesta pasta. Substituir pelo que veio de ${basename(path)}?`, buttons: [{ id: 'yes', label: 'Substituir', primary: true }, { id: 'no', label: 'Cancelar' }] });
        if (q.id !== 'yes') return;
        const open = get().openDocs.find((d) => d.path && samePath(d.path, target));
        if (open) set({ openDocs: get().openDocs.filter((d) => d !== open) });
      }
      for (const img of r.images) await platform.writeBase64(joinPath(dirname(path), img.path), img.base64);
      await platform.write(target, normalizeForSave(r.text));
      await get().openFile(target);
      const kinds = [...new Set(r.unsupported.map((u) => u.reason.replace(/ \(.*$/, '')))];
      say(`Importado: ${r.regions} regiões${r.unsupported.length ? `, ${r.unsupported.length} não suportadas (${kinds.join(', ')})` : ''}`);
    } catch (e) {
      say(`Não foi possível importar ${basename(path)}: ${errMsg(e)}`);
    }
  };

  const writeProject = async (mutate: (lists: Record<ProjectList, string[]>) => void) => {
    const p = get().project;
    if (!p) return;
    const lists = { arquivos: [...p.lists.arquivos], documentos: [...p.lists.documentos], bibliotecas: [...p.lists.bibliotecas] };
    mutate(lists);
    const text = rewriteFrontmatter(await platform.read(p.path), (y) => { for (const k of Object.keys(lists) as ProjectList[]) y.set(k, lists[k]); });
    await platform.write(p.path, text);
    await get().refreshProject();
  };

  return {
    paths: null,
    config: {},
    recents: [],
    recovered: [],
    project: null,
    dirFiles: {},
    openDocs: [],
    active: 'home',
    ribbonTab: 'inicio',
    menuOpen: false,
    exportOpen: false,
    showSource: false,
    status: null,
    results: {},
    calculating: false,
    dialog: null,
    fnSearchOpen: false,
    formatDialog: null,
    libsVersion: 0,
    set: (patch) => set(patch),

    ask: (d) => new Promise((resolve) => set({ dialog: { ...d, resolve: (r) => { set({ dialog: null }); resolve(r); } } })),

    init: async () => {
      const [paths, config, recents, recovered] = await Promise.all([
        platform.paths().catch(() => null),
        platform.config().then((t) => (parseYaml(t) ?? {}) as Record<string, unknown>).catch(() => ({})),
        platform.recent().catch(() => []),
        platform.recoveryList().catch(() => []),
      ]);
      set({ paths, config, recents, recovered });
      await get().openPaths(await platform.startupFiles().catch(() => []));
    },

    isFactory: (path) => { const f = get().paths?.factory; return !!f && !!path && normPath(path).toLowerCase().startsWith(`${normPath(f).toLowerCase()}/`); },

    activate: (id) => set({ active: id, ribbonTab: 'inicio', menuOpen: false, status: null }),

    newDoc: (type, opts) => {
      const name = `${NEW_NAME[type]}${++counters[type]}`;
      const ext = TIPO_EXT[EDITOR_TIPO[type]];
      const doc: OpenDoc = { id: `novo:${name}`, path: null, name, ext, type, text: type === 'caderno' || type === 'folha' ? stampFormat(TEMPLATES[type](name), appFormat(get().config)) : TEMPLATES[type](name), dirty: false, readOnly: false, addToProject: opts?.addToProject };
      set({ openDocs: [...get().openDocs, doc] });
      get().activate(doc.id);
      return doc;
    },

    openPaths: async (paths) => {
      for (const p of paths) {
        if (extOf(p) === 'prsp') await get().openProject(p);
        else await get().openFile(p);
      }
    },

    openFile: async (path) => {
      if (extOf(path) === 'sm') return importSmath(path);
      const open = get().openDocs.find((d) => d.path && samePath(d.path, path));
      if (open) return get().activate(open.id);
      try {
        const text = await platform.read(path);
        const ext = extOf(path);
        const meta = isPrisma(ext) ? parse(text).meta : {};
        const c = classifyFile(path, meta);
        if (c.tipo === 'projeto') return get().openProject(path);
        if (!c.editor) return say(c.warnings.join(' ') || `Não sei abrir ${basename(path)}`);
        const factory = get().isFactory(path);
        const doc: OpenDoc = { id: path, path, name: basename(path), ext, type: c.editor, text, dirty: false, readOnly: c.readOnly || factory, factory };
        set({ openDocs: [...get().openDocs, doc] });
        get().activate(path);
        if (c.warnings.length) say(c.warnings.join(' '));
        void recent(path, c.tipo);
      } catch (e) {
        say(`Não foi possível abrir ${basename(path)}: ${errMsg(e)}`);
      }
    },

    openWithDialog: async (kind) => {
      set({ menuOpen: false });
      const filters = kind === 'projeto' ? [OPEN_FILTERS.find((f) => f.extensions[0] === 'prsp')!] : OPEN_FILTERS;
      const def = get().project?.dir ?? get().paths?.docs;
      await get().openPaths(await platform.openDialog(filters, kind !== 'projeto', def));
    },

    edit: (id, start, end, insert) => {
      const doc = get().openDocs.find((d) => d.id === id);
      if (!doc) return;
      if (doc.readOnly) return say(doc.factory ? FACTORY_MSG : 'Arquivo em somente leitura (formato mais novo que esta versão do Prisma)');
      updateDoc(id, { text: doc.text.slice(0, start) + insert + doc.text.slice(end), dirty: true });
      clearTimeout(autosave.get(id));
      if (doc.path) autosave.set(id, window.setTimeout(() => void get().save(id, true), AUTOSAVE_MS)); // só arquivo que já existe em disco
    },

    save: async (id, quiet) => {
      const doc = get().openDocs.find((d) => d.id === (id ?? get().active));
      if (!doc) return false;
      // de fábrica: nunca grava ali; oferece salvar uma cópia em Documentos (F4-07c)
      if (doc.factory) { const ok = await get().saveAs(doc.id); if (!ok) say(FACTORY_COPY_MSG); return ok; }
      if (doc.readOnly) { say('Arquivo em somente leitura'); return false; }
      if (!doc.path) return get().saveAs(doc.id);
      clearTimeout(autosave.get(doc.id));
      // Prisma: serializa (sem edição devolve os mesmos bytes) e grava em UTF-8 sem BOM com LF
      const text = isPrisma(doc.ext) ? normalizeForSave(serialize(parse(doc.text))) : doc.text;
      try {
        await platform.write(doc.path, text);
        const cur = get().openDocs.find((d) => d.id === doc.id);
        if (cur && cur.text === doc.text) updateDoc(doc.id, { text, dirty: false });
        if (!quiet) say(`Salvo: ${doc.name}`);
        return true;
      } catch (e) {
        say(`Erro ao salvar ${doc.name}: ${errMsg(e)}`);
        return false;
      }
    },

    saveAs: async (id) => {
      const doc = get().openDocs.find((d) => d.id === (id ?? get().active));
      if (!doc) return false;
      const { project, paths } = get();
      // cópia de arquivo de fábrica: sugere Documentos/Prisma/Bibliotecas (ou /Modelos)
      const factoryDir = doc.ext === 'prst' ? paths?.models : paths?.libraries;
      const baseDir = doc.factory && factoryDir ? factoryDir : doc.path ? dirname(doc.path) : project ? joinPath(project.dir, SUBDIR[doc.type]) : paths?.docs ?? '';
      if (doc.factory) say(FACTORY_COPY_MSG);
      const fileName = doc.path ? doc.name : `${doc.name}.${doc.ext}`;
      const tipo = tipoByExt(`x.${doc.ext}`) ?? 'caderno';
      let path = await platform.saveDialog(`${baseDir}/${fileName}`, [{ name: `${LABEL[tipo]} (*.${doc.ext})`, extensions: [doc.ext] }]);
      if (!path) return false;
      if (extOf(path) !== doc.ext) path = `${path}.${doc.ext}`;
      if (get().isFactory(path)) { say(FACTORY_COPY_MSG); return false; } // nunca nos recursos do programa
      const text = isPrisma(doc.ext) ? normalizeForSave(serialize(parse(doc.text))) : doc.text;
      try {
        await platform.write(path, text);
      } catch (e) {
        say(`Erro ao salvar: ${errMsg(e)}`);
        return false;
      }
      if (doc.recovery) void platform.recoveryDelete(doc.recovery);
      const fresh: OpenDoc = { ...doc, id: path, path, name: basename(path), text, dirty: false, recovery: undefined, addToProject: undefined, factory: false, readOnly: doc.factory ? false : doc.readOnly };
      const { [doc.id]: res, ...results } = get().results;
      set({
        openDocs: get().openDocs.map((d) => (d.id === doc.id ? fresh : d)),
        active: get().active === doc.id ? path : get().active,
        results: res ? { ...results, [path]: res } : results,
        status: `Salvo: ${fresh.name}`,
      });
      void recent(path, tipo);
      if (doc.addToProject && get().project) await get().projectAdd([path]);
      return true;
    },

    close: async (id) => {
      const doc = get().openDocs.find((d) => d.id === id);
      if (!doc) return true;
      if (doc.dirty) {
        get().activate(id);
        const r = await get().ask({
          title: APP_NAME, message: `Salvar alterações em ${doc.name}?`,
          buttons: [{ id: 'save', label: 'Salvar', primary: true }, { id: 'discard', label: 'Não salvar' }, { id: 'cancel', label: 'Cancelar' }],
        });
        if (r.id === 'cancel') return false;
        if (r.id === 'save' && !(await get().save(id))) return false;
        if (r.id === 'discard' && doc.recovery) void platform.recoveryDelete(doc.recovery);
      }
      clearTimeout(autosave.get(id));
      const docs = get().openDocs;
      const i = docs.findIndex((d) => d.id === id);
      const rest = docs.filter((d) => d.id !== id);
      const next = get().active === id ? (rest[Math.min(i, rest.length - 1)]?.id ?? 'home') : get().active;
      set({ openDocs: rest, active: next, menuOpen: false, status: null });
      return true;
    },

    closeAll: async () => {
      for (const d of get().openDocs.filter((x) => x.dirty)) if (!(await get().close(d.id))) return false;
      return true;
    },

    externalChange: async (path) => {
      const { project } = get();
      if (project && (samePath(path, project.path) || Object.keys(project.exists).some((r) => samePath(joinPath(project.dir, r), path)))) await get().refreshProject();
      const doc = get().openDocs.find((d) => d.path && samePath(d.path, path));
      if (!doc) return;
      let text: string;
      try {
        text = await platform.read(path);
      } catch {
        return say(`${doc.name} foi removido ou renomeado fora do ${APP_NAME}`);
      }
      const cur = get().openDocs.find((d) => d.id === doc.id);
      if (!cur || text === cur.text) return; // inclui o eco das nossas gravações
      if (cur.dirty) {
        const r = await get().ask({
          title: APP_NAME, message: `${cur.name} mudou fora do ${APP_NAME}. Descartar suas alterações e carregar a versão do disco?`,
          buttons: [{ id: 'reload', label: 'Carregar do disco', primary: true }, { id: 'keep', label: 'Manter as minhas' }],
        });
        if (r.id !== 'reload') return;
      }
      clearTimeout(autosave.get(doc.id));
      updateDoc(doc.id, { text, dirty: false });
      say(`${doc.name} atualizado: mudou fora do ${APP_NAME}`);
    },

    // documento novo nunca salvo vai para recuperacao\ a cada 30 s (o autossalvar só vale para arquivo em disco)
    writeRecovery: async () => {
      for (const d of get().openDocs.filter((x) => !x.path && x.dirty)) {
        const name = d.recovery ?? `${SESSION}-${d.name}.${d.ext}`;
        try { await platform.recoveryWrite(name, d.text); if (!d.recovery) updateDoc(d.id, { recovery: name }); } catch { /* tenta de novo em 30 s */ }
      }
    },

    openRecovered: async (name) => {
      const text = await platform.recoveryRead(name);
      const ext = extOf(name);
      const c = classifyFile(`x.${ext}`, isPrisma(ext) ? parse(text).meta : {});
      if (!c.editor) return say(`Não sei abrir ${name}`);
      const display = name.replace(/^\d+-/, '').replace(/\.[^.]+$/, '');
      const doc: OpenDoc = { id: `novo:${name}`, path: null, name: display, ext, type: c.editor, text, dirty: true, readOnly: false, recovery: name };
      set({ openDocs: [...get().openDocs, doc], recovered: get().recovered.filter((r) => r.name !== name) });
      get().activate(doc.id);
    },

    discardRecovered: async (name) => {
      const r = await get().ask({ title: APP_NAME, message: `Descartar ${name.replace(/^\d+-/, '')}? Isso não pode ser desfeito.`, buttons: [{ id: 'yes', label: 'Descartar', primary: true }, { id: 'no', label: 'Cancelar' }] });
      if (r.id !== 'yes') return;
      await platform.recoveryDelete(name);
      set({ recovered: get().recovered.filter((x) => x.name !== name) });
    },

    removeRecent: async (path) => { set({ recents: await platform.removeRecent(path) }); },

    loadDir: async (dir) => {
      if (!dir || get().dirFiles[dir]) return;
      try { set({ dirFiles: { ...get().dirFiles, [dir]: await platform.listDir(dir) } }); } catch { set({ dirFiles: { ...get().dirFiles, [dir]: [] } }); }
    },

    // [[nome]]: 1) arquivo do projeto com esse nome; 2) mesma pasta; 3) caminho relativo explícito (A6)
    resolveLink: (target, fromPath) => {
      const name = decodeURIComponent(target.split('#')[0]).trim();
      const { project, dirFiles } = get();
      const explicit = name.includes('/') || /\.[a-z]{2,4}$/i.test(name);
      if (!explicit && project) {
        const hit = Object.values(project.lists).flat().find((r) => stem(r) === name);
        if (hit) return joinPath(project.dir, hit);
      }
      if (!fromPath) return null;
      const here = dirname(fromPath);
      if (!explicit) {
        const f = (dirFiles[here] ?? []).find((x) => stem(x) === name && (tipoByExt(x) ?? '') !== '');
        return f ? `${here}/${f}` : null;
      }
      const abs = joinPath(here, name);
      return (dirFiles[dirname(abs)] ?? []).some((x) => samePath(x, basename(abs))) ? abs : null;
    },

    newProject: async () => {
      set({ menuOpen: false });
      const chosen = await platform.saveDialog(`${get().paths?.docs ?? ''}/Novo projeto.prsp`, [OPEN_FILTERS.find((f) => f.extensions[0] === 'prsp')!]);
      if (!chosen) return;
      try {
        const file = await platform.createProject(extOf(chosen) === 'prsp' ? chosen : `${chosen}.prsp`);
        await get().openProject(file);
      } catch (e) {
        say(`Não foi possível criar o projeto: ${errMsg(e)}`);
      }
    },

    openProject: async (path) => {
      try {
        const project = await readProject(path);
        set({ project, status: `Projeto aberto: ${project.nome}` });
        void recent(path, 'projeto');
      } catch (e) {
        say(`Não foi possível abrir o projeto: ${errMsg(e)}`);
      }
    },

    refreshProject: async () => {
      const p = get().project;
      if (!p) return;
      try { set({ project: await readProject(p.path) }); } catch (e) { say(`Projeto ${p.nome}: ${errMsg(e)}`); }
    },

    closeProject: () => set({ project: null, status: null }),

    projectPathOf: (path) => {
      const p = get().project;
      if (!p || !path) return null;
      return Object.values(p.lists).flat().find((r) => samePath(joinPath(p.dir, r), path)) ?? null;
    },

    projectAdd: async (paths) => {
      const p = get().project;
      if (!p) return;
      const rels = paths.map((x) => relativePath(p.dir, x));
      await writeProject((lists) => {
        paths.forEach((x, i) => { const k = listFor(x); if (!lists[k].includes(rels[i])) lists[k].push(rels[i]); });
      });
      if (rels.some((r) => r.startsWith('../') || /^([A-Za-z]:)?\//.test(r))) say('Arquivo fora da pasta do projeto: o projeto deixa de ser portátil.');
    },

    projectAddExisting: async () => {
      const p = get().project;
      if (!p) return;
      const picked = await platform.openDialog(OPEN_FILTERS.filter((f) => f.extensions[0] !== 'prsp'), true, p.dir);
      if (picked.length) await get().projectAdd(picked);
    },

    projectNewFile: async (type) => {
      const doc = get().newDoc(type, { addToProject: true });
      await get().saveAs(doc.id);
    },

    projectRemove: async (rel) => { await writeProject((lists) => { for (const k of Object.keys(lists) as ProjectList[]) lists[k] = lists[k].filter((r) => r !== rel); }); },

    projectLocate: async (rel) => {
      const p = get().project;
      if (!p) return;
      const [found] = await platform.openDialog(OPEN_FILTERS, false, p.dir);
      if (!found) return;
      const next = relativePath(p.dir, found);
      await writeProject((lists) => { for (const k of Object.keys(lists) as ProjectList[]) lists[k] = lists[k].map((r) => (r === rel ? next : r)); });
    },

    projectRename: async (rel) => {
      const p = get().project;
      if (!p) return;
      const from = joinPath(p.dir, rel);
      const r = await get().ask({ title: 'Renomear', message: `Novo nome para ${basename(rel)}:`, input: basename(rel), buttons: [{ id: 'ok', label: 'Renomear', primary: true }, { id: 'cancel', label: 'Cancelar' }] });
      const name = r.value.trim();
      if (r.id !== 'ok' || !name || name === basename(rel)) return;
      const finalName = extOf(name) === extOf(rel) ? name : `${name}.${extOf(rel)}`;
      const to = `${dirname(from)}/${finalName}`;
      try {
        await platform.rename(from, to);
      } catch (e) {
        return say(`Não foi possível renomear: ${errMsg(e)}`);
      }
      const nextRel = relativePath(p.dir, to);
      await writeProject((lists) => { for (const k of Object.keys(lists) as ProjectList[]) lists[k] = lists[k].map((x) => (x === rel ? nextRel : x)); });
      const open = get().openDocs.find((d) => d.path && samePath(d.path, from));
      if (open) {
        set({ openDocs: get().openDocs.map((d) => (d === open ? { ...d, id: to, path: to, name: finalName } : d)), active: get().active === open.id ? to : get().active });
      }
    },
  };
});

export const activeDoc = (s: State): OpenDoc | undefined => s.openDocs.find((d) => d.id === s.active);
