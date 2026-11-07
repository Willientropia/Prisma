// Handlers dos comandos. Os sem handler avisam na barra de status.
import { register, onUnhandled } from './registry';
import { useApp } from '../store/app';
import { interrupt, recalc } from '../engine/run';
import '../shell/ribbons'; // registra os rótulos do ribbon

const st = useApp.getState;
const say = (status: string) => st().set({ status, menuOpen: false });

onUnhandled((cmd) => say(`${cmd.label}: ainda não disponível nesta versão`));

register('app.novo', { label: 'Novo', shortcut: 'Ctrl+N', run: () => st().activate('home') });
register('app.abrir', { label: 'Abrir', shortcut: 'Ctrl+O', run: () => void st().openVault() });
register('app.salvar', { label: 'Salvar', shortcut: 'Ctrl+S', run: () => void st().save() });
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

register('calc.tudo', { shortcut: 'Ctrl+Enter', run: () => void recalc(st().active) });
register('calc.interromper', { run: interrupt });

register('tex.exportarPdf', { run: () => st().set({ exportOpen: true }) });
register('tex.exportarTex', { run: () => st().set({ exportOpen: true }) });
register('lib.exportarPacote', { run: () => st().set({ exportOpen: true }) });
