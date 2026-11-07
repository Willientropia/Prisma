import { create } from 'zustand';
import { parse as parseYaml } from 'yaml';
import { APP_NAME, type DocType } from '../constants';
import { parse, serialize } from '../format/doc';
import { docType } from '../format/views';
import { basename, dirname, vaultName } from '../format/display';
import { vault, type Entry, type Recent } from '../vault';
import type { RibbonTab } from '../shell/ribbons';
import type { EvalResult } from '../engine/evaluate';

export type OpenDoc = { id: string; name: string; type: DocType; folder: string; text: string; dirty: boolean };

export const AUTOSAVE_MS = 2000;
const autosave = new Map<string, number>();

type AppState = {
  vaultRoot: string | null;
  files: Entry[];
  recents: Recent[];
  config: Record<string, unknown>;
  openDocs: OpenDoc[];
  active: string; // 'home' ou caminho do documento
  ribbonTab: RibbonTab;
  menuOpen: boolean;
  exportOpen: boolean;
  status: string | null; // mensagem temporária; null = status padrão
  results: Record<string, EvalResult>; // por documento; só na memória, o arquivo guarda "= ?"
  calculating: boolean;
  set: (patch: Partial<AppState>) => void;
  activate: (id: string) => void;
  close: (id: string) => void;
  openVault: (root?: string) => Promise<boolean>;
  openFile: (path: string, root?: string) => Promise<void>;
  /** Troca o trecho [start, end) do texto; marca alteração pendente e agenda o autossalvar. */
  edit: (id: string, start: number, end: number, insert: string) => void;
  save: (id?: string, quiet?: boolean) => Promise<void>;
  newDoc: (type: DocType) => Promise<void>;
  externalChange: (paths: string[]) => Promise<void>;
};

const TEMPLATES: Record<DocType, (titulo: string) => string> = {
  caderno: (t) => `---\ntipo: caderno\ntitulo: ${t}\nbibliotecas: []\nunidades: SI\ncriado: ${today()}\nversao_formato: 1\n---\n\n# ${t}\n`,
  folha: (t) => `---\ntipo: folha\ntitulo: ${t}\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\ncriado: ${today()}\nversao_formato: 1\n---\n`,
  lib: (t) => `---\ntipo: biblioteca\nnome: ${t}\nid: sem-titulo\nversao: 0.1\nconstantes: {}\nversao_formato: 1\n---\n`,
  tex: () => `\\documentclass[12pt]{article}\n\\usepackage{prisma}\n\n\\begin{document}\n\n\\section{Introdução}\n\n\\end{document}\n`,
};
const EXT: Record<DocType, string> = { caderno: '.caderno.md', folha: '.folha.md', lib: '.lib.md', tex: '.tex' };
const today = () => new Date().toISOString().slice(0, 10);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useApp = create<AppState>((set, get) => {
  const say = (status: string) => set({ status });

  return {
    vaultRoot: null,
    files: [],
    recents: [],
    config: {},
    openDocs: [],
    active: 'home',
    ribbonTab: 'inicio',
    menuOpen: false,
    exportOpen: false,
    status: null,
    results: {},
    calculating: false,
    set: (patch) => set(patch),

    edit: (id, start, end, insert) => {
      set({ openDocs: get().openDocs.map((d) => (d.id === id ? { ...d, text: d.text.slice(0, start) + insert + d.text.slice(end), dirty: true } : d)) });
      clearTimeout(autosave.get(id));
      autosave.set(id, window.setTimeout(() => void get().save(id, true), AUTOSAVE_MS));
    },

    activate: (id) => set({ active: id, ribbonTab: 'inicio', menuOpen: false, status: null }),

    close: (id) => {
      const doc = get().openDocs.find((d) => d.id === id);
      if (doc?.dirty && !confirm(`"${doc.name}" tem alterações não salvas. Fechar mesmo assim?`)) return;
      set({ openDocs: get().openDocs.filter((d) => d.id !== id), active: get().active === id ? 'home' : get().active, menuOpen: false, status: null });
    },

    openVault: async (root) => {
      set({ menuOpen: false });
      const path = root ?? (await vault.pick());
      if (!path) return false;
      if (get().openDocs.some((d) => d.dirty) && !confirm('Há documentos com alterações não salvas. Trocar de cofre mesmo assim?')) return false;
      try {
        const files = await vault.open(path);
        const config = await vault.read('.prisma/config.yaml').then((t) => (parseYaml(t) ?? {}) as Record<string, unknown>).catch(() => ({}));
        set({ vaultRoot: path, files, config, openDocs: [], active: 'home', status: `Cofre aberto: ${vaultName(path)} · ${files.length} arquivos` });
        return true;
      } catch (e) {
        say(`Não foi possível abrir o cofre: ${errMsg(e)}`);
        return false;
      }
    },

    openFile: async (path, root) => {
      if (root && root !== get().vaultRoot && !(await get().openVault(root))) return;
      if (get().openDocs.some((d) => d.id === path)) return get().activate(path);
      const type = docType(path);
      if (!type) return say(`Tipo de arquivo não suportado: ${basename(path)}`);
      try {
        const text = await vault.read(path);
        const { vaultRoot } = get();
        const doc: OpenDoc = { id: path, name: basename(path), type, folder: dirname(path), text, dirty: false };
        set({ openDocs: [...get().openDocs, doc] });
        get().activate(path);
        if (vaultRoot) set({ recents: await vault.addRecent(vaultRoot, path) });
      } catch (e) {
        say(`Não foi possível abrir ${basename(path)}: ${errMsg(e)}`);
      }
    },

    save: async (id, quiet) => {
      const doc = get().openDocs.find((d) => d.id === (id ?? get().active));
      if (!doc) return;
      clearTimeout(autosave.get(doc.id));
      // .md passa pelo serializador; sem edição, devolve os mesmos bytes
      const text = doc.type === 'tex' ? doc.text : serialize(parse(doc.text));
      try {
        await vault.write(doc.id, text);
        // se o texto mudou enquanto gravava, continua pendente
        set({ openDocs: get().openDocs.map((d) => (d.id === doc.id && d.text === text ? { ...d, dirty: false } : d)) });
        if (!quiet) say(`Salvo: ${doc.name}`);
      } catch (e) {
        say(`Erro ao salvar ${doc.name}: ${errMsg(e)}`);
      }
    },

    newDoc: async (type) => {
      if (!get().vaultRoot && !(await get().openVault())) return say('Abra um cofre para criar arquivos');
      const names = new Set(get().files.map((f) => f.path));
      let n = 1;
      let path = `sem-titulo${EXT[type]}`;
      while (names.has(path)) path = `sem-titulo-${++n}${EXT[type]}`;
      try {
        await vault.write(path, TEMPLATES[type]('Sem título'));
        set({ files: await vault.list() });
        await get().openFile(path);
      } catch (e) {
        say(`Não foi possível criar o arquivo: ${errMsg(e)}`);
      }
    },

    // Arquivo mudou fora do app (Git, outro editor, uma IA): sem edição pendente, recarrega; com edição, pergunta.
    externalChange: async (paths) => {
      set({ files: await vault.list().catch(() => get().files) });
      for (const doc of get().openDocs.filter((d) => paths.includes(d.id))) {
        let text: string;
        try {
          text = await vault.read(doc.id);
        } catch {
          say(`${doc.name} foi removido ou renomeado fora do ${APP_NAME}`);
          continue;
        }
        const cur = get().openDocs.find((d) => d.id === doc.id);
        if (!cur || text === cur.text) continue; // inclui o eco das nossas próprias gravações
        if (cur.dirty && !confirm(`"${cur.name}" mudou fora do ${APP_NAME}. Descartar suas alterações e carregar a versão do disco?`)) continue;
        clearTimeout(autosave.get(doc.id));
        set({ openDocs: get().openDocs.map((d) => (d.id === doc.id ? { ...d, text, dirty: false } : d)), status: `${doc.name} atualizado: mudou fora do ${APP_NAME}` });
      }
    },
  };
});

export const activeDoc = (s: AppState): OpenDoc | undefined => s.openDocs.find((d) => d.id === s.active);
