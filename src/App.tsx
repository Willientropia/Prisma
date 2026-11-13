import { useEffect } from 'react';
import { AppMenu, ChoiceDialog, DocTabs, ExportDialog, FunctionSearch, StatusBar, TitleBar } from './shell/Shell';
import { Ribbon } from './shell/Ribbon';
import { CatalogHost } from './shell/CatalogHost';
import { FormatDialogHost } from './shell/FormatDialogHost';
import { Home } from './home/Home';
import { Caderno } from './editors/caderno/Caderno';
import { Folha } from './editors/folha/Folha';
import { Latex } from './editors/latex/Latex';
import { Biblioteca } from './editors/biblioteca/Biblioteca';
import { byShortcut, shortcutOf } from './commands/registry';
import { useWorkspace, activeDoc } from './store/workspace';
import s from './App.module.css';

const EDITORS = { caderno: Caderno, folha: Folha, tex: Latex, lib: Biblioteca };

export function App() {
  const doc = useWorkspace(activeDoc);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { useWorkspace.getState().set({ menuOpen: false, exportOpen: false, fnSearchOpen: false, formatDialog: null }); return; }
      const cmd = byShortcut(shortcutOf(e));
      if (cmd?.run) { e.preventDefault(); cmd.run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Editor = doc && EDITORS[doc.type];
  return (
    <div className={s.app}>
      {/* ADENDO 04: abas sempre logo abaixo da barra de título; o ribbon vem embaixo delas */}
      <TitleBar />
      <DocTabs />
      <Ribbon />
      <div className={s.body}>{doc && Editor ? <Editor key={doc.id} doc={doc} /> : <Home />}</div>
      <StatusBar />
      <AppMenu />
      <ExportDialog />
      <ChoiceDialog />
      <FormatDialogHost />
      <FunctionSearch />
      <CatalogHost />
    </div>
  );
}
