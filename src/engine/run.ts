// Liga o documento aberto + bibliotecas ao worker, e guarda o resultado na store.
import { lines, parse } from '../format/doc';
import { byPosition } from '../format/views';
import { joinPath, stem } from '../format/display';
import { useWorkspace } from '../store/workspace';
import { platform } from '../platform';
import { evaluateAsync, LINE_LIMIT_MS, stop } from './client';
import type { BlockInput, EvalResult, LibInfo, LibInput } from './evaluate';
import { DEFAULT_FORMAT } from './format';

/** Chave do bloco = índice do segmento no arquivo (a mesma usada na estrutura do caderno). */
export const blockKey = (segIndex: number) => `b${segIndex}`;

/**
 * Busca de bibliotecas (ADENDO 01, A3): 1) do projeto, se o arquivo está num projeto aberto;
 * 2) Documentos\Prisma\Bibliotecas; 3) de fábrica. Mesmo id em dois lugares: vence o primeiro, com aviso.
 */
async function loadLibs(ids: string[], inProject: boolean, errors: string[]): Promise<{ libs: LibInput[]; info: LibInfo[] }> {
  if (!ids.length) return { libs: [], info: [] };
  const { project } = useWorkspace.getState();
  const { user, factory } = await platform.libraryFiles().catch(() => ({ user: [] as string[], factory: [] as string[] }));
  const candidates: { path: string; origem: LibInfo['origem'] }[] = [
    ...(inProject && project ? project.lists.bibliotecas.map((r) => ({ path: joinPath(project.dir, r), origem: 'projeto' as const })) : []),
    ...user.map((path) => ({ path, origem: 'usuário' as const })),
    ...factory.map((path) => ({ path, origem: 'fábrica' as const })),
  ];
  const byId = new Map<string, { path: string; origem: LibInfo['origem']; text: string }[]>();
  for (const c of candidates) {
    try {
      const text = await platform.read(c.path);
      const id = String(parse(text).meta.id ?? stem(c.path));
      byId.set(id, [...(byId.get(id) ?? []), { ...c, text }]);
    } catch (e) {
      errors.push(`Erro ao ler ${c.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const libs: LibInput[] = [];
  const info: LibInfo[] = [];
  for (const id of ids) {
    const found = byId.get(id);
    if (!found) { errors.push(`Biblioteca não encontrada: ${id}`); continue; }
    const lib = parse(found[0].text);
    const c = lib.meta.constantes;
    const constants = c && typeof c === 'object' ? Object.entries(c).map(([k, v]) => [k, String(v)] as [string, string]) : [];
    const functions = lib.segments.flatMap((s) => (s.kind === 'block' && s.type === 'funcao' ? lines(s.body) : []));
    libs.push({ id, constants, functions });
    info.push({
      id, nome: String(lib.meta.nome ?? id), versao: String(lib.meta.versao ?? ''), origem: found[0].origem, path: found[0].path,
      duplicate: found[1] ? `Também existe em ${found[1].origem}: ${found[1].path}` : undefined,
    });
  }
  return { libs, info };
}

export async function recalc(docId: string): Promise<void> {
  const st = useWorkspace.getState();
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
  const { libs, info } = await loadLibs(ids, !!st.projectPathOf(doc.path), libErrors);
  const cfg = st.config;
  const format = {
    decimals: typeof cfg.casas_decimais === 'number' ? cfg.casas_decimais : DEFAULT_FORMAT.decimals,
    sep: typeof cfg.separador_decimal === 'string' ? cfg.separador_decimal : DEFAULT_FORMAT.sep,
  };

  useWorkspace.setState({ calculating: true });
  const out = await evaluateAsync({ libs, blocks, format });
  useWorkspace.setState({ calculating: false });

  let result: EvalResult;
  if (out.kind === 'done') result = { ...out.result, libErrors: [...libErrors, ...out.result.libErrors], libs: info };
  else if (out.kind === 'timeout') {
    const n = blocks.find((b) => b.key === out.key)?.lines.length ?? 0;
    const ls = Array.from({ length: n }, (_, i) => (i === out.line ? { kind: 'eval' as const, error: `Tempo esgotado: a linha passou de ${LINE_LIMIT_MS / 1000} s` } : { kind: 'empty' as const }));
    result = { blocks: { [out.key]: ls }, libErrors, defined: [], ms: LINE_LIMIT_MS, libs: info };
  } else if (out.kind === 'stopped') {
    return; // outra avaliação começou ou o usuário interrompeu
  } else result = { blocks: {}, libErrors: [...libErrors, `Erro no motor: ${out.message}`], defined: [], ms: 0, libs: info };

  useWorkspace.setState((s) => ({ results: { ...s.results, [docId]: result } }));
}

export function interrupt(): void {
  stop();
  useWorkspace.setState({ calculating: false, status: 'Cálculo interrompido' });
}
