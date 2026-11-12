// Do texto do documento à entrada do motor: ordem, regiões desativadas, casas= e "exibicao:".
// Puro (sem store nem worker): o recálculo do app e o teste do corpus SMath usam o mesmo caminho.
import { lines, parse, withAttr, type PrismaDoc } from '../format/doc';
import { byPosition } from '../format/views';
import type { BlockInput } from './evaluate';
import { DEFAULT_FORMAT, parseMargin, type FormatOpts } from './format';

/** Chave do bloco = índice do segmento no arquivo (a mesma usada na estrutura do caderno). */
export const blockKey = (segIndex: number) => `b${segIndex}`;

/**
 * "exibicao:" no cabeçalho (ADENDO 05, E4.2): casas, modo (decimais | significativos), zeros_a_direita e
 * limite_exponencial. Sem ele, vale o padrão do SMath (DEFAULT_FORMAT: 4 casas, sem zeros à direita; ADENDO 06, 1.3).
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
    notation: notacao(o.notacao) ?? 'automatica',
  };
}

type Notation = NonNullable<FormatOpts['notation']>;
const notacao = (v: unknown): Notation | undefined => (v === 'automatica' || v === 'cientifica' || v === 'engenharia' ? v : undefined);
const inRange = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** Linha "exibicao: {…}" do cabeçalho; notacao só sai quando não é a automática (arquivo antigo = mesmos bytes). */
const exibicaoYaml = (f: FormatOpts) =>
  `exibicao: {casas: ${f.decimals}, modo: ${f.mode ?? 'decimais'}, zeros_a_direita: ${!!f.trailingZeros}, limite_exponencial: ${f.expThreshold ?? 5}${f.notation && f.notation !== 'automatica' ? `, notacao: ${f.notation}` : ''}}`;

/** Troca (ou põe, antes de versao_formato) a linha exibicao do cabeçalho; o resto do arquivo não muda. */
export function setExibicao(text: string, f: FormatOpts): string {
  const fm = parse(text).frontmatterRaw;
  const ls = lines(fm);
  if (ls.length < 2) return text;
  const eol = /\r?\n$/.exec(ls[0])?.[0] ?? '\n';
  const line = exibicaoYaml(f) + eol;
  const k = ls.findIndex((l, i) => i > 0 && i < ls.length - 1 && /^exibicao:/.test(l));
  if (k >= 0) {
    let end = k + 1;
    while (end < ls.length - 1 && /^[ \t]+\S/.test(ls[end])) end++; // exibicao em bloco de várias linhas
    ls.splice(k, end - k, line);
  } else {
    const v = ls.findIndex((l, i) => i > 0 && i < ls.length - 1 && /^versao_formato:/.test(l));
    ls.splice(v >= 0 ? v : ls.length - 1, 0, line);
  }
  return ls.join('') + text.slice(fm.length);
}

/** Padrão do app para documentos novos (config.yaml); valor inválido ou ausente fica no padrão do SMath. */
export function appFormat(cfg: Record<string, unknown>): FormatOpts {
  const f: FormatOpts = { ...DEFAULT_FORMAT };
  if (inRange(cfg.casas_decimais, 0, 15)) f.decimals = cfg.casas_decimais;
  if (cfg.modo_arredondamento === 'decimais' || cfg.modo_arredondamento === 'significativos') f.mode = cfg.modo_arredondamento;
  if (typeof cfg.zeros_a_direita === 'boolean') f.trailingZeros = cfg.zeros_a_direita;
  if (notacao(cfg.notacao)) f.notation = notacao(cfg.notacao);
  if (inRange(cfg.limite_exponencial, 1, 15)) f.expThreshold = cfg.limite_exponencial;
  return f;
}

const key = (f: FormatOpts) => [f.decimals, f.mode ?? 'decimais', !!f.trailingZeros, f.expThreshold ?? 5, f.notation ?? 'automatica'].join('|');
const sameFormat = (a: FormatOpts, b: FormatOpts) => key(a) === key(b);

/** Modelo de documento novo com o padrão do app gravado; igual ao padrão do SMath, nada muda no arquivo. */
export const stampFormat = (template: string, f: FormatOpts) => (sameFormat(f, DEFAULT_FORMAT) ? template : setExibicao(template, f));

/** Formato só desta região: casas=, modo=, zeros_a_direita= e notacao= na linha de abertura (sem aspas); f null tira os quatro. */
export function setRegionFormat(text: string, id: string, f: FormatOpts | null): { start: number; end: number; insert: string } | null {
  const d = parse(text);
  let pos = d.frontmatterRaw.length;
  for (const [i, seg] of d.segments.entries()) {
    const start = pos;
    pos += seg.raw.length;
    if (seg.kind !== 'block' || (seg.id ?? `b${i}`) !== id) continue;
    const first = lines(seg.raw)[0];
    const attrs: [string, string | null][] = f
      ? [['casas', String(f.decimals)], ['modo', f.mode ?? 'decimais'], ['zeros_a_direita', f.trailingZeros ? 'sim' : 'nao'], ['notacao', f.notation ?? 'automatica']]
      : [['casas', null], ['modo', null], ['zeros_a_direita', null], ['notacao', null]];
    return { start, end: start + first.length, insert: attrs.reduce((l, [n, val]) => withAttr(l, n, val, false), first) };
  }
  return null;
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

/** casas=2, modo=decimais|significativos, zeros_a_direita=sim|nao e notacao=automatica|cientifica|engenharia na região (E4.2). */
export function regionFormat(a: Record<string, string>): Partial<FormatOpts> | undefined {
  const f: Partial<FormatOpts> = {};
  if (notacao(a.notacao)) f.notation = notacao(a.notacao);
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
