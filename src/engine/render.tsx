// Desenha uma expressão como no protótipo: variáveis em itálico com índice, números e unidades retos, frações empilhadas.
import type { ReactNode } from 'react';
import type { MathNode } from 'mathjs';
import { math } from './math';
import { prettyUnit } from './format';

type Ctx = { user: Set<string>; sep: string };

const isUnitName = (name: string, ctx: Ctx) => !ctx.user.has(name) && math.Unit.isValuelessUnit(name);

/** Só unidades (e números) abaixo deste nó: "mm^2/m" fica em linha, sem fração empilhada. */
function unitOnly(n: MathNode, ctx: Ctx): boolean {
  if (math.isSymbolNode(n)) return isUnitName(n.name, ctx);
  if (math.isOperatorNode(n) && ['*', '/', '^'].includes(n.op)) return n.args.every((a) => unitOnly(a, ctx) || (math.isConstantNode(a) && n.op === '^'));
  if (math.isParenthesisNode(n)) return unitOnly(n.content, ctx);
  return false;
}

function unitText(n: MathNode): string {
  return prettyUnit(n.toString({ implicit: 'hide' }).replace(/\s*\^\s*/g, '^').replace(/\s*\*\s*/g, ' '));
}

export function Variable({ name }: { name: string }) {
  const i = name.indexOf('_');
  if (i <= 0) return <span className="v">{name}</span>;
  return <><span className="v">{name.slice(0, i)}</span><sub>{name.slice(i + 1)}</sub></>;
}

const OPS: Record<string, string> = { '+': ' + ', '-': ' − ', '<': ' < ', '<=': ' ≤ ', '>': ' > ', '>=': ' ≥ ', '==': ' = ', '!=': ' ≠ ', to: ' em ', mod: ' mod ' };

function r(n: MathNode, ctx: Ctx): ReactNode {
  if (unitOnly(n, ctx)) return <span className="u">{unitText(n)}</span>;
  if (math.isConstantNode(n)) return typeof n.value === 'number' ? String(n.value).replace('.', ctx.sep) : String(n.value);
  if (math.isSymbolNode(n)) return <Variable name={n.name} />;
  if (math.isParenthesisNode(n)) return <>({r(n.content, ctx)})</>;
  if (math.isFunctionNode(n)) {
    const name = n.fn.toString();
    return <>{ctx.user.has(name) ? <Variable name={name} /> : <span>{name}</span>}({n.args.map((a, i) => <span key={i}>{i > 0 && ', '}{r(a, ctx)}</span>)})</>;
  }
  if (math.isAssignmentNode(n)) {
    const name = math.isSymbolNode(n.object) ? n.object.name : '';
    return <>{name ? <Variable name={name} /> : r(n.object, ctx)}<span className="op"> ≔ </span>{r(n.value, ctx)}</>;
  }
  if (math.isFunctionAssignmentNode(n)) {
    const inner = { ...ctx, user: new Set([...ctx.user, n.name, ...n.params]) }; // L e S são parâmetros, não litro e siemens
    return <><Variable name={n.name} />({n.params.map((p, i) => <span key={p}>{i > 0 && ', '}<Variable name={p} /></span>)})<span className="op"> ≔ </span>{r(n.expr, inner)}</>;
  }
  if (math.isOperatorNode(n)) {
    const [a, b] = n.args;
    const strip = (x: MathNode) => (math.isParenthesisNode(x) ? x.content : x);
    if (n.args.length === 1) return (n.op as string) === '%' ? <>{r(a, ctx)} %</> : <>{n.op === '-' ? '−' : n.op}{r(a, ctx)}</>;
    if (n.op === '/') {
      if ((n as unknown as { isPercentage?: boolean }).isPercentage) return <>{r(a, ctx)} %</>; // "1 %" vira 1/100 no math.js
      if (unitOnly(b, ctx)) return <>{r(a, ctx)}/{r(b, ctx)}</>; // "5,4 h/dia", "Ω·mm²/m"
      return <span className="fr"><span>{r(strip(a), ctx)}</span><span>{r(strip(b), ctx)}</span></span>;
    }
    if (n.op === '^') return <>{r(a, ctx)}<sup>{r(strip(b), ctx)}</sup></>;
    if (n.op === '*') {
      // número e unidade: espaço ("25 m"); unidade seguida de unidade: "Ω·mm²"; o resto: " · "
      const sepr = unitOnly(b, ctx) ? (math.isConstantNode(a) ? ' ' : '·') : ' · ';
      return <>{r(a, ctx)}{sepr}{r(b, ctx)}</>;
    }
    return <>{r(a, ctx)}{OPS[n.op] ?? ` ${n.op} `}{r(b, ctx)}</>;
  }
  return n.toString();
}

/** Expressão math.js como matemática. Se não der para analisar, mostra o texto como está. */
export function MathView({ src, user, sep = ',' }: { src: string; user: Set<string>; sep?: string }) {
  let node: MathNode;
  try { node = math.parse(src); } catch { return <span className="mono">{src}</span>; }
  return <>{r(node, { user, sep })}</>;
}
