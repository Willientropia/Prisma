import { create } from 'zustand';
import { DOCS, type DocRef } from '../mock';
import type { RibbonTab } from '../shell/ribbons';

type AppState = {
  openDocs: DocRef[];
  active: string; // 'home' ou id do documento
  ribbonTab: RibbonTab;
  menuOpen: boolean;
  exportOpen: boolean;
  status: string | null; // mensagem temporária; null = status padrão do tipo
  texInserted: boolean;
  texCompiled: boolean;
  open: (id: string) => void;
  close: (id: string) => void;
  set: (patch: Partial<AppState>) => void;
};

export const useApp = create<AppState>((set, get) => ({
  openDocs: DOCS,
  active: 'home',
  ribbonTab: 'inicio',
  menuOpen: false,
  exportOpen: false,
  status: null,
  texInserted: false,
  texCompiled: false,
  open: (id) => {
    const { openDocs } = get();
    const doc = DOCS.find((d) => d.id === id);
    set({
      active: id,
      ribbonTab: 'inicio',
      menuOpen: false,
      status: null,
      openDocs: doc && !openDocs.includes(doc) ? [...openDocs, doc] : openDocs,
    });
  },
  close: (id) => {
    const openDocs = get().openDocs.filter((d) => d.id !== id);
    set({ openDocs, active: get().active === id ? 'home' : get().active, menuOpen: false, status: null });
  },
  set: (patch) => set(patch),
}));

export const activeDoc = (s: AppState): DocRef | undefined => s.openDocs.find((d) => d.id === s.active);
