// Conversor entre a sintaxe linear do arquivo (SPEC 3.4) e o LaTeX do MathLive (ADENDO 02, B2 e B9).
// O arquivo guarda "S := 4 mm^2"; a tela mostra S ≔ 4 mm². toLinear(toLatex(x)) === x para a forma canônica.

// ---------- árvore comum ----------
export type UnitTerm = { name: string; exp?: string; div: boolean };
export type Unit = { one: boolean; terms: UnitTerm[] }; // one: começa com "1/" (ex.: 1/°C)
export type Node =
  | { t: 'num'; v: string } // sempre com ponto decimal
  | { t: 'id'; name: string } // V_mp, ρ_cu, ΔV
  | { t: 'qty'; n: Node; u: Unit } // 4 mm^2
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'neg'; a: Node }
  | { t: 'paren'; a: Node }
  | { t: 'call'; f: string; args: Node[] }
  | { t: 'mat'; rows: Node[][] };
export type Line =
  | { kind: 'def'; lhs: Node; rhs: Node; show?: boolean; unit?: Unit; conv?: Node } // show: "x := expr = ?" (ADENDO 05, E2.1)
  | { kind: 'eval'; expr: Node; unit?: Unit; conv?: Node } // conv: conversão por expressão, "= ? 10^-6" (E4.3)
  | { kind: 'expr'; expr: Node };

export class MathSyntaxError extends Error {}
const fail = (msg: string): never => { throw new MathSyntaxError(msg); };

const REL = ['<', '<=', '>', '>=', '==', '!='];
const PREC: Record<string, number> = { '<': 1, '<=': 1, '>': 1, '>=': 1, '==': 1, '!=': 1, '+': 2, '-': 2, '*': 3, '/': 3, '^': 5 };
const prec = (n: Node): number => (n.t === 'bin' ? PREC[n.op] : n.t === 'neg' ? 4 : 6);

/** Funções nativas: nome reto na tela (SPEC 8.6). */
export const BUILTINS = new Set(['sqrt', 'abs', 'exp', 'ln', 'log', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'min', 'max', 'round', 'ceil', 'floor', 'sum', 'mean', 'root', 'integral', 'deriv', 'interp', 'polyroots', 'solve', 'det', 'inv', 'transpose']);

// ---------- linear: leitura ----------
type Tok = { k: 'num' | 'id' | 'op' | 'ws'; v: string };
const TOKEN = /\s+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|:=|<=|>=|!=|==|[\p{L}°][\p{L}\p{N}_]*|%|[+\-*/^()[\],;<>=?]/uy;

function lex(src: string): Tok[] {
  const s = src.replace(/[·×]/g, '*').replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=').replace(/≔/g, ':=');
  const out: Tok[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < s.length) {
    const at = TOKEN.lastIndex;
    const m = TOKEN.exec(s);
    if (!m) fail(`Caractere inesperado: ${s[at]}`);
    const v = m![0];
    out.push({ k: /^\s/.test(v) ? 'ws' : /^\d/.test(v) ? 'num' : /^[\p{L}°%]/u.test(v) ? 'id' : 'op', v });
  }
  return out;
}

class LinearParser {
  i = 0;
  constructor(private toks: Tok[]) {}
  private skip() { while (this.toks[this.i]?.k === 'ws') this.i++; }
  peek(): Tok | undefined { this.skip(); return this.toks[this.i]; }
  isOp(v: string) { const t = this.peek(); return t?.k === 'op' && t.v === v; }
  eat(v: string) { if (!this.isOp(v)) fail(`Esperava "${v}"`); this.i++; }
  atEnd() { return this.peek() === undefined; }

  /** O que vem depois de "= ?": unidade ("mV", "%", "deg") ou, se não for, expressão ("10^-6"). */
  target(): { unit?: Unit; conv?: Node } {
    if (this.atEnd()) return {};
    const save = this.i;
    try { const unit = this.unit(); if (this.atEnd()) return { unit }; } catch { /* não é unidade */ }
    this.i = save;
    return { conv: this.expr() };
  }

  line(): Line {
    const e = this.expr();
    if (this.isOp(':=')) {
      this.i++;
      const rhs = this.expr();
      if (this.isOp('=')) { this.i++; this.eat('?'); const t = this.target(); this.end(); return { kind: 'def', lhs: e, rhs, show: true, ...t }; }
      this.end();
      return { kind: 'def', lhs: e, rhs };
    }
    if (this.isOp('=')) {
      this.i++;
      this.eat('?');
      const t = this.target();
      this.end();
      return { kind: 'eval', expr: e, ...t };
    }
    this.end();
    return { kind: 'expr', expr: e };
  }
  private end() { if (!this.atEnd()) fail(`Sobrou: ${this.toks.slice(this.i).map((t) => t.v).join('')}`); }

  expr(): Node {
    const a = this.add();
    const t = this.peek();
    if (t?.k === 'op' && REL.includes(t.v)) { this.i++; return { t: 'bin', op: t.v, a, b: this.add() }; }
    return a;
  }
  private add(): Node {
    let a = this.mul();
    for (let t = this.peek(); t?.k === 'op' && (t.v === '+' || t.v === '-'); t = this.peek()) { this.i++; a = { t: 'bin', op: t.v, a, b: this.mul() }; }
    return a;
  }
  private mul(): Node {
    let a = this.unary();
    for (let t = this.peek(); t?.k === 'op' && (t.v === '*' || t.v === '/'); t = this.peek()) { this.i++; a = { t: 'bin', op: t.v, a, b: this.unary() }; }
    return a;
  }
  private unary(): Node {
    if (this.isOp('-')) { this.i++; return { t: 'neg', a: this.unary() }; }
    const a = this.atom();
    if (this.isOp('^')) { this.i++; return { t: 'bin', op: '^', a, b: this.unary() }; }
    return a;
  }
  private atom(): Node {
    const t = this.peek();
    if (!t) return fail('Expressão incompleta');
    if (t.k === 'num') {
      this.i++;
      const n: Node = { t: 'num', v: t.v };
      // número, espaço e unidade: "25 m", "0.0179 Ω*mm^2/m", "0.00393 1/°C"
      const ws = this.toks[this.i]?.k === 'ws';
      const nx = this.toks[this.i + 1];
      const unitAhead = nx && (nx.k === 'id' || (nx.k === 'num' && nx.v === '1' && this.toks[this.i + 2]?.v === '/'));
      if (ws && unitAhead && this.toks[this.i + 2]?.v !== '(') { this.i++; return { t: 'qty', n, u: this.unit() }; }
      return n;
    }
    if (t.k === 'id') {
      this.i++;
      if (this.toks[this.i]?.k === 'op' && this.toks[this.i].v === '(') {
        this.i++;
        const args: Node[] = [];
        if (!this.isOp(')')) { do { args.push(this.expr()); } while (this.isOp(',') && ++this.i); }
        this.eat(')');
        return { t: 'call', f: t.v, args };
      }
      return { t: 'id', name: t.v };
    }
    if (t.v === '(') { this.i++; const a = this.expr(); this.eat(')'); return { t: 'paren', a }; }
    if (t.v === '[') {
      this.i++;
      const rows: Node[][] = [[]];
      if (!this.isOp(']')) {
        for (;;) {
          rows[rows.length - 1].push(this.expr());
          if (this.isOp(',')) { this.i++; continue; }
          if (this.isOp(';')) { this.i++; rows.push([]); continue; }
          break;
        }
      }
      this.eat(']');
      return { t: 'mat', rows };
    }
    return fail(`Inesperado: ${t.v}`);
  }
  /** Unidade sem espaços: mm^2, Ω*mm^2/m, h/dia, 1/°C, %. */
  unit(): Unit {
    this.skip();
    const u: Unit = { one: false, terms: [] };
    let div = false;
    if (this.toks[this.i]?.v === '1' && this.toks[this.i + 1]?.v === '/') { u.one = true; div = true; this.i += 2; }
    for (;;) {
      const t = this.toks[this.i];
      if (t?.k !== 'id') return fail('Unidade esperada');
      this.i++;
      const term: UnitTerm = { name: t.v, div };
      if (this.toks[this.i]?.v === '^') {
        this.i++;
        let e = '';
        if (this.toks[this.i]?.v === '-') { e = '-'; this.i++; }
        const n = this.toks[this.i];
        if (n?.k !== 'num') return fail('Expoente da unidade');
        this.i++;
        term.exp = e + n.v;
      }
      u.terms.push(term);
      const op = this.toks[this.i];
      if (op?.k === 'op' && (op.v === '*' || op.v === '/') && this.toks[this.i + 1]?.k === 'id') { div = op.v === '/'; this.i++; continue; }
      return u;
    }
  }
}

export const parseLinear = (s: string): Line => new LinearParser(lex(s)).line();
export const parseUnit = (s: string): Unit => { const p = new LinearParser(lex(s)); const u = p.unit(); if (!p.atEnd()) fail('Unidade inválida'); return u; };

// ---------- linear: escrita (forma canônica) ----------
const needParens = (child: Node, op: string, right: boolean) => {
  const cp = prec(child), pp = PREC[op];
  if (cp < pp) return true;
  if (cp === pp && right && (op === '-' || op === '/' || PREC[op] === 1)) return true;
  if (op === '^' && !right && cp === pp) return true;
  return false;
};

export function unitToLinear(u: Unit): string {
  return u.terms.map((t, i) => `${i === 0 ? (t.div ? '1/' : '') : t.div ? '/' : '*'}${t.name}${t.exp ? `^${t.exp}` : ''}`).join('');
}

export function nodeToLinear(n: Node): string {
  const wrap = (c: Node, op: string, right: boolean) => (needParens(c, op, right) ? `(${nodeToLinear(c)})` : nodeToLinear(c));
  switch (n.t) {
    case 'num': return n.v;
    case 'id': return n.name;
    case 'qty': return `${nodeToLinear(n.n)} ${unitToLinear(n.u)}`;
    case 'neg': return `-${prec(n.a) < 4 ? `(${nodeToLinear(n.a)})` : nodeToLinear(n.a)}`;
    case 'paren': return `(${nodeToLinear(n.a)})`;
    case 'call': return `${n.f}(${n.args.map(nodeToLinear).join(', ')})`;
    case 'mat': return `[${n.rows.map((r) => r.map(nodeToLinear).join(', ')).join('; ')}]`;
    case 'bin': {
      const a = wrap(n.a, n.op, false), b = wrap(n.b, n.op, true);
      return n.op === '*' || n.op === '/' || n.op === '^' ? `${a}${n.op}${b}` : `${a} ${n.op} ${b}`;
    }
  }
}

export function lineToLinear(l: Line): string {
  const tgt = (x: { unit?: Unit; conv?: Node }) => (x.unit ? ` ${unitToLinear(x.unit)}` : x.conv ? ` ${nodeToLinear(x.conv)}` : '');
  if (l.kind === 'def') return `${nodeToLinear(l.lhs)} := ${nodeToLinear(l.rhs)}${l.show ? ` = ?${tgt(l)}` : ''}`;
  if (l.kind === 'eval') return `${nodeToLinear(l.expr)} = ?${tgt(l)}`;
  return nodeToLinear(l.expr);
}

// ---------- LaTeX: escrita ----------
const GREEK: [string, string][] = [
  ['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'], ['δ', 'delta'], ['ε', 'varepsilon'], ['ζ', 'zeta'], ['η', 'eta'], ['θ', 'theta'],
  ['ι', 'iota'], ['κ', 'kappa'], ['λ', 'lambda'], ['μ', 'mu'], ['ν', 'nu'], ['ξ', 'xi'], ['π', 'pi'], ['ρ', 'rho'], ['σ', 'sigma'],
  ['τ', 'tau'], ['υ', 'upsilon'], ['φ', 'varphi'], ['χ', 'chi'], ['ψ', 'psi'], ['ω', 'omega'],
  ['Γ', 'Gamma'], ['Δ', 'Delta'], ['Θ', 'Theta'], ['Λ', 'Lambda'], ['Ξ', 'Xi'], ['Π', 'Pi'], ['Σ', 'Sigma'], ['Υ', 'Upsilon'], ['Φ', 'Phi'], ['Ψ', 'Psi'], ['Ω', 'Omega'],
];
const TO_CMD = new Map(GREEK);
const FROM_CMD = new Map<string, string>([...GREEK.map(([c, n]) => [n, c] as [string, string]), ['epsilon', 'ε'], ['phi', 'φ']]);
/** Ctrl+G (SMath): letra latina para a grega correspondente. */
export const LATIN_TO_GREEK: Record<string, string> = {
  a: 'α', b: 'β', g: 'γ', d: 'δ', e: 'ε', z: 'ζ', h: 'η', q: 'θ', i: 'ι', k: 'κ', l: 'λ', m: 'μ', n: 'ν', x: 'ξ', p: 'π', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', f: 'φ', c: 'χ', y: 'ψ', w: 'ω',
  G: 'Γ', D: 'Δ', Q: 'Θ', L: 'Λ', X: 'Ξ', P: 'Π', S: 'Σ', U: 'Υ', F: 'Φ', Y: 'Ψ', W: 'Ω',
};
export const greekLatex = (ch: string) => (TO_CMD.has(ch) ? `\\${TO_CMD.get(ch)} ` : ch);

const chars = (s: string) => [...s].map((c) => (TO_CMD.has(c) ? `\\${TO_CMD.get(c)} ` : c === '%' ? '\\%' : c === '°' ? '\\degree ' : c === 'µ' ? '\\mu ' : c)).join('').trim();
/** Nome com índice reto: V_mp -> V_{\mathrm{mp}}. */
export function idLatex(name: string): string {
  const i = name.indexOf('_');
  return i <= 0 ? chars(name) : `${chars(name.slice(0, i))}_{\\mathrm{${chars(name.slice(i + 1))}}}`;
}

/** defined: variáveis e funções já definidas (motor); isUnit: unidade conhecida (math.js). B4, reconhecimento de unidades. */
/** before: nomes definidos ANTES desta linha na ordem de avaliação (o "=" inteligente do ADENDO 05, E2.1). */
export type LatexCtx = { defined?: Set<string>; params?: Set<string>; isUnit?: (name: string) => boolean; before?: (name: string) => boolean };

const unitTermLatex = (t: UnitTerm) => `\\mathrm{${chars(t.name)}}${t.exp ? `^{${t.exp}}` : ''}`;
/** Unidade em azul (classe u) e divisão sempre como fração (B3). */
export function unitLatex(u: Unit): string {
  const num = u.terms.filter((t) => !t.div).map(unitTermLatex).join('\\cdot ');
  const den = u.terms.filter((t) => t.div).map(unitTermLatex).join('\\cdot ');
  return `\\class{u}{${den ? `\\frac{${num || '1'}}{${den}}` : num}}`;
}

function numLatex(v: string) { return v.replace('.', '{,}'); }

export function nodeLatex(n: Node, ctx: LatexCtx = {}): string {
  const L = (c: Node) => nodeLatex(c, ctx);
  const strip = (c: Node) => (c.t === 'paren' ? c.a : c);
  const wrap = (c: Node, op: string, right: boolean) => (needParens(c, op, right) ? `\\left(${L(c)}\\right)` : L(c));
  switch (n.t) {
    case 'num': return numLatex(n.v);
    case 'id': {
      const user = ctx.defined?.has(n.name) || ctx.params?.has(n.name);
      if (n.name === 'i' && !user) return '\\mathbf{i}'; // unidade imaginária: negrito reto (ADENDO 05, E2.3)
      const known = !ctx.defined || user || n.name === 'pi' || n.name === 'e';
      return known ? idLatex(n.name) : `\\class{undef}{${idLatex(n.name)}}`;
    }
    case 'qty': {
      // "2 x" com x variável definida: mostra como variável; senão é unidade
      // 1) variável definida -> variável; 2) unidade conhecida -> unidade; 3) senão, variável não definida
      const single = n.u.terms.length === 1 && !n.u.one && !n.u.terms[0].exp ? n.u.terms[0].name : null;
      const asVar = single && (ctx.defined?.has(single) || ctx.params?.has(single));
      const unknown = single && !asVar && ctx.isUnit && !ctx.isUnit(single);
      return `${L(n.n)}\\,${asVar ? idLatex(single!) : unknown ? L({ t: 'id', name: single! }) : unitLatex(n.u)}`;
    }
    case 'neg': return `-${prec(n.a) < 4 ? `\\left(${L(n.a)}\\right)` : L(n.a)}`;
    case 'paren': return `\\left(${L(n.a)}\\right)`;
    case 'mat': return `\\begin{bmatrix}${n.rows.map((r) => r.map(L).join('&')).join('\\\\')}\\end{bmatrix}`;
    case 'call': {
      if (n.f === 'sqrt' && n.args.length === 1) return `\\sqrt{${L(strip(n.args[0]))}}`;
      if (n.f === 'abs' && n.args.length === 1) return `\\left\\lvert ${L(n.args[0])}\\right\\rvert`;
      const name = BUILTINS.has(n.f) ? `\\operatorname{${n.f}}` : idLatex(n.f);
      return `${name}(${n.args.map(L).join(';\\,')})`; // ΔV(L; I; S): ponto e vírgula separa argumentos (B4)
    }
    case 'bin': {
      if (n.op === '/') return `\\frac{${L(strip(n.a))}}{${L(strip(n.b))}}`;
      if (n.op === '^') return `${wrap(n.a, '^', false)}^{${L(strip(n.b))}}`;
      const a = wrap(n.a, n.op, false), b = wrap(n.b, n.op, true);
      const op = { '*': '\\cdot ', '+': '+', '-': '-', '<': '<', '>': '>', '<=': '\\le ', '>=': '\\ge ', '==': '=', '!=': '\\ne ' }[n.op] ?? n.op;
      return `${a}${op}${b}`;
    }
  }
}

const paramsOf = (lhs: Node) => new Set(lhs.t === 'call' ? lhs.args.flatMap((a) => (a.t === 'id' ? [a.name] : [])) : []);

const tgtLatex = (x: { unit?: Unit; conv?: Node }) => (x.unit ? `\\,${unitLatex(x.unit)}` : x.conv ? `\\,${nodeLatex(x.conv)}` : '');

export function lineToLatex(l: Line, ctx: LatexCtx = {}): string {
  if (l.kind === 'def') {
    const inner = { ...ctx, params: new Set([...(ctx.params ?? []), ...paramsOf(l.lhs)]) };
    const lhs = l.lhs.t === 'id' ? idLatex(l.lhs.name) : nodeLatex(l.lhs, { ...inner, defined: undefined });
    return `${lhs}\\;\\coloneq\\;${nodeLatex(l.rhs, inner)}${l.show ? `=?${tgtLatex(l)}` : ''}`;
  }
  if (l.kind === 'eval') return `${nodeLatex(l.expr, ctx)}=?${tgtLatex(l)}`;
  return nodeLatex(l.expr, ctx);
}

// ---------- LaTeX: leitura (o que o MathLive produz) ----------
type LTok = { k: 'cmd' | 'ch' | 'open' | 'close' | 'sup' | 'sub' | 'amp'; v: string };
const SPACES = new Set([',', ';', ':', '!', ' ', 'quad', 'qquad', 'thinspace', 'enspace']);

function llex(src: string): LTok[] {
  const out: LTok[] = [];
  for (let i = 0; i < src.length; ) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i))!;
      i += m[0].length;
      if (/^[a-zA-Z]/.test(m[1])) while (src[i] === ' ') i++;
      if (!SPACES.has(m[1])) out.push({ k: 'cmd', v: m[1] });
      continue;
    }
    i++;
    if (/\s|~/.test(c)) continue;
    out.push(c === '{' ? { k: 'open', v: c } : c === '}' ? { k: 'close', v: c } : c === '^' ? { k: 'sup', v: c } : c === '_' ? { k: 'sub', v: c } : c === '&' ? { k: 'amp', v: c } : { k: 'ch', v: c });
  }
  return out;
}

const isLetter = (t?: LTok) => !!t && ((t.k === 'ch' && /^[\p{L}°]$/u.test(t.v)) || (t.k === 'cmd' && (FROM_CMD.has(t.v) || t.v === 'degree' || t.v === 'mu')));
const letterOf = (t: LTok) => (t.k === 'ch' ? t.v : t.v === 'degree' ? '°' : FROM_CMD.get(t.v) ?? (t.v === 'mu' ? 'μ' : ''));
const isDigit = (t?: LTok) => t?.k === 'ch' && /^\d$/.test(t.v);
const OPS: Record<string, string> = { '+': '+', '-': '-', '−': '-', '*': '*', cdot: '*', times: '*', '/': '/', '<': '<', '>': '>', le: '<=', leq: '<=', ge: '>=', geq: '>=', ne: '!=', neq: '!=', lt: '<', gt: '>', '≤': '<=', '≥': '>=', '≠': '!=', '=': '==' };
const opOf = (t?: LTok) => (t ? OPS[t.v] : undefined);
const isColoneq = (t?: LTok) => !!t && ((t.k === 'cmd' && (t.v === 'coloneq' || t.v === 'coloneqq')) || (t.k === 'ch' && (t.v === '≔' || t.v === ':')));

class LatexParser {
  i = 0;
  constructor(private t: LTok[]) {}
  peek(o = 0) { return this.t[this.i + o]; }
  next() { return this.t[this.i++]; }
  atEnd() { return this.i >= this.t.length; }
  /** Conteúdo de {grupo} (ou um token só). */
  group(): LTok[] {
    const t = this.next();
    if (!t) return fail('Grupo esperado');
    if (t.k !== 'open') return [t];
    let depth = 1;
    const start = this.i;
    while (this.i < this.t.length) {
      const x = this.t[this.i++];
      if (x.k === 'open') depth++;
      else if (x.k === 'close' && --depth === 0) return this.t.slice(start, this.i - 1);
    }
    return fail('Chave sem fechamento');
  }
  sub(toks: LTok[]) { return new LatexParser(toks); }

  line(): Line {
    const e = this.expr();
    if (isColoneq(this.peek())) {
      if (this.peek()!.v === ':' && this.peek(1)?.v === '=') this.i++;
      this.i++;
      const rhs = this.expr();
      if (this.peek()?.v === '=' && this.peek(1)?.v === '?') {
        this.i += 2;
        return { kind: 'def', lhs: e, rhs, show: true, ...this.done(this.targetFrom()) };
      }
      return { kind: 'def', lhs: e, rhs: this.done(rhs) };
    }
    if (this.peek()?.v === '=' && this.peek(1)?.v === '?') {
      this.i += 2;
      return { kind: 'eval', expr: e, ...this.done(this.targetFrom()) };
    }
    return { kind: 'expr', expr: this.done(e) };
  }
  private done<T>(x: T): T { if (!this.atEnd()) fail('Expressão incompleta'); return x; }
  /** Depois de "=?": unidade ou expressão de conversão (E4.3). */
  targetFrom(): { unit?: Unit; conv?: Node } {
    if (this.atEnd()) return {};
    const save = this.i;
    try { const unit = this.unitFrom(); if (this.atEnd()) return { unit }; } catch { /* não é unidade */ }
    this.i = save;
    return { conv: this.expr() };
  }

  expr(): Node {
    const a = this.add();
    const op = opOf(this.peek());
    if (op && PREC[op] === 1 && !(this.peek()!.v === '=' && this.peek(1)?.v === '?')) { this.i++; return { t: 'bin', op, a, b: this.add() }; }
    return a;
  }
  private add(): Node {
    let a = this.mul();
    for (let op = opOf(this.peek()); op === '+' || op === '-'; op = opOf(this.peek())) { this.i++; a = { t: 'bin', op, a, b: this.mul() }; }
    return a;
  }
  private startsAtom(t?: LTok) {
    if (!t) return false;
    if (t.k === 'close' || t.k === 'amp' || t.k === 'sup' || t.k === 'sub') return false;
    if (opOf(t) || isColoneq(t)) return false;
    if (t.k === 'ch' && (t.v === ')' || t.v === ']' || t.v === '|' || t.v === ',' || t.v === ';' || t.v === '?')) return false;
    if (t.k === 'cmd' && ['right', 'end', '\\'].includes(t.v)) return false;
    return true;
  }
  private mul(): Node {
    let a = this.unary();
    for (;;) {
      const op = opOf(this.peek());
      if (op === '*' || op === '/') { this.i++; a = { t: 'bin', op, a, b: this.unary() }; continue; }
      if (this.startsAtom(this.peek())) { a = { t: 'bin', op: '*', a, b: this.unary() }; continue; } // justaposição: 2(x+1)
      return a;
    }
  }
  private unary(): Node {
    if (opOf(this.peek()) === '-') { this.i++; return { t: 'neg', a: this.unary() }; }
    let a = this.atom();
    while (this.peek()?.k === 'sup') { this.i++; a = { t: 'bin', op: '^', a, b: this.sub(this.group()).exprAll() }; }
    return a;
  }
  exprAll(): Node { const e = this.expr(); return this.done(e); }

  /** Nome: letras seguidas (ΔV, HSP), com índice opcional (_{mp}). */
  private name(): string {
    let s = '';
    for (;;) {
      const t = this.peek();
      if (isLetter(t)) { s += letterOf(this.next()); continue; }
      if (t?.k === 'cmd' && (t.v === 'mathrm' || t.v === 'operatorname' || t.v === 'text' || t.v === 'mathit')) { this.i++; s += this.sub(this.group()).plain(); continue; }
      break;
    }
    if (this.peek()?.k === 'sub') { this.i++; s += `_${this.sub(this.group()).plain()}`; }
    return s;
  }
  /** Texto de um grupo (índice, \mathrm{...}): letras, dígitos e gregas. */
  plain(): string {
    let s = '';
    while (!this.atEnd()) {
      const t = this.next();
      if (t.k === 'ch') s += t.v;
      else if (t.k === 'cmd' && (t.v === 'mathrm' || t.v === 'text' || t.v === 'operatorname')) s += this.sub(this.group()).plain();
      else if (t.k === 'cmd' && FROM_CMD.has(t.v)) s += FROM_CMD.get(t.v);
      else if (t.k === 'cmd' && t.v === 'degree') s += '°';
      else if (t.k === 'cmd' && t.v === '%') s += '%';
      else if (t.k === 'open' || t.k === 'close') continue;
      else fail(`Inesperado no nome: \\${t.v}`);
    }
    return s;
  }
  /** Unidade a partir daqui: \class{u}{...}, \unit{...}, ou letras (4mm^2 digitado sem classificação). */
  unitFrom(): Unit {
    const t = this.peek();
    if (t?.k === 'cmd' && t.v === 'class') { this.i++; this.group(); return this.unitPow(this.sub(this.group()).unitBody()); }
    if (t?.k === 'cmd' && t.v === 'unit') { this.i++; return this.unitPow(this.sub(this.group()).unitBody()); }
    return this.unitBody(true);
  }
  /** Expoente digitado fora do grupo da unidade: \class{u}{\mathrm{mm}}^{2}. */
  private unitPow(u: Unit): Unit {
    if (this.peek()?.k === 'sup' && u.terms.length) { this.i++; u.terms[u.terms.length - 1].exp = this.sub(this.group()).plain(); }
    return u;
  }
  unitBody(stopAtOps = false): Unit {
    const u: Unit = { one: false, terms: [] };
    const term = (div: boolean) => {
      const t = this.peek();
      let name = '';
      if (t?.k === 'cmd' && t.v === '%') { this.i++; name = '%'; }
      else if (t?.k === 'cmd' && t.v === 'mathrm') { this.i++; name = this.sub(this.group()).plain(); }
      else while (isLetter(this.peek())) name += letterOf(this.next());
      if (!name) fail('Unidade esperada');
      const tt: UnitTerm = { name, div };
      if (this.peek()?.k === 'sup') { this.i++; tt.exp = this.sub(this.group()).plain(); }
      u.terms.push(tt);
    };
    const t = this.peek();
    if (t?.k === 'cmd' && t.v === 'frac') {
      this.i++;
      const num = this.sub(this.group()).unitBody();
      const den = this.sub(this.group()).unitBody();
      if (num.terms.length === 0) u.one = true;
      u.terms.push(...num.terms, ...den.terms.map((x) => ({ ...x, div: !x.div })));
      return u;
    }
    if (isDigit(t) && t!.v === '1' && this.peek(1)?.v === '/') { this.i += 2; u.one = true; term(true); }
    else if (isDigit(t) && t!.v === '1' && this.t.length === 1) { this.i++; return u; } // numerador "1" de \frac{1}{°C}
    else term(false);
    if (stopAtOps) return u;
    for (;;) {
      const op = opOf(this.peek());
      if (op === '*' || op === '/') { this.i++; term(op === '/'); continue; }
      if (isLetter(this.peek()) || this.peek()?.v === 'mathrm') { term(false); continue; }
      return u;
    }
  }

  private atom(): Node {
    const t = this.peek();
    if (!t) return fail('Expressão incompleta');
    if (t.k === 'cmd' && t.v === 'placeholder') return fail('Expressão incompleta');
    // número: 11,5 / 11.5 / 11{,}5, opcionalmente seguido de unidade
    if (isDigit(t) || (t.k === 'ch' && t.v === '.')) {
      let v = '';
      for (;;) {
        const x = this.peek();
        if (isDigit(x)) { v += this.next().v; continue; }
        if ((x?.v === '.' || x?.v === ',') && isDigit(this.peek(1))) { this.i++; v += '.'; continue; }
        if (x?.k === 'open' && this.peek(1)?.v === ',' && this.peek(2)?.k === 'close' && isDigit(this.peek(3))) { this.i += 3; v += '.'; continue; }
        break;
      }
      const n: Node = { t: 'num', v };
      const nx = this.peek();
      const unitNext = (nx?.k === 'cmd' && (nx.v === 'class' || nx.v === 'unit' || nx.v === '%' || nx.v === 'degree' || nx.v === 'mathrm' || FROM_CMD.has(nx.v))) || (nx?.k === 'ch' && /^[\p{L}°]$/u.test(nx.v));
      if (unitNext) {
        const save = this.i;
        const nameAhead = isLetter(nx) ? this.sub(this.t.slice(this.i)).nameLen() : 0;
        // letras seguidas de "(" são chamada de função (2 f(x)), não unidade
        if (!(nameAhead && (this.t[this.i + nameAhead]?.v === '(' || (this.t[this.i + nameAhead]?.v === 'left')))) {
          try { return { t: 'qty', n, u: this.unitFrom() }; } catch { this.i = save; }
        }
      }
      return n;
    }
    if (t.k === 'cmd') {
      switch (t.v) {
        case 'frac': { this.i++; const a = this.sub(this.group()).exprAll(); const b = this.sub(this.group()).exprAll(); return { t: 'bin', op: '/', a, b }; }
        case 'sqrt': { this.i++; return { t: 'call', f: 'sqrt', args: [this.sub(this.group()).exprAll()] }; }
        case 'class': {
          this.i++;
          const cls = this.sub(this.group()).plain();
          const body = this.group();
          if (cls === 'u') { const u = this.unitPow(this.sub(body).unitBody()); return u.terms.length === 1 && !u.terms[0].exp ? { t: 'id', name: u.terms[0].name } : fail('Unidade sem número'); }
          return this.sub(body).exprAll();
        }
        case 'left': return this.fence();
        case 'lvert': case 'vert': { this.i++; const a = this.until((x) => x.k === 'cmd' && (x.v === 'rvert' || x.v === 'vert')); return { t: 'call', f: 'abs', args: [a] }; }
        case 'begin': {
          this.i++;
          this.group();
          const rows: Node[][] = [[]];
          let cell: LTok[] = [];
          const push = () => { if (cell.length) rows[rows.length - 1].push(this.sub(cell).exprAll()); cell = []; };
          while (!this.atEnd()) {
            const x = this.next();
            if (x.k === 'cmd' && x.v === 'end') { this.group(); break; }
            if (x.k === 'amp') { push(); continue; }
            if (x.k === 'cmd' && x.v === '\\') { push(); rows.push([]); continue; }
            cell.push(x);
          }
          push();
          return { t: 'mat', rows: rows.filter((r) => r.length) };
        }
      }
      if (isLetter(t) || ['mathrm', 'operatorname', 'mathit', 'text'].includes(t.v)) return this.named();
      if (['sin', 'cos', 'tan', 'ln', 'log', 'exp', 'min', 'max', 'det', 'arcsin', 'arccos', 'arctan'].includes(t.v)) {
        this.i++;
        const f = t.v.replace(/^arc/, 'a');
        return this.callArgs(f);
      }
      return fail(`Comando não suportado: \\${t.v}`);
    }
    if (isLetter(t)) return this.named();
    if (t.k === 'ch' && t.v === '(') { this.i++; const a = this.until((x) => x.k === 'ch' && x.v === ')'); return { t: 'paren', a }; }
    if (t.k === 'ch' && t.v === '|') { this.i++; const a = this.until((x) => x.k === 'ch' && x.v === '|'); return { t: 'call', f: 'abs', args: [a] }; }
    if (t.k === 'open') return this.sub(this.group()).exprAll();
    return fail(`Inesperado: ${t.v}`);
  }
  nameLen(): number { const s = this.i; this.name(); return this.i - s; }
  private named(): Node {
    const n = this.name();
    const nx = this.peek();
    if ((nx?.k === 'ch' && nx.v === '(') || (nx?.k === 'cmd' && nx.v === 'left' && this.peek(1)?.v === '(')) return this.callArgs(n);
    return { t: 'id', name: n };
  }
  private callArgs(f: string): Node {
    const open = this.next();
    if (open.k === 'cmd' && open.v === 'left') this.next();
    const isClose = (x: LTok) => (x.k === 'ch' && x.v === ')') || (x.k === 'cmd' && x.v === 'right');
    const toks: LTok[] = [];
    let depth = 0;
    while (!this.atEnd()) {
      const x = this.next();
      if ((x.k === 'cmd' && x.v === 'left') || (x.k === 'ch' && x.v === '(')) depth++;
      if (isClose(x)) { if (depth === 0) { if (x.k === 'cmd') this.next(); break; } depth--; }
      toks.push(x);
    }
    // argumentos separados por ";" (tela) ou "," fora de número
    const args: LTok[][] = [[]];
    let d = 0;
    toks.forEach((x, k) => {
      if (x.k === 'open' || (x.k === 'cmd' && x.v === 'left') || (x.k === 'ch' && x.v === '(')) d++;
      if (x.k === 'close' || (x.k === 'cmd' && x.v === 'right') || (x.k === 'ch' && x.v === ')')) d--;
      const sepComma = x.v === ',' && !(isDigit(toks[k - 1]) && isDigit(toks[k + 1]));
      if (d === 0 && x.k === 'ch' && (x.v === ';' || sepComma)) args.push([]); else args[args.length - 1].push(x);
    });
    return { t: 'call', f, args: args.filter((a) => a.length).map((a) => this.sub(a).exprAll()) };
  }
  private fence(): Node {
    this.i++; // \left
    const open = this.next();
    if (open.v === 'lvert' || open.v === '|' || open.v === 'vert') { const a = this.until((x) => x.k === 'cmd' && x.v === 'right', true); return { t: 'call', f: 'abs', args: [a] }; }
    const a = this.until((x) => x.k === 'cmd' && x.v === 'right', true);
    return { t: 'paren', a };
  }
  /** Lê até o fechamento (respeitando aninhamento de \left/\right) e devolve a expressão interna. */
  private until(isEnd: (t: LTok) => boolean, rightCmd = false): Node {
    const toks: LTok[] = [];
    let depth = 0;
    while (!this.atEnd()) {
      const x = this.next();
      if (rightCmd && x.k === 'cmd' && x.v === 'left') depth++;
      if (isEnd(x)) {
        if (depth === 0) { if (rightCmd) this.next(); return this.sub(toks).exprAll(); }
        depth--;
      }
      toks.push(x);
    }
    return fail('Parêntese sem fechamento');
  }
}

export const latexToLine = (latex: string): Line => new LatexParser(llex(latex)).line();
/** Unidade digitada no campo do marcador (B5): "mV", "\%", "\mathrm{kWh}". */
/** Conversão digitada no marcador (E4.3): unidade ou, se não for, expressão ("10^{-6}"). */
export function latexToTarget(latex: string): { unit?: Unit; conv?: Node } {
  const p = new LatexParser(llex(latex));
  const t = p.targetFrom();
  if (!p.atEnd()) fail('Conversão inválida');
  return t;
}
export function latexToUnit(latex: string): Unit {
  const p = new LatexParser(llex(latex));
  const u = p.unitFrom();
  if (!p.atEnd()) fail('Unidade inválida');
  return u;
}

// ---------- API ----------
export const toLatex = (linear: string, ctx?: LatexCtx) => lineToLatex(parseLinear(linear), ctx);
export const toLinear = (latex: string) => lineToLinear(latexToLine(latex));

/** Separa "# comentário" do fim da linha. */
export function splitComment(raw: string): [string, string] {
  const i = raw.indexOf('#');
  return i < 0 ? [raw, ''] : [raw.slice(0, i), raw.slice(i)];
}

/** Unidade do math.js ("(ohm mm^2) / m", "kWh") para a forma do arquivo ("Ω*mm^2/m"). */
export function unitFromMathjs(u: string): string {
  return u.replace(/[()]/g, '').replace(/\s*\/\s*/g, '/').trim().replace(/\s+/g, '*').replace(/ohm/g, 'Ω').replace(/degC/g, '°C').replace(/degF/g, '°F');
}
