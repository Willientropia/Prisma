// Handlers dos comandos. Os sem handler avisam na barra de status.
import { register, onUnhandled } from './registry';
import { useWorkspace, activeDoc } from '../store/workspace';
import { interrupt, recalc } from '../engine/run';
import { activeTextEditor } from '../editors/TextEditor';
import '../shell/ribbons'; // registra os rótulos do ribbon
import { saveConfig } from '../shell/config';

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
register('app.configuracoes', { label: 'Configurações', run: () => st().set({ formatDialog: { scope: 'app' }, menuOpen: false }) });
register('home.modelos', { label: 'Modelos' });
register('app.desfazer', { label: 'Desfazer', shortcut: 'Ctrl+Z' });
register('app.refazer', { label: 'Refazer', shortcut: 'Ctrl+Y' });

register('exibir.codigo', { run: () => st().set({ showSource: !st().showSource }) });
// Exibir > Assistente dinâmico (ADENDO 06, 3.1): ligado por padrão, salvo na configuração
register('exibir.assistente', {
  run: () => {
    const on = st().config.assistente_dinamico === false;
    void saveConfig({ assistente_dinamico: on })
      .then(() => say(on ? 'Assistente dinâmico ligado' : 'Assistente dinâmico desligado'))
      .catch((e: unknown) => say(`Não foi possível salvar as configurações: ${e instanceof Error ? e.message : String(e)}`));
  },
});

// grupo Texto (caderno): age no último editor de texto focado (ADENDO 02, B7)
const text = (fn: (e: NonNullable<typeof activeTextEditor>) => void) => () => {
  if (!activeTextEditor || activeTextEditor.isDestroyed) return say('Clique num texto do caderno primeiro');
  fn(activeTextEditor);
};
register('texto.negrito', { run: text((e) => e.chain().focus().toggleBold().run()) });
register('texto.italico', { run: text((e) => e.chain().focus().toggleItalic().run()) });
register('texto.titulo', { run: text((e) => e.chain().focus().toggleHeading({ level: 2 }).run()) });
register('texto.lista', { run: text((e) => e.chain().focus().toggleBulletList().run()) });
register('texto.link', {
  run: text(async (e) => {
    const r = await st().ask({ title: 'Link', message: 'Endereço ou nota (ex.: string-3):', input: '', buttons: [{ id: 'ok', label: 'Inserir', primary: true }, { id: 'cancel', label: 'Cancelar' }] });
    const v = r.value.trim();
    if (r.id !== 'ok' || !v) return;
    const href = /^[a-z]+:/i.test(v) ? v : `prisma:${encodeURI(v)}`;
    e.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }),
});

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
