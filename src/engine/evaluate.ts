// Avaliação pura e síncrona (roda no worker e nos testes). Ordem: bibliotecas, depois blocos na ordem dada.
import type { MathNode, Unit } from 'mathjs';
import { parse as parseYaml } from 'yaml';
import { mapFree } from './bound';
import { withWarning } from './calculus';
import { math, smath } from './math';
import { classify, fromMath, markVars, toMath, toMathVars, VAR_MARK, type Line, type LineKind } from './syntax';
import { DEFAULT_FORMAT, DEFAULT_MARGIN, fmtComplex, fmtNum, prettyUnit, type FormatOpts } from './format';

export type LibInput = { id: string; constants: [string, string][]; functions: string[] };
/** atencao: margem de ATENÇÃO do bloco (atributo atencao=10%), em fração; vence a margem geral. */
/** fmt: formato só deste bloco (casas=2, modo=, zeros_a_direita=; o decimalPlaces do SMath, E4.2). */
export type BlockInput = { key: string; type: string; lines: string[]; atencao?: number; fmt?: Partial<FormatOpts> };
/** margem: margem de ATENÇÃO geral (config.yaml, verificacao.margem_atencao), em fração; padrão 0,2. */
/** symbolic: folha livre (ADENDO 05, E3.3): nome indefinido não é erro, a expressão fica em aberto. */
/** keepRaw: devolve também o valor do math.js de cada resultado (teste do corpus SMath; não usar no worker). */
export type EvalInput = { libs: LibInput[]; blocks: BlockInput[]; format?: FormatOpts; margem?: number; symbolic?: boolean; keepRaw?: boolean };

export type LineResult = {
  kind: LineKind;
  text?: string; // valor formatado, ex.: "1,79 V"
  value?: number; // número na unidade exibida
  unit?: string; // unidade exibida, ex.: "V"
  numText?: string; // só o número formatado, ex.: "1,79"
  unitRaw?: string; // unidade do math.js, ex.: "(ohm mm^2) / m" (a tela converte para LaTeX)
  error?: string;
  warning?: string; // aviso que não impede o valor: integral que pode não ter convergido (--warn-text)
  status?: 'ok' | 'warn' | 'fail';
  limit?: string;
  writes?: string;
  symbolic?: string; // resultado ainda com nome em aberto, na sintaxe linear: "10*x" (E3.3)
  missing?: string[]; // nomes que faltam definir
  factor?: string; // conversão por expressão: resultado = número·factor, "= ? 10^-6" (E4.3)
  raw?: unknown; // valor do math.js, só com keepRaw
  matrix?: string[][]; // vetor ou matriz: células já formatadas (E4.1)
  assigned?: { text?: string; numText?: string; unit?: string; unitRaw?: string }; // A6-4: valor de definição sem "= ?" (detalhe do assistente; a região não mostra)
};
/** Biblioteca efetivamente usada (preenchido fora do worker, por engine/run.ts). */
export type LibInfo = { id: string; nome: string; versao: string; origem: 'projeto' | 'usuário' | 'fábrica'; path: string; duplicate?: string; readOnly?: boolean; extension?: { path: string; versao: string } };
/** Gráfico (bloco grafico): pontos já convertidos para as unidades pedidas. */
export type PlotResult = { titulo: string; xs: number[]; ys: (number | null)[]; xUnit: string; yUnit: string; limite?: { valor: number; rotulo: string }; error?: string };
export type EvalResult = { blocks: Record<string, LineResult[]>; plots?: Record<string, PlotResult>; libErrors: string[]; defined: string[]; ms: number; libs?: LibInfo[]; shadow?: { name: string; value: string } };

const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const isUnit = (v: unknown): v is Unit => math.isUnit(v);
const isUnitName = (n: string) => { try { return math.Unit.isValuelessUnit(n); } catch { return false; } };

type Shown = { text: string; value?: number; unit?: string; numText?: string; unitRaw?: string; factor?: string; matrix?: string[][] };
type Cx = { re: number; im: number };
const num = (x: unknown, fmt: FormatOpts) => (math.isComplex(x) ? fmtComplex((x as Cx).re, (x as Cx).im, fmt) : fmtNum(x as number, fmt));
const real = (x: unknown) => (math.isComplex(x) ? ((x as Cx).im === 0 ? (x as Cx).re : undefined) : (x as number));
/** Valor de definição para o assistente (A6-4): só escalar, para não formatar matrizes grandes à toa. */
const assignedOf = (v: unknown, fmt: FormatOpts): LineResult['assigned'] => {
  if (!(typeof v === 'number' || isUnit(v) || math.isComplex(v))) return undefined;
  const { text, numText, unit, unitRaw } = safeShow(v, undefined, fmt);
  return text === undefined ? undefined : { text, numText, unit, unitRaw };
};
const cannot = (from: string, to: string) => new Error(`Não é possível converter ${from} em ${to}`);

/** show que não falha num valor sem exibição (o for devolve o último valor do corpo). */
const safeShow = (v: unknown, target: string | undefined, fmt: FormatOpts): Partial<Shown> => { try { return show(v, target, fmt); } catch { return {}; } };

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
  // vetor e matriz (E4.1): cada elemento com o formato do arquivo; vetor do SMath é coluna
  if (math.isMatrix(v) || Array.isArray(v)) {
    const a = (math.isMatrix(v) ? v.toArray() : v) as unknown[];
    const cell = (x: unknown): string => (typeof x === 'string' ? `"${x}"` : math.isMatrix(x) || Array.isArray(x) ? show(x, undefined, fmt).text : num(x, fmt));
    const rows = a.map((r) => (Array.isArray(r) ? r.map(cell) : [cell(r)]));
    return { text: `[${rows.map((r) => r.join('; ')).join(' | ')}]`, matrix: rows };
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
  if ((m = /Undefined symbol (\S+)/.exec(msg))) return `Variável não definida: ${fromMath(m[1])}`;
  if ((m = /Undefined function (\S+)/.exec(msg))) return `Função não definida: ${fromMath(m[1])}`;
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
  const target = lim.endsWith('%') ? '%' : isUnit(lhs) ? (math.evaluate(toMathVars(lim), scope) as Unit).formatUnits?.() || undefined : undefined;
  return show(lhs, target, fmt);
}

/** Parâmetros de f(a, b) = ... (o texto de classify): dentro da função, "2 s" com parâmetro s é produto. */
const paramsOf = (c: Line) => new Set(c.kind === 'func' ? (/^[^(]*\(([^)]*)\)/.exec(c.src)?.[1] ?? '').split(',').map((x) => x.trim()) : []);

export function evaluate(input: EvalInput, onLine?: (key: string, line: number) => void): EvalResult {
  const t0 = performance.now();
  const fmt = input.format ?? DEFAULT_FORMAT;
  const scope = new Map<string, unknown>();
  const libErrors: string[] = [];
  const defined = new Set<string>();

  for (const lib of input.libs) {
    for (const [name, expr] of lib.constants) {
      try { scope.set(toMathVars(name), math.evaluate(toMathVars(expr), scope)); defined.add(name); } catch (e) { libErrors.push(`${lib.id}: constante ${name}: ${message(e, toMathVars(expr), scope)}`); }
    }
    for (const l of lib.functions) {
      const c0 = classify(l);
      if (c0.kind === 'empty') continue;
      const ps = paramsOf(c0);
      const c = { ...c0, src: markVars(c0.src, (n) => scope.has(n + VAR_MARK) || ps.has(n)) };
      try { math.evaluate(c.src, scope); if (c.name) defined.add(c.name); } catch (e) { libErrors.push(`${lib.id}: ${l.trim()}: ${message(e, c.src, scope)}`); }
    }
  }

  // E3.3 (só na folha): definição com nome em aberto guarda a expressão; a avaliação resolve com os
  // valores daquele ponto, e o que sobrar indefinido aparece como expressão, sem erro.
  const withRaw = (v: unknown) => (input.keepRaw ? { raw: v } : {});
  const open = new Map<string, MathNode>();
  type Sym = MathNode & { name: string };
  // F04: o nome que sobra sem marca (VAR_MARK) e é unidade está em posição de unidade ("25 m", "'m"): conhecido
  const known = (n: string) => scope.has(n) || open.has(n) || n in math || isUnitName(n);
  // v[i] na leitura passa pela função el (E2.3); math.parse local já faz isso
  const P = (src: string) => smath.readIndexAsEl(math.parse(src));
  const expand = (node: MathNode): MathNode => mapFree(node, (s) => (!scope.has(s.name) && open.has(s.name) ? new math.ParenthesisNode(expand(open.get(s.name)!)) : s));
  // a variável de integral(expr, x, a, b) e de diff(expr, x, ponto) é do cálculo (bound.ts): nunca falta nem é trocada
  const missingOf = (node: MathNode) => {
    const miss = new Set<string>();
    mapFree(node, (s) => { if (!known(s.name)) miss.add(s.name); return s; }, true);
    return [...miss];
  };
  const resolveFree = (node: MathNode) => mapFree(node, (s) => (scope.has(s.name) ? math.resolve(s, scope) : s));
  const symbolicText = (node: MathNode) => {
    let r = resolveFree(node);
    try { r = math.simplify(r); } catch { /* fica como está */ }
    return fromMath(r.toString({ implicit: 'show' }));
  };

  const blocks: Record<string, LineResult[]> = {};
  const fromLibs = new Set(defined);
  for (const b of input.blocks) {
    if (!EVALUATED.has(b.type)) continue;
    // casas= sozinho num arquivo com formato do SMath é casas decimais (o decimalPlaces do SMath)
    const bfmt: FormatOpts = b.fmt ? { ...fmt, ...(b.fmt.decimals !== undefined && fmt.mode && !b.fmt.mode ? { mode: 'decimais' as const } : {}), ...b.fmt } : fmt;
    blocks[b.key] = b.lines.map((raw, i) => withWarning(() => {
      const c0 = classify(raw, b.type === 'verificar');
      if (c0.kind === 'empty') return { kind: 'empty' };
      const ps = paramsOf(c0);
      const c = { ...c0, src: markVars(c0.src, (n) => scope.has(n + VAR_MARK) || open.has(n + VAR_MARK) || ps.has(n)) }; // F04: nome em posição de variável não vira unidade; variável ou parâmetro já definido vence a unidade
      onLine?.(b.key, i);
      try {
        // v[j] := x e for(j, faixa, v[j] := ...): executam direto; o vetor de destino nasce se não existir
        const imperative = (c.kind === 'assign' || c.kind === 'eval') && /\[|\bfor\(/.test(c.src) ? P(c.src) : null;
        if (imperative && ((imperative as MathNode & { index?: unknown }).index || imperative.filter((n) => math.isFunctionNode(n) && (n as MathNode & { fn: Sym }).fn.name === 'for').length)) {
          smath.prepareTargets(imperative, scope);
          const v = imperative.compile().evaluate(scope);
          if (c.name) defined.add(c.name);
          // a variável do laço continua definida com o último valor, como no SMath (E8-28); o vetor de destino também
          imperative.traverse((n) => {
            const x = n as MathNode & { fn?: Sym; args?: MathNode[]; object?: Sym };
            if (math.isFunctionNode(n) && x.fn!.name === 'for' && math.isSymbolNode(x.args![0])) defined.add(fromMath((x.args![0] as Sym).name));
            if (math.isAssignmentNode(n) && math.isSymbolNode(x.object)) defined.add(fromMath(x.object!.name));
          });
          if (c.kind === 'assign') return { kind: 'assign', writes: c.name, ...(c.show ? { ...show(v, c.target, bfmt), ...withRaw(v) } : {}) };
          return { kind: 'eval', ...(c.target !== undefined || v !== undefined ? safeShow(v, c.target, bfmt) : {}), ...withRaw(v) };
        }
        if (c.kind === 'assign' && input.symbolic) {
          const node = P(c.src) as MathNode & { object: Sym; value: MathNode };
          const value = expand(node.value);
          const name = node.object.name;
          if (c.name) defined.add(c.name);
          const miss = missingOf(value).map(fromMath);
          if (miss.length) {
            open.set(name, resolveFree(value)); // guarda a expressão com os valores conhecidos até aqui
            scope.delete(name);
            return { kind: 'assign', writes: c.name, ...(c.show ? { symbolic: symbolicText(value), missing: miss, text: '' } : {}) };
          }
          const v = value.compile().evaluate(scope);
          scope.set(name, v);
          open.delete(name);
          return { kind: 'assign', writes: c.name, ...(c.show ? { ...show(v, c.target, bfmt), ...withRaw(v) } : { assigned: assignedOf(v, bfmt) }) };
        }
        if (c.kind === 'assign' || c.kind === 'func') {
          const v = P(c.src).compile().evaluate(scope);
          if (c.name) defined.add(c.name);
          return { kind: c.kind, writes: c.name, ...(c.show && c.kind === 'assign' ? { ...show(v, c.target, bfmt), ...withRaw(v) } : c.kind === 'assign' ? { assigned: assignedOf(v, bfmt) } : {}) };
        }
        if (input.symbolic && c.kind === 'eval') {
          const node = expand(P(c.src));
          const miss = missingOf(node).map(fromMath);
          if (miss.length) return { kind: 'eval', symbolic: symbolicText(node), missing: miss, text: '' };
          const v = node.compile().evaluate(scope);
          return { kind: 'eval', ...show(v, c.target, bfmt), ...withRaw(v) };
        }
        const v = P(c.src).compile().evaluate(scope);
        if (c.kind === 'check') {
          const cond = typeof v === 'number' && /\bor\b/.test(c.src) ? v !== 0 : v; // o ou (||) dá 1 ou 0 (A6-3)
          if (typeof cond !== 'boolean') return { kind: 'check', error: 'A verificação precisa ser uma condição, como x < 1 %' };
          const r = usage(c.src, scope);
          const m = b.atencao ?? input.margem ?? DEFAULT_MARGIN;
          let shown: Shown | undefined;
          try { shown = lhsShown(c.src, c.limit, scope, bfmt); } catch { /* sem valor exibido; o estado já basta */ }
          const status = !cond ? 'fail' : r !== undefined && r >= 1 - m ? 'warn' : 'ok';
          return { kind: 'check', status, limit: c.limit, ...shown };
        }
        return { kind: 'eval', ...show(v, c.target, bfmt), ...withRaw(v) };
      } catch (e) {
        return { kind: c.kind, error: message(e, c.src, scope) };
      }
    }));
  }
  const plots: Record<string, PlotResult> = {};
  for (const b of input.blocks) if (b.type === 'grafico') plots[b.key] = plot(b.lines.join(''), scope, fmt);
  // i ou e definidos pelo usuário (inclusive como variável de laço): a tela avisa uma vez (E8-29)
  const sh = ['i', 'e'].find((n) => defined.has(n) && !fromLibs.has(n) && scope.has(n) && typeof scope.get(n) !== 'function');
  const shadow = sh ? { name: sh, value: math.format(scope.get(sh) as never, { precision: 6 }).replace(/\./g, fmt.sep === ',' ? ',' : '.') } : undefined;
  return { blocks, plots, libErrors, defined: [...defined], ms: performance.now() - t0, ...(shadow ? { shadow } : {}) };
}

type PlotSpec = { titulo?: unknown; x?: { var?: unknown; valores?: unknown; unidade?: unknown }; y?: { expr?: unknown; unidade?: unknown }; limite?: { valor?: unknown; rotulo?: unknown } };

/** Bloco grafico (SPEC 3.6): varia x.var pelos valores e avalia y.expr em cada um. */
export function plot(body: string, scope: Map<string, unknown>, fmt: FormatOpts): PlotResult {
  let spec: PlotSpec;
  try { spec = (parseYaml(body) ?? {}) as PlotSpec; } catch (e) { return { titulo: 'Gráfico', xs: [], ys: [], xUnit: '', yUnit: '', error: `YAML inválido: ${e instanceof Error ? e.message : e}` }; }
  const titulo = String(spec.titulo ?? 'Gráfico');
  // importado do SMath (E7.1): eixos e rótulos estão no bloco, as séries ainda não são desenhadas
  if ((spec as { origem?: unknown }).origem === 'smath') return { titulo: titulo || 'Gráfico do SMath', xs: [], ys: [], xUnit: '', yUnit: '', error: 'Gráfico importado do SMath: as séries ainda não são desenhadas nesta versão' };
  const xVar = String(spec.x?.var ?? '');
  const xUnit = String(spec.x?.unidade ?? '');
  const yUnit = String(spec.y?.unidade ?? '');
  const valores = Array.isArray(spec.x?.valores) ? spec.x!.valores.map(Number) : [];
  const limite = spec.limite && Number.isFinite(Number(spec.limite.valor)) ? { valor: Number(spec.limite.valor), rotulo: String(spec.limite.rotulo ?? '') } : undefined;
  const base = { titulo, xs: valores, xUnit, yUnit, limite };
  if (!xVar || !spec.y?.expr) return { ...base, ys: [], error: 'Gráfico precisa de x.var, x.valores e y.expr' };
  const expr = toMathVars(String(spec.y.expr));
  const ys: (number | null)[] = [];
  let error: string | undefined;
  for (const v of valores) {
    const local = new Map(scope);
    try {
      local.set(toMathVars(xVar), math.evaluate(xUnit ? `${v} ${toMath(xUnit)}` : String(v)));
      const r = show(math.evaluate(expr, local), yUnit ? (yUnit === '%' ? '%' : toMath(yUnit)) : undefined, fmt);
      ys.push(r.value ?? null);
    } catch (e) {
      ys.push(null);
      error ??= message(e, expr, local);
    }
  }
  return { ...base, ys, error };
}
