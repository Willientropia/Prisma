// Assistente dinâmico (ADENDO 06, Parte 3; A6-4): o que lista, em que ordem e o que insere. Sem tela nem MathLive.
import { unitFactor, unitInfo, UNIDADES } from '../engine/unidades';
import { BUILTINS, idLatex, parseUnit, unitFromMathjs, unitLatex } from '../format/mathlinear';
import { numberLatex } from './resultado';
import { fmtNum } from '../engine/format';

export type AssistKind = 'var' | 'userfn' | 'lib' | 'native' | 'unit' | 'const';
export type AssistItem = {
  name: string;
  kind: AssistKind;
  lower: string; // name em minúsculas, calculado uma vez (o filtro roda a cada tecla)
  nameLatex: string; // como o nome aparece na lista
  insert: string; // LaTeX inserido ao aceitar
  title: string; // depois do "·" na linha 1 do detalhe: "Segundo (Tempo)", "Variável do usuário"
  detail?: string; // LaTeX da linha 2 (valor, definição, assinatura, fator)
  note?: string; // texto da linha 2 (primeira frase do "Por que e quando usar")
  arity?: number;
  inner?: string; // unidade: LaTeX de dentro do \mathrm, para aceitar dentro da unidade do apóstrofo
};

/** Categorias com os nomes da tabela 3.2. */
export const CATEGORY: Record<AssistKind, string> = {
  var: 'Variável do usuário', userfn: 'Função do usuário', lib: 'Função de biblioteca', native: 'Função nativa', unit: 'Unidade', const: 'Constante',
};
const ORDER: Record<AssistKind, number> = { var: 0, userfn: 0, lib: 1, native: 3, unit: 4, const: 5 }; // 2: o nome igual ao digitado

/** Funções que o motor tem além das que o conversor conhece (smathfns.ts). */
export const NATIVES = [...BUILTINS, 'mat', 'el', 'range', 'stack', 'augment', 'length', 'row', 'col', 'xy2pol', 'sys2mat', 'fft', 'invert', 'vectorize', 'for'].filter((n, i, a) => a.indexOf(n) === i);

/** 2.2: funções que viram estrutura visual (a mesma tabela do MathField). */
export const STRUCTURE: Record<string, string> = {
  sqrt: '\\sqrt{#0}',
  nthroot: '\\sqrt[#0]{#?}',
  abs: '\\left\\lvert #0\\right\\rvert',
  int: '\\int_{#0}^{#?}#?\\mathrm{d}#?', // sem "\,": o espaço fino seria uma parada a mais para as setas
  sum: '\\sum_{#0=#?}^{#?}#?',
};

const MAX = 64; // nome mais longo que o assistente considera; acima disso a lista fecha (C7: nada por tecla passa de alguns ms)

/**
 * Nome sendo digitado antes do cursor (LaTeX do começo até o cursor). Só olha os últimos caracteres:
 * uma regex ancorada no fim, sobre o texto todo, faria backtracking quadrático numa sequência longa de letras.
 */
export function partialName(before: string): string | null {
  const tail = before.slice(-(MAX + 1));
  if (tail.endsWith('\\%')) return '%'; // BUG-019: o % digitado é o nome parcial se a lista está aberta (Tab o troca pelo item, não o duplica); a lista só abre por letra, ' ou Ctrl+Espaço
  const m = /[\p{L}\d]+$/u.exec(tail);
  if (!m) return null;
  // depois de "\" vem um comando (\cdot, \rho), que é só letras; o MathLive cola o número nele (\coloneq25m)
  const run = tail[m.index - 1] === '\\' ? m[0].replace(/^[A-Za-z]+/, '') : m[0];
  const name = run.replace(/^\d+/, ''); // 400V: o nome é V
  return name && name.length <= MAX ? name : null;
}

const item = (name: string, kind: AssistKind, rest: Partial<AssistItem> & { insert: string; nameLatex: string }): AssistItem =>
  ({ name, kind, lower: name.toLowerCase(), title: CATEGORY[kind], ...rest });

export const varItem = (name: string, detail?: string): AssistItem => item(name, 'var', { nameLatex: idLatex(name), insert: idLatex(name), detail });

/** Função com n argumentos: nome(□; □) com o cursor no primeiro. */
export function fnItem(name: string, kind: 'userfn' | 'lib' | 'native', arity: number, rest: Partial<AssistItem> = {}): AssistItem {
  const args = ['#0', ...Array.from({ length: Math.max(arity, 1) - 1 }, () => '#?')].join(';');
  const insert = kind === 'native' && STRUCTURE[name] ? STRUCTURE[name] : `${idLatex(name)}\\left(${args}\\right)`;
  return item(name, kind, { nameLatex: kind === 'native' ? `\\mathrm{${name}}` : idLatex(name), insert, arity, ...rest }); // nativa reta, do usuário em itálico (3.4)
}

const SIG = { decimals: 6, sep: ',', mode: 'significativos' as const, expThreshold: 5 };
function unitItem(sym: string): AssistItem | null {
  const info = unitInfo(sym);
  if (!info) return null;
  let latex: string;
  try { latex = unitLatex(parseUnit(sym)); } catch { return null; }
  const f = info.fator ? { value: Number(info.fator.replace(',', '.')), unitRaw: '' } : unitFactor(sym);
  let detail: string | undefined;
  if (f) {
    let si = '';
    try { si = f.unitRaw ? `\\,${unitLatex(parseUnit(unitFromMathjs(f.unitRaw)))}` : ''; } catch { si = ''; }
    detail = `1\\,${latex} = ${numberLatex(fmtNum(f.value, SIG))}${si}`;
  }
  // inner: o que vai dentro da unidade já aberta pelo apóstrofo (\class{u}{\mathrm{…}}), sem abrir outra
  const inner = /^\\class\{u\}\{\\mathrm\{(.*)\}\}$/.exec(latex)?.[1];
  return item(sym, 'unit', { nameLatex: latex, insert: latex, inner, title: `${info.nome} (${info.grandeza})`, detail });
}

/** Ordem fixa da lista antes do filtro: categoria e depois alfabética (o filtro só reparte em grupos, sem reordenar). */
export const sortItems = (xs: AssistItem[]) => [...xs].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.name.localeCompare(b.name, 'pt-BR'));

let units: AssistItem[] | null = null;
export const unitItems = () => (units ??= sortItems(UNIDADES.map(([s]) => unitItem(s)).filter((x): x is AssistItem => !!x)));
let base: AssistItem[] | null = null;
/** Nativas, unidades e constantes: o que vale em qualquer folha. */
export const baseItems = () => (base ??= sortItems([
  ...NATIVES.map((n) => fnItem(n, 'native', 1)),
  ...unitItems(),
  item('π', 'const', { nameLatex: '\\pi', insert: '\\pi ', lower: 'pi' }),
  item('∞', 'const', { nameLatex: '\\infty', insert: '\\infty ', lower: 'inf' }),
  item('e', 'const', { nameLatex: 'e', insert: 'e' }),
]));

/**
 * Filtro (3.3): começa com o digitado (mesma caixa), começa sem diferenciar caixa, contém. Dentro de cada grupo:
 * usuário, biblioteca, nome igual ao digitado (decisão do A6-4, para o 06-10), nativas, unidades, constantes.
 * O(N) por tecla sobre a lista já ordenada.
 */
export function filterItems(items: AssistItem[], typed: string, opts: { units?: boolean } = {}): AssistItem[] {
  if (typed.length > MAX) return [];
  const pool = opts.units ? items.filter((x) => x.kind === 'unit') : items;
  if (!typed) return pool;
  const low = typed.toLowerCase();
  const groups: AssistItem[][] = [[], [], []];
  for (const x of pool) {
    const g = x.name.startsWith(typed) ? 0 : x.lower.startsWith(low) ? 1 : x.lower.includes(low) ? 2 : -1;
    if (g >= 0) groups[g].push(x);
  }
  // unidade com prefixo (mm, kN) não tem linha própria: entra montada quando o digitado é uma delas
  if (!pool.some((x) => x.kind === 'unit' && x.name === typed)) { const u = /^[\p{L}]+$/u.test(typed) ? unitItem(typed) : null; if (u) groups[0].push(u); }
  const rank = (x: AssistItem) => (x.kind !== 'var' && x.kind !== 'userfn' && x.kind !== 'lib' && x.lower === low ? (x.name === typed ? 2 : 2.5) : ORDER[x.kind]);
  return groups.flatMap((g) => g.map((x, i) => ({ x, i, r: rank(x) })).sort((a, b) => a.r - b.r || a.i - b.i).map((e) => e.x));
}
