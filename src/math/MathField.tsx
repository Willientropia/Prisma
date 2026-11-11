// Campo matemático (ADENDO 02): MathLive configurado como o SMath. Edita e mostra no mesmo formato.
import { useEffect, useMemo, useRef } from 'react';
import { MathfieldElement, convertLatexToMarkup } from 'mathlive';
import 'mathlive/static.css'; // estilos da renderização estática e as fontes (empacotadas, sem internet)
import { run } from '../commands/registry';
import { math } from '../engine/math';
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
  ariaLabel?: string;
};

export type Key = { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean };
const OPERATOR_KEYS = new Set(['+', '-', '<', '>', ';', ')', ':', '=', '*', '/', ',']);

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
type FieldState = { script: 'sub' | 'sup' | null; edited: boolean; lastCommit?: Commit | null };

const GREEK_CMD = /^\\(?:var)?(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)$/;

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

  // confirmar: forma canônica (unidade em azul, índice reto) e marca como gravado, para a saída do campo
  // logo em seguida não gravar de novo por cima (BUG-004: o "= ?" era perdido)
  const commit = (how: Commit) => { state.script = null; classify(true); state.edited = false; state.lastCommit = how; p.current.onCommit(mf.value, how); };

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    const l = lastLetter(before());
    const g = l ? LATIN_TO_GREEK[l] : undefined;
    if (g) { mf.executeCommand('deleteBackward'); insert(greekLatex(g)); }
    return true;
  }
  // Ctrl+K: busca de função (F4-06); o MathLive não deixa o atalho chegar à janela
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { run('funcao.inserir'); return true; }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;

  // ':' e '=' não reclassificam: o nome à esquerda está sendo definido ou avaliado
  // ';' e ')': reclassificar ali tiraria o cursor de dentro dos parênteses (f(a;b)); confirmar reclassifica
  if (OPERATOR_KEYS.has(e.key)) { leaveSub(); if (!['/', ',', ':', '=', ';', ')'].includes(e.key)) classify(); }
  switch (e.key) {
    case 'Enter': commit(e.shiftKey ? 'shift-enter' : 'enter'); return true;
    case 'Escape': commit('escape'); return true;
    case 'Backspace': if (mf.value === '') { p.current.onBackspaceEmpty?.(); return true; } return false;
    case ':': insert('\\coloneq '); return true;
    case '=': {
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
    case "'": insert('\\class{u}{\\mathrm{#0}}'); return true; // força unidade (B4)
    case '|': insert('\\left\\lvert #0\\right\\rvert'); return true;
    case ',': {
      if (afterDigit()) { insert('{,}'); return true; } // vírgula decimal
      // depois de letra abre o índice do nome, como no SMath: s,tensao (ADENDO 05, E2.2)
      if (!state.script && (nameDigit() || /(^|[^\\A-Za-z])[A-Za-z]\s*$|\\[A-Za-z]+\s*$|[\u00C0-\u024F\u0370-\u03FF]\s*$/.test(before()))) { mf.executeCommand('moveToSubscript'); state.script = 'sub'; return true; }
      insert(';'); return true; // senão separa argumentos
    }
    case ';': insert(';'); return true;
    case '.': {
      if (afterDigit()) { insert('{,}'); return true; }
      if (nameDigit() || /(^|[^\\A-Za-z])[A-Za-z]\s*$|\\[A-Za-z]+\s*$/.test(before())) { mf.executeCommand('moveToSubscript'); state.script = 'sub'; return true; }
      return false;
    }
    case '_': state.script = 'sub'; return false;
    case '^': state.script = 'sup'; return false;
    case ' ': if (state.script) { mf.executeCommand('moveAfterParent'); state.script = null; } else classify(); return true;
    case 'ArrowRight': case 'ArrowLeft': case 'ArrowUp': case 'ArrowDown': state.script = null; return false;
    case '/': {
      // (a+b)/ -> fração com a+b em cima, sem os parênteses (B4)
      // seleção/inserção do MathLive cai dentro dos parênteses; reescreve o valor e põe o cursor no denominador
      const b = before();
      const f = trailingFence(b);
      if (!f) return false;
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
let held: { keys: Key[]; listener: (e: KeyboardEvent) => void } | null = null;
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
  held = { keys, listener };
}
/** Acrescenta teclas à fila guardada (se houver uma esperando o próximo campo). */
function holdMore(keys: Key[]): void {
  held?.keys.push(...keys);
}
function releaseKeys(): Key[] {
  if (!held) return [];
  window.removeEventListener('keydown', held.listener, true);
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
    // Enquanto as teclas guardadas (digitadas antes do foco) não foram aplicadas, as que chegam direto ao
    // campo esperam na fila: senão o "=" de "x=2" seria tratado com o campo ainda vazio, antes do "x".
    let waiting = !!p.current.focused && !!p.current.initialKeys?.length;
    const queued: Key[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (waiting) {
        if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); queued.push({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey }); }
        return;
      }
      if (handleKey(mf, e, state, p)) { e.preventDefault(); e.stopPropagation(); }
    };
    mf.addEventListener('keydown', onKey, { capture: true });
    mf.addEventListener('input', () => { state.edited = true; p.current.onInput?.(mf.value); });
    mf.addEventListener('focusin', () => { state.edited = false; lastMathField = mf as unknown as typeof lastMathField; p.current.onFocus?.(); });
    mf.addEventListener('focusout', () => {
      state.script = null;
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
        state.lastCommit = null;
        if (!handleKey(mf, k, state, p) && k.key.length === 1 && !k.ctrlKey && !k.metaKey) mf.executeCommand(['typedText', k.key]);
        // depois do "=" que avalia, o resto do lote é do marcador de conversão, não deste campo (E8-08)
        if (state.lastCommit === 'eval' || state.lastCommit === 'defeval') { holdMore(keys.slice(i + 1)); break; }
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
    <span
      ref={host}
      className={`mfield mfield-${props.theme}${props.invalid ? ' mfield-invalid' : ''}`}
      style={{ fontSize: props.size }}
    />
  );
}

/** Renderização estática (resultado, tabelas): o mesmo motor do campo, para não haver pulo visual. */
export function MathMarkup({ latex, theme, size, className }: { latex: string; theme: 'paper' | 'dark'; size?: number; className?: string }) {
  const html = useMemo(() => { try { return convertLatexToMarkup(latex); } catch { return ''; } }, [latex]);
  return <span className={`mmarkup mfield-${theme}${className ? ` ${className}` : ''}`} style={size ? { fontSize: size } : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
