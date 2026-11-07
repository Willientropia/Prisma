// Avaliação pura e síncrona (roda no worker e nos testes). Ordem: bibliotecas, depois blocos na ordem dada.
import type { MathNode, Unit } from 'mathjs';
import { math } from './math';
import { classify, toMath, type LineKind } from './syntax';
import { DEFAULT_FORMAT, fmtNum, prettyUnit, type FormatOpts } from './format';

export type LibInput = { id: string; constants: [string, string][]; functions: string[] };
export type BlockInput = { key: string; type: string; lines: string[] };
export type EvalInput = { libs: LibInput[]; blocks: BlockInput[]; format?: FormatOpts };

export type LineResult = {
  kind: LineKind;
  text?: string; // valor formatado, ex.: "1,79 V"
  value?: number; // número na unidade exibida
  unit?: string; // unidade exibida, ex.: "V"
  error?: string;
  status?: 'ok' | 'warn' | 'fail';
  limit?: string;
  writes?: string;
};
export type EvalResult = { blocks: Record<string, LineResult[]>; libErrors: string[]; defined: string[]; ms: number };

const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const isUnit = (v: unknown): v is Unit => math.isUnit(v);

type Shown = { text: string; value?: number; unit?: string };

export function show(v: unknown, target: string | undefined, fmt: FormatOpts): Shown {
  if (typeof v === 'boolean') return { text: v ? 'verdadeiro' : 'falso' };
  if (typeof v === 'function') return { text: 'função' };
  if (target === '%') {
    if (isUnit(v)) throw new Error(`Unidades incompatíveis: ${prettyUnit(v.formatUnits())} não vira %`);
    const n = Number(v) * 100;
    return { text: `${fmtNum(n, fmt)} %`, value: n, unit: '%' };
  }
  if (typeof v === 'number') {
    if (target) throw new Error(`Unidades incompatíveis: número sem unidade não vira ${prettyUnit(target)}`);
    return { text: fmtNum(v, fmt), value: v };
  }
  if (isUnit(v)) {
    let u = v;
    if (target) {
      const want = math.unit(target);
      if (!u.equalBase(want)) throw new Error(`Unidades incompatíveis: ${prettyUnit(u.formatUnits())} não vira ${prettyUnit(target)}`);
      u = u.to(target);
    } else u = u.simplify();
    const units = u.formatUnits();
    const n = units ? u.toNumber(units) : (u.value ?? 0);
    const unit = prettyUnit(units);
    return { text: unit ? `${fmtNum(n, fmt)} ${unit}` : fmtNum(n, fmt), value: n, unit };
  }
  return { text: math.format(v as never, { precision: 4 }).replace(/\./g, fmt.sep === ',' ? ',' : '.') };
}

/** Procura a soma/subtração/comparação com unidades diferentes, para a mensagem "Unidades incompatíveis: m + A". */
function diagnose(node: MathNode, scope: Map<string, unknown>): string | undefined {
  let found: string | undefined;
  const ops = new Set(['add', 'subtract', 'smaller', 'smallerEq', 'larger', 'largerEq', 'equal', 'unequal']);
  node.traverse((n) => {
    if (found || !math.isOperatorNode(n) || !ops.has(n.fn) || n.args.length !== 2) return;
    try {
      const [a, b] = n.args.map((x) => x.compile().evaluate(scope));
      const name = (x: unknown) => (isUnit(x) ? prettyUnit(x.formatUnits()) : 'número');
      if (isUnit(a) !== isUnit(b) || (isUnit(a) && isUnit(b) && !a.equalBase(b))) found = `${name(a)} ${n.op} ${name(b)}`;
    } catch { /* o erro está mais dentro; segue procurando */ }
  });
  return found;
}

function message(e: unknown, src: string, scope: Map<string, unknown>): string {
  const msg = e instanceof Error ? e.message : String(e);
  let m: RegExpExecArray | null;
  if ((m = /Undefined symbol (\S+)/.exec(msg))) return `Variável não definida: ${m[1]}`;
  if ((m = /Undefined function (\S+)/.exec(msg))) return `Função não definida: ${m[1]}`;
  if (/Units do not match|Unidades incompatíveis/.test(msg)) {
    if (msg.startsWith('Unidades')) return msg;
    try { const d = diagnose(math.parse(src), scope); if (d) return `Unidades incompatíveis: ${d}`; } catch { /* sem detalhe */ }
    return 'Unidades incompatíveis';
  }
  if (/Too (many|few) arguments/.test(msg)) return `Número de argumentos errado: ${msg}`;
  if (/Unexpected|Value expected|Parenthesis|Unterminated|Syntax/.test(msg)) return `Erro de sintaxe: ${msg}`;
  return msg;
}

/** Folga da condição: passou, mas com o lado esquerdo a 80 % ou mais do limite vira ATENÇÃO. */
function margin(src: string, scope: Map<string, unknown>): number | undefined {
  const node = math.parse(src);
  if (!math.isOperatorNode(node) || node.args.length !== 2) return undefined;
  const [a, b] = node.args.map((x) => x.compile().evaluate(scope));
  const r = Number(math.divide(a as never, b as never));
  if (!Number.isFinite(r)) return undefined;
  return node.fn === 'smaller' || node.fn === 'smallerEq' ? r : node.fn === 'larger' || node.fn === 'largerEq' ? 1 / r : undefined;
}

function lhsShown(src: string, limit: string | undefined, scope: Map<string, unknown>, fmt: FormatOpts): Shown | undefined {
  const node = math.parse(src);
  if (!math.isOperatorNode(node) || node.args.length !== 2) return undefined;
  const lhs = node.args[0].compile().evaluate(scope);
  const lim = limit?.trim() ?? '';
  const target = lim.endsWith('%') ? '%' : isUnit(lhs) ? (math.evaluate(toMath(lim), scope) as Unit).formatUnits?.() || undefined : undefined;
  return show(lhs, target, fmt);
}

export function evaluate(input: EvalInput, onLine?: (key: string, line: number) => void): EvalResult {
  const t0 = performance.now();
  const fmt = input.format ?? DEFAULT_FORMAT;
  const scope = new Map<string, unknown>();
  const libErrors: string[] = [];
  const defined = new Set<string>();

  for (const lib of input.libs) {
    for (const [name, expr] of lib.constants) {
      try { scope.set(name, math.evaluate(toMath(expr), scope)); } catch (e) { libErrors.push(`${lib.id}: constante ${name}: ${message(e, toMath(expr), scope)}`); }
    }
    for (const l of lib.functions) {
      const c = classify(l);
      if (c.kind === 'empty') continue;
      try { math.evaluate(c.src, scope); } catch (e) { libErrors.push(`${lib.id}: ${l.trim()}: ${message(e, c.src, scope)}`); }
    }
  }

  const blocks: Record<string, LineResult[]> = {};
  for (const b of input.blocks) {
    if (!EVALUATED.has(b.type)) continue;
    blocks[b.key] = b.lines.map((raw, i) => {
      const c = classify(raw, b.type === 'verificar');
      if (c.kind === 'empty') return { kind: 'empty' };
      onLine?.(b.key, i);
      try {
        if (c.kind === 'assign' || c.kind === 'func') {
          math.evaluate(c.src, scope);
          if (c.name) defined.add(c.name);
          return { kind: c.kind, writes: c.name };
        }
        const v = math.evaluate(c.src, scope);
        if (c.kind === 'check') {
          if (typeof v !== 'boolean') return { kind: 'check', error: 'A verificação precisa ser uma condição, como x < 1 %' };
          const r = margin(c.src, scope);
          let shown: Shown | undefined;
          try { shown = lhsShown(c.src, c.limit, scope, fmt); } catch { /* sem valor exibido; o estado já basta */ }
          const status = !v ? 'fail' : r !== undefined && r >= 0.8 ? 'warn' : 'ok';
          return { kind: 'check', status, limit: c.limit, ...shown };
        }
        return { kind: 'eval', ...show(v, c.target, fmt) };
      } catch (e) {
        return { kind: c.kind, error: message(e, c.src, scope) };
      }
    });
  }
  return { blocks, libErrors, defined: [...defined], ms: performance.now() - t0 };
}
