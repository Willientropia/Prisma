// Uma linha de cálculo (caderno ou folha): campo MathLive + resultado à direita + selo de verificação.
// O arquivo guarda a forma linear; a tela nunca mostra ":=", "= ?", "^" ou "_" (ADENDO 02, B1).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../components/ui';
import {
  latexToLine, latexToTarget, latexToUnit, lineToLatex, lineToLinear, nodeLatex, parseLinear, parseUnit, splitComment, unitFromMathjs, unitLatex, unitToLinear,
  type LatexCtx, type Line, type Node, type Unit,
} from '../format/mathlinear';
import { math } from '../engine/math';
import { toMath } from '../engine/syntax';
import type { LineResult } from '../engine/evaluate';
import { useWorkspace } from '../store/workspace';
import { MathField, MathMarkup, holdKeys, type Commit, type Key } from './MathField';

export const LIVE_MS = 100; // B5: resultado novo até ~150 ms depois da última tecla (100 de espera + cálculo)

/** Unidade conhecida pelo math.js (para classificar identificadores, B4). */
export function isKnownUnit(name: string): boolean {
  if (name === '%') return true;
  try { return math.Unit.isValuelessUnit(toMath(name)); } catch { return false; }
}

/** Latex do resultado: "3{,}29\,\class{u}{\mathrm{V}}". */
export function resultLatex(r: LineResult): string {
  return resultLatexOf(r);
}

/** Resultado com nome em aberto (E3.3): a expressão, com os nomes que faltam sublinhados. */
export function symbolicLatex(r: LineResult): string {
  const missing = new Set(r.missing ?? []);
  try {
    const l = parseLinear(r.symbolic ?? '');
    const node = l.kind === 'def' ? l.rhs : l.expr;
    return nodeLatex(node, { defined: { has: (n: string) => !missing.has(n) } as Set<string>, isUnit: isKnownUnit });
  } catch { return `\\text{${(r.symbolic ?? '').replace(/[\\{}]/g, '')}}`; }
}

/** Número do motor -> LaTeX: "1,475e-3" vira 1,475·10⁻³ (nunca "e-3" na tela) e o i do complexo, negrito reto (E4.2). */
export function numberLatex(t: string): string {
  return t
    .replace(/\s/g, '')
    .replace(/−/g, '-')
    .replace(/(\d),(\d)/g, '$1{,}$2')
    .replace(/e(-?\d+)/g, (_, n: string) => `\\cdot 10^{${Number(n)}}`)
    .replace(/·i/g, '\\cdot \\mathbf{i}');
}

function resultLatexOf(r: LineResult): string {
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

type Props = {
  raw: string; // linha do arquivo, sem a quebra
  isCheck?: boolean;
  result?: LineResult;
  stale?: boolean; // calculando há mais de 300 ms: resultado anterior apagado (B5)
  ctx: LatexCtx;
  theme: 'paper' | 'dark';
  size: number;
  focused?: boolean;
  initialKeys?: Key[];
  onReady?: () => void;
  onWrite: (raw: string) => void; // grava a linha (vazia = apagar)
  onEnter?: (shift: boolean) => void;
  onBackspaceEmpty?: () => void;
  onFocus?: () => void;
  onExit?: () => void;
};

export function MathLine(props: Props) {
  const { raw, result, ctx, theme, size } = props;
  const [code, comment] = splitComment(raw);
  const parsed: Line | null = useMemo(() => { try { return code.trim() ? parseLinear(code.trim()) : null; } catch { return null; } }, [code]);
  const [invalid, setInvalid] = useState(false);
  const [unitEdit, setUnitEdit] = useState(false);
  const live = useRef(0);
  const set = useWorkspace((s) => s.set);

  // o campo mostra a expressão; o resultado fica fora dele
  const fieldLatex = !code.trim() ? '' : parsed ? (parsed.kind === 'eval' ? nodeLatex(parsed.expr, ctx) : lineToLatex(parsed.kind === 'def' ? { ...parsed, show: false, unit: undefined } : parsed, ctx)) : `\\text{${code.trim().replace(/[\\{}]/g, '')}}`;
  // linha que mostra resultado: avaliação ("x = ?") ou definição com "= ?" (ADENDO 05, E2.1)
  const shows = parsed?.kind === 'eval' || (parsed?.kind === 'def' && !!parsed.show);
  const evalUnit = parsed?.kind === 'eval' || parsed?.kind === 'def' ? parsed.unit : undefined;
  const evalConv = parsed?.kind === 'eval' || parsed?.kind === 'def' ? parsed.conv : undefined; // conversão por expressão (E4.3)

  /** Latex do campo -> linha do arquivo. null = expressão incompleta (não grava). */
  const toRaw = (latex: string, asEval: boolean): string | null => {
    if (!latex.trim()) return '';
    let l: Line;
    try { l = latexToLine(latex); } catch { return null; }
    if ((asEval || parsed?.kind === 'eval') && l.kind === 'expr') l = { kind: 'eval', expr: l.expr, unit: evalUnit, conv: evalConv };
    if (l.kind === 'def' && (asEval || (parsed?.kind === 'def' && parsed.show))) l = { ...l, show: true, unit: evalUnit, conv: evalConv };
    return lineToLinear(l) + (comment ? ` ${comment.trim()}` : '');
  };

  const write = (next: string | null) => {
    if (next === null) { setInvalid(true); return false; }
    setInvalid(false);
    if (next !== raw) props.onWrite(next);
    return true;
  };

  useEffect(() => () => clearTimeout(live.current), []);

  const onInput = (latex: string) => {
    clearTimeout(live.current);
    live.current = window.setTimeout(() => { const n = toRaw(latex, false); if (n !== null && n !== '') write(n); }, LIVE_MS);
  };

  const onCommit = (latex: string, how: Commit) => {
    clearTimeout(live.current);
    // depois do "=", o que se digita vai para o marcador de conversão (ADENDO 05, E2.1 e E8-08)
    if (how === 'eval' || how === 'defeval') { if (write(toRaw(latex, true))) { holdKeys(); setUnitEdit(true); } return; }
    const ok = write(toRaw(latex, false));
    if (!ok && how !== 'blur') { set({ status: 'Expressão incompleta: termine ou apague antes de sair' }); return; }
    if (how === 'enter' || how === 'shift-enter') props.onEnter?.(how === 'shift-enter');
    if (how === 'escape') props.onExit?.();
  };

  if (!code.trim() && comment) return <span className="mline-comment">{comment.replace(/^#\s*/, '')}</span>;

  const err = result?.error;
  const symbolic = result?.symbolic !== undefined && !err;
  const showResult = (shows && result && !err && (result.numText !== undefined || symbolic || !!result.matrix)) || unitEdit;
  return (
    <span className={`mline${err || invalid ? ' mline-error' : ''}`} title={err} onMouseEnter={() => err && set({ status: err })}>
      <MathField latex={fieldLatex} ctx={ctx} theme={theme} size={size} focused={props.focused} initialKeys={props.initialKeys} onReady={props.onReady}
        invalid={invalid || !!err} onInput={onInput} onCommit={onCommit} onBackspaceEmpty={props.onBackspaceEmpty} onFocus={props.onFocus} onLeave={props.onExit} />
      {showResult && (
        <span className={`mresult${props.stale ? ' mresult-stale' : ''}`}>
          <MathMarkup latex="=" theme={theme} size={size} />
          {unitEdit ? (
            <UnitInput theme={theme} size={size} result={result ?? { kind: 'eval' }} current={parsed && parsed.kind !== 'expr' ? { unit: parsed.unit, conv: parsed.conv } : undefined}
              onDone={(u, how) => {
                setUnitEdit(false);
                if (how === 'enter' || how === 'shift-enter') queueMicrotask(() => props.onEnter?.(how === 'shift-enter'));
                if (u === undefined || !parsed || parsed.kind === 'expr') return;
                props.onWrite(lineToLinear({ ...parsed, unit: u?.unit, conv: u?.conv }) + (comment ? ` ${comment.trim()}` : ''));
              }} />
          ) : (
            <>
              {symbolic
                ? <span title={`${result!.missing!.join(', ')} ainda não ${result!.missing!.length > 1 ? 'foram definidos' : 'foi definido'}`}><MathMarkup latex={symbolicLatex(result!)} theme={theme} size={size} className="mresult-value mresult-symbolic" /></span>
                : <MathMarkup latex={resultLatex(result!)} theme={theme} size={size} className="mresult-value" />}
              <button type="button" className="unit-marker" aria-label="Converter unidade do resultado" title="Converter unidade" onClick={() => setUnitEdit(true)} />
            </>
          )}
        </span>
      )}
      {props.isCheck && result?.status && !err && (
        <Badge kind={result.status}>{`${{ ok: 'APROVADO', warn: 'ATENÇÃO', fail: 'REPROVADO' }[result.status]}${result.limit ? ` · limite ${result.limit}` : ''}`}</Badge>
      )}
    </span>
  );
}

/**
 * Marcador de unidade (B5): campo pequeno no lugar da unidade. Enter converte; unidade incompatível
 * deixa a borda vermelha e avisa na barra de status. onDone(undefined) = cancelado; onDone(null) = sem unidade.
 */
type Target = { unit?: Unit; conv?: Node };
function UnitInput({ theme, size, result, current, onDone }: { theme: 'paper' | 'dark'; size: number; result: LineResult; current?: Target; onDone: (t: Target | null | undefined, how: Commit) => void }) {
  const [bad, setBad] = useState(false);
  const set = useWorkspace((s) => s.set);
  const finish = (latex: string, how: Commit) => {
    if (how === 'escape' || (how === 'blur' && !latex.trim())) return onDone(undefined, how);
    if (!latex.trim()) return onDone(current?.unit || current?.conv ? null : undefined, how); // vazio: tira a conversão pedida (ou nada a fazer)
    let u: Unit;
    try { u = latexToUnit(latex); } catch {
      // não é unidade: conversão por expressão, como o "contract" do SMath ("10^-6", E4.3); o motor confere
      try { const t = latexToTarget(latex); if (t.conv) return onDone(t, how); } catch { /* inválida */ }
      setBad(true); set({ status: 'Conversão inválida' }); return;
    }
    const target = unitToLinear(u);
    const from = result.unitRaw ? unitFromMathjs(result.unitRaw) : '';
    let ok: boolean;
    try {
      const want = math.unit(toMath(target));
      // número puro pedido em ângulo (arg(z) = ? deg): o número está em radianos (E4.3)
      ok = target === '%' ? !from || from === '%' : !from ? want.equalBase(math.unit('rad')) : from !== '%' && math.unit(1, toMath(from)).equalBase(want);
    } catch { ok = false; }
    if (!ok) { setBad(true); set({ status: `Não é possível converter ${from || 'número sem unidade'} em ${target}` }); return; }
    onDone({ unit: u }, how);
  };
  return (
    <span className="unit-input">
      <MathField latex={current?.unit ? unitLatex(current.unit) : current?.conv ? nodeLatex(current.conv) : ''} ctx={{}} theme={theme} size={size} focused selectOnFocus invalid={bad} onCommit={finish}
        onLeave={() => onDone(undefined, 'blur')} /* sair sem digitar também fecha o marcador */ ariaLabel="Unidade do resultado" />
    </span>
  );
}
