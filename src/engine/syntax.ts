// Sintaxe linear do Prisma (SPEC 3.4) traduzida para math.js.
export type LineKind = 'empty' | 'assign' | 'func' | 'eval' | 'check';
export type Line = {
  kind: LineKind;
  src: string; // expressão math.js ('' quando vazia)
  target?: string; // unidade pedida em "= ? V" (math.js) ou '%'
  name?: string; // variável ou função definida
  limit?: string; // lado direito da condição, como escrito (para o selo "limite 1 %")
  show?: boolean; // definição que também mostra o valor: "Z_0 := sqrt(L/C) = ?" (ADENDO 05, E2.1)
};

const REPLACE: [RegExp, string][] = [
  [/[·×]/g, '*'],
  [/−/g, '-'],
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/≠/g, '!='],
  [/°C/g, 'degC'],
  [/°F/g, 'degF'],
  [/°/g, 'deg'],
  [/([kMGmµu]?)Ω/g, '$1ohm'], // math.js só aceita nomes de unidade ASCII
  [/µ/g, 'u'],
  [/(\d)\s+1\s*\//g, '$1 /'], // "0.00393 1/°C" = 0.00393 por °C
];

export const toMath = (s: string) => REPLACE.reduce((acc, [re, to]) => acc.replace(re, to), s.trim());

/** De volta do math.js para a sintaxe linear (resultado simbólico, E3.3): "10 * x" -> "10*x". */
export const fromMath = (s: string) => s.replace(/\s*\*\s*/g, '*').replace(/\bohm\b/g, 'Ω').replace(/\bdeg\b/g, '°');

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
/** "\rho_cu" vira "ρ_cu" (o editor converte ao confirmar a linha). */
export const greek = (s: string) => s.replace(/\\([A-Za-z]+)/g, (m, w: string) => GREEK[w] ?? m);

const FUNC_LHS = /^\s*[\p{L}_][\p{L}\p{N}_]*\s*\(/u;
const RELATION = /(<=|>=|<|>|≤|≥|==|!=|≠)/;

export function classify(raw: string, isCheck = false): Line {
  const line = raw.replace(/#.*$/, '').trim();
  if (!line) return { kind: 'empty', src: '' };

  const ev = /^(.*?)(?<![:<>!=])=\s*\?\s*(.*)$/.exec(line);
  const defShow = ev && /^(.+?):=(.*)$/.exec(ev[1]);
  if (ev && defShow) {
    const lhs = defShow[1].trim();
    const t = ev[2].trim();
    return { kind: FUNC_LHS.test(lhs) ? 'func' : 'assign', src: `${toMath(lhs)} = ${toMath(defShow[2])}`, name: lhs.replace(/\(.*$/, '').trim(), show: true, target: t ? (t === '%' ? '%' : toMath(t)) : undefined };
  }
  if (ev) {
    const t = ev[2].trim();
    return { kind: 'eval', src: toMath(ev[1]), target: t ? (t === '%' ? '%' : toMath(t)) : undefined };
  }

  const as = /^(.+?):=(.*)$/.exec(line);
  if (as) {
    const lhs = as[1].trim();
    const kind = FUNC_LHS.test(lhs) ? 'func' : 'assign';
    return { kind, src: `${toMath(lhs)} = ${toMath(as[2])}`, name: lhs.replace(/\(.*$/, '').trim() };
  }

  if (isCheck) {
    const parts = line.split(RELATION);
    return { kind: 'check', src: toMath(line), limit: parts.length === 3 ? parts[2].trim() : undefined };
  }
  return { kind: 'eval', src: toMath(line) };
}
