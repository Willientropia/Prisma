// A6-3 (ADENDO 06, 2.3): Espaço amplia a seleção. Funções sobre o LaTeX do grupo onde está o cursor.
import type { MathfieldElement } from 'mathlive';

const OP = /\\(?:cdot|times|coloneq|le|ge|ne|lt|gt)(?![A-Za-z])|[-+=<>;]/y;
const SPACE = /(?:\\[;,!:]|\s)*/y;
const LEFT = /\\left(?![A-Za-z])/y;
const RIGHT = /\\right(?![A-Za-z])/y;
const at = (re: RegExp, s: string, i: number) => { re.lastIndex = i; return re.exec(s)?.[0]; }; // regex "y": casa só na posição i, sem fatiar o texto
/** Força do operador: 1 relação, definição e ";" (solta mais) · 2 soma e subtração · 3 produto (prende mais). */
const rank = (op: string) => (/^\\(?:cdot|times)/.test(op) ? 3 : /^[-+]/.test(op) ? 2 : 1);
/** Grupos maiores que isto não ampliam: o Espaço roda a cada tecla e não pode demorar (CLAUDE.md). */
const MAX_ATOMS = 300;

/** Operadores binários do nível mais externo (fora de chaves e de \left...\right), com a posição no texto. */
export function topOperators(s: string): { at: number; rank: number; text: string }[] {
  const out: { at: number; rank: number; text: string }[] = [];
  let depth = 0, operand = false; // operand: já vimos algo que pode ser operando à esquerda (senão +/- é sinal)
  for (let i = 0; i < s.length;) { // avança sempre: cada volta consome ao menos um caractere
    const l = at(LEFT, s, i), r = l ? undefined : at(RIGHT, s, i);
    if (l) { depth++; i += l.length; continue; }
    if (r) { depth--; i += r.length; continue; }
    if (s[i] === '{') depth++;
    else if (s[i] === '}') depth--;
    else if (depth === 0) {
      const m = at(OP, s, i);
      if (m) {
        const text = m + (at(SPACE, s, i + m.length) ?? ''); // o MathLive põe \; em volta de ≔: o corte vai depois deles
        if (!(/^[-+]$/.test(m) && !operand)) out.push({ at: i, rank: rank(m), text });
        operand = false;
        i += text.length;
        continue;
      }
    }
    if (!/\s/.test(s[i])) operand = true;
    i++;
  }
  return out;
}

/**
 * Onde começa a parte selecionada em cada nível de ampliação (índices no texto, do mais curto ao mais longo):
 * 0 o último operando, 1 o produto que o contém, 2 a soma, 3 a expressão toda do grupo
 * (em x ≔ a + b, "toda" é o lado direito: o x não entra).
 */
export function levelStarts(s: string): number[] {
  const ops = topOperators(s);
  const starts = [3, 2, 1, 0].map((stop) => {
    const last = ops.filter((o) => o.rank <= stop).at(-1);
    return last ? last.at + last.text.length : 0;
  });
  if (ops.some((o) => o.text.startsWith('\\coloneq'))) starts[3] = starts[2];
  return starts;
}

type Grow = { start: number; end: number; level: number };
/** A seleção feita pelo Espaço ainda vale (ninguém mexeu nela)? */
export function grownOf(mf: MathfieldElement, g: Grow | undefined): Grow | undefined {
  const r = mf.selection.ranges;
  return g && r.length === 1 && r[0][0] === g.start && r[0][1] === g.end ? g : undefined;
}

/** Espaço: amplia a parte selecionada para a expressão que a contém (operando, produto, soma, grupo todo). */
export function growSelect(mf: MathfieldElement, state: { grow?: Grow }): boolean {
  const cur = grownOf(mf, state.grow);
  if (!cur && mf.selection.ranges.some(([a, b]) => a !== b)) return false; // seleção do usuário: não é conosco
  const end = cur ? cur.end : mf.position;
  mf.position = end;
  mf.executeCommand('moveToGroupStart');
  const from = mf.position;
  mf.position = end;
  const keep = () => { if (cur) mf.selection = { ranges: [[cur.start, cur.end]], direction: 'forward' }; return !!cur; }; // o mf.position acima desfez a seleção: devolve-a
  if (end - from > MAX_ATOMS) return keep();
  const content = mf.getValue(from, end, 'latex');
  const strip = (t: string) => t.replace(/\s/g, '');
  // texto do campo de `from` até cada posição, calculado uma vez (o tamanho do texto não cresce sempre com a posição: não dá para parar no meio)
  const starts = levelStarts(content);
  const cuts = starts.map((idx) => (idx <= 0 ? '' : strip(content.slice(0, idx))));
  const pre: string[] = [];
  for (let k = from; k <= end; k++) {
    const t = strip(mf.getValue(from, k, 'latex'));
    pre.push(t);
  }
  const offsets = cuts.map((cut, i) => {
    if (starts[i] <= 0) return from;
    const k = pre.indexOf(cut);
    return k < 0 ? null : from + k;
  });
  const prev = cur ? cur.start : offsets[0] ?? end; // sem seleção, o ponto de partida é o último operando
  const level = offsets.findIndex((k, i) => k !== null && k < prev && i > (cur?.level ?? -1));
  if (level < 0) return keep(); // nada maior: mantém o que está (ou deixa o Espaço seguir o caminho normal)
  mf.selection = { ranges: [[offsets[level]!, end]], direction: 'forward' };
  state.grow = { start: offsets[level]!, end, level };
  return true;
}
