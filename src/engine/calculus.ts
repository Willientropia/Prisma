// Cálculo numérico (ADENDO 06, 5.3): integral Gauss-Kronrod G7-K15 adaptativa e derivada de Ridders
// (diferenças centrais com extrapolação de Richardson). Funções de argumentos brutos: integral(expr, x, a, b)
// e diff(expr, x[, ponto]) avaliam expr com x trocado a cada ponto; integral(f, a, b) com função continua valendo.
// Também aqui: sum(expr, i, a, b) com índice (A6-2, ADENDO 06 2.2) e nthroot(x, n).
import type { MathJsInstance, MathNode, Unit } from 'mathjs';

type M = MathJsInstance;
type Q = [number, number]; // parte real e imaginária
type Scope = Map<string, unknown>;

const REL_TOL = 1e-10;
const MAX_SUBDIVISIONS = 2000;

/**
 * Prazo do cálculo de uma linha (A6-ROBUSTEZ-02). Fica abaixo dos 2 s do cliente do worker (client.ts), que
 * mata o worker e perde as outras linhas: assim só a linha lenta dá erro. Vale para integral, diff e sum, aninhados ou não.
 */
export const CALC_LIMIT_MS = 1500;
let deadline = Infinity;
const tick = () => { if (performance.now() > deadline) throw new Error('O cálculo passou do tempo limite'); };

// avisos da linha em avaliação (a integral que não convergiu); evaluate.ts recolhe depois de cada linha
const pending: string[] = [];
/** Executa a avaliação de uma linha e anexa o primeiro aviso do cálculo, se houver. */
export function withWarning<T extends object>(run: () => T): T & { warning?: string } {
  pending.length = 0;
  deadline = performance.now() + CALC_LIMIT_MS;
  let r: T;
  try { r = run(); } finally { deadline = Infinity; }
  return pending.length ? { ...r, warning: pending[0] } : r;
}

// nós e pesos de Gauss-Kronrod 7-15 (QUADPACK qk15); a metade positiva, do extremo ao centro
const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926, 0.741531185599394439863864773280788, 0.586087235467691130294144838258730, 0.405845151377397166906606412076961, 0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518, 0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014, 0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975, 0.417959183673469387755102040816327]; // nós XGK[1], [3], [5], [7]

type Seg = { lo: number; hi: number; i: Q; err: number; dead?: boolean };

/** Integral de h em [lo, hi] por G7-K15 adaptativo (a pior subdivisão é dividida primeiro). */
function adaptive(h: (t: number) => Q, lo: number, hi: number): { value: Q; err: number; converged: boolean } {
  const seg = (l: number, r: number): Seg & { abs: number } => {
    const c = (l + r) / 2, half = (r - l) / 2;
    const f0 = h(c);
    const k: Q = [f0[0] * WGK[7], f0[1] * WGK[7]], g: Q = [f0[0] * WG[3], f0[1] * WG[3]];
    let abs = Math.hypot(f0[0], f0[1]) * WGK[7];
    for (let j = 0; j < 7; j++) {
      const dx = half * XGK[j];
      const a = h(c - dx), b = h(c + dx);
      for (let p = 0; p < 2; p++) {
        const s = a[p] + b[p];
        k[p] += WGK[j] * s;
        if (j % 2 === 1) g[p] += WG[(j - 1) / 2] * s;
      }
      abs += WGK[j] * (Math.hypot(a[0], a[1]) + Math.hypot(b[0], b[1]));
    }
    const i: Q = [k[0] * half, k[1] * half];
    const err = Math.hypot((k[0] - g[0]) * half, (k[1] - g[1]) * half);
    return { lo: l, hi: r, i, err: Number.isFinite(err) ? err : Infinity, abs: abs * Math.abs(half) };
  };
  const segs: (Seg & { abs: number })[] = [seg(lo, hi)];
  for (let splits = 0; ; splits++) {
    const total: Q = [0, 0];
    let err = 0, abs = 0;
    for (const s of segs) { total[0] += s.i[0]; total[1] += s.i[1]; err += s.err; abs += s.abs; }
    const mag = Math.hypot(total[0], total[1]);
    // o piso em função de ∫|f| evita exigir erro relativo de uma integral que dá zero (função ímpar)
    if (Number.isFinite(mag) && err <= Math.max(REL_TOL * mag, 1e-15 * abs)) return { value: total, err, converged: true };
    if (splits >= MAX_SUBDIVISIONS) return { value: total, err, converged: false };
    let worst = -1;
    segs.forEach((s, n) => { if (!s.dead && (worst < 0 || s.err > segs[worst].err)) worst = n; });
    if (worst < 0) return { value: total, err, converged: false };
    const s = segs[worst], mid = (s.lo + s.hi) / 2;
    if (!(mid > s.lo && mid < s.hi)) { s.dead = true; continue; } // intervalo sem como dividir: o laço avança pelo marcador
    segs.splice(worst, 1, seg(s.lo, mid), seg(mid, s.hi));
  }
}

/** Derivada de g em x pelo método de Ridders (Richardson sobre diferenças centrais); h0 é o passo inicial. */
function ridders(g: (x: number) => number, x: number, h0: number): number {
  const CON = 1.4, CON2 = CON * CON, NTAB = 10, SAFE = 2;
  const a: number[][] = Array.from({ length: NTAB }, () => new Array<number>(NTAB).fill(0));
  let h = h0;
  a[0][0] = (g(x + h) - g(x - h)) / (2 * h);
  let ans = a[0][0], err = Infinity;
  for (let i = 1; i < NTAB; i++) {
    h /= CON;
    a[0][i] = (g(x + h) - g(x - h)) / (2 * h);
    let fac = CON2;
    for (let j = 1; j <= i; j++) {
      a[j][i] = (a[j - 1][i] * fac - a[j - 1][i - 1]) / (fac - 1);
      fac *= CON2;
      const e = Math.max(Math.abs(a[j][i] - a[j - 1][i]), Math.abs(a[j][i] - a[j - 1][i - 1]));
      if (e <= err) { err = e; ans = a[j][i]; }
    }
    if (Math.abs(a[i][i] - a[i - 1][i - 1]) >= SAFE * err) break;
  }
  return ans;
}

export function calculusFunctions(math: M) {
  const nativeDiff = math.diff; // diff(vetor) e diff(matriz, dim) do math.js continuam valendo
  type Sym = MathNode & { name: string };
  const isU = (v: unknown): v is Unit => math.isUnit(v);
  /** Valor em unidades SI de base, separado em parte real e imaginária. */
  const parts = (v: unknown): Q => {
    if (isU(v)) return parts(v.value ?? 0);
    if (typeof v === 'number') return [v, 0];
    if (math.isComplex(v)) return [(v as { re: number }).re, (v as unknown as { im: number }).im];
    if (typeof v === 'boolean') return [Number(v), 0];
    throw new Error('O cálculo numérico precisa de número, complexo ou grandeza');
  };
  /** Grandeza de valor 1 na unidade de v (para carregar a unidade do resultado); indefinida se v não tem unidade. */
  const carrierOf = (v: unknown): Unit | undefined => {
    if (!isU(v) || !v.formatUnits()) return undefined;
    if ((v as unknown as { units: { unit: { offset: number } }[] }).units.some((x) => x.unit.offset !== 0)) throw new Error('Unidade com deslocamento (°C, °F) não é aceita no cálculo; use K ou R');
    return math.unit(1, v.formatUnits());
  };
  const build = (q: Q, carrier?: Unit): unknown => {
    const val = q[1] === 0 ? q[0] : math.complex(q[0], q[1]);
    if (!carrier) return val;
    return math.multiply(carrier, math.divide(val as never, (carrier as unknown as { value: number }).value as never) as never);
  };
  const siOf = (c?: Unit) => (c ? (c as unknown as { value: number }).value : 1);
  const times = (a?: Unit, b?: Unit, divide = false) => (a && b ? ((divide ? math.divide(a, b) : math.multiply(a, b)) as Unit) : a ?? (b && divide ? (math.divide(1, b) as Unit) : b));

  /** Troca x do escopo por cada valor e restaura o que havia (o laço do chamador é que decide o prazo). */
  function withVar<T>(scope: Scope, name: string, body: (set: (v: unknown) => void) => T): T {
    const had = scope.has(name), old = scope.get(name);
    try { return body((v) => scope.set(name, v)); } finally { if (had) scope.set(name, old); else scope.delete(name); }
  }

  /** Integral de f (que devolve Q já em SI) entre a e b, com os limites possivelmente infinitos. */
  function integrate(f: (x: number) => Q, a: number, b: number): Q {
    if (a === b || Number.isNaN(a) || Number.isNaN(b)) return [0, 0];
    if (a > b) { const r = integrate(f, b, a); return [-r[0], -r[1]]; }
    let h: (t: number) => Q, lo: number, hi: number;
    if (Number.isFinite(a) && Number.isFinite(b)) { h = f; lo = a; hi = b; }
    else if (Number.isFinite(a)) { // [a, ∞): x = a + t/(1 − t)
      h = (t) => { const w = 1 / ((1 - t) * (1 - t)), y = f(a + t / (1 - t)); return [y[0] * w, y[1] * w]; };
      lo = 0; hi = 1;
    } else if (Number.isFinite(b)) { // (−∞, b]: x = b − t/(1 − t)
      h = (t) => { const w = 1 / ((1 - t) * (1 - t)), y = f(b - t / (1 - t)); return [y[0] * w, y[1] * w]; };
      lo = 0; hi = 1;
    } else { // (−∞, ∞): x = t/(1 − t²)
      h = (t) => { const d = 1 - t * t, w = (1 + t * t) / (d * d), y = f(t / d); return [y[0] * w, y[1] * w]; };
      lo = -1; hi = 1;
    }
    const r = adaptive(h, lo, hi);
    if (!r.converged && !pending.length) pending.push(`A integral pode não ter convergido (estimativa de erro: ${r.err.toExponential(2).replace('.', ',')})`);
    return r.value;
  }

  /** Núcleo comum: f(xValue) é o integrando como valor do math.js; limites a e b já avaliados. */
  function runIntegral(f: (x: unknown) => unknown, aV: unknown, bV: unknown): unknown {
    for (const v of [aV, bV]) if (!(typeof v === 'number' || isU(v))) throw new Error('integral: os limites precisam ser números ou grandezas');
    // número puro só vale como limite 0 ou infinito; "2 m" até 3 não diz que 3 é metro
    const bare = (v: unknown) => !isU(v) && v !== 0 && Number.isFinite(v);
    if ((isU(aV) && isU(bV) && !aV.equalBase(bV)) || (isU(aV) && bare(bV)) || (isU(bV) && bare(aV))) throw new Error('Unidades incompatíveis: limites da integral');
    const xc = carrierOf(isU(aV) && Number.isFinite(parts(aV)[0]) ? aV : bV);
    let yc: Unit | undefined;
    const q = integrate((x) => {
      tick();
      const y = f(xc ? build([x, 0], xc) : x);
      yc ??= carrierOf(y);
      return parts(y);
    }, parts(aV)[0], parts(bV)[0]);
    return build(q, times(yc, xc));
  }

  /** integral(expr, x, a, b) avalia expr com x trocado; integral(f, a, b) chama a função f. */
  const integral = Object.assign((args: MathNode[], _m: unknown, scope: Scope) => {
    if (args.length === 3) {
      const f = args[0].compile().evaluate(scope) as (x: unknown) => unknown;
      if (typeof f !== 'function') throw new Error('integral(f, a, b): f precisa ser uma função');
      return runIntegral(f, args[1].compile().evaluate(scope), args[2].compile().evaluate(scope));
    }
    if (args.length !== 4 || !math.isSymbolNode(args[1])) throw new Error('integral(expressão, variável, a, b): argumentos inválidos');
    const name = (args[1] as Sym).name, body = args[0].compile();
    const aV = args[2].compile().evaluate(scope), bV = args[3].compile().evaluate(scope);
    return withVar(scope, name, (set) => runIntegral((x) => { set(x); return body.evaluate(scope); }, aV, bV));
  }, { rawArgs: true });

  /** diff(expr, x): derivada no valor atual de x; diff(expr, x, ponto): no ponto dado. */
  const diff = Object.assign((args: MathNode[], _m: unknown, scope: Scope) => {
    if (args.length === 1 || (args.length === 2 && !math.isSymbolNode(args[1]))) return (nativeDiff as (...a: unknown[]) => unknown)(...args.map((a) => a.compile().evaluate(scope)));
    if (args.length > 3 || !math.isSymbolNode(args[1])) throw new Error('diff(expressão, variável[, ponto]): argumentos inválidos');
    const name = (args[1] as Sym).name, body = args[0].compile();
    const x0 = (args[2] ?? args[1]).compile().evaluate(scope);
    if (!(typeof x0 === 'number' || isU(x0))) throw new Error('diff: o ponto precisa ser número ou grandeza');
    const xc = carrierOf(x0), cx = siOf(xc), xs = parts(x0)[0];
    let yc: Unit | undefined;
    return withVar(scope, name, (set) => {
      // o passo é medido na unidade de x ("3 mm" tem passo em mm), não em SI
      const memo = new Map<number, Q>();
      const at = (xd: number): Q => {
        let r = memo.get(xd);
        if (!r) {
          tick();
          set(xc ? build([xd * cx, 0], xc) : xd);
          const y = body.evaluate(scope);
          yc ??= carrierOf(y);
          memo.set(xd, (r = parts(y)));
        }
        return r;
      };
      const xd = xs / cx, step = 0.01 * (Math.abs(xd) || 1);
      const d: Q = [ridders((t) => at(t)[0], xd, step) / cx, 0];
      if (memo.size && [...memo.values()].some((q) => q[1] !== 0)) d[1] = ridders((t) => at(t)[1], xd, step) / cx;
      return build(d, times(yc, xc, true));
    });
  }, { rawArgs: true });

  /** sum(expr, i, a, b): soma de expr com i de a até b (passo 1); sum(vetor) e sum(a, b, c) do math.js continuam valendo. */
  const nativeSum = math.sum;
  const MAX_TERMS = 1_000_000;
  const sum = Object.assign((args: MathNode[], _m: unknown, scope: Scope) => {
    if (args.length !== 4 || !math.isSymbolNode(args[1])) return (nativeSum as (...a: unknown[]) => unknown)(...args.map((a) => a.compile().evaluate(scope)));
    const name = (args[1] as Sym).name, body = args[0].compile();
    const [a, b] = [args[2], args[3]].map((x) => x.compile().evaluate(scope));
    if (typeof a !== 'number' || typeof b !== 'number' || !Number.isInteger(a) || !Number.isInteger(b)) throw new Error('sum(expressão, i, início, fim): início e fim precisam ser inteiros');
    if (b - a >= MAX_TERMS) throw new Error('A soma tem termos demais (máximo de 1 000 000)');
    return withVar(scope, name, (set) => {
      let acc: unknown = 0;
      for (let k = a; k <= b; k++) { tick(); set(k); acc = math.add(acc as never, body.evaluate(scope) as never); }
      return acc;
    });
  }, { rawArgs: true });

  return { integral, diff, sum, nthroot: (x: unknown, n: unknown) => math.nthRoot(x as never, n as never) };
}
