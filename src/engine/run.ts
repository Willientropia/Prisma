// Liga documento aberto + bibliotecas do cofre ao worker, e guarda o resultado na store.
import { lines, parse } from '../format/doc';
import { byPosition } from '../format/views';
import { basename } from '../format/display';
import { useApp } from '../store/app';
import { vault } from '../vault';
import { evaluateAsync, LINE_LIMIT_MS, stop } from './client';
import type { BlockInput, EvalResult, LibInput } from './evaluate';
import { DEFAULT_FORMAT } from './format';

/** Chave do bloco = índice do segmento no arquivo (a mesma usada na estrutura do caderno). */
export const blockKey = (segIndex: number) => `b${segIndex}`;

async function loadLibs(ids: string[], errors: string[]): Promise<LibInput[]> {
  const { files } = useApp.getState();
  const out: LibInput[] = [];
  for (const id of ids) {
    const file = files.find((f) => basename(f.path) === `${id}.lib.md`);
    if (!file) { errors.push(`Biblioteca não encontrada no cofre: ${id}.lib.md`); continue; }
    try {
      const lib = parse(await vault.read(file.path));
      const c = lib.meta.constantes;
      const constants = c && typeof c === 'object' ? Object.entries(c).map(([k, v]) => [k, String(v)] as [string, string]) : [];
      const functions = lib.segments.flatMap((s) => (s.kind === 'block' && s.type === 'funcao' ? lines(s.body) : []));
      out.push({ id, constants, functions });
    } catch (e) {
      errors.push(`Erro ao ler ${file.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

export async function recalc(docId: string): Promise<void> {
  const st = useApp.getState();
  const doc = st.openDocs.find((d) => d.id === docId);
  if (!doc || (doc.type !== 'caderno' && doc.type !== 'folha')) return;
  const parsed = parse(doc.text);
  let bs = parsed.segments.flatMap((s, i) => (s.kind === 'block' ? [{ seg: s, key: blockKey(i) }] : []));
  if (doc.type === 'folha') {
    const order = byPosition(bs.map((b) => b.seg));
    bs = order.map((seg) => bs.find((b) => b.seg === seg)!);
  }
  const blocks: BlockInput[] = bs.map(({ seg, key }) => ({ key, type: seg.type, lines: lines(seg.body) }));
  const libErrors: string[] = [];
  const ids = Array.isArray(parsed.meta.bibliotecas) ? parsed.meta.bibliotecas.map(String) : [];
  const libs = await loadLibs(ids, libErrors);
  const cfg = st.config;
  const format = {
    decimals: typeof cfg.casas_decimais === 'number' ? cfg.casas_decimais : DEFAULT_FORMAT.decimals,
    sep: typeof cfg.separador_decimal === 'string' ? cfg.separador_decimal : DEFAULT_FORMAT.sep,
  };

  useApp.setState({ calculating: true });
  const out = await evaluateAsync({ libs, blocks, format });
  useApp.setState({ calculating: false });

  let result: EvalResult;
  if (out.kind === 'done') result = { ...out.result, libErrors: [...libErrors, ...out.result.libErrors] };
  else if (out.kind === 'timeout') {
    const n = blocks.find((b) => b.key === out.key)?.lines.length ?? 0;
    const ls = Array.from({ length: n }, (_, i) => (i === out.line ? { kind: 'eval' as const, error: `Tempo esgotado: a linha passou de ${LINE_LIMIT_MS / 1000} s` } : { kind: 'empty' as const }));
    result = { blocks: { [out.key]: ls }, libErrors, defined: [], ms: LINE_LIMIT_MS };
  } else if (out.kind === 'stopped') {
    return; // outra avaliação começou ou o usuário interrompeu
  } else result = { blocks: {}, libErrors: [...libErrors, `Erro no motor: ${out.message}`], defined: [], ms: 0 };

  useApp.setState((s) => ({ results: { ...s.results, [docId]: result } }));
}

export function interrupt(): void {
  stop();
  useApp.setState({ calculating: false, status: 'Cálculo interrompido' });
}
