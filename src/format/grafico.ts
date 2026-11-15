// Corpo YAML do bloco grafico 2D (ADENDO 06, 5.4): troca só a chave mexida e mantém o resto como está no arquivo.
import { isMap, parse, parseDocument, type Scalar, type YAMLMap, type YAMLSeq } from 'yaml';

export type View = { x: [number, number]; y: [number, number] };
export type AxisEdit = { min?: number; max?: number; rotulo?: string };

export const NEW_GRAPH = 'tipo: 2d\nseries: []\ngrade: true\n';
/** Gráfico de função (tipo: 2d ou séries em lista); o formato antigo com var e valores não entra. Mesma regra do motor (isGraph2D). */
export const isGraph2DBody = (body: string) => {
  try { const v = parse(body) as { tipo?: unknown; series?: unknown } | null; return !!v && typeof v === 'object' && (v.tipo === '2d' || Array.isArray(v.series)); } catch { return false; }
};
const out = (d: ReturnType<typeof parseDocument>) => d.toString({ lineWidth: 0, flowCollectionPadding: false });

export function seriesOf(body: string): string[] {
  try { const v = (parseDocument(body).toJS() as { series?: unknown } | null)?.series; return Array.isArray(v) ? v.map((s) => String(s ?? '')) : []; } catch { return []; }
}

export function setSeries(body: string, list: string[]): string {
  const d = parseDocument(body);
  const seq = d.createNode(list, { flow: true }) as YAMLSeq<Scalar>;
  for (const s of seq.items) s.type = 'QUOTE_DOUBLE'; // series: ["F(x)"], como no ADENDO
  d.set('series', seq);
  return out(d);
}

/** Arredonda ao milésimo da faixa: 0.1234567 numa vista de 0 a 3 grava 0.123. */
const tidy = (v: number, span: number) => {
  const dec = Math.max(0, Math.min(12, -Math.floor(Math.log10(span / 1000))));
  return Number(v.toFixed(dec));
};

function axisMap(d: ReturnType<typeof parseDocument>, k: 'x' | 'y'): YAMLMap {
  const cur = d.get(k);
  if (isMap(cur)) return cur;
  const m = d.createNode({}, { flow: true }) as YAMLMap;
  d.set(k, m);
  return m;
}

/** Vista ajustada (zoom, mover) vai para o arquivo; null volta à automática, que tira min e max. */
export function setView(body: string, view: View | null): string {
  const d = parseDocument(body);
  for (const k of ['x', 'y'] as const) {
    if (!view) {
      const m = d.get(k);
      if (!isMap(m)) continue;
      m.delete('min'); m.delete('max');
      if (!m.items.length) d.delete(k);
      continue;
    }
    const [lo, hi] = view[k];
    const m = axisMap(d, k);
    m.set('min', tidy(lo, hi - lo)); m.set('max', tidy(hi, hi - lo));
  }
  return out(d);
}

export function setAxis(body: string, k: 'x' | 'y', a: AxisEdit): string {
  const d = parseDocument(body);
  const m = axisMap(d, k);
  for (const key of ['min', 'max', 'rotulo'] as const) {
    const v = a[key];
    if (v === undefined || v === '') m.delete(key); else m.set(key, v);
  }
  if (!m.items.length) d.delete(k);
  return out(d);
}

export function setFlag(body: string, key: 'grade' | 'pontos' | 'linhas' | 'legenda', on: boolean): string {
  const d = parseDocument(body);
  d.set(key, on);
  return out(d);
}
