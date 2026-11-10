// Do texto do documento à entrada do motor: ordem, regiões desativadas, casas= e "exibicao:".
// Puro (sem store nem worker): o recálculo do app e o teste do corpus SMath usam o mesmo caminho.
import { lines, parse, type PrismaDoc } from '../format/doc';
import { byPosition } from '../format/views';
import type { BlockInput } from './evaluate';
import { DEFAULT_FORMAT, parseMargin, type FormatOpts } from './format';

/** Chave do bloco = índice do segmento no arquivo (a mesma usada na estrutura do caderno). */
export const blockKey = (segIndex: number) => `b${segIndex}`;

/**
 * "exibicao:" no cabeçalho (ADENDO 05, E4.2): casas, modo (decimais | significativos), zeros_a_direita e
 * limite_exponencial. Sem ele, vale o formato de sempre do Prisma (arquivo novo não muda).
 */
export function exibicao(x: unknown, base: FormatOpts = DEFAULT_FORMAT): FormatOpts {
  if (!x || typeof x !== 'object') return base;
  const o = x as Record<string, unknown>;
  return {
    ...base,
    decimals: typeof o.casas === 'number' ? o.casas : base.decimals,
    mode: o.modo === 'significativos' ? 'significativos' : 'decimais',
    trailingZeros: o.zeros_a_direita === true,
    expThreshold: typeof o.limite_exponencial === 'number' ? o.limite_exponencial : 5,
  };
}

/**
 * Blocos na ordem de avaliação: caderno na ordem do arquivo; folha na ordem de leitura (E3.1).
 * Região desativada fica de fora (E3.6); casas=2 vale só para a região (E4.2).
 */
export function blockInputs(parsed: PrismaDoc, folha: boolean): BlockInput[] {
  let bs = parsed.segments.flatMap((s, i) => (s.kind === 'block' ? [{ seg: s, key: blockKey(i) }] : []));
  if (folha) {
    const order = byPosition(bs.map((b) => b.seg));
    bs = order.map((seg) => bs.find((b) => b.seg === seg)!);
  }
  bs = bs.filter(({ seg }) => !('desativado' in seg.attrs));
  return bs.map(({ seg, key }) => ({ key, type: seg.type, lines: lines(seg.body), atencao: parseMargin(seg.attrs.atencao), fmt: regionFormat(seg.attrs) }));
}

/** casas=2, modo=decimais|significativos, zeros_a_direita=sim|nao na região (E4.2). */
function regionFormat(a: Record<string, string>): Partial<FormatOpts> | undefined {
  const f: Partial<FormatOpts> = {};
  if (a.casas !== undefined && /^\d+$/.test(a.casas)) f.decimals = Number(a.casas);
  if (a.modo === 'decimais' || a.modo === 'significativos') f.mode = a.modo;
  if (a.zeros_a_direita === 'sim' || a.zeros_a_direita === 'nao') f.trailingZeros = a.zeros_a_direita === 'sim';
  return Object.keys(f).length ? f : undefined;
}

/** Atalho para quem tem só o texto. */
export const prepare = (text: string, folha: boolean, base?: FormatOpts) => {
  const parsed = parse(text);
  return { parsed, blocks: blockInputs(parsed, folha), format: exibicao(parsed.meta.exibicao, base) };
};
