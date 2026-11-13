// Sintaxe linear do Prisma (SPEC 3.4) traduzida para math.js.
import { math } from './math';

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
  [/∞/g, 'Infinity'],
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/≠/g, '!='],
  [/\|\|/g, ' or '], // o ou (A6-3): operador "or" do math.js (em math.ts devolve 1 ou 0, como o SMath)
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
const ODD_NAME = /[\p{L}][\p{L}\p{N}%]*_(?:"[^"]*"|[\p{L}\p{N}_.%]*)|[\p{L}][\p{L}\p{N}]*%[\p{L}\p{N}%]*/gu;
/**
 * F04: dentro da expressão, nome é sempre variável (como no SMath). O math.js, porém, resolve qualquer símbolo
 * indefinido que seja nome de unidade (L, m, b, S) como unidade. Por isso o nome em posição de variável que
 * coincide com uma unidade ganha esta marca ("L" -> "Lǃ"), que o math.js não reconhece como unidade; fromMath
 * a retira. Posição de unidade: depois de número e espaço ("25 m", "5.4 h/dia", "0.0179 ohm*mm^2/m"), depois de
 * apóstrofo ("x*'m") e depois de to/in. Nome que é função ou constante do math.js (min, pi) não leva marca.
 * isVar: nome já definido como variável (ou parâmetro) vence a unidade, como antes: "2 h" com h := 3 é 6.
 */
export const VAR_MARK = 'ǃ';
const unitNames = new Map<string, boolean>();
const isUnitName = (n: string) => {
  let r = unitNames.get(n);
  if (r === undefined) { try { r = math.Unit.isValuelessUnit(n); } catch { r = false; } unitNames.set(n, r); }
  return r;
};
const isUnitLike = (n: string) => isUnitName(n) && !(n in math);

const MARK_TOKEN = /"[^"]*"|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[\p{L}_$][\p{L}\p{N}_$]*|\s+|[\s\S]/uy;
export function markVars(s: string, isVar?: (name: string) => boolean): string {
  const t: string[] = [];
  MARK_TOKEN.lastIndex = 0;
  for (let m = MARK_TOKEN.exec(s); m; m = MARK_TOKEN.exec(s)) t.push(m[0]); // todo token consome ao menos um caractere
  const isName = (i: number) => /^[\p{L}_$]/u.test(t[i] ?? '');
  const isNum = (i: number) => /^\d/.test(t[i] ?? '');
  let out = '';
  /** Copia o expoente da unidade (^2, ^-1) e devolve o índice seguinte. */
  const exponent = (i: number) => {
    if (t[i] !== '^') return i;
    let j = i + 1;
    if (t[j] === '-') j++;
    if (!isNum(j)) return i;
    out += t.slice(i, j + 1).join('');
    return j + 1;
  };
  /** Unidade composta a partir do nome em i, sem marca: mm^2, ohm*mm^2/m. Devolve o índice seguinte. */
  const unitChain = (i: number) => {
    for (;;) {
      out += t[i] === 'ppm' ? '*1e-6' : t[i]; // o math.js não tem ppm: 3 ppm vale 3·10^-6, como o % (A6-ESCALA)
      i = exponent(i + 1);
      if ((t[i] === '*' || t[i] === '/') && isName(i + 1) && isUnitName(t[i + 1]) && !isVar?.(t[i + 1])) { out += t[i]; i++; continue; } // só continua em unidade; "2 m*L" com L definida: L é variável
      return i;
    }
  };
  for (let i = 0; i < t.length; ) {
    const tk = t[i];
    if (tk === "'" && isName(i + 1)) { out += t[i + 1] === 'ppm' ? '1e-6' : t[i + 1]; i = exponent(i + 2); continue; } // unidade explícita (um só termo); ppm vale 10^-6 (A6-ESCALA)
    if (isNum(i)) {
      out += tk;
      let j = i + 1;
      while (/^\s/.test(t[j] ?? '')) j++;
      if (j > i + 1) {
        let k = j;
        if (t[k] === '/') { k++; while (/^\s/.test(t[k] ?? '')) k++; }
        let after = k + 1;
        while (/^\s/.test(t[after] ?? '')) after++;
        if (isName(k) && t[k] !== 'or' && t[after] !== '(' && !isVar?.(t[k])) { out += t.slice(i + 1, k).join(''); i = unitChain(k); continue; } // número e espaço: unidade
      }
      i++;
      continue;
    }
    if (isName(i)) {
      if (tk === 'to' || tk === 'in') { // 5 m to cm
        let k = i + 1;
        while (/^\s/.test(t[k] ?? '')) k++;
        if (isName(k) && !isVar?.(t[k])) { out += t.slice(i, k).join(''); i = unitChain(k); continue; }
      }
      out += isUnitLike(tk) ? tk + VAR_MARK : tk;
      i++;
      continue;
    }
    out += tk;
    i++;
  }
  return out;
}

export const toMath = (s: string) => REPLACE.reduce((acc, [re, to]) => acc.replace(re, to), s.trim())
  .replace(ODD_NAME, (n) => n.replace(/"/g, 'ǁ').replace(/,/g, 'ǅ').replace(/\./g, 'ǀ').replace(/%/g, 'ǂ'))
  .replace(/(?<![\p{L}\p{N}_])π(?![\p{L}\p{N}_])/gu, 'pi')
  .replace(/\s*\*?\s*‰/g, '*1e-3') // 5‰ e 5 ‰ valem 0,005, como o % do math.js (A6-ESCALA)
  .replace(/𝐢/gu, 'ⅈ').replace(/𝐞/gu, 'ℯ'); // símbolos próprios, que variável nenhuma esconde

/** Texto linear -> math.js já com as variáveis marcadas (F04): o que o motor avalia. classify() devolve o texto sem marca. */
export const toMathVars = (s: string) => markVars(toMath(s));

/** Unidades de escala que o math.js não tem (%, ‰, ppm): o número pedido nelas é o valor vezes o fator (BUG-019). */
export const SCALES: Record<string, number> = { '%': 100, '‰': 1000, ppm: 1e6 };
export const isScale = (t: string | undefined): t is string => !!t && Object.hasOwn(SCALES, t);

/** De volta do math.js para a sintaxe linear (resultado simbólico, E3.3): "10 * x" -> "10*x". */
export const fromMath = (s: string) => s.replace(/ǃ/g, '').replace(/ⅈ/g, '𝐢').replace(/ℯ/g, '𝐞').replace(/ǀ/g, '.').replace(/ǂ/g, '%').replace(/ǁ/g, '"').replace(/ǅ/g, ',').replace(/\bpi\b/g, 'π').replace(/\s*\*\s*/g, '*').replace(/\bohm\b/g, 'Ω').replace(/\bdeg\b/g, '°').replace(/\bInfinity\b/g, '∞');

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
    return { kind: FUNC_LHS.test(lhs) && !lhs.includes('[') ? 'func' : 'assign', src: `${toMath(lhs)} = ${inner(defShow[2])}`, name: lhs.replace(/[([].*$/, '').trim(), show: true, target: t ? (isScale(t) ? t : toMath(t).replace(/'/g, '')) : undefined };
  }
  if (ev) {
    const t = ev[2].trim();
    return { kind: 'eval', src: inner(ev[1]), target: t ? (isScale(t) ? t : toMath(t).replace(/'/g, '')) : undefined };
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
