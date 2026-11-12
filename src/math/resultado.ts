// Resultado do motor -> LaTeX da tela. Separado do MathLine para o assistente (assistente.ts) usar sem import circular.
import { nodeLatex, parseLinear, parseUnit, unitFromMathjs, unitLatex } from '../format/mathlinear';
import type { LineResult } from '../engine/evaluate';

/** Número do motor -> LaTeX: "1,475e-3" vira 1,475·10⁻³ (nunca "e-3" na tela) e o i do complexo, negrito reto (E4.2). */
export function numberLatex(t: string): string {
  return t
    .replace(/\s/g, '')
    .replace(/−/g, '-')
    .replace(/(\d),(\d)/g, '$1{,}$2')
    .replace(/e(-?\d+)/g, (_, n: string) => `\\cdot 10^{${Number(n)}}`)
    .replace(/·i/g, '\\cdot \\mathbf{i}');
}

/** Latex do resultado: "3{,}29\,\class{u}{\mathrm{V}}". */
export function resultLatex(r: LineResult): string {
  // vetor ou matriz (E4.1); texto entre aspas fica reto
  if (r.matrix) return `\\begin{bmatrix}${r.matrix.map((row) => row.map((c) => (c.startsWith('"') ? `\\text{${c.replace(/[\\{}]/g, '')}}` : numberLatex(c))).join('&')).join('\\\\')}\\end{bmatrix}`;
  let num = numberLatex(r.numText ?? r.text ?? '');
  if (r.factor) {
    // conversão por expressão (E4.3): (0,2 + 3,77·i)·10⁻⁶
    if (/[+-]/.test(num.replace(/^-/, '').replace(/10\^\{-/g, ''))) num = `\\left(${num}\\right)`;
    let f: string;
    try { const l = parseLinear(r.factor); f = nodeLatex(l.kind === 'def' ? l.rhs : l.expr); } catch { f = `\\mathrm{${r.factor}}`; }
    num = `${num}\\cdot ${f}`;
  }
  if (!r.unitRaw) return num;
  let unit: string;
  try { unit = unitLatex(parseUnit(unitFromMathjs(r.unitRaw))); } catch { unit = `\\mathrm{${r.unitRaw}}`; }
  return `${num}\\,${unit}`;
}
