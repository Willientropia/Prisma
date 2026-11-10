// Funções de vetor, matriz e programação do SMath (ADENDO 05, E4.1). Índices começam em 1, como no SMath.
// Vetor do SMath (n×1) é vetor de uma dimensão aqui; matriz com mais de uma coluna é 2D, preenchida por linha.
import type { MathJsInstance, MathNode, Matrix } from 'mathjs';

type M = MathJsInstance;
type Sym = MathNode & { name: string };

export function smathFunctions(math: M) {
  // as originais, antes de range/fft/inv do SMath tomarem o lugar delas
  const mrange = math.range, mfft = math.fft, minv = math.inv;
  const isM = (v: unknown): v is Matrix => math.isMatrix(v);
  const arr = (v: unknown): unknown[] => (isM(v) ? (v.toArray() as unknown[]) : Array.isArray(v) ? v : [v]);
  const size = (v: unknown) => (isM(v) ? v.size() : Array.isArray(v) ? math.size(v as never) as unknown as number[] : []);
  /** 1D -> coluna n×1; escalar -> 1×1; 2D fica. */
  const as2d = (v: unknown): unknown[][] => {
    const s = size(v);
    if (s.length === 2) return arr(v) as unknown[][];
    if (s.length === 1) return arr(v).map((x) => [x]);
    return [[v]];
  };
  const toMatrix = (els: unknown[], r: number, c: number): Matrix => {
    if (els.length !== r * c) throw new Error(`mat: ${els.length} elementos para ${r}×${c}`);
    return c === 1 ? math.matrix(els as never) : math.matrix(Array.from({ length: r }, (_, i) => els.slice(i * c, i * c + c)) as never);
  };
  const num = (v: unknown) => Number(v);

  /** mat(a1, ..., an, linhas, colunas): matriz preenchida por linha (sys é igual, mostrado com chave no SMath). */
  const mat = (...a: unknown[]) => toMatrix(a.slice(0, -2), num(a[a.length - 2]), num(a[a.length - 1]));
  /** el(v, i) / el(M, i, j): elemento, contando de 1; i pode ser vetor de índices (range). */
  const el = (v: unknown, i: unknown, j?: unknown) => {
    const idx = (k: unknown) => (isM(k) || Array.isArray(k) ? arr(k).map((x) => num(x) - 1) : num(k) - 1);
    const s = size(v);
    if (j !== undefined) return math.subset(v as never, math.index(idx(i) as never, idx(j) as never));
    if (s.length === 2) return s[1] === 1 ? math.subset(v as never, math.index(idx(i) as never, 0)) : math.squeeze(math.subset(v as never, math.index(idx(i) as never, mrange(0, s[1]) as never)) as never);
    return math.subset(v as never, math.index(idx(i) as never));
  };
  /** range(a, b): a até b, passo 1; range(a, b, s): o segundo elemento é s (passo s - a), como no SMath. */
  const range = (a: unknown, b: unknown, s?: unknown) => {
    const x0 = num(a), x1 = num(b);
    const step = s === undefined ? (x1 >= x0 ? 1 : -1) : num(s) - x0;
    if (!step) throw new Error('range: passo zero');
    const out: number[] = [];
    for (let x = x0, k = 0; step > 0 ? x <= x1 + 1e-12 : x >= x1 - 1e-12; x = x0 + ++k * step) out.push(Number(x.toPrecision(15)));
    return math.matrix(out);
  };
  /** stack: um embaixo do outro. augment: lado a lado. */
  const stack = (...a: unknown[]) => {
    if (a.every((v) => size(v).length <= 1)) return math.matrix(a.flatMap((v) => arr(v)) as never);
    return math.matrix(a.flatMap(as2d) as never);
  };
  const augment = (...a: unknown[]) => {
    const parts = a.map(as2d);
    const rows = Math.max(...parts.map((p) => p.length));
    return math.matrix(Array.from({ length: rows }, (_, i) => parts.flatMap((p) => p[i] ?? p[0].map(() => 0))) as never);
  };
  const length = (v: unknown) => (isM(v) || Array.isArray(v) ? arr(v).flat(Infinity).length : 1);
  /** row(M, i): linha i; num vetor, o elemento i (o SMath trata sys(a, b) como coluna). */
  const row = (v: unknown, i: unknown) => (size(v).length === 2 && size(v)[1] > 1 ? el(v, i) : el(v, i));
  const col = (v: unknown, j: unknown) => (size(v).length === 2 ? math.subset(v as never, math.index(mrange(0, size(v)[0]) as never, num(j) - 1)) : v);
  /** xy2pol(z): forma polar sys(|z|, arg z); num vetor, elemento a elemento (cada um vira linha). */
  const xy2pol = (z: unknown): unknown => (isM(z) || Array.isArray(z) ? math.matrix(arr(z).map((x) => arr(xy2pol(x))) as never) : math.matrix([math.abs(z as never), math.arg(z as never)] as never));
  const sys2mat = (v: unknown) => v;
  const fft = (v: unknown) => math.matrix(mfft(arr(v) as never) as never);
  const invert = (v: unknown) => minv(v as never);

  /** vectorize(expr): operações elemento a elemento (*, /, ^), como no SMath. */
  const vectorize = Object.assign((args: MathNode[], _m: unknown, scope: Map<string, unknown>) => {
    const dot: Record<string, string> = { multiply: 'dotMultiply', divide: 'dotDivide', pow: 'dotPow' };
    const node = args[0].transform((n) => (math.isOperatorNode(n) && dot[n.fn] ? new math.FunctionNode(dot[n.fn], n.args) : n));
    return node.compile().evaluate(scope);
  }, { rawArgs: true });

  /** for(i, faixa, corpo): repete o corpo para cada valor da faixa; o corpo costuma ser v[i] := ... */
  const forLoop = Object.assign((args: MathNode[], _m: unknown, scope: Map<string, unknown>) => {
    const name = (args[0] as Sym).name;
    const values = arr(args[1].compile().evaluate(scope)).flat(Infinity);
    prepareTargets(args[2], scope);
    const body = args[2].compile();
    let last: unknown;
    for (const v of values) { scope.set(name, v); last = body.evaluate(scope); }
    return last;
  }, { rawArgs: true });

  /** Atribuição a elemento (v[i] := x) cria o vetor se ele ainda não existe, como no SMath. */
  function prepareTargets(node: MathNode, scope: Map<string, unknown>) {
    node.traverse((n) => {
      const a = n as MathNode & { object?: Sym; index?: unknown };
      if (math.isAssignmentNode(n) && a.index && a.object && math.isSymbolNode(a.object) && !scope.has(a.object.name)) scope.set(a.object.name, math.matrix([]));
    });
  }

  /** v[i] na leitura vira el(v, i) (1-based, e num vetor de linhas devolve a linha); v[i] := x continua nativo. */
  function readIndexAsEl(node: MathNode): MathNode {
    return node.transform((n, path, parent) => {
      const acc = n as MathNode & { object?: MathNode; index?: { dimensions: MathNode[] } };
      if (math.isAccessorNode(n) && !(math.isAssignmentNode(parent as MathNode) && path === 'object')) return new math.FunctionNode('el', [acc.object!, ...acc.index!.dimensions]);
      return n;
    });
  }

  return { readIndexAsEl, mat, sys: mat, el, range, stack, augment, length, row, col, xy2pol, sys2mat, fft, invert, vectorize, for: forLoop, prepareTargets };
}
