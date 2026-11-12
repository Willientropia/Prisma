// Uma linha de cálculo (caderno ou folha): campo MathLive + resultado à direita + selo de verificação.
// O arquivo guarda a forma linear; a tela nunca mostra ":=", "= ?", "^" ou "_" (ADENDO 02, B1).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../components/ui';
import {
  latexToLine, latexToTarget, latexToUnit, lineToLatex, lineToLinear, nodeLatex, nodeToLinear, parseLinear, splitComment, unitFromMathjs, unitLatex, unitToLinear,
  type LatexCtx, type Line, type Node, type Unit,
} from '../format/mathlinear';
import { math } from '../engine/math';
import { toMath } from '../engine/syntax';
import { symbolic as symbolicOf } from '../engine/symbolic';
import type { LineResult } from '../engine/evaluate';
import { useWorkspace } from '../store/workspace';
import { MathField, MathMarkup, type AssistSource, type Commit, type Key } from './MathField';
import { unitItems } from './assistente';
import { resultLatex } from './resultado';
import { isKnownUnit } from '../engine/unidades';

export { isKnownUnit };

export const LIVE_MS = 100; // B5: resultado novo até ~150 ms depois da última tecla (100 de espera + cálculo)


/** Resultado com nome em aberto (E3.3): a expressão, com os nomes que faltam sublinhados. */
export function symbolicLatex(r: LineResult): string {
  const missing = new Set(r.missing ?? []);
  try {
    const l = parseLinear(r.symbolic ?? '');
    const node = l.kind === 'def' ? l.rhs : l.expr;
    return nodeLatex(node, { defined: { has: (n: string) => !missing.has(n) } as Set<string>, isUnit: isKnownUnit });
  } catch { return `\\text{${(r.symbolic ?? '').replace(/[\\{}]/g, '')}}`; }
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
  onToText?: (word: string) => void; // Espaço numa região de um nome só (A6-3): a folha troca a região por texto
  assist?: AssistSource; // A6-4: assistente dinâmico (só a folha passa)
};

export function MathLine(props: Props) {
  const { raw, result, ctx, theme, size } = props;
  const [code, comment] = splitComment(raw);
  const parsed: Line | null = useMemo(() => { try { return code.trim() ? parseLinear(code.trim()) : null; } catch { return null; } }, [code]);
  const [invalid, setInvalid] = useState(false);
  const [unitEdit, setUnitEdit] = useState(false);
  const live = useRef(0);
  // A6-1 (ADENDO 06, 1.2): a região é reclassificada a cada edição, pelo que está no campo agora.
  // cleared: a expressão foi toda apagada, então a avaliação antiga acabou (nada dela vai para a linha nova);
  // pending: o campo está vazio ou incompleto, então o resultado antigo some na hora.
  const cleared = useRef(false);
  const [pending, setPending] = useState(false);
  const forceEval = useRef(false); // o "=" foi digitado neste campo e ainda não se apagou tudo
  const set = useWorkspace((s) => s.set);
  const [sym, setSym] = useState<string | null>(null); // Ctrl+. (A6-3, 2.4): latex de "-> resultado", some ao editar
  const symFor = useRef(''); // o que havia no campo quando o Ctrl+. foi apertado

  // o campo mostra a expressão; o resultado fica fora dele
  const fieldLatex = !code.trim() ? '' : parsed ? (parsed.kind === 'eval' ? nodeLatex(parsed.expr, ctx) : lineToLatex(parsed.kind === 'def' ? { ...parsed, show: false, unit: undefined } : parsed, ctx)) : `\\text{${code.trim().replace(/[\\{}]/g, '')}}`;
  // linha que mostra resultado: avaliação ("x = ?") ou definição com "= ?" (ADENDO 05, E2.1)
  const shows = !pending && (parsed?.kind === 'eval' || (parsed?.kind === 'def' && !!parsed.show));
  const evalUnit = parsed?.kind === 'eval' || parsed?.kind === 'def' ? parsed.unit : undefined;
  const evalConv = parsed?.kind === 'eval' || parsed?.kind === 'def' ? parsed.conv : undefined; // conversão por expressão (E4.3)

  /** Latex do campo -> linha do arquivo. null = expressão incompleta (não grava). */
  const toRaw = (latex: string, asEval: boolean): string | null => {
    if (!latex.trim()) return '';
    let l: Line;
    try { l = latexToLine(latex); } catch { return null; }
    const old = cleared.current ? null : parsed; // sem resto da avaliação apagada
    const [unit, conv] = old ? [evalUnit, evalConv] : [undefined, undefined];
    const keep = asEval || forceEval.current; // forceEval: depois do "=" o campo segue editável e a linha continua sendo avaliação (2.5)
    if ((keep || old?.kind === 'eval') && l.kind === 'expr') l = { kind: 'eval', expr: l.expr, unit, conv };
    if (l.kind === 'def' && (keep || (old?.kind === 'def' && old.show))) l = { ...l, show: true, unit, conv };
    return lineToLinear(l) + (comment ? ` ${comment.trim()}` : '');
  };

  const write = (next: string | null) => {
    if (next === null) { setInvalid(true); return false; }
    setInvalid(false);
    if (next !== raw) props.onWrite(next);
    return true;
  };

  useEffect(() => () => clearTimeout(live.current), []);
  useEffect(() => { cleared.current = false; forceEval.current = false; setPending(false); }, [raw]); // a linha mudou (gravação, desfazer, outra visão): o estado de edição recomeça

  const onInput = (latex: string) => {
    clearTimeout(live.current);
    if (latex !== symFor.current) setSym(null); // o resultado vale enquanto a expressão não mudar (o MathLive repete o "input" do ')' depois da tecla)
    const n = toRaw(latex, false);
    if (n === '') { cleared.current = true; forceEval.current = false; }
    setPending(n === null || n === '');
    live.current = window.setTimeout(() => { if (n !== null && n !== '') { write(n); cleared.current = false; } }, LIVE_MS);
  };

  /** Ctrl+.: derivada e simplificação do math.js; sem resultado, avisa na barra de status. */
  const onSymbolic = (latex: string) => {
    let out: string | null = null;
    try {
      const l = latexToLine(latex);
      const src = nodeToLinear(l.kind === 'def' ? l.rhs : l.expr);
      const r = symbolicOf(src);
      if (r) { const o = parseLinear(r); out = `\\to ${nodeLatex(o.kind === 'def' ? o.rhs : o.expr, { defined: { has: () => true } as unknown as Set<string>, isUnit: () => false })}`; }
    } catch { out = null; }
    symFor.current = latex;
    setSym(out);
    if (!out) set({ status: 'Cálculo simbólico não disponível para esta expressão' });
  };

  const onCommit = (latex: string, how: Commit) => {
    setSym(null);
    clearTimeout(live.current);
    // depois do "=" o resultado aparece na hora e o cursor fica no campo; o marcador de conversão abre com seta direita ou clique (ADENDO 06, 2.5)
    if (how === 'eval' || how === 'defeval') { if (write(toRaw(latex, true))) { cleared.current = false; forceEval.current = true; setPending(false); } return; }
    const next = toRaw(latex, false);
    if (next === null && cleared.current && how === 'blur') { cleared.current = false; setPending(false); props.onWrite(''); return; } // saiu com o que sobrou incompleto: a avaliação apagada não volta
    const ok = write(next);
    cleared.current = false; setPending(false); // saiu: vale o que está gravado; sem gravação, o resultado antigo (ainda no arquivo) volta
    if (!ok && how !== 'blur') { set({ status: 'Expressão incompleta: termine ou apague antes de sair' }); return; }
    if (how === 'enter' || how === 'shift-enter') props.onEnter?.(how === 'shift-enter');
    if (how === 'escape') props.onExit?.();
  };

  if (!code.trim() && comment) return <span className="mline-comment">{comment.replace(/^#\s*/, '')}</span>;

  const err = result?.error;
  const symbolic = result?.symbolic !== undefined && !err;
  const showResult = (shows && result && !err && (result.numText !== undefined || symbolic || !!result.matrix)) || unitEdit;
  // nome sozinho e ainda indefinido (x5 depois do "="): resultado vazio e sem erro, só o "=" e o marcador (2.5)
  const emptyResult = !!symbolic && result!.missing?.length === 1 && result!.symbolic === result!.missing[0];
  /** seta direita no fim do campo: vai ao marcador de conversão, se a região mostra resultado. */
  const onArrowEnd = () => { if (!showResult || unitEdit) return false; setUnitEdit(true); return true; };
  return (
    <span className={`mline${err || invalid ? ' mline-error' : ''}`} title={err} onMouseEnter={() => err && set({ status: err })}>
      <MathField latex={fieldLatex} ctx={ctx} theme={theme} size={size} focused={props.focused} initialKeys={props.initialKeys} onReady={props.onReady}
        invalid={invalid || !!err} onInput={onInput} onCommit={onCommit} onBackspaceEmpty={props.onBackspaceEmpty} onFocus={props.onFocus} onLeave={props.onExit} onToText={props.onToText} onSymbolic={onSymbolic} onArrowEnd={onArrowEnd} assist={props.assist} />
      {sym && <span className="mresult msymbolic"><MathMarkup latex={sym} theme={theme} size={size} className="msymbolic-value" /></span>}
      {showResult && (
        <span className={`mresult${props.stale ? ' mresult-stale' : ''}`}>
          <MathMarkup latex="=" theme={theme} size={size} />
          {unitEdit ? (
            <UnitInput theme={theme} size={size} assist={props.assist && { items: unitItems, auto: props.assist.auto, units: true, openOnFocus: true }} result={result ?? { kind: 'eval' }} current={parsed && parsed.kind !== 'expr' ? { unit: parsed.unit, conv: parsed.conv } : undefined}
              onDone={(u, how) => {
                setUnitEdit(false);
                if (how === 'enter' || how === 'shift-enter') queueMicrotask(() => props.onEnter?.(how === 'shift-enter'));
                if (u === undefined || !parsed || parsed.kind === 'expr') return;
                props.onWrite(lineToLinear({ ...parsed, unit: u?.unit, conv: u?.conv }) + (comment ? ` ${comment.trim()}` : ''));
              }} />
          ) : (
            <>
              {emptyResult ? null : symbolic
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
function UnitInput({ theme, size, result, current, onDone, assist }: { theme: 'paper' | 'dark'; size: number; result: LineResult; current?: Target; onDone: (t: Target | null | undefined, how: Commit) => void; assist?: AssistSource }) {
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
      // BUG-019: "%" não é unidade do math.js (math.unit('%') lança); o motor converte por conta própria
      // número puro pedido em ângulo (arg(z) = ? deg): o número está em radianos (E4.3)
      if (target === '%') ok = !from || from === '%';
      else {
        const want = math.unit(toMath(target));
        ok = !from ? want.equalBase(math.unit('rad')) : from !== '%' && math.unit(1, toMath(from)).equalBase(want);
      }
    } catch { ok = false; }
    if (!ok) { setBad(true); set({ status: `Não é possível converter ${from || 'número sem unidade'} em ${target}` }); return; }
    onDone({ unit: u }, how);
  };
  return (
    <span className="unit-input">
      <MathField latex={current?.unit ? unitLatex(current.unit) : current?.conv ? nodeLatex(current.conv) : ''} ctx={{}} theme={theme} size={size} focused selectOnFocus invalid={bad} onCommit={finish}
        onLeave={() => onDone(undefined, 'blur')} /* sair sem digitar também fecha o marcador */ ariaLabel="Unidade do resultado" assist={assist} />
    </span>
  );
}
