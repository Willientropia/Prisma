import { useEffect } from 'react';
import { AppMenu, DocTabs, ExportDialog, Ribbon, StatusBar, TitleBar } from './shell/Shell';
import { Home } from './home/Home';
import { Caderno } from './editors/caderno/Caderno';
import { Folha } from './editors/folha/Folha';
import { Latex } from './editors/latex/Latex';
import { Biblioteca } from './editors/biblioteca/Biblioteca';
import { byShortcut, shortcutOf } from './commands/registry';
import { useApp, activeDoc } from './store/app';
import s from './App.module.css';

const EDITORS = { caderno: Caderno, folha: Folha, tex: Latex, lib: Biblioteca };

export function App() {
  const doc = useApp(activeDoc);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { useApp.getState().set({ menuOpen: false, exportOpen: false }); return; }
      const cmd = byShortcut(shortcutOf(e));
      if (cmd?.run) { e.preventDefault(); cmd.run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Editor = doc ? EDITORS[doc.type] : Home;
  return (
    <div className={s.app}>
      <TitleBar />
      <Ribbon />
      <DocTabs />
      <div className={s.body}><Editor key={doc?.id} /></div>
      <StatusBar />
      <AppMenu />
      <ExportDialog />
    </div>
  );
}
