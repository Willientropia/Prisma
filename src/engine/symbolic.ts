// A6-3 (ADENDO 06, 2.4): cálculo simbólico mínimo do Ctrl+. com o que o math.js já faz (derivative, simplify).
// O CAS completo é da Fase 8. Devolve a expressão resultante (sintaxe linear) ou null quando não há o que mostrar.
import type { MathNode } from 'mathjs';
import { math } from './math';
import { toMath } from './syntax';

/** Funções do motor que o math.js não conhece como símbolos: expressão com elas não tem resultado simbólico. */
const NUMERIC_ONLY = new Set(['integral', 'sum', 'diff', 'deriv', 'root', 'solve', 'interp', 'polyroots']);

const MAX_SRC = 500; // o simplify do math.js não tem prazo e o Ctrl+. é uma tecla: expressão enorme fica de fora

export function symbolic(src: string): string | null {
  try {
    if (!src.trim() || src.length > MAX_SRC) return null;
    const node = math.parse(toMath(src));
    // diff(f, x): derivada simbólica em x
    if (node.type === 'FunctionNode' && (node as MathNode & { fn: { name: string } }).fn.name === 'diff') {
      const [f, x] = (node as MathNode & { args: MathNode[] }).args;
      if (!f || !x || x.type !== 'SymbolNode' || (node as MathNode & { args: MathNode[] }).args.length !== 2) return null;
      return math.simplify(math.derivative(f, x as never)).toString();
    }
    let blocked = false;
    node.traverse((n) => { if (n.type === 'FunctionNode' && NUMERIC_ONLY.has((n as MathNode & { fn: { name: string } }).fn.name)) blocked = true; });
    if (blocked) return null;
    const out = math.simplify(node).toString();
    return out === node.toString() ? null : out;
  } catch { return null; }
}
