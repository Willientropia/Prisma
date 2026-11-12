// Mais de 300 linhas: o teclado do campo (handleKey) é uma peça só e já passava do limite; a lógica nova do Espaço mora em selecao.ts
// e a do assistente dinâmico (o que lista e insere) em assistente.ts; aqui fica só a ligação com as teclas.
// Campo matemático (ADENDO 02): MathLive configurado como o SMath. Edita e mostra no mesmo formato.
import { useEffect, useMemo, useRef, useState } from 'react';
import { MathfieldElement, convertLatexToMarkup } from 'mathlive';
import 'mathlive/static.css'; // estilos da renderização estática e as fontes (empacotadas, sem internet)
import { run } from '../commands/registry';
import { math } from '../engine/math';
import { grownOf, growSelect, topOperators } from './selecao';
import { CATEGORY, filterItems, partialName, STRUCTURE, type AssistItem } from './assistente';
import { Assistente, type AssistDetail, type AssistRow } from '../components/Assistente';
import { greekLatex, LATIN_TO_GREEK, type Node, latexToLine, lineToLatex, type LatexCtx } from '../format/mathlinear';

MathfieldElement.fontsDirectory = null; // as @font-face já vêm de mathlive/static.css
MathfieldElement.soundsDirectory = null;
MathfieldElement.decimalSeparator = ',';

/** Estilo injetado no shadow DOM de cada campo (o CSS da página não entra lá). Só variáveis de tokens.css. */
const SHADOW_CSS = `
:host { --caret-color: var(--math-focus-frame); --selection-background-color: var(--region-selected-bg); --primary: var(--math-focus-frame); }
.ML__mathit, .ML__cmr { font-family: 'STIX Two Text', Georgia, serif !important; }
.ML__mathit { font-style: italic; }
.u, .u * { color: var(--mf-unit) !important; }
.undef { text-decoration: underline wavy var(--math-error); text-decoration-skip-ink: none; }
.ML__container { min-height: auto; padding: 0; }
.ML__virtual-keyboard-toggle, .ML__menu-toggle { display: none !important; }
`;

/** eval: pediu o resultado ("x ="); defeval: definição completa + "=" acrescenta o resultado ("Z_0 := sqrt(L/C) ="). */
export type Commit = 'enter' | 'shift-enter' | 'blur' | 'escape' | 'eval' | 'defeval';
/** Assistente dinâmico (A6-4): items monta a lista quando ela abre; auto: abre sozinho ao digitar (Exibir > Assistente dinâmico). */
export type AssistSource = { items: () => AssistItem[]; auto: boolean; units?: boolean; openOnFocus?: boolean };
export type FieldProps = {
  latex: string;
  ctx: LatexCtx;
  theme: 'paper' | 'dark';
  size: number;
  focused?: boolean; // pedir foco (linha nova, região nova)
  selectOnFocus?: boolean; // ao ganhar foco, seleciona tudo (o que se digitar substitui)
  initialKeys?: Key[]; // teclas digitadas antes do campo ter foco (região nova na folha)
  onReady?: () => void; // campo com foco e teclas pendentes já aplicadas
  invalid?: boolean;
  onInput?: (latex: string) => void;
  onCommit: (latex: string, how: Commit) => void;
  onBackspaceEmpty?: () => void;
  onFocus?: () => void;
  onLeave?: () => void; // perdeu o foco (com ou sem edição)
  onToText?: (word: string) => void; // Espaço numa região de um nome só (A6-3): quem hospeda troca a região por texto
  onSymbolic?: (latex: string) => void; // Ctrl+. (A6-3, 2.4)
  onArrowEnd?: () => boolean; // seta direita no fim do campo (A6-3, 2.5): true se levou o cursor ao marcador de conversão
  ariaLabel?: string;
  assist?: AssistSource;
};

export type Key = { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean };
const OPERATOR_KEYS = new Set(['+', '-', '<', '>', ';', ')', ':', '=', '*', '/', ',', '|']);

/** LaTeX do começo até o cursor. getValue(pos-1, pos) volta vazio logo depois de parênteses, então lemos o prefixo. */
const beforeCaret = (mf: MathfieldElement) => (mf.position > 0 ? mf.getValue(0, mf.position, 'latex') : '');
/** Última letra latina solta antes do cursor (não parte de um comando como \rho). */
export function lastLetter(s: string): string | null {
  const m = /(\\?)([A-Za-z]+)\s*$/.exec(s);
  return m && !m[1] ? m[2].slice(-1) : null;
}
/** "\left(...\right)" no fim do texto: onde começa e o que tem dentro. */
export function trailingFence(s: string): { start: number; inner: string } | null {
  const t = s.trimEnd();
  if (!t.endsWith('\\right)')) return null;
  let depth = 0;
  const marks = [...t.matchAll(/\\(left|right)/g)];
  for (let i = marks.length - 1; i >= 0; i--) {
    depth += marks[i][1] === 'right' ? 1 : -1;
    if (depth === 0) return { start: marks[i].index!, inner: t.slice(marks[i].index! + '\\left('.length, t.length - '\\right)'.length) };
  }
  return null;
}

/**
 * Teclas da B4 que o MathLive não faz sozinho. Devolve true quando tratou a tecla.
 * state.script: estamos num índice (sub) ou expoente (sup) aberto por digitação.
 */
type FieldState = {
  script: 'sub' | 'sup' | 'idx' | null; edited: boolean; lastCommit?: Commit | null; unit?: boolean; struct?: number; grow?: { start: number; end: number; level: number }; // unit: o cursor está dentro da unidade aberta com apóstrofo (F04)
  assist?: { all: AssistItem[]; shown: AssistItem[]; sel: number; typed: string; moved: boolean }; // lista aberta (A6-4); moved: escolhida com as setas ou o mouse
  letter?: boolean; // a última tecla foi uma letra: o assistente pode abrir
  pending?: boolean; // letra digitada cujo "input" o MathLive ainda não mandou: a próxima tecla recalcula a lista antes
  paint?: () => void; // redesenha a lista
};

/** Abre, filtra ou fecha a lista com o nome antes do cursor. force: Ctrl+Espaço ou campo de unidade, mesmo sem nada digitado. */
function refreshAssist(mf: MathfieldElement, state: FieldState, p: { current: FieldProps }, force = false) {
  const src = p.current.assist;
  const was = state.assist;
  state.assist = undefined;
  if (src && !state.script && (was || force || (src.auto && state.letter))) {
    const units = !!src.units || !!state.unit;
    const typed = partialName(beforeCaret(mf)) ?? '';
    if (typed || units || force) {
      const all = was?.all ?? src.items();
      const shown = filterItems(all, typed, { units });
      if (shown.length) state.assist = { all, shown, typed, sel: 0, moved: false };
    }
  }
  if (was || state.assist) state.paint?.();
}
const ROWS = 100; // linhas desenhadas da lista (A6-4)
const closeAssist = (state: FieldState) => { if (state.assist) { state.assist = undefined; state.paint?.(); } };

/** Aceitar (3.5): troca o nome digitado pelo item; função com os argumentos, unidade como unidade. */
function acceptAssist(mf: MathfieldElement, state: FieldState, p: { current: FieldProps }, i: number) {
  const a = state.assist!;
  const it = a.shown[i];
  closeAssist(state);
  state.letter = false;
  for (let k = 0; k < a.typed.length; k++) mf.executeCommand('deleteBackward');
  if (state.unit && it.inner !== undefined) { mf.insert(it.inner, { format: 'latex' }); mf.executeCommand('moveAfterParent'); state.unit = false; }
  else mf.insert(it.insert, { selectionMode: it.insert.includes('#0') ? 'placeholder' : 'after', format: 'latex' });
  if (it.kind === 'native' && STRUCTURE[it.name]) state.struct = (state.struct ?? 0) + 1;
  state.edited = true;
  p.current.onInput?.(mf.value);
}

// 2.2: STRUCTURE (funções que viram estrutura visual) mora em assistente.ts, que também insere por ela.
/** Ctrl+tecla que insere um símbolo (tabela 2.1). */
const CTRL_SYMBOL: Record<string, string> = { '3': '\\ne ', '9': '\\le ', '0': '\\ge ', '=': '=', '\\': '\\sqrt[#0]{#?}' };

const GREEK_CMD =/^\\(?:var)?(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)$/;

function handleKey(mf: MathfieldElement, e: Key, state: FieldState, p: { current: FieldProps }): boolean {
  const before = () => beforeCaret(mf);
  // dígitos coladas numa letra ou grega (R1, ρ1) fazem parte do nome; o texto antes do cursor não basta (perde "(" e cola \coloneq no número)
  const nameDigit = () => {
    let k = mf.position;
    const at = (i: number) => mf.getValue(i - 1, i, 'latex').trim();
    if (!/^\d$/.test(at(k))) return false;
    while (k > 0 && /^\d$/.test(at(k))) k--;
    return k > 0 && (/^\p{L}$/u.test(at(k)) || GREEK_CMD.test(at(k)));
  };
  // depois de um nome (A6-2): letras e dígitos (batata, R1, ΔV) ou letra grega (\rho); "." e "," abrem o índice
  const afterName = () => {
    if (nameDigit()) return true;
    const b = before();
    const cmd = /\\[A-Za-z]+\s*$/.exec(b);
    return cmd ? GREEK_CMD.test(cmd[0].trim()) : /(^|[^\\\p{L}])\p{L}[\p{L}\d]*\s*$/u.test(b);
  };
  // o campo tem só um nome (sem índice, operador, ≔ ou =)? devolve a palavra
  const lone = () => {
    try { const l = latexToLine(mf.value); return l.kind === 'expr' && l.expr.t === 'id' && !l.expr.name.includes('_') ? l.expr.name : null; } catch { return null; }
  };
  const afterDigit = () => /\d$/.test(before()) && !nameDigit();
  const atEnd = () => mf.position === mf.lastOffset;
  const insert = (latex: string) => mf.insert(latex, { selectionMode: latex.includes('#0') ? 'placeholder' : 'after', format: 'latex' });
  const leaveSub = () => { if (state.script === 'sub') mf.executeCommand('moveAfterParent'); if (state.script === 'sub') state.script = null; };
  // ao sair de um identificador, reclassifica: variável, unidade ou não definida (B4)
  const classify = (force = false) => {
    if (!force && (!atEnd() || state.script)) return;
    try {
      const canon = lineToLatex(latexToLine(mf.value), p.current.ctx);
      if (canon !== mf.value) { mf.setValue(canon, { silenceNotifications: true }); mf.position = mf.lastOffset; }
    } catch { /* expressão ainda incompleta */ }
  };

  const grown = () => grownOf(mf, state.grow); // A6-3, 2.3: a seleção do Espaço ainda vale?
  const growSelection = () => growSelect(mf, state); // Espaço: amplia a seleção (selecao.ts)

  // confirmar: forma canônica (unidade em azul, índice reto) e marca como gravado, para a saída do campo
  // logo em seguida não gravar de novo por cima (BUG-004: o "= ?" era perdido)
  const commit = (how: Commit) => { state.script = null; state.unit = false; state.struct = 0; classify(true); state.edited = false; state.lastCommit = how; p.current.onCommit(mf.value, how); };

  // A6-4 (3.5): com a lista aberta, Tab, Ctrl+Enter, Shift+Enter e Ctrl+Espaço aceitam; Enter só aceita se o item foi escolhido
  // (decisão do usuário); setas navegam; Esc fecha só a lista. Espaço, setas laterais, Home e End fecham e seguem o caminho de sempre.
  const a = state.assist;
  if (a) {
    if ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.shiftKey || a.moved)) || (e.key === ' ' && e.ctrlKey)) { acceptAssist(mf, state, p, a.sel); return true; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { a.sel = (a.sel + (e.key === 'ArrowDown' ? 1 : a.shown.length - 1)) % a.shown.length; a.moved = true; state.paint?.(); return true; }
    if (e.key === 'Escape') { closeAssist(state); state.letter = false; return true; }
    if (['Enter', ' ', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) closeAssist(state); // Tab aqui é Shift+Tab
  } else if (e.key === ' ' && e.ctrlKey && p.current.assist) { refreshAssist(mf, state, p, true); return true; }
  state.letter = e.key.length === 1 && /\p{L}/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    const l = lastLetter(before());
    const g = l ? LATIN_TO_GREEK[l] : undefined;
    if (g) { mf.executeCommand('deleteBackward'); insert(greekLatex(g)); }
    return true;
  }
  // Ctrl+.: cálculo simbólico mínimo (A6-3, 2.4)
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === '.') { p.current.onSymbolic?.(mf.value); return true; }
  // Ctrl+K: busca de função (F4-06); o MathLive não deixa o atalho chegar à janela
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { run('funcao.inserir'); return true; }
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const key = e.key.toLowerCase();
    const sym = e.shiftKey ? ({ p: '\\pi ', z: '\\infty ' } as Record<string, string>)[key] : CTRL_SYMBOL[key]; // Ctrl+Shift+P = π, Ctrl+Shift+Z = ∞
    if (sym) { leaveSub(); insert(sym); return true; }
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;

  // F04: a unidade do apóstrofo vale para um nome só; operador, expoente ou espaço fecham a unidade antes de seguir
  // (se a unidade foi apagada, o campo não tem mais \class{u}: state.unit ficou velho; getValue(0, pos) não mostra o \class, então só dá para conferir o campo todo)
  if (state.unit && !mf.value.includes('\\class{u}')) state.unit = false;
  if (state.unit && (OPERATOR_KEYS.has(e.key) || ['^', ' ', '|'].includes(e.key))) { mf.executeCommand('moveAfterParent'); state.unit = false; }

  // A6-3, 2.3: com a seleção ampliada pelo Espaço, o próximo caractere age sobre ela em vez de substituí-la
  const g = grown();
  if (g && e.key.length === 1 && e.key !== ' ') {
    state.grow = undefined;
    const sel = mf.getValue(g.start, g.end, 'latex');
    const ops = topOperators(sel);
    const wrap = e.key === '^' ? ops.length > 0 : e.key === '*' && ops.some((o) => o.rank <= 2); // (a+b)^ e (a+b)*, mas a*b^ não precisa
    if (e.key === '/' || wrap) mf.executeCommand('deleteBackward'); // tira a seleção: com ela, o #0 do insert seria preenchido pela seleção
    if (e.key === '/') { insert(`\\frac{${sel}}{#0}`); return true; }
    if (wrap) { insert(e.key === '^' ? `\\left(${sel}\\right)^{#0}` : `\\left(${sel}\\right)\\cdot `); if (e.key === '^') state.script = 'sup'; return true; }
    mf.position = g.end; // outro operador (ou letra): a seleção se desfaz e o texto segue depois dela
  }

  // ':' e '=' não reclassificam: o nome à esquerda está sendo definido ou avaliado
  // ';' e ')': reclassificar ali tiraria o cursor de dentro dos parênteses (f(a;b)); confirmar reclassifica
  if (OPERATOR_KEYS.has(e.key) && !(e.key === ',' && state.script === 'sub')) { leaveSub(); if (!['/', ',', ':', '=', ';', ')'].includes(e.key)) classify(); } // a vírgula dentro do índice é texto: não sai dele
  switch (e.key) {
    case 'Enter': commit(e.shiftKey ? 'shift-enter' : 'enter'); return true;
    case 'Escape': commit('escape'); return true;
    case 'Backspace': if (mf.value === '') { p.current.onBackspaceEmpty?.(); return true; } return false;
    case ':': insert('\\coloneq '); return true;
    case '=': {
      // BUG-016: "<=" e ">=" digitados viram ≤ e ≥ (o "=" não avalia)
      const rel = /([<>])\s*$/.exec(before());
      if (rel) { mf.executeCommand('deleteBackward'); insert(rel[1] === '<' ? '\\le ' : '\\ge '); return true; }
      // "=" inteligente (ADENDO 05, E2.1): nome ainda não definido vira definição; o resto, avaliação
      const v = mf.value;
      if (v.includes('coloneq')) { if (v.split('coloneq')[1].replace(/\\[;,]/g, '').trim()) commit('defeval'); return true; }
      let target: Node | null = null;
      try { const l = latexToLine(v); if (l.kind === 'expr') target = l.expr; } catch { /* incompleta */ }
      const name = target?.t === 'id' ? target.name : target?.t === 'call' && target.args.every((a) => a.t === 'id') ? target.f : null;
      const defined = (n: string) => !!p.current.ctx.before?.(n) || n in math || n === 'i' || n === 'e';
      if (name && !defined(name)) { leaveSub(); insert('\\coloneq '); return true; }
      commit('eval');
      return true;
    }
    case '*': insert('\\cdot '); return true;
    case '\\': insert('\\sqrt{#0}'); return true;
    case "'": insert('\\class{u}{\\mathrm{#0}}'); state.unit = true; state.letter = true; refreshAssist(mf, state, p); return true; // força unidade (B4); o assistente abre só com unidades (3.1)
    case '|': insert('\\lor '); return true; // o ou (A6-3, decisão do usuário conferida no SMath); o valor absoluto é abs(
    case ',': {
      if (afterDigit()) { insert('{,}'); return true; } // vírgula decimal
      // depois de letra abre o índice do nome, como no SMath: s,tensao (ADENDO 05, E2.2)
      if (!state.script && afterName()) { mf.executeCommand('moveToSubscript'); state.script = 'sub'; return true; }
      if (state.script === 'sub') { insert(','); return true; } // dentro do índice a vírgula é texto (batata com índice alo,oi), como no SMath
      insert(';'); return true; // senão separa argumentos
    }
    case ';': insert(';'); return true;
    case '.': {
      if (afterDigit()) { insert('{,}'); return true; }
      if (afterName()) { mf.executeCommand('moveToSubscript'); state.script = 'sub'; return true; }
      return false;
    }
    // v[2]: índice de elemento (M[2;3] com ";"); "]" ou espaço saem dele (A6-2, tabela 2.1)
    case '[': {
      if (state.script || !(afterName() || /\\right\)$/.test(before()))) return false;
      mf.executeCommand('moveToSubscript');
      state.script = 'idx';
      insert('\\lbrack #0\\rbrack ');
      return true;
    }
    case ']': if (state.script === 'idx') { mf.executeCommand('moveAfterParent'); state.script = null; return true; } return false;
    // digitar o nome de certas funções e "(" cria a estrutura visual com quadradinhos (ADENDO 06, 2.2)
    case '(': {
      const name = state.script ? undefined : /(?:^|[^\\\p{L}])(sqrt|nthroot|abs|int|sum)$/u.exec(before())?.[1];
      if (!name) {
        // com algo à direita (o dx da integral), o parêntese automático do MathLive engoliria tudo: fecha-se já aqui
        if (state.struct && !state.script && !atEnd()) { insert('\\left(#0\\right)'); return true; }
        return false;
      }
      for (let i = 0; i < name.length; i++) mf.executeCommand('deleteBackward');
      insert(STRUCTURE[name]);
      state.struct = (state.struct ?? 0) + 1;
      return true;
    }
    // sqrt(4): o ")" digitado por hábito fecha a estrutura em vez de entrar nela (só sem parêntese aberto)
    case ')': {
      if (!state.struct) return false;
      const b = before();
      if ((b.match(/\\left\(/g)?.length ?? 0) > (b.match(/\\right\)/g)?.length ?? 0)) return false;
      const at = mf.position;
      mf.executeCommand('moveAfterParent');
      if (mf.position === at) return false;
      state.struct--;
      return true;
    }
    case '_': state.script = 'sub'; return false;
    case '^': state.script = 'sup'; return false;
    case ' ': {
      if (state.script) { mf.executeCommand('moveAfterParent'); state.script = null; return true; }
      // só um nome na região: vira texto (comportamento do SMath); com expressão, o Espaço amplia a seleção (A6-3)
      const word = p.current.onToText && lone();
      if (word) { state.edited = false; holdKeys(); p.current.onToText!(word); return true; } // edited: a saída do campo não grava a linha de volta por cima do texto
      if (!growSelection()) classify();
      return true;
    }
    case 'Tab': if (e.shiftKey) return false; commit('blur'); mf.blur(); return true; // sai da região (tabela 2.1): grava e solta o foco
    case 'ArrowRight': case 'ArrowLeft': case 'ArrowUp': case 'ArrowDown':
      if (e.key === 'ArrowRight' && atEnd() && !state.script && p.current.onArrowEnd?.()) return true; // depois do "=", seta direita vai ao marcador (2.5)
      state.script = null; state.unit = false; return false;
    case '/': {
      // (a+b)/ -> fração com a+b em cima, sem os parênteses (B4)
      // seleção/inserção do MathLive cai dentro dos parênteses; reescreve o valor e põe o cursor no denominador
      const b = before();
      const f = trailingFence(b);
      // BUG-018: sem parênteses, a fração também é montada aqui. O atalho nativo do MathLive perdia a corrida quando o "/" vinha
      // logo depois do índice (V.o/T.total digitado depressa saía com a barra solta); #@ é o operando anterior, o mesmo que ele usa
      if (!f) { mf.insert('\\frac{#@}{#?}', { selectionMode: 'placeholder', format: 'latex' }); return true; }
      const after = atEnd() ? '' : mf.getValue(mf.position, mf.lastOffset, 'latex');
      mf.setValue(`${b.slice(0, f.start)}\\frac{${f.inner}}{\\placeholder{}}${after}`);
      mf.position = 0;
      mf.executeCommand('moveToNextPlaceholder');
      return true;
    }
  }
  return false;
}

/**
 * Teclas digitadas enquanto um campo novo ainda não tem foco (linha nova do caderno depois de Enter):
 * ficam guardadas aqui, em vez de cair no campo anterior, e o campo que receber o foco as aplica.
 */
let held: { keys: Key[]; listener: (e: KeyboardEvent) => void; timer: number } | null = null;
const HOLD_MS = 1000; // prazo: se nenhum campo assumir (documento somente leitura, campo desmontado), o teclado volta
export function holdKeys(): void {
  releaseKeys();
  const keys: Key[] = [];
  const listener = (e: KeyboardEvent) => {
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    keys.push({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey });
  };
  window.addEventListener('keydown', listener, true);
  held = { keys, listener, timer: window.setTimeout(releaseKeys, HOLD_MS) };
}
/** Teclas digitadas depois do Espaço que trocou a região por texto: quem recebe o foco as aplica (A6-3). */
export const takeHeldKeys = (): Key[] => releaseKeys();
function releaseKeys(): Key[] {
  if (!held) return [];
  window.removeEventListener('keydown', held.listener, true);
  clearTimeout(held.timer);
  const k = held.keys;
  held = null;
  return k;
}

/** Um campo MathLive. O valor de fora (latex) só substitui o do campo quando ele não está em edição. */
/** Último campo matemático que teve foco: "Inserir função" (Ctrl+K) escreve nele (Fase 4, F4-06). */
export let lastMathField: (HTMLElement & { insert(s: string, o?: object): boolean; focus(): void }) | null = null;

export function MathField(props: FieldProps) {
  const host = useRef<HTMLSpanElement>(null);
  const mfRef = useRef<MathfieldElement | null>(null);
  const p = useRef(props);
  p.current = props;
  const focusFrame = useRef(0);
  const focusNow = useRef<() => void>(() => {});
  const [view, setView] = useState<{ rows: AssistRow[]; sel: number; detail: AssistDetail | null; x: number; y: number } | null>(null);
  const pick = useRef<{ select: (i: number) => void; accept: (i: number) => void }>({ select: () => {}, accept: () => {} });

  useEffect(() => {
    const mf = new MathfieldElement();
    host.current!.appendChild(mf);
    // as opções só valem depois de o campo estar no documento
    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.menuItems = [];
    mf.smartFence = true;
    mf.smartMode = false;
    mf.inlineShortcuts = { '<=': '\\le', '>=': '\\ge', '!=': '\\ne' };
    mf.popoverPolicy = 'off';
    mf.setAttribute('aria-label', p.current.ariaLabel ?? 'Expressão');
    const style = document.createElement('style');
    style.textContent = SHADOW_CSS;
    mf.shadowRoot?.appendChild(style);
    mf.value = p.current.latex;

    const state: FieldState = { script: null, edited: false }; // edited: houve digitação desde o foco ou o último commit
    state.paint = () => {
      const a = state.assist;
      if (!a) { setView(null); return; }
      const r = host.current!.getBoundingClientRect();
      const b = mf.getElementInfo(Math.max(0, mf.position))?.bounds;
      const it = a.shown[a.sel];
      setView({
        // ponytail: só as 100 primeiras linhas são desenhadas (8 visíveis); mais que isso, o nome digitado filtra
        rows: a.shown.slice(0, ROWS).map((x) => ({ key: `${x.kind}:${x.name}`, name: x.name, kind: x.kind, nameLatex: x.nameLatex, category: CATEGORY[x.kind] })),
        sel: a.sel,
        detail: { nameLatex: it.nameLatex, title: it.title, line2: it.detail, note: it.note },
        x: Math.max(0, Math.min((b?.right ?? r.left), window.innerWidth - 490)), y: r.bottom + 2,
      });
    };
    pick.current = {
      select: (i) => { if (state.assist && i < state.assist.shown.length) { state.assist.sel = i; state.assist.moved = true; state.paint?.(); } },
      accept: (i) => { if (state.assist) acceptAssist(mf, state, p, i); },
    };
    // Enquanto as teclas guardadas (digitadas antes do foco) não foram aplicadas, as que chegam direto ao
    // campo esperam na fila: senão o "=" de "x=2" seria tratado com o campo ainda vazio, antes do "x".
    let waiting = !!p.current.focused && !!p.current.initialKeys?.length;
    const queued: Key[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (waiting) {
        if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); queued.push({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey }); }
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; // modificadora sozinha (o Ctrl de Ctrl+Enter) não mexe no campo nem na lista
      if (state.pending) { state.pending = false; refreshAssist(mf, state, p); } // digitação rápida: o "input" da letra anterior ainda não veio
      if (handleKey(mf, e, state, p)) {
        e.preventDefault(); e.stopPropagation();
        if (e.key.length === 1 && e.key !== "'" && !e.ctrlKey) closeAssist(state); // operador, "=", ";", "(": a lista fecha (3.1)
      } else state.pending = !!p.current.assist && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey; // qualquer caractere (o % e o ‰ do campo de unidade também): o "input" dele pode chegar depois da próxima tecla
    };
    mf.addEventListener('keydown', onKey, { capture: true });
    // o "input" da tecla anterior pode chegar depois do Espaço: a ampliação só acaba se a seleção deixou de ser a dela (a6-3-05 falhava 4 em 10)
    mf.addEventListener('input', () => { state.edited = true; state.grow = grownOf(mf, state.grow); state.pending = false; refreshAssist(mf, state, p); p.current.onInput?.(mf.value); });
    mf.addEventListener('focusin', () => {
      state.edited = false; lastMathField = mf as unknown as typeof lastMathField; p.current.onFocus?.();
      if (p.current.assist?.openOnFocus && p.current.assist.auto) requestAnimationFrame(() => { if (document.activeElement === mf) refreshAssist(mf, state, p, true); }); // campo de unidade: a lista abre na hora
    });
    mf.addEventListener('focusout', () => {
      state.script = null;
      closeAssist(state);
      // sair sem editar não grava nada (B10.11) e volta a mostrar o que está no arquivo:
      // depois de apagar uma linha, este componente pode já representar outra linha
      if (state.edited) p.current.onCommit(mf.value, 'blur');
      else if (mf.value !== p.current.latex) mf.value = p.current.latex;
      state.edited = false;
      p.current.onLeave?.();
    });
    mfRef.current = mf;

    // O MathLive só aceita foco alguns quadros depois de montado: tenta até conseguir e só então
    // aplica as teclas que chegaram antes (região nova na folha, linha nova no caderno).
    let startEl: Element | null = null; // quem tinha o foco quando este campo pediu foco
    const tryFocus = (n: number) => {
      if (!mf.isConnected) return;
      // a pessoa já clicou em outro lugar: não rouba o foco de volta; o campo é tratado como deixado
      const now = document.activeElement;
      if (now && now !== startEl && now !== document.body && now !== mf && !host.current?.contains(now)) {
        releaseKeys(); waiting = false; p.current.onLeave?.(); return;
      }
      mf.focus();
      // hasFocus() do MathLive diz "sim" antes do documento: só confia quando o foco é de fato do campo
      if (document.activeElement !== mf) {
        if (n < 120) focusFrame.current = requestAnimationFrame(() => tryFocus(n + 1));
        else { releaseKeys(); waiting = false; }
        return;
      }
      if (p.current.selectOnFocus) mf.executeCommand('selectAll'); else mf.position = mf.lastOffset;
      const keys = [...(p.current.initialKeys?.splice(0) ?? []), ...releaseKeys(), ...queued.splice(0)];
      waiting = false;
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!handleKey(mf, k, state, p) && k.key.length === 1 && !k.ctrlKey && !k.metaKey) mf.executeCommand(['typedText', k.key]);
      }
      p.current.onReady?.();
    };
    focusNow.current = () => { cancelAnimationFrame(focusFrame.current); startEl = document.activeElement; focusFrame.current = requestAnimationFrame(() => tryFocus(0)); };
    if (p.current.focused) focusNow.current();
    return () => { cancelAnimationFrame(focusFrame.current); mf.removeEventListener('keydown', onKey, { capture: true }); mf.remove(); mfRef.current = null; };
  }, []);

  useEffect(() => {
    const mf = mfRef.current;
    if (mf && document.activeElement !== mf && mf.value !== props.latex) mf.value = props.latex;
  }, [props.latex]);

  useEffect(() => {
    const mf = mfRef.current;
    if (mf && props.focused && document.activeElement !== mf) focusNow.current();
  }, [props.focused]);

  return (
    <>
      <span
        ref={host}
        className={`mfield mfield-${props.theme}${props.invalid ? ' mfield-invalid' : ''}`}
        style={{ fontSize: props.size }}
      />
      {view && <Assistente {...view} theme={props.theme} onSelect={(i) => pick.current.select(i)} onAccept={(i) => pick.current.accept(i)} />}
    </>
  );
}

/** Renderização estática (resultado, tabelas): o mesmo motor do campo, para não haver pulo visual. */
export function MathMarkup({ latex, theme, size, className }: { latex: string; theme: 'paper' | 'dark'; size?: number; className?: string }) {
  const html = useMemo(() => { try { return convertLatexToMarkup(latex); } catch { return ''; } }, [latex]);
  return <span className={`mmarkup mfield-${theme}${className ? ` ${className}` : ''}`} style={size ? { fontSize: size } : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
