// Percurso de expressão que respeita a variável de integração (A6-8): em integral(expr, x, a, b) e em
// diff(expr, x, ponto), o x de expr é do próprio cálculo; não falta definir, não troca por valor nem por expressão.
import type { MathNode } from 'mathjs';
import { math } from './math';

type Sym = MathNode & { name: string };
type Call = MathNode & { fn: MathNode; args: MathNode[] };

/** Nome da variável que a chamada liga, ou undefined (integral antiga integral(f, a, b) não liga nada). */
function boundBy(c: Call): string | undefined {
  const name = math.isSymbolNode(c.fn) ? (c.fn as Sym).name : '';
  const ok = (name === 'integral' && c.args.length === 4) || (name === 'diff' && c.args.length === 3) || (name === 'sum' && c.args.length === 4);
  return ok && math.isSymbolNode(c.args[1]) ? (c.args[1] as Sym).name : undefined;
}

/**
 * Reconstrói node trocando cada símbolo livre por f(símbolo). O nome da função só passa por f com withFn
 * (para listar o que falta definir); a variável ligada e o nome em args[1] nunca passam.
 */
export function mapFree(node: MathNode, f: (s: Sym) => MathNode, withFn = false, bound: ReadonlySet<string> = new Set()): MathNode {
  if (math.isSymbolNode(node)) return bound.has((node as Sym).name) ? node : f(node as Sym);
  if (math.isFunctionNode(node)) {
    const c = node as Call, v = boundBy(c);
    const fn = withFn ? mapFree(c.fn, f, true, bound) : c.fn;
    const inner = v ? new Set(bound).add(v) : bound;
    return new math.FunctionNode(fn, c.args.map((a, i) => (v && i === 1 ? a : mapFree(a, f, withFn, v && i === 0 ? inner : bound))));
  }
  return node.map((c) => mapFree(c, f, withFn, bound));
}
