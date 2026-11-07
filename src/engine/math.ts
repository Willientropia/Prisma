// Instância do math.js com as unidades e as funções nativas da v1 (SPEC 8.6).
import { all, create, type Complex, type Unit } from 'mathjs';

export const math = create(all);

math.createUnit({
  Wp: { definition: '1 W', prefixes: 'short' }, // watt-pico (painel FV)
  dia: '1 day',
});

type V = number | Unit;
const isUnit = (v: unknown): v is Unit => math.isUnit(v);
/** Valor em unidades SI de base, para comparar e testar convergência. */
const si = (v: V): number => (isUnit(v) ? (v.value ?? 0) : Number(v));
// as funções do math.js são genéricas demais para o TS; aqui só entram número ou unidade
const add = (a: V, b: V) => math.add(a as never, b as never) as unknown as V;
const sub = (a: V, b: V) => math.subtract(a as never, b as never) as unknown as V;
const mul = (a: V, b: V) => math.multiply(a as never, b as never) as unknown as V;
const div = (a: V, b: V) => math.divide(a as never, b as never) as unknown as V;
type Fn = (x: V) => V;

/** Passo pequeno com a mesma unidade de x. */
function step(x: V): V {
  if (!isUnit(x)) return Math.max(Math.abs(x), 1) * 1e-6;
  const u = x.formatUnits();
  return math.unit(Math.max(Math.abs(x.toNumber(u)), 1) * 1e-6, u);
}

/** Derivada numérica por diferença central. */
export function deriv(f: Fn, x: V): V {
  const h = step(x);
  return div(sub(f(add(x, h)), f(sub(x, h))), mul(h, 2));
}

/** root(f, x0): Newton. root(f, a, b): bisseção no intervalo. */
export function root(f: Fn, a: V, b?: V): V {
  if (b !== undefined) {
    let lo = a, hi = b, flo = si(f(lo));
    if (flo === 0) return lo;
    if (Math.sign(flo) === Math.sign(si(f(hi)))) throw new Error('root: f(a) e f(b) têm o mesmo sinal');
    let mid = lo;
    for (let i = 0; i < 200; i++) {
      mid = div(add(lo, hi), 2);
      const fm = si(f(mid));
      if (fm === 0 || Math.abs(si(hi) - si(lo)) <= 1e-13 * Math.max(Math.abs(si(mid)), 1e-300)) return mid;
      if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
    }
    return mid;
  }
  let x = a;
  for (let i = 0; i < 100; i++) {
    const dx = div(f(x), deriv(f, x));
    x = sub(x, dx);
    if (Math.abs(si(dx)) <= 1e-12 * Math.max(Math.abs(si(x)), 1e-12)) return x;
  }
  throw new Error('root: Newton não convergiu; tente root(f, a, b) com um intervalo');
}

/** Integral numérica por Simpson adaptativo. */
export function integral(f: Fn, a: V, b: V): V {
  const simpson = (l: V, r: V, fl: V, fm: V, fr: V) => mul(div(sub(r, l), 6), add(add(fl, mul(fm, 4)), fr));
  const rec = (l: V, r: V, fl: V, fm: V, fr: V, whole: V, depth: number): V => {
    const m = div(add(l, r), 2), lm = div(add(l, m), 2), rm = div(add(m, r), 2);
    const flm = f(lm), frm = f(rm);
    const left = simpson(l, m, fl, flm, fm), right = simpson(m, r, fm, frm, fr);
    const both = add(left, right);
    if (depth > 40 || Math.abs(si(both) - si(whole)) <= 1e-10 * Math.max(Math.abs(si(both)), 1e-300)) return both;
    return add(rec(l, m, fl, flm, fm, left, depth + 1), rec(m, r, fm, frm, fr, right, depth + 1));
  };
  const fa = f(a), fb = f(b), fm = f(div(add(a, b), 2));
  return rec(a, b, fa, fm, fb, simpson(a, b, fa, fm, fb), 0);
}

const toArray = (v: unknown): V[] => (math.isMatrix(v) ? (v.toArray() as V[]) : (v as V[]));

/** Interpolação linear em tabela (xs crescente). Fora da tabela, extrapola pelo trecho da ponta. */
export function interp(xsIn: unknown, ysIn: unknown, x: V): V {
  const xs = toArray(xsIn), ys = toArray(ysIn);
  if (xs.length !== ys.length || xs.length < 2) throw new Error('interp: xs e ys precisam ter o mesmo tamanho (mínimo 2)');
  let i = 0;
  while (i < xs.length - 2 && si(x) > si(xs[i + 1])) i++;
  const t = div(sub(x, xs[i]), sub(xs[i + 1], xs[i]));
  return add(ys[i], mul(t, sub(ys[i + 1], ys[i])));
}

/** Raízes de polinômio (coeficientes do maior grau para o menor), por Durand-Kerner. */
export function polyroots(coefIn: unknown): (number | Complex)[] {
  const c = toArray(coefIn).map(Number);
  while (c.length && c[0] === 0) c.shift();
  const n = c.length - 1;
  if (n < 1) throw new Error('polyroots: grau mínimo 1');
  const a = c.map((k) => k / c[0]);
  const p = (z: Complex) => a.reduce<Complex>((acc, k) => math.add(math.multiply(acc, z), k) as Complex, math.complex(0, 0));
  let z = Array.from({ length: n }, (_, k) => math.pow(math.complex(0.4, 0.9), k) as Complex);
  for (let it = 0; it < 500; it++) {
    let delta = 0;
    z = z.map((zi, i) => {
      const den = z.reduce<Complex>((acc, zj, j) => (i === j ? acc : (math.multiply(acc, math.subtract(zi, zj)) as Complex)), math.complex(1, 0));
      const next = math.subtract(zi, math.divide(p(zi), den)) as Complex;
      delta = Math.max(delta, math.abs(math.subtract(next, zi)) as unknown as number);
      return next;
    });
    if (delta < 1e-14) break;
  }
  return z
    .map((r) => (Math.abs(r.im) < 1e-9 * Math.max(1, Math.abs(r.re)) ? r.re : r))
    .sort((x, y) => (typeof y === 'number' ? y : y.re) - (typeof x === 'number' ? x : x.re));
}

// Engenharia: log é base 10 e ln é natural. Guarda as originais antes de sobrescrever.
const naturalLog = math.log;
const log10 = math.log10;
math.import(
  {
    ln: (x: V) => naturalLog(x as never),
    log: (x: V, base?: V) => (base === undefined ? log10(x as never) : naturalLog(x as never, base as never)),
    solve: (A: unknown, b: unknown) => math.lusolve(A as never, b as never),
    root, integral, deriv, interp, polyroots,
  },
  { override: true },
);
