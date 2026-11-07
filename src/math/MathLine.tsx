// Uma linha de cálculo (caderno ou folha): campo MathLive + resultado à direita + selo de verificação.
// O arquivo guarda a forma linear; a tela nunca mostra ":=", "= ?", "^" ou "_" (ADENDO 02, B1).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../components/ui';
import {
  latexToLine, latexToUnit, lineToLatex, lineToLinear, nodeLatex, parseLinear, parseUnit, splitComment, unitFromMathjs, unitLatex, unitToLinear,
  type LatexCtx, type Line, type Unit,
} from '../format/mathlinear';
import { math } from '../engine/math';
import { toMath } from '../engine/syntax';
import type { LineResult } from '../engine/evaluate';
import { useWorkspace } from '../store/workspace';
import { MathField, MathMarkup, type Commit, type Key } from './MathField';

export const LIVE_MS = 100; // B5: resultado novo até ~150 ms depois da última tecla (100 de espera + cálculo)

/** Unidade conhecida pelo math.js (para classificar identificadores, B4). */
export function isKnownUnit(name: string): boolean {
  if (name === '%') return true;
  try { return math.Unit.isValuelessUnit(toMath(name)); } catch { return false; }
}

/** Latex do resultado: "3{,}29\,\class{u}{\mathrm{V}}". */
export function resultLatex(r: LineResult): string {
  const num = (r.numText ?? r.text ?? '').replace(',', '{,}').replace(/\s/g, '');
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
  const fieldLatex = !code.trim() ? '' : parsed ? (parsed.kind === 'eval' ? nodeLatex(parsed.expr, ctx) : lineToLatex(parsed, ctx)) : `\\text{${code.trim().replace(/[\\{}]/g, '')}}`;
  const evalUnit = parsed?.kind === 'eval' ? parsed.unit : undefined;

  /** Latex do campo -> linha do arquivo. null = expressão incompleta (não grava). */
  const toRaw = (latex: string, asEval: boolean): string | null => {
    if (!latex.trim()) return '';
    let l: Line;
    try { l = latexToLine(latex); } catch { return null; }
    if ((asEval || parsed?.kind === 'eval') && l.kind === 'expr') l = { kind: 'eval', expr: l.expr, unit: evalUnit };
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
    if (how === 'eval') { write(toRaw(latex, true)); (document.activeElement as HTMLElement | null)?.blur?.(); return; }
    const ok = write(toRaw(latex, false));
    if (!ok && how !== 'blur') { set({ status: 'Expressão incompleta: termine ou apague antes de sair' }); return; }
    if (how === 'enter' || how === 'shift-enter') props.onEnter?.(how === 'shift-enter');
    if (how === 'escape') props.onExit?.();
  };

  if (!code.trim() && comment) return <span className="mline-comment">{comment.replace(/^#\s*/, '')}</span>;

  const err = result?.error;
  const showResult = parsed?.kind === 'eval' && result && !err && result.numText !== undefined;
  return (
    <span className={`mline${err || invalid ? ' mline-error' : ''}`} title={err} onMouseEnter={() => err && set({ status: err })}>
      <MathField latex={fieldLatex} ctx={ctx} theme={theme} size={size} focused={props.focused} initialKeys={props.initialKeys} onReady={props.onReady}
        invalid={invalid || !!err} onInput={onInput} onCommit={onCommit} onBackspaceEmpty={props.onBackspaceEmpty} onFocus={props.onFocus} onLeave={props.onExit} />
      {showResult && (
        <span className={`mresult${props.stale ? ' mresult-stale' : ''}`}>
          <MathMarkup latex="=" theme={theme} size={size} />
          {unitEdit ? (
            <UnitInput theme={theme} size={size} result={result!} current={evalUnit}
              onDone={(u) => {
                setUnitEdit(false);
                if (u === undefined || !parsed || parsed.kind !== 'eval') return;
                props.onWrite(lineToLinear({ ...parsed, unit: u ?? undefined }) + (comment ? ` ${comment.trim()}` : ''));
              }} />
          ) : (
            <>
              <MathMarkup latex={resultLatex(result!)} theme={theme} size={size} className="mresult-value" />
              <button type="button" className="unit-marker" aria-label="Converter unidade do resultado" title="Converter unidade" onClick={() => setUnitEdit(true)} />
            </>
          )}
        </span>
      )}
      {props.isCheck && result?.status && !err && (
        <Badge kind={result.status}>{result.status === 'ok' ? `APROVADO · limite ${result.limit ?? ''}` : result.status === 'warn' ? 'ATENÇÃO · perto do limite' : `REPROVADO · limite ${result.limit ?? ''}`}</Badge>
      )}
    </span>
  );
}

/**
 * Marcador de unidade (B5): campo pequeno no lugar da unidade. Enter converte; unidade incompatível
 * deixa a borda vermelha e avisa na barra de status. onDone(undefined) = cancelado; onDone(null) = sem unidade.
 */
function UnitInput({ theme, size, result, current, onDone }: { theme: 'paper' | 'dark'; size: number; result: LineResult; current?: Unit; onDone: (u: Unit | null | undefined) => void }) {
  const [bad, setBad] = useState(false);
  const set = useWorkspace((s) => s.set);
  const finish = (latex: string, how: Commit) => {
    if (how === 'escape' || (how === 'blur' && !latex.trim())) return onDone(undefined);
    if (!latex.trim()) return onDone(null);
    let u: Unit;
    try { u = latexToUnit(latex); } catch { setBad(true); set({ status: 'Unidade inválida' }); return; }
    const target = unitToLinear(u);
    const from = result.unitRaw ? unitFromMathjs(result.unitRaw) : '';
    let ok: boolean;
    try {
      ok = target === '%' ? !from || from === '%' : !!from && from !== '%' && math.unit(1, toMath(from)).equalBase(math.unit(toMath(target)));
    } catch { ok = false; }
    if (!ok) { setBad(true); set({ status: `Não é possível converter ${from || 'número sem unidade'} em ${target}` }); return; }
    onDone(u);
  };
  return (
    <span className="unit-input">
      <MathField latex={current ? unitLatex(current) : ''} ctx={{}} theme={theme} size={size} focused selectOnFocus invalid={bad} onCommit={finish} ariaLabel="Unidade do resultado" />
    </span>
  );
}
