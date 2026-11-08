// Avaliação pura e síncrona (roda no worker e nos testes). Ordem: bibliotecas, depois blocos na ordem dada.
import type { MathNode, Unit } from 'mathjs';
import { parse as parseYaml } from 'yaml';
import { math } from './math';
import { classify, fromMath, toMath, type LineKind } from './syntax';
import { DEFAULT_FORMAT, DEFAULT_MARGIN, fmtComplex, fmtNum, prettyUnit, type FormatOpts } from './format';

export type LibInput = { id: string; constants: [string, string][]; functions: string[] };
/** atencao: margem de ATENÇÃO do bloco (atributo atencao=10%), em fração; vence a margem geral. */
/** casas: casas decimais só deste bloco (atributo casas=2, o decimalPlaces do SMath, E4.2). */
export type BlockInput = { key: string; type: string; lines: string[]; atencao?: number; casas?: number };
/** margem: margem de ATENÇÃO geral (config.yaml, verificacao.margem_atencao), em fração; padrão 0,2. */
/** symbolic: folha livre (ADENDO 05, E3.3): nome indefinido não é erro, a expressão fica em aberto. */
export type EvalInput = { libs: LibInput[]; blocks: BlockInput[]; format?: FormatOpts; margem?: number; symbolic?: boolean };

export type LineResult = {
  kind: LineKind;
  text?: string; // valor formatado, ex.: "1,79 V"
  value?: number; // número na unidade exibida
  unit?: string; // unidade exibida, ex.: "V"
  numText?: string; // só o número formatado, ex.: "1,79"
  unitRaw?: string; // unidade do math.js, ex.: "(ohm mm^2) / m" (a tela converte para LaTeX)
  error?: string;
  status?: 'ok' | 'warn' | 'fail';
  limit?: string;
  writes?: string;
  symbolic?: string; // resultado ainda com nome em aberto, na sintaxe linear: "10*x" (E3.3)
  missing?: string[]; // nomes que faltam definir
  factor?: string; // conversão por expressão: resultado = número·factor, "= ? 10^-6" (E4.3)
};
/** Biblioteca efetivamente usada (preenchido fora do worker, por engine/run.ts). */
export type LibInfo = { id: string; nome: string; versao: string; origem: 'projeto' | 'usuário' | 'fábrica'; path: string; duplicate?: string; readOnly?: boolean; extension?: { path: string; versao: string } };
/** Gráfico (bloco grafico): pontos já convertidos para as unidades pedidas. */
export type PlotResult = { titulo: string; xs: number[]; ys: (number | null)[]; xUnit: string; yUnit: string; limite?: { valor: number; rotulo: string }; error?: string };
export type EvalResult = { blocks: Record<string, LineResult[]>; plots?: Record<string, PlotResult>; libErrors: string[]; defined: string[]; ms: number; libs?: LibInfo[] };

const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const isUnit = (v: unknown): v is Unit => math.isUnit(v);
const isUnitName = (n: string) => { try { return math.Unit.isValuelessUnit(n); } catch { return false; } };

type Shown = { text: string; value?: number; unit?: string; numText?: string; unitRaw?: string; factor?: string };
type Cx = { re: number; im: number };
const num = (x: unknown, fmt: FormatOpts) => (math.isComplex(x) ? fmtComplex((x as Cx).re, (x as Cx).im, fmt) : fmtNum(x as number, fmt));
const real = (x: unknown) => (math.isComplex(x) ? ((x as Cx).im === 0 ? (x as Cx).re : undefined) : (x as number));
const cannot = (from: string, to: string) => new Error(`Não é possível converter ${from} em ${to}`);

export function show(v: unknown, target: string | undefined, fmt: FormatOpts): Shown {
  if (typeof v === 'boolean') return { text: v ? 'verdadeiro' : 'falso' };
  if (typeof v === 'function') return { text: 'função' };
  // conversão (E4.3): unidade sem valor ("mV", "deg") segue abaixo; número ou expressão ("10^-6") divide
  if (target && target !== '%') {
    let want: unknown;
    try { want = math.evaluate(target); } catch { want = undefined; }
    const valueless = isUnit(want) && (want as Unit & { value: unknown }).value === null;
    // número puro pedido em ângulo (arg(γ) = ? deg): o número está em radianos
    if (valueless && (typeof v === 'number' || math.isComplex(v)) && (want as Unit).equalBase(math.unit('rad'))) v = math.unit(real(v) ?? 0, 'rad');
    else if (!valueless && want !== undefined) {
      const q = math.divide(v as never, want as never);
      const s = show(q, undefined, fmt);
      const grouped = / [+−] /.test(s.text) ? `(${s.text})` : s.text; // complexo: (0,2 + 3,77·i)·10^-6
      return { ...s, factor: target, text: `${grouped}·${target}` };
    }
  }
  if (target === '%') {
    if (isUnit(v)) throw cannot(prettyUnit(v.formatUnits()), '%');
    const n = Number(v) * 100;
    return { text: `${fmtNum(n, fmt)} %`, value: n, unit: '%', numText: fmtNum(n, fmt), unitRaw: '%' };
  }
  if (typeof v === 'number' || math.isComplex(v)) {
    if (target) throw cannot('número sem unidade', prettyUnit(target));
    return { text: num(v, fmt), value: real(v), numText: num(v, fmt) };
  }
  if (isUnit(v)) {
    let u = v;
    if (target) {
      const want = math.unit(target);
      if (!u.equalBase(want)) throw cannot(prettyUnit(u.formatUnits()), prettyUnit(target));
      u = u.to(target);
    } else u = u.simplify();
    const units = u.formatUnits();
    const n: unknown = units ? u.toNumeric(units) : (u.value ?? 0); // complexo também (impedância em Ω, E4.1)
    const unit = prettyUnit(units);
    return { text: unit ? `${num(n, fmt)} ${unit}` : num(n, fmt), value: real(n), unit, numText: num(n, fmt), unitRaw: units };
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
  if (msg.startsWith('Não é possível converter')) return msg;
  if (/Units do not match|Unidades incompatíveis/.test(msg)) {
    if (msg.startsWith('Unidades')) return msg;
    try { const d = diagnose(math.parse(src), scope); if (d) return `Unidades incompatíveis: ${d}`; } catch { /* sem detalhe */ }
    return 'Unidades incompatíveis';
  }
  if (/Too (many|few) arguments/.test(msg)) return `Número de argumentos errado: ${msg}`;
  if (/Unexpected|Value expected|Parenthesis|Unterminated|Syntax/.test(msg)) return `Erro de sintaxe: ${msg}`;
  return msg;
}

/**
 * Razão de uso da condição (regra do selo): `<`/`<=` r = valor/limite; `>`/`>=` r = limite/valor.
 * Sem razão (nunca ATENÇÃO): `=`/`≠`, limite que depende de variáveis, limite zero ou negativo.
 */
function usage(src: string, scope: Map<string, unknown>): number | undefined {
  const node = math.parse(src);
  if (!math.isOperatorNode(node) || node.args.length !== 2) return undefined;
  const less = node.fn === 'smaller' || node.fn === 'smallerEq';
  if (!less && node.fn !== 'larger' && node.fn !== 'largerEq') return undefined;
  let limit: unknown;
  try { limit = node.args[1].compile().evaluate(new Map()); } catch { return undefined; } // limite com variável
  const sign = isUnit(limit) ? Math.sign(Number(limit.value)) : typeof limit === 'number' ? Math.sign(limit) : NaN;
  if (!(sign > 0)) return undefined;
  const value = node.args[0].compile().evaluate(scope);
  const r = Number(less ? math.divide(value as never, limit as never) : math.divide(limit as never, value as never));
  return Number.isFinite(r) ? r : undefined;
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
      try { scope.set(name, math.evaluate(toMath(expr), scope)); defined.add(name); } catch (e) { libErrors.push(`${lib.id}: constante ${name}: ${message(e, toMath(expr), scope)}`); }
    }
    for (const l of lib.functions) {
      const c = classify(l);
      if (c.kind === 'empty') continue;
      try { math.evaluate(c.src, scope); if (c.name) defined.add(c.name); } catch (e) { libErrors.push(`${lib.id}: ${l.trim()}: ${message(e, c.src, scope)}`); }
    }
  }

  // E3.3 (só na folha): definição com nome em aberto guarda a expressão; a avaliação resolve com os
  // valores daquele ponto, e o que sobrar indefinido aparece como expressão, sem erro.
  const open = new Map<string, MathNode>();
  type Sym = MathNode & { name: string };
  const known = (n: string) => scope.has(n) || open.has(n) || n in math || isUnitName(n);
  const expand = (node: MathNode): MathNode => node.transform((n) => (math.isSymbolNode(n) && !scope.has((n as Sym).name) && open.has((n as Sym).name) ? new math.ParenthesisNode(expand(open.get((n as Sym).name)!)) : n));
  const missingOf = (node: MathNode) => [...new Set(node.filter((n) => math.isSymbolNode(n) && !known((n as Sym).name)).map((n) => (n as Sym).name))];
  const symbolicText = (node: MathNode) => {
    let r = math.resolve(node, scope);
    try { r = math.simplify(r); } catch { /* fica como está */ }
    return fromMath(r.toString({ implicit: 'show' }));
  };

  const blocks: Record<string, LineResult[]> = {};
  for (const b of input.blocks) {
    if (!EVALUATED.has(b.type)) continue;
    const bfmt: FormatOpts = b.casas !== undefined ? { ...fmt, decimals: b.casas, mode: fmt.mode ? 'decimais' : undefined } : fmt;
    blocks[b.key] = b.lines.map((raw, i) => {
      const c = classify(raw, b.type === 'verificar');
      if (c.kind === 'empty') return { kind: 'empty' };
      onLine?.(b.key, i);
      try {
        if (c.kind === 'assign' && input.symbolic) {
          const node = math.parse(c.src) as MathNode & { object: Sym; value: MathNode };
          const value = expand(node.value);
          const name = node.object.name;
          if (c.name) defined.add(c.name);
          const miss = missingOf(value);
          if (miss.length) {
            open.set(name, math.resolve(value, scope)); // guarda a expressão com os valores conhecidos até aqui
            scope.delete(name);
            return { kind: 'assign', writes: c.name, ...(c.show ? { symbolic: symbolicText(value), missing: miss, text: '' } : {}) };
          }
          const v = value.compile().evaluate(scope);
          scope.set(name, v);
          open.delete(name);
          return { kind: 'assign', writes: c.name, ...(c.show ? show(v, c.target, bfmt) : {}) };
        }
        if (c.kind === 'assign' || c.kind === 'func') {
          const v = math.evaluate(c.src, scope);
          if (c.name) defined.add(c.name);
          return { kind: c.kind, writes: c.name, ...(c.show && c.kind === 'assign' ? show(v, c.target, bfmt) : {}) };
        }
        if (input.symbolic && c.kind === 'eval') {
          const node = expand(math.parse(c.src));
          const miss = missingOf(node);
          if (miss.length) return { kind: 'eval', symbolic: symbolicText(node), missing: miss, text: '' };
          return { kind: 'eval', ...show(node.compile().evaluate(scope), c.target, bfmt) };
        }
        const v = math.evaluate(c.src, scope);
        if (c.kind === 'check') {
          if (typeof v !== 'boolean') return { kind: 'check', error: 'A verificação precisa ser uma condição, como x < 1 %' };
          const r = usage(c.src, scope);
          const m = b.atencao ?? input.margem ?? DEFAULT_MARGIN;
          let shown: Shown | undefined;
          try { shown = lhsShown(c.src, c.limit, scope, bfmt); } catch { /* sem valor exibido; o estado já basta */ }
          const status = !v ? 'fail' : r !== undefined && r >= 1 - m ? 'warn' : 'ok';
          return { kind: 'check', status, limit: c.limit, ...shown };
        }
        return { kind: 'eval', ...show(v, c.target, bfmt) };
      } catch (e) {
        return { kind: c.kind, error: message(e, c.src, scope) };
      }
    });
  }
  const plots: Record<string, PlotResult> = {};
  for (const b of input.blocks) if (b.type === 'grafico') plots[b.key] = plot(b.lines.join(''), scope, fmt);
  return { blocks, plots, libErrors, defined: [...defined], ms: performance.now() - t0 };
}

type PlotSpec = { titulo?: unknown; x?: { var?: unknown; valores?: unknown; unidade?: unknown }; y?: { expr?: unknown; unidade?: unknown }; limite?: { valor?: unknown; rotulo?: unknown } };

/** Bloco grafico (SPEC 3.6): varia x.var pelos valores e avalia y.expr em cada um. */
export function plot(body: string, scope: Map<string, unknown>, fmt: FormatOpts): PlotResult {
  let spec: PlotSpec;
  try { spec = (parseYaml(body) ?? {}) as PlotSpec; } catch (e) { return { titulo: 'Gráfico', xs: [], ys: [], xUnit: '', yUnit: '', error: `YAML inválido: ${e instanceof Error ? e.message : e}` }; }
  const titulo = String(spec.titulo ?? 'Gráfico');
  const xVar = String(spec.x?.var ?? '');
  const xUnit = String(spec.x?.unidade ?? '');
  const yUnit = String(spec.y?.unidade ?? '');
  const valores = Array.isArray(spec.x?.valores) ? spec.x!.valores.map(Number) : [];
  const limite = spec.limite && Number.isFinite(Number(spec.limite.valor)) ? { valor: Number(spec.limite.valor), rotulo: String(spec.limite.rotulo ?? '') } : undefined;
  const base = { titulo, xs: valores, xUnit, yUnit, limite };
  if (!xVar || !spec.y?.expr) return { ...base, ys: [], error: 'Gráfico precisa de x.var, x.valores e y.expr' };
  const expr = toMath(String(spec.y.expr));
  const ys: (number | null)[] = [];
  let error: string | undefined;
  for (const v of valores) {
    const local = new Map(scope);
    try {
      local.set(xVar, math.evaluate(xUnit ? `${v} ${toMath(xUnit)}` : String(v)));
      const r = show(math.evaluate(expr, local), yUnit ? (yUnit === '%' ? '%' : toMath(yUnit)) : undefined, fmt);
      ys.push(r.value ?? null);
    } catch (e) {
      ys.push(null);
      error ??= message(e, expr, local);
    }
  }
  return { ...base, ys, error };
}
