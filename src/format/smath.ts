// Importa arquivos do SMath Studio (.sm) para folha livre .prsf (ADENDO 05, E7).
// Puro (sem disco): quem chama grava o .prsf e as imagens. O .sm original nunca é alterado.
import { nodeToLinear, parseUnit, unitToLinear, type Node, type Unit } from './mathlinear';

// ---------- XML mínimo (o .sm é XML bem-formado, sem DTD) ----------
export type X = { tag: string; attrs: Record<string, string>; children: X[]; text: string; start: number; end: number };
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s: string) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m);

export function parseXml(src: string): X {
  const root: X = { tag: '#root', attrs: {}, children: [], text: '', start: 0, end: src.length };
  const stack = [root];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  for (const m of src.matchAll(re)) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) { top.end = m.index! + m[0].length; stack.pop(); }
    else if (m[3]) {
      const el: X = { tag: m[3], attrs: {}, children: [], text: '', start: m.index!, end: m.index! + m[0].length };
      for (const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) el.attrs[a[1]] = unesc(a[2] ?? a[3]);
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] !== undefined) top.text += unesc(m[6]);
  }
  return root;
}
const kid = (x: X | undefined, tag: string) => x?.children.find((c) => c.tag === tag);
const kids = (x: X | undefined, tag: string) => x?.children.filter((c) => c.tag === tag) ?? [];
const deep = (x: X, tag: string): X | undefined => (x.tag === tag ? x : x.children.reduce<X | undefined>((f, c) => f ?? deep(c, tag), undefined));

// ---------- nomes e expressões ----------
/** S.trafo -> S_trafo; Relação.invest.Lucro -> Relação_invest.Lucro (só o primeiro ponto vira índice, E7.1). */
export const smName = (n: string) => n.replace('.', '_');
/** Funções que vêm de plugins do SMath sem equivalente no Prisma (E7.1). */
export const PLUGIN = /^excel_/;

type E = { type: string; args: number; style?: string; v: string };
const toks = (x: X | undefined): E[] => kids(x, 'e').map((e) => ({ type: e.attrs.type, args: Number(e.attrs.args ?? 0), style: e.attrs.style, v: e.text.trim() }));

/** Unidade (style="unit") como no arquivo do Prisma; o SMath usa Ω, ohm, volt, deg... */
const unitName = (v: string) => (v === '°' ? 'deg' : v);

export type Rpn = { node: Node; funcs: string[]; ids: string[] };
/** Notação polonesa reversa do SMath -> árvore do Prisma. Operando com style="unit" junto de número vira grandeza (5 kV). */
export function fromRpn(es: E[]): Rpn {
  const st: (Node & { unit?: boolean })[] = [];
  const funcs: string[] = [];
  const ids: string[] = [];
  const pop = () => { const n = st.pop(); if (!n) throw new Error('expressão incompleta'); return n; };
  const asUnit = (n: Node & { unit?: boolean }): Unit | null => (n.unit && n.t === 'id' ? parseUnit(n.name) : null);
  for (const e of es) {
    if (e.type === 'operand') {
      if (e.style === 'string') st.push({ t: 'str', v: e.v } as Node);
      else if (e.style === 'unit') st.push({ t: 'id', name: unitName(e.v), unit: true });
      else if (/^[\d.]/.test(e.v)) st.push({ t: 'num', v: e.v });
      else { const name = smName(e.v); ids.push(name); st.push({ t: 'id', name }); }
    } else if (e.type === 'operator') {
      if (e.args === 1) {
        if (e.v !== '-') throw new Error(`operador ${e.v}`);
        st.push({ t: 'neg', a: pop() });
        continue;
      }
      const b = pop(), a = pop();
      if (e.v === ':') { st.push({ t: 'bin', op: ':=', a, b }); continue; }
      if (!['+', '-', '*', '/', '^'].includes(e.v)) throw new Error(`operador ${e.v}`);
      // 5 kV, 5 kV·A, 10 A/m: número (ou grandeza) vezes/por unidade vira grandeza
      const ub = asUnit(b);
      if (ub && (e.v === '*' || e.v === '/') && (a.t === 'num' || a.t === 'qty')) {
        const left = a.t === 'qty' ? unitToLinear(a.u) : '';
        const right = unitToLinear(ub);
        const u = parseUnit(left ? `${left}${e.v}${right}` : e.v === '/' ? `1/${right}` : right);
        st.push({ t: 'qty', n: a.t === 'qty' ? a.n : a, u });
        continue;
      }
      st.push({ t: 'bin', op: e.v, a, b });
    } else if (e.type === 'function') {
      const args = Array.from({ length: e.args }, pop).reverse();
      const f = smName(e.v);
      if (f === 'el' && args.length >= 2) { st.push({ t: 'idx', a: args[0], i: args.slice(1) } as Node); continue; } // el(v; i) -> v[i] (E7.1)
      funcs.push(f);
      st.push({ t: 'call', f, args });
    } else if (e.type === 'bracket') st.push({ t: 'paren', a: pop() });
    else throw new Error(`elemento ${e.type}`);
  }
  if (st.length !== 1) throw new Error('expressão com sobras');
  return { node: st[0], funcs, ids };
}

/** O que uma expressão define (x :=, f(a) :=, v[i] := dentro de for) e os nomes livres que ela usa. */
function scopeOf(node: Node): { defines: string[]; free: string[] } {
  const defines: string[] = [];
  const free = new Set<string>();
  const walk = (n: Node, bound: Set<string>) => {
    switch (n.t) {
      case 'id': if (!bound.has(n.name)) free.add(n.name); return;
      case 'qty': walk(n.n, bound); return;
      case 'neg': case 'paren': walk(n.a, bound); return;
      case 'idx': walk(n.a, bound); n.i.forEach((x) => walk(x, bound)); return;
      case 'mat': n.rows.flat().forEach((x) => walk(x, bound)); return;
      case 'call':
        if (n.f === 'for' && n.args[0]?.t === 'id') { const b = new Set(bound).add(n.args[0].name); n.args.slice(1).forEach((x) => walk(x, b)); return; }
        n.args.forEach((x) => walk(x, bound)); return;
      case 'bin':
        if (n.op === ':=') {
          const lhs = n.a;
          if (lhs.t === 'id') { defines.push(lhs.name); walk(n.b, bound); return; }
          if (lhs.t === 'idx' && lhs.a.t === 'id') { defines.push(lhs.a.name); lhs.i.forEach((x) => walk(x, bound)); walk(n.b, bound); return; }
          if (lhs.t === 'call') { defines.push(lhs.f); const b = new Set(bound); lhs.args.forEach((x) => x.t === 'id' && b.add(x.name)); walk(n.b, b); return; }
        }
        walk(n.a, bound); walk(n.b, bound); return;
      default: return;
    }
  };
  walk(node, new Set());
  return { defines, free: [...free] };
}

// ---------- importação ----------
export type SmResult = { id: string; expected: string; conv?: string; defines?: string; uses: string[]; plugin: boolean; disabled?: boolean };
export type SmImport = {
  text: string; // a folha .prsf
  regions: number; // <region> do .sm
  blocks: number; // blocos gerados (inclui fim-area criado para área sem terminador)
  synthetic: number; // fim-area criados
  unsupported: { id: string; reason: string }[];
  math: { id: string; defines: string[]; uses: string[]; plugin: boolean }[]; // toda região de cálculo, na ordem do arquivo (uses: nomes livres e funções chamadas)
  results: SmResult[]; // regiões com resultado guardado pelo SMath (para conferir)
  images: { path: string; base64: string }[];
};

const fence = '```';
const q = (s: string) => `"${s.replace(/"/g, "'").replace(/\s+/g, ' ').trim()}"`;
const paras = (x: X | undefined) => kids(kid(x, 'content'), 'p').map((p) => inline(p).trim()).filter(Boolean);
function inline(x: X): string {
  const inner = x.children.map(inline).join('');
  const t = x.text + inner;
  if (x.tag === 'strong' || x.tag === 'b') return `**${t}**`;
  if (x.tag === 'em' || x.tag === 'i') return `*${t}*`;
  return t;
}

export function importSm(xml: string, nome: string): SmImport {
  const doc = parseXml(xml);
  const ws = kid(doc, 'worksheet');
  if (!ws) throw new Error('Não é um arquivo do SMath Studio (falta <worksheet>)');
  const settings = kid(ws, 'settings');
  const ppi = Number(settings?.attrs.ppi) || 96;
  const px = (v: string | undefined) => Math.round((Number(v) || 0) * 96 / ppi);
  const calc = kid(settings, 'calculation');
  const cv = (t: string) => kid(calc, t)?.text.trim();
  const out: string[] = [];
  const res: SmImport = { text: '', regions: 0, blocks: 0, synthetic: 0, unsupported: [], math: [], results: [], images: [] };
  let n = 0;
  let maxY = 0, maxX = 0;
  const block = (type: string, attrs: string, body: string) => {
    res.blocks++;
    out.push(`${fence}${type} {${attrs}}\n${body}${body && !body.endsWith('\n') ? '\n' : ''}${fence}\n`);
  };

  const region = (r: X) => {
    res.regions++;
    const id = `r${++n}`;
    const x = px(r.attrs.left), y = px(r.attrs.top);
    maxY = Math.max(maxY, y + px(r.attrs.height));
    maxX = Math.max(maxX, x + px(r.attrs.width));
    const pos = `#${id} x=${x} y=${y}`;
    const raw = xml.slice(r.start, r.end);
    const unsupported = (reason: string) => {
      res.unsupported.push({ id, reason });
      block('smath-original', `${pos} desativado moldura descricao=${q(`Não suportado: ${reason}`)}`, raw.replace(/```/g, "'''"));
    };
    const area = kid(r, 'area');
    if (area) {
      if (area.attrs.terminator === 'true') { block('fim-area', `#${id} y=${y}`, ''); return; } // fim de área solto
      const titulo = paras(kid(area, 'title')).join(' ') || 'Área';
      block('area', `#${id} titulo=${q(titulo)} y=${y}${area.attrs.collapsed === 'true' ? ' recolhida' : ''}`, '');
      let closed = false;
      let bottom = y + 20;
      for (const c of kids(r, 'region')) {
        if (kid(c, 'area')?.attrs.terminator === 'true') { res.regions++; n++; block('fim-area', `#${id} y=${px(c.attrs.top)}`, ''); closed = true; continue; }
        region(c);
        bottom = Math.max(bottom, px(c.attrs.top) + px(c.attrs.height) + 10);
      }
      if (!closed) { res.synthetic++; block('fim-area', `#${id} y=${bottom}`, ''); }
      return;
    }
    const math = kid(r, 'math');
    if (math) {
      const desc = deep(math, 'description');
      const extra = [
        math.attrs.evaluate === 'false' ? 'desativado' : '',
        r.attrs.border === 'true' ? 'moldura' : '',
        math.attrs.decimalPlaces ? `casas=${math.attrs.decimalPlaces}` : '',
        math.attrs.significantDigitsMode ? `modo=${math.attrs.significantDigitsMode === 'true' ? 'significativos' : 'decimais'}` : '',
        math.attrs.trailingZeros ? `zeros_a_direita=${math.attrs.trailingZeros === 'true' ? 'sim' : 'nao'}` : '',
        desc && desc.attrs.active === 'true' ? `descricao=${q(paras(desc).join(' '))}` : '',
      ].filter(Boolean).join(' ');
      let input: Rpn;
      try { input = fromRpn(toks(kid(math, 'input'))); } catch (e) { return unsupported(`expressão (${(e as Error).message})`); }
      const plugin = input.funcs.find((f) => PLUGIN.test(f));
      const { defines, free } = scopeOf(input.node);
      res.math.push({ id, defines, uses: [...free, ...input.funcs], plugin: !!plugin });
      if (plugin) return unsupported(`${plugin} (plugin do SMath)`);
      const result = kid(math, 'result');
      const contract = kid(math, 'contract');
      let conv = '';
      if (contract) { try { conv = nodeToLinear(fromRpn(toks(contract)).node); } catch { /* sem conversão */ } }
      const node = input.node;
      const isDef = node.t === 'bin' && node.op === ':=';
      const lhs = isDef ? nodeToLinear(node.a) : '';
      const body = isDef ? `${lhs} := ${nodeToLinear(node.b)}` : nodeToLinear(node);
      const show = result ? ` = ?${conv ? ` ${conv}` : ''}` : '';
      block('calc', `${pos}${extra ? ` ${extra}` : ''}`, `${body}${show}`);
      if (result) {
        let expected = '';
        try { expected = nodeToLinear(fromRpn(toks(result)).node); } catch { /* resultado ilegível */ }
        res.results.push({ id, expected, conv: conv || undefined, defines: isDef ? lhs.replace(/\(.*$/, '') : undefined, uses: input.ids, plugin: false, disabled: math.attrs.evaluate === 'false' || undefined });
      }
      return;
    }
    const text = kid(r, 'text');
    if (text) { block('texto', pos, paras(text).join('\n\n') || ' '); return; }
    const image = kid(r, 'image');
    const picture = kid(r, 'picture');
    if (image || picture) {
      const file = kid(image, 'imagefile');
      const b64 = (file ?? kid(picture, 'raw'))?.text.replace(/\s+/g, '') ?? '';
      const ext = (file?.attrs.renderExt ?? `.${kid(picture, 'raw')?.attrs.format ?? 'png'}`).replace(/^\.?/, '.');
      const fname = (file?.attrs.filename ?? `imagem-${id}${ext}`).replace(/[\\/:*?"<>|]/g, '_');
      const path = `${nome}_arquivos/${fname}`;
      if (b64) res.images.push({ path, base64: b64 });
      block('imagem', `${pos} largura=${px(r.attrs.width)} altura=${px(r.attrs.height)}`, path);
      return;
    }
    const table = kid(r, 'table');
    if (table) {
      const inputs = kids(kid(table, 'inputs'), 'e').filter((e) => e.attrs.regions === 'columns').map((e) => smName(e.text.trim()));
      block('tabela', `${pos} desativado`, `origem: smath\nentradas: [${inputs.join(', ')}]`);
      return;
    }
    const plot = kid(r, 'xyplot');
    if (plot) {
      const ax = (t: string) => kid(plot, t)?.attrs ?? {};
      const lab = ax('xylabel');
      block('grafico', `${pos} largura=${px(plot.attrs.width)} altura=${px(plot.attrs.height)}`,
        `origem: smath\ntitulo: ${q(kid(plot, 'title2d')?.attrs.title ?? '')}\nx: {min: ${ax('xaxes').xmin ?? 0}, max: ${ax('xaxes').xmax ?? 1}, rotulo: ${q(lab.xlabel ?? '')}}\ny: {min: ${ax('yaxes').ymin ?? 0}, max: ${ax('yaxes').ymax ?? 1}, rotulo: ${q(lab.ylabel ?? '')}}\nseries: ${kids(kid(plot, 'traces'), 'trace').length}`);
      return;
    }
    unsupported(`${r.children[0]?.tag ?? 'região'} (região do SMath sem equivalente)`);
  };

  for (const r of kids(kid(ws, 'regions'), 'region')) region(r);

  const sig = cv('significantDigitsMode') === 'true';
  const head = [
    '---', 'tipo: folha', `titulo: ${q(nome)}`, 'bibliotecas: []',
    `pagina: {largura: ${Math.max(1200, maxX + 200)}, altura: ${Math.max(1600, maxY + 200)}, grade: 20}`,
    `exibicao: {casas: ${Number(cv('precision')) || 4}, modo: ${sig ? 'significativos' : 'decimais'}, zeros_a_direita: ${cv('trailingZeros') === 'true'}, limite_exponencial: ${Number(cv('exponentialThreshold')) || 5}}`,
    `origem: ${q(`${nome}.sm`)}`, 'versao_formato: 1', '---', '',
  ].join('\n');
  res.text = `${head}\n${out.join('\n')}`;
  return res;
}
