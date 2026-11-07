// Campo matemático (ADENDO 02): MathLive configurado como o SMath. Edita e mostra no mesmo formato.
import { useEffect, useMemo, useRef } from 'react';
import { MathfieldElement, convertLatexToMarkup } from 'mathlive';
import 'mathlive/static.css'; // estilos da renderização estática e as fontes (empacotadas, sem internet)
import { greekLatex, LATIN_TO_GREEK, latexToLine, lineToLatex, type LatexCtx } from '../format/mathlinear';

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

export type Commit = 'enter' | 'shift-enter' | 'blur' | 'escape' | 'eval';
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
function handleKey(mf: MathfieldElement, e: Key, state: { script: 'sub' | 'sup' | null }, p: { current: FieldProps }): boolean {
  const before = () => beforeCaret(mf);
  const afterDigit = () => /\d$/.test(before());
  const atEnd = () => mf.position === mf.lastOffset;
  const insert = (latex: string) => mf.insert(latex, { selectionMode: latex.includes('#0') ? 'placeholder' : 'after', format: 'latex' });
  const leaveSub = () => { if (state.script === 'sub') mf.executeCommand('moveAfterParent'); if (state.script === 'sub') state.script = null; };
  // ao sair de um identificador, reclassifica: variável, unidade ou não definida (B4)
  const classify = () => {
    if (!atEnd() || state.script) return;
    try {
      const canon = lineToLatex(latexToLine(mf.value), p.current.ctx);
      if (canon !== mf.value) { mf.setValue(canon, { silenceNotifications: true }); mf.position = mf.lastOffset; }
    } catch { /* expressão ainda incompleta */ }
  };

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
    const l = lastLetter(before());
    const g = l ? LATIN_TO_GREEK[l] : undefined;
    if (g) { mf.executeCommand('deleteBackward'); insert(greekLatex(g)); }
    return true;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return false;

  // ':' e '=' não reclassificam: o nome à esquerda está sendo definido ou avaliado
  if (OPERATOR_KEYS.has(e.key)) { leaveSub(); if (!['/', ',', ':', '='].includes(e.key)) classify(); }
  switch (e.key) {
    case 'Enter': classify(); p.current.onCommit(mf.value, e.shiftKey ? 'shift-enter' : 'enter'); return true;
    case 'Escape': classify(); p.current.onCommit(mf.value, 'escape'); return true;
    case 'Backspace': if (mf.value === '') { p.current.onBackspaceEmpty?.(); return true; } return false;
    case ':': insert('\\coloneq '); return true;
    case '=': if (!mf.value.includes('coloneq')) p.current.onCommit(mf.value, 'eval'); return true;
    case '*': insert('\\cdot '); return true;
    case '\\': insert('\\sqrt{#0}'); return true;
    case "'": insert('\\class{u}{\\mathrm{#0}}'); return true; // força unidade (B4)
    case '|': insert('\\left\\lvert #0\\right\\rvert'); return true;
    case ',': if (afterDigit()) { insert('{,}'); return true; } insert(';'); return true; // vírgula decimal; senão separa argumentos
    case ';': insert(';'); return true;
    case '.': {
      if (afterDigit()) { insert('{,}'); return true; }
      if (/(^|[^\\A-Za-z])[A-Za-z]\s*$|\\[A-Za-z]+\s*$/.test(before())) { mf.executeCommand('moveToSubscript'); state.script = 'sub'; return true; }
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
function releaseKeys(): Key[] {
  if (!held) return [];
  window.removeEventListener('keydown', held.listener, true);
  const k = held.keys;
  held = null;
  return k;
}

/** Um campo MathLive. O valor de fora (latex) só substitui o do campo quando ele não está em edição. */
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

    const state: { script: 'sub' | 'sup' | null } = { script: null };
    let edited = false; // houve digitação desde que ganhou foco
    const onKey = (e: KeyboardEvent) => {
      if (handleKey(mf, e, state, p)) { e.preventDefault(); e.stopPropagation(); }
    };
    mf.addEventListener('keydown', onKey, { capture: true });
    mf.addEventListener('input', () => { edited = true; p.current.onInput?.(mf.value); });
    mf.addEventListener('focusin', () => { edited = false; p.current.onFocus?.(); });
    mf.addEventListener('focusout', () => {
      state.script = null;
      // sair sem editar não grava nada (B10.11) e volta a mostrar o que está no arquivo:
      // depois de apagar uma linha, este componente pode já representar outra linha
      if (edited) p.current.onCommit(mf.value, 'blur');
      else if (mf.value !== p.current.latex) mf.value = p.current.latex;
      edited = false;
      p.current.onLeave?.();
    });
    mfRef.current = mf;

    // O MathLive só aceita foco alguns quadros depois de montado: tenta até conseguir e só então
    // aplica as teclas que chegaram antes (região nova na folha, linha nova no caderno).
    const tryFocus = (n: number) => {
      if (!mf.isConnected) return;
      mf.focus();
      // hasFocus() do MathLive diz "sim" antes do documento: só confia quando o foco é de fato do campo
      if (document.activeElement !== mf) {
        if (n < 120) focusFrame.current = requestAnimationFrame(() => tryFocus(n + 1));
        else releaseKeys();
        return;
      }
      if (p.current.selectOnFocus) mf.executeCommand('selectAll'); else mf.position = mf.lastOffset;
      const keys = [...(p.current.initialKeys?.splice(0) ?? []), ...releaseKeys()];
      for (const k of keys) if (!handleKey(mf, k, state, p) && k.key.length === 1 && !k.ctrlKey && !k.metaKey) mf.executeCommand(['typedText', k.key]);
      p.current.onReady?.();
    };
    focusNow.current = () => { cancelAnimationFrame(focusFrame.current); focusFrame.current = requestAnimationFrame(() => tryFocus(0)); };
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
