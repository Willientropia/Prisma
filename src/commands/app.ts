// Handlers da fase 0. Cada fase troca os avisos por ações reais.
import { register, onUnhandled } from './registry';
import { useApp } from '../store/app';
import '../shell/ribbons'; // registra os rótulos do ribbon

const st = useApp.getState;
const say = (status: string) => st().set({ status, menuOpen: false });

onUnhandled((cmd) => say(`${cmd.label}: ainda não disponível nesta versão`));

register('app.novo', { label: 'Novo', shortcut: 'Ctrl+N', run: () => st().open('home') });
register('app.abrir', { label: 'Abrir', shortcut: 'Ctrl+O', run: () => st().open('home') });
register('app.salvar', { label: 'Salvar', shortcut: 'Ctrl+S' });
register('app.salvarComo', { label: 'Salvar como', shortcut: 'Ctrl+Shift+S' });
register('app.exportar', { label: 'Exportar', run: () => st().set({ exportOpen: true, menuOpen: false }) });
register('app.imprimir', { label: 'Imprimir', shortcut: 'Ctrl+P' });
register('app.gerarSkill', { label: 'Gerar skill para IA' });
register('app.fechar', {
  label: 'Fechar', shortcut: 'Ctrl+W',
  run: () => { const { active, close } = st(); if (active !== 'home') close(active); else st().set({ menuOpen: false }); },
});
register('app.configuracoes', { label: 'Configurações' });
register('home.modelos', { label: 'Modelos' });
register('app.desfazer', { label: 'Desfazer', shortcut: 'Ctrl+Z' });
register('app.refazer', { label: 'Refazer', shortcut: 'Ctrl+Y' });

register('tex.exportarPdf', { run: () => st().set({ exportOpen: true }) });
register('tex.exportarTex', { run: () => st().set({ exportOpen: true }) });
register('lib.exportarPacote', { run: () => st().set({ exportOpen: true }) });
register('tex.inserirResultado', { run: () => st().set({ texInserted: true, status: 'Resultado inserido no cursor' }) });
register('tex.compilar', { run: () => st().set({ texCompiled: true, status: 'Compilado agora · 12 páginas' }) });
