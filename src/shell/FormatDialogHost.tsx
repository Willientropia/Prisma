// Container do diálogo de formato do resultado (F-CONFIG): decide onde grava, conforme o alvo.
//   app    -> config.yaml (padrão dos documentos novos; Configurações)
//   doc    -> linha exibicao do cabeçalho do documento
//   region -> casas=, modo=, zeros_a_direita= e notacao= da região
import { FormatDialog } from '../components/FormatDialog';
import { parse } from '../format/doc';
import { DEFAULT_FORMAT, type FormatOpts } from '../engine/format';
import { appFormat, exibicao, regionFormat, setExibicao, setRegionFormat } from '../engine/prepare';
import { saveConfig } from './config';
import { useWorkspace } from '../store/workspace';

export function FormatDialogHost() {
  const target = useWorkspace((s) => s.formatDialog);
  const config = useWorkspace((s) => s.config);
  const doc = useWorkspace((s) => (s.formatDialog && s.formatDialog.scope !== 'app' ? s.openDocs.find((d) => d.id === (s.formatDialog as { docId: string }).docId) : undefined));
  if (!target || (target.scope !== 'app' && !doc)) return null;
  const ws = useWorkspace.getState;
  const close = () => ws().set({ formatDialog: null });
  const key = JSON.stringify(target);

  if (target.scope === 'app') {
    const save = async (v: FormatOpts) => {
      try {
        await saveConfig({
          casas_decimais: v.decimals, modo_arredondamento: v.mode ?? 'decimais', zeros_a_direita: !!v.trailingZeros,
          notacao: v.notation ?? 'automatica', limite_exponencial: v.expThreshold ?? DEFAULT_FORMAT.expThreshold,
        });
        ws().set({ formatDialog: null, status: 'Formato salvo para documentos novos' });
      } catch (e) {
        ws().set({ formatDialog: null, status: `Não foi possível salvar as configurações: ${e instanceof Error ? e.message : String(e)}` });
      }
    };
    return <FormatDialog key={key} title="Configurações" note="Formato do resultado em documentos novos" value={appFormat(config)} showThreshold onSave={(v) => void save(v)} onCancel={close} />;
  }

  const text = doc!.text;
  const docFormat = exibicao(parse(text).meta.exibicao);
  if (target.scope === 'doc') {
    const save = (v: FormatOpts) => {
      const fm = parse(text).frontmatterRaw;
      const novo = setExibicao(text, v);
      if (novo === text && !fm) { ws().set({ formatDialog: null, status: 'Este documento não tem cabeçalho: o formato não foi gravado' }); return; }
      ws().edit(doc!.id, 0, fm.length, novo.slice(0, novo.length - (text.length - fm.length))); // só o cabeçalho muda
      close();
    };
    return <FormatDialog key={key} title="Formato do resultado" note="Vale para este documento" value={docFormat} showThreshold onSave={save} onCancel={close} />;
  }

  const seg = parse(text).segments.find((s, i) => s.kind === 'block' && (s.id ?? `b${i}`) === target.regionId);
  const apply = (f: FormatOpts | null) => {
    const e = setRegionFormat(text, target.regionId, f);
    if (e) ws().edit(doc!.id, e.start, e.end, e.insert);
    close();
  };
  const value = { ...docFormat, ...(seg?.kind === 'block' ? regionFormat(seg.attrs) : undefined) };
  return <FormatDialog key={key} title="Formato do resultado" note="Vale só para esta região" value={value} showThreshold={false} extra={{ label: 'Usar o do documento', run: () => apply(null) }} onSave={(v) => apply(v)} onCancel={close} />;
}
