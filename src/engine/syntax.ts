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

/**
 * Nomes que o math.js não aceita, vindos do SMath: ponto no índice (Relação_invest.Lucro) e "%" no nome
 * (Z%_modulo) viram letras parecidas ("ǀ" e "ǂ") e voltam em fromMath. π sozinho é pi.
 */
const ODD_NAME = /[\p{L}][\p{L}\p{N}%]*_[\p{L}\p{N}_.%]*|[\p{L}][\p{L}\p{N}]*%[\p{L}\p{N}%]*/gu;
export const toMath = (s: string) => REPLACE.reduce((acc, [re, to]) => acc.replace(re, to), s.trim())
  .replace(ODD_NAME, (n) => n.replace(/\./g, 'ǀ').replace(/%/g, 'ǂ'))
  .replace(/(?<![\p{L}\p{N}_])π(?![\p{L}\p{N}_])/gu, 'pi')
  .replace(/𝐢/gu, 'ⅈ').replace(/𝐞/gu, 'ℯ'); // símbolos próprios, que variável nenhuma esconde

/** De volta do math.js para a sintaxe linear (resultado simbólico, E3.3): "10 * x" -> "10*x". */
export const fromMath = (s: string) => s.replace(/ⅈ/g, '𝐢').replace(/ℯ/g, '𝐞').replace(/ǀ/g, '.').replace(/ǂ/g, '%').replace(/\bpi\b/g, 'π').replace(/\s*\*\s*/g, '*').replace(/\bohm\b/g, 'Ω').replace(/\bdeg\b/g, '°');

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
/** "\rho_cu" vira "ρ_cu" (o editor converte ao confirmar a linha). */
export const greek = (s: string) => s.replace(/\\([A-Za-z]+)/g, (m, w: string) => GREEK[w] ?? m);

const FUNC_LHS = /^\s*[\p{L}_][\p{L}\p{N}_]*\s*\(/u;
const RELATION = /(<=|>=|<|>|≤|≥|==|!=|≠)/;

/** Posição do primeiro "token" fora de parênteses e colchetes (o ":=" de dentro de for(...) é do corpo). */
function topLevel(s: string, token: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && s.startsWith(token, i)) return i;
  }
  return -1;
}
/** ":=" que sobrou dentro de parênteses (corpo de for) vira "=" para o math.js. */
const inner = (s: string) => toMath(s).replace(/:=/g, '=');

export function classify(raw: string, isCheck = false): Line {
  const line = raw.replace(/#.*$/, '').trim();
  if (!line) return { kind: 'empty', src: '' };

  const ev = /^(.*?)(?<![:<>!=])=\s*\?\s*(.*)$/.exec(line);
  const top = (x: string) => { const k = topLevel(x, ':='); return k < 0 ? null : [x, x.slice(0, k), x.slice(k + 2)]; };
  const defShow = ev && top(ev[1]);
  if (ev && defShow) {
    const lhs = defShow[1].trim();
    const t = ev[2].trim();
    return { kind: FUNC_LHS.test(lhs) && !lhs.includes('[') ? 'func' : 'assign', src: `${toMath(lhs)} = ${inner(defShow[2])}`, name: lhs.replace(/[([].*$/, '').trim(), show: true, target: t ? (t === '%' ? '%' : toMath(t)) : undefined };
  }
  if (ev) {
    const t = ev[2].trim();
    return { kind: 'eval', src: inner(ev[1]), target: t ? (t === '%' ? '%' : toMath(t)) : undefined };
  }

  const as = top(line);
  if (as) {
    const lhs = as[1].trim();
    const kind = FUNC_LHS.test(lhs) ? 'func' : 'assign';
    return { kind, src: `${toMath(lhs)} = ${inner(as[2])}`, name: lhs.replace(/[([].*$/, '').trim() }; // v[i] := x define v
  }

  if (isCheck) {
    const parts = line.split(RELATION);
    return { kind: 'check', src: toMath(line), limit: parts.length === 3 ? parts[2].trim() : undefined };
  }
  return { kind: 'eval', src: inner(line) };
}
