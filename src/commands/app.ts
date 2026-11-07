// Handlers dos comandos. Os sem handler avisam na barra de status.
import { register, onUnhandled } from './registry';
import { useWorkspace, activeDoc } from '../store/workspace';
import { interrupt, recalc } from '../engine/run';
import '../shell/ribbons'; // registra os rótulos do ribbon

const st = useWorkspace.getState;
const say = (status: string) => st().set({ status, menuOpen: false });

onUnhandled((cmd) => say(`${cmd.label}: ainda não disponível nesta versão`));

register('app.novo', { label: 'Novo', shortcut: 'Ctrl+N', run: () => st().activate('home') });
register('app.abrir', { label: 'Abrir', shortcut: 'Ctrl+O', run: () => void st().openWithDialog('tudo') });
register('app.abrirProjeto', { label: 'Abrir projeto', run: () => void st().openWithDialog('projeto') });
register('app.novoProjeto', { label: 'Novo projeto', run: () => void st().newProject() });
register('app.salvar', { label: 'Salvar', shortcut: 'Ctrl+S', run: () => { st().set({ menuOpen: false }); void st().save(); } });
register('app.salvarComo', { label: 'Salvar como', shortcut: 'Ctrl+Shift+S', run: () => { st().set({ menuOpen: false }); void st().saveAs(); } });
register('app.exportar', { label: 'Exportar', run: () => st().set({ exportOpen: true, menuOpen: false }) });
register('app.imprimir', { label: 'Imprimir', shortcut: 'Ctrl+P' });
register('app.gerarSkill', { label: 'Gerar skill para IA' });
register('app.fechar', {
  label: 'Fechar', shortcut: 'Ctrl+W',
  run: () => { const { active, close } = st(); st().set({ menuOpen: false }); if (active !== 'home') void close(active); },
});
register('app.configuracoes', { label: 'Configurações' });
register('home.modelos', { label: 'Modelos' });
register('app.desfazer', { label: 'Desfazer', shortcut: 'Ctrl+Z' });
register('app.refazer', { label: 'Refazer', shortcut: 'Ctrl+Y' });

register('calc.tudo', { shortcut: 'Ctrl+Enter', run: () => void recalc(st().active) });
register('calc.interromper', { run: interrupt });

// \resultado e \figura só valem para .tex listado em "documentos" de um projeto aberto (ADENDO 01, A6)
const texInProject = () => { const s = st(); const d = activeDoc(s); return !!d && d.type === 'tex' && !!s.projectPathOf(d.path); };
const TEX_HINT = 'Adicione este documento a um projeto para inserir resultados.';
register('tex.inserirResultado', { enabled: texInProject, hint: TEX_HINT });
register('tex.atualizarResultados', { enabled: texInProject, hint: TEX_HINT });

register('tex.exportarPdf', { run: () => st().set({ exportOpen: true }) });
register('tex.exportarTex', { run: () => st().set({ exportOpen: true }) });
register('lib.exportarPacote', { run: () => st().set({ exportOpen: true }) });
