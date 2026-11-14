// Gráfico 2D de função (ADENDO 06, 5.4): cada série é uma expressão com uma variável livre (curva),
// uma matriz n × 2 (pontos ligados) ou um vetor de matrizes n × 2 (uma série por matriz).
import type { MathNode } from 'mathjs';
import { math } from './math';
import { fromMath, markVars, toMath } from './syntax';

export type Series2D = { expr: string; xs: number[]; ys: (number | null)[]; error?: string }; // y null: quebra da linha
export type Graph2D = {
  tipo: '2d';
  series: Series2D[];
  x: [number, number];
  y: [number, number];
  auto: { x: boolean; y: boolean }; // eixo sem limites no arquivo: vista automática
  rotulos: { x: string; y: string };
  grade: boolean; pontos: boolean; linhas: boolean; legenda: boolean;
  error?: string;
};
type Axis = { min?: unknown; max?: unknown; rotulo?: unknown };
export type Spec2D = { tipo?: unknown; series?: unknown; x?: Axis; y?: Axis; grade?: unknown; pontos?: unknown; linhas?: unknown; legenda?: unknown };
/** O que o gráfico usa do evaluate: ler a expressão, listar os nomes livres e traduzir o erro. */
export type GraphCtx = { prep: (src: string) => MathNode; missing: (node: MathNode) => string[]; scope: Map<string, unknown>; message: (e: unknown, src: string) => string };

const COARSE = 400; // pontos iniciais
const MAX_POINTS = 4000; // com o refinamento
const MAX_DEPTH = 8; // cada trecho inicial divide no máximo 2^8 vezes
export const AUTO_X: [number, number] = [-5, 5];

export const isGraph2D = (spec: Spec2D) => spec.tipo === '2d' || Array.isArray(spec.series);

/** Número para desenhar: complexo só sem parte imaginária, unidade no valor do SI; o resto é quebra. */
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (math.isComplex(v)) return Math.abs(v.im) <= 1e-12 * Math.abs(v.re) && Number.isFinite(v.re) ? v.re : null;
  if (math.isUnit(v)) { const n = (v as { value: unknown }).value; return typeof n === 'number' && Number.isFinite(n) ? n : null; }
  return null;
}

const arr = (v: unknown): unknown[] | null => (math.isMatrix(v) ? (v.toArray() as unknown[]) : Array.isArray(v) ? v : null);
const pairs = (v: unknown): { xs: number[]; ys: (number | null)[] } | null => {
  const a = arr(v);
  if (!a?.length || !a.every((r) => Array.isArray(r) && r.length === 2)) return null;
  const rows = (a as unknown[][]).map(([x, y]) => [toNum(x), toNum(y)] as const).filter(([x]) => x !== null);
  return { xs: rows.map(([x]) => x!), ys: rows.map(([, y]) => y) };
};
/** Matriz n × 2, ou vetor (linha ou coluna) de matrizes n × 2. */
function dataSeries(v: unknown): { xs: number[]; ys: (number | null)[] }[] | null {
  const one = pairs(v);
  if (one) return [one];
  const items = arr(v)?.flat(1);
  const many = items?.length ? items.map(pairs) : null;
  return many?.every(Boolean) ? (many as { xs: number[]; ys: (number | null)[] }[]) : null;
}

const extent = (vs: (number | null)[]): [number, number] | null => {
  let lo = Infinity, hi = -Infinity;
  for (const v of vs) if (v !== null) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return lo <= hi ? [lo, hi] : null;
};
/** Vista automática de y: a curva com 5 % de folga. */
function padded(e: [number, number] | null): [number, number] {
  if (!e) return [-5, 5];
  const d = e[1] - e[0] || Math.abs(e[0]) || 1;
  return [e[0] - 0.05 * d, e[1] + 0.05 * d];
}

/**
 * 400 pontos e refinamento adaptativo (até 4 000): divide o trecho enquanto o meio foge da reta.
 * No fim da divisão, um salto maior que a altura da vista com o meio fora dos extremos é assíntota: quebra a linha.
 */
export function refine(f: (x: number) => number | null, xs0: number[], ys0: (number | null)[], span: number) {
  const tol = span / 1000;
  const xs = [xs0[0]], ys = [ys0[0]];
  let budget = MAX_POINTS - xs0.length;
  const seg = (xa: number, ya: number | null, xb: number, yb: number | null, depth: number) => {
    if (budget <= 0 || (ya === null && yb === null)) return;
    const xm = (xa + xb) / 2, ym = f(xm);
    const fin = ya !== null && yb !== null && ym !== null;
    if (fin && Math.abs(ym - (ya + yb) / 2) <= tol) return; // já é reta
    if (depth >= MAX_DEPTH) {
      const between = fin && (ym - ya) * (ym - yb) <= 0;
      xs.push(xm); ys.push(fin && !between && Math.abs(yb - ya) > span ? null : ym);
      return;
    }
    budget--;
    seg(xa, ya, xm, ym, depth + 1);
    xs.push(xm); ys.push(ym);
    seg(xm, ym, xb, yb, depth + 1);
  };
  for (let i = 1; i < xs0.length; i++) {
    seg(xs0[i - 1], ys0[i - 1], xs0[i], ys0[i], 0);
    xs.push(xs0[i]); ys.push(ys0[i]);
  }
  return { xs, ys };
}

export function graph2d(spec: Spec2D, ctx: GraphCtx): Graph2D {
  const flag = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const lim = (a?: Axis): [number, number] | null => {
    if (a?.min == null || a.max == null) return null;
    const lo = Number(a.min), hi = Number(a.max);
    return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo ? [lo, hi] : null;
  };
  const label = (a: Axis | undefined, d: string) => (a?.rotulo != null && String(a.rotulo) !== '' ? String(a.rotulo) : d);
  const xv = lim(spec.x), yv = lim(spec.y);
  const list = (Array.isArray(spec.series) ? spec.series : []).map((s) => String(s ?? '').trim()).filter(Boolean);
  const parsed = list.map((expr) => {
    try { const node = ctx.prep(markVars(toMath(expr))); return { expr, node, free: ctx.missing(node) }; } catch (e) { return { expr, error: ctx.message(e, expr) }; }
  });
  const free = [...new Set(parsed.flatMap((p) => p.free ?? []))];
  const out = (series: Series2D[], x: [number, number], y: [number, number], error?: string): Graph2D => ({
    tipo: '2d', series, x, y, auto: { x: !xv, y: !yv },
    rotulos: { x: label(spec.x, free.length === 1 ? fromMath(free[0]) : 'x'), y: label(spec.y, 'y') },
    grade: flag(spec.grade, true), pontos: flag(spec.pontos, false), linhas: flag(spec.linhas, true), legenda: flag(spec.legenda, false),
    ...(error ? { error } : {}),
  });
  if (free.length > 1) return out([], xv ?? AUTO_X, yv ?? [-5, 5], `O gráfico 2D precisa de uma única variável livre (encontradas: ${free.map(fromMath).join(', ')})`);

  const v = free[0];
  const local = new Map(ctx.scope);
  const series: Series2D[] = [];
  const curves: { at: number; f: (x: number) => number | null }[] = [];
  for (const p of parsed) {
    if (!p.node) { series.push({ expr: p.expr, xs: [], ys: [], error: p.error }); continue; }
    const code = p.node.compile();
    let err: string | undefined;
    if (!p.free.length) {
      let val: unknown;
      try { val = code.evaluate(local); } catch (e) { series.push({ expr: p.expr, xs: [], ys: [], error: ctx.message(e, p.expr) }); continue; }
      const data = dataSeries(val);
      if (data) { for (const d of data) series.push({ expr: p.expr, ...d }); continue; }
    }
    const s: Series2D = { expr: p.expr, xs: [], ys: [] };
    const f = (x: number) => {
      if (v) local.set(v, x);
      try { return toNum(code.evaluate(local)); } catch (e) { err ??= ctx.message(e, p.expr); s.error = err; return null; }
    };
    curves.push({ at: series.length, f });
    series.push(s);
  }

  const data = series.filter((_, i) => !curves.some((c) => c.at === i));
  const x = xv ?? (curves.length || !data.length ? AUTO_X : padded(extent(data.flatMap((s) => s.xs))));
  const coarse = curves.map((c) => {
    const xs = Array.from({ length: COARSE + 1 }, (_, i) => x[0] + ((x[1] - x[0]) * i) / COARSE);
    return { c, xs, ys: xs.map(c.f) };
  });
  const y = yv ?? padded(extent([...coarse.flatMap((k) => k.ys), ...data.flatMap((s) => s.ys)]));
  for (const k of coarse) {
    const r = refine(k.c.f, k.xs, k.ys, y[1] - y[0]);
    const s = series[k.c.at];
    s.xs = r.xs; s.ys = r.ys;
    if (s.ys.some((q) => q !== null)) delete s.error; // erro em parte do domínio (raiz de negativo) só quebra a linha
  }
  return out(series, x, y, series.find((s) => s.error)?.error);
}
