import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';
import './commands/app';
import { App } from './App';
import { useApp } from './store/app';
import { vault } from './vault';

vault.onChange((paths) => void useApp.getState().externalChange(paths));
vault.recent().then((recents) => useApp.setState({ recents })).catch(() => {});

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
