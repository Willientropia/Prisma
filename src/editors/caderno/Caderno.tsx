// Caderno (SPEC 7.1 + ADENDO 02, B7): texto formatado (TipTap) e blocos com uma linha MathLive por linha de cálculo.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PanelHeader, PropGrid, Row, Tag } from '../../components/ui';
import { blocks, lines, parse, type BlockSegment } from '../../format/doc';
import { outline, type OutlineItem } from '../../format/views';
import { dirname, displayPath } from '../../format/display';
import { recalc } from '../../engine/run';
import type { LineResult } from '../../engine/evaluate';
import { register } from '../../commands/registry';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import { LeftPanel } from '../../shell/ProjectPanel';
import { MathLine, isKnownUnit } from '../../math/MathLine';
import { holdKeys } from '../../math/MathField';
import { TextEditor } from '../TextEditor';
import { SourceView } from '../SourceView';
import s from '../editors.module.css';

export const BLOCK_LABEL: Record<string, string> = {
  funcao: 'Função', calc: 'Cálculo', verificar: 'Verificação', grafico: 'Gráfico', tabela: 'Tabela', texto: 'Texto', teste: 'Teste',
};
export const blockLabel = (t: string) => BLOCK_LABEL[t] ?? (t || 'Bloco');

export function blockProps(b: BlockSegment): [string, string][] {
  return [['Tipo', blockLabel(b.type)], ['Id', b.id ? `#${b.id}` : 'sem id'], ...Object.entries(b.attrs)];
}

type BlockItem = Extract<OutlineItem, { kind: 'block' }>;
type Focus = { key: string; line: number } | null;
const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const SINGLE_LINE = new Set(['funcao', 'verificar']); // B7: uma linha só

function props(it: OutlineItem, r: LineResult[] | undefined): [string, string][] {
  if (it.kind === 'text') return it.tag === 'TIT' ? [['Tipo', 'Título'], ['Nível', String(it.level)]] : [['Tipo', 'Texto'], ['Palavras', String(it.text.split(/\s+/).length)]];
  const b = it.block;
  const rows = blockProps(b);
  const count = (f: (l: LineResult) => boolean) => String(r?.filter(f).length ?? 0);
  if (b.type === 'calc') rows.push(['Variáveis', count((l) => l.kind === 'assign')], ['Resultados', count((l) => l.kind === 'eval' && !l.error)]);
  if (b.type === 'verificar') {
    const st = r?.find((l) => l.kind === 'check');
    rows.push(['Estado', st?.error ? 'Erro' : st?.status === 'ok' ? 'Aprovado' : st?.status === 'warn' ? 'Atenção' : st?.status === 'fail' ? 'Reprovado' : 'não avaliado']);
  }
  if (EVALUATED.has(b.type)) rows.push(['Erros', count((l) => !!l.error)]);
  return rows;
}

/** Trecho [start, end) da linha i do bloco, sem a quebra; nl = tamanho da quebra. */
function lineSpan(it: BlockItem, i: number) {
  const ls = lines(it.block.body);
  let start = it.bodyStart;
  for (let k = 0; k < i; k++) start += ls[k].length;
  const raw = (ls[i] ?? '').replace(/\r?\n$/, '');
  return { start, end: start + raw.length, nl: (ls[i] ?? '').length - raw.length, raw, count: ls.length };
}

/** Faixa de cada segmento de texto (sem os brancos das pontas), para o editor de texto trocar só ela. */
function textRanges(text: string) {
  const d = parse(text);
  let pos = d.frontmatterRaw.length;
  return d.segments.map((seg, si) => {
    const start = pos;
    pos += seg.raw.length;
    if (seg.kind !== 'text') return null;
    const lead = seg.raw.length - seg.raw.trimStart().length;
    const body = seg.raw.trim();
    return body ? { si, start: start + lead, end: start + lead + body.length, md: body } : null;
  });
}

/** Resultado anterior fica apagado se o cálculo passar de 300 ms (B5). */
function useStale(): boolean {
  const calculating = useWorkspace((x) => x.calculating);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!calculating) { setStale(false); return; }
    const t = setTimeout(() => setStale(true), 300);
    return () => clearTimeout(t);
  }, [calculating]);
  return stale;
}

export function Caderno({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const items = useMemo(() => outline(parsed), [parsed]);
  const texts = useMemo(() => textRanges(doc.text), [doc.text]);
  const result = useWorkspace((x) => x.results[doc.id]);
  const projectPath = useWorkspace((x) => x.project?.path);
  const showSource = useWorkspace((x) => x.showSource);
  useWorkspace((x) => x.dirFiles); // links: redesenha quando a pasta for listada
  const { edit, openFile, set, resolveLink, loadDir } = useWorkspace.getState();
  const [selStart, setSelStart] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [pending, setPending] = useState<number | null>(null);
  const stale = useStale();

  // recálculo: as linhas já esperam 150 ms depois da última tecla; aqui só junta mudanças do mesmo instante
  useEffect(() => { const t = setTimeout(() => void recalc(doc.id), 0); return () => clearTimeout(t); }, [doc.id, doc.text, projectPath]);
  useEffect(() => { if (doc.path) void loadDir(dirname(doc.path)); }, [doc.path, loadDir]);

  const ctx = useMemo(() => ({ defined: new Set(result?.defined ?? []), isUnit: isKnownUnit }), [result]);
  const sel = items.find((i) => i.start === selStart) ?? items.find((i) => i.kind === 'block') ?? items[0];
  const libIds = Array.isArray(parsed.meta.bibliotecas) ? parsed.meta.bibliotecas.map(String) : [];

  // estado atual do arquivo (a edição anterior pode ter mudado as posições)
  const fresh = () => {
    const d = useWorkspace.getState().openDocs.find((x) => x.id === doc.id);
    return d ? outline(parse(d.text)) : [];
  };
  const blockByKey = (key: string) => fresh().find((x): x is BlockItem => x.kind === 'block' && x.key === key);

  const writeLine = (key: string, i: number, raw: string) => {
    const it = blockByKey(key);
    if (!it) return;
    const sp = lineSpan(it, i);
    if (raw === '') { if (sp.count > 1 || !SINGLE_LINE.has(it.block.type)) edit(doc.id, sp.start, sp.end + sp.nl, ''); return; }
    edit(doc.id, sp.start, sp.end, raw);
  };
  /** Enter no fim de uma linha de cálculo: cria a próxima e põe o cursor nela (B7). */
  const newLineAfter = (key: string, i: number) => {
    const it = blockByKey(key);
    if (!it || SINGLE_LINE.has(it.block.type)) { (document.activeElement as HTMLElement | null)?.blur?.(); setFocus(null); return; }
    const sp = lineSpan(it, i);
    const at = sp.end + sp.nl;
    holdKeys(); // o que for digitado até a linha nova ter foco vai para ela
    edit(doc.id, at, at, '\n');
    setFocus({ key, line: i + 1 });
  };
  /** Backspace numa linha vazia: apaga e volta para a anterior. */
  const deleteEmpty = (key: string, i: number) => {
    const it = blockByKey(key);
    if (!it) return;
    const sp = lineSpan(it, i);
    if (sp.count <= 1) return;
    holdKeys();
    edit(doc.id, sp.start, sp.end + sp.nl, '');
    setFocus({ key, line: Math.max(0, i - 1) });
  };
  const addLine = (it: BlockItem) => {
    const at = it.bodyStart + it.block.body.length;
    holdKeys();
    edit(doc.id, at, at, '\n');
    setFocus({ key: it.key, line: lines(it.block.body).length });
  };

  // inserção pelo ribbon (grupo Células): depois da célula selecionada, já em edição
  const insertAfter = (content: string) => {
    const at = sel ? sel.end : doc.text.replace(/\s+$/, '').length;
    edit(doc.id, at, at, `\n\n${content}`);
    setPending(at + 2);
  };
  useEffect(() => {
    if (pending === null) return;
    const it = items.find((i) => i.start === pending);
    if (!it) return;
    setSelStart(it.start);
    if (it.kind === 'block' && EVALUATED.has(it.block.type)) setFocus({ key: it.key, line: 0 });
    setPending(null);
    document.querySelector(`[data-start="${it.start}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [items, pending]);
  const nextId = (prefix: string) => {
    const used = new Set(blocks(parsed).map((b) => b.id));
    let n = 1;
    while (used.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  };
  const fence = (type: string, prefix: string, body: string) => '```' + `${type} {#${nextId(prefix)}}\n${body}\n` + '```';
  const CELL_CMDS = ['caderno.texto', 'caderno.calculo', 'caderno.funcao', 'caderno.grafico', 'caderno.verificacao'];
  useEffect(() => {
    register('caderno.texto', { run: () => insertAfter('Novo parágrafo.') });
    register('caderno.calculo', { run: () => insertAfter(fence('calc', 'calc', '')) });
    register('caderno.funcao', { run: () => insertAfter(fence('funcao', 'funcao', '')) });
    register('caderno.verificacao', { run: () => insertAfter(fence('verificar', 'verificacao', '')) });
    register('caderno.grafico', { run: () => insertAfter(fence('grafico', 'grafico', 'titulo: Novo gráfico\nx: {var: x, valores: [1, 2, 3]}\ny: {expr: "f(x)"}')) });
  });
  useEffect(() => () => CELL_CMDS.forEach((id) => register(id, { run: undefined })), []);

  const pick = (it: OutlineItem) => {
    setSelStart(it.start);
    const el = document.querySelector(`[data-start="${it.start}"]`) ?? [...document.querySelectorAll<HTMLElement>('[data-text-start]')].find((e) => Number(e.dataset.textStart) <= it.start && it.start < Number(e.dataset.textEnd));
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  const openNote = (target: string) => {
    const f = resolveLink(target, doc.path);
    if (f) void openFile(f); else set({ status: `Arquivo não encontrado: ${target.split('#')[0]}` });
  };

  const lineEl = (it: BlockItem, raw: string, i: number, size: number) => (
    <MathLine key={i} raw={raw} isCheck={it.block.type === 'verificar'} result={result?.blocks[it.key]?.[i]} stale={stale} ctx={ctx} theme="paper" size={size}
      focused={focus?.key === it.key && focus.line === i}
      onWrite={(r) => writeLine(it.key, i, r)}
      onEnter={() => newLineAfter(it.key, i)}
      onBackspaceEmpty={() => deleteEmpty(it.key, i)}
      onFocus={() => { setSelStart(it.start); setFocus({ key: it.key, line: i }); }}
      onExit={() => setFocus((f) => (f?.key === it.key && f.line === i ? null : f))} />
  );

  const blockView = (it: BlockItem): ReactNode => {
    const b = it.block;
    const fn = b.type === 'funcao';
    const lib = b.attrs.salvar ?? b.attrs.biblioteca;
    const label = `${blockLabel(b.type).toUpperCase()}${lib ? ` · ${lib.toUpperCase()}` : ''}`;
    const ls = lines(b.body).map((l) => l.replace(/\r?\n$/, ''));
    const selected = it === sel;
    let body: ReactNode;
    if (!EVALUATED.has(b.type)) body = <pre className={s.blockBody}>{b.body}</pre>;
    else if (ls.length === 0) body = <div className={s.calcLines}>{lineEl(it, '', 0, fn ? 24 : 19)}</div>;
    else if (fn) body = <div className={`${s.fnMath}`}>{ls.map((raw, i) => lineEl(it, raw, i, 24))}</div>;
    else {
      // entradas (≔) em grade de 4 colunas; resultados e verificações embaixo, depois de uma linha tracejada
      const groups: { out: boolean; idx: number[] }[] = [];
      ls.forEach((raw, i) => {
        const t = raw.replace(/#.*$/, '').trim();
        const out = !t || /=\s*\?/.test(t) || b.type === 'verificar' ? true : !/:=/.test(t);
        const wide = !t; // linha nova (vazia): linha inteira
        if (!wide && groups.at(-1)?.out === out) groups.at(-1)!.idx.push(i); else groups.push({ out, idx: [i] });
      });
      body = groups.map((g, gi) => (
        <div key={gi} className={`${g.out ? s.calcResults : s.calcInputs} ${gi > 0 ? s.dashed : ''}`}>{g.idx.map((i) => lineEl(it, ls[i], i, g.out ? 20 : 19))}</div>
      ));
    }
    return (
      <div key={it.key} data-start={it.start} className={[fn ? s.fnBlock : s.calcBlock, selected && s.selectedBlock].filter(Boolean).join(' ')} onMouseDown={() => setSelStart(it.start)}>
        <span className={fn ? s.fnLabel : s.blockLabel}>{label}</span>
        {body}
        {selected && b.type === 'calc' && <button type="button" className={s.addLine} onClick={(e) => { e.stopPropagation(); addLine(it); }}>Adicionar linha</button>}
      </div>
    );
  };

  const page = (
    <div className={s.workspace}>
      <article className={s.page}>
        {parsed.metaError && <p className={s.paperError}>Frontmatter inválido: {parsed.metaError}</p>}
        {result?.libErrors.map((e) => <p key={e} className={s.paperError}>{e}</p>)}
        {parsed.segments.map((seg, si) => {
          if (seg.kind === 'block') {
            const it = items.find((x): x is BlockItem => x.kind === 'block' && x.key === `b${si}`);
            return it ? blockView(it) : null;
          }
          const tr = texts[si];
          if (!tr) return null;
          return (
            <div key={`t${si}`} data-text-start={tr.start} data-text-end={tr.end} className={s.prose}>
              <TextEditor markdown={tr.md}
                resolveLink={(t) => resolveLink(t, doc.path)} onOpenLink={openNote}
                onChange={(md) => {
                  const cur = textRanges(useWorkspace.getState().openDocs.find((x) => x.id === doc.id)?.text ?? '')[si];
                  if (cur && md !== cur.md) edit(doc.id, cur.start, cur.end, md);
                }} />
            </div>
          );
        })}
      </article>
    </div>
  );

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Estrutura do caderno" aside={items.length} />
        <div className={s.list}>
          {items.map((it) => (
            <Row key={it.key} active={it === sel} onClick={() => pick(it)}>
              <Tag tone={it === sel ? 'selected' : undefined}>{it.tag}</Tag><span className={s.ellipsis}>{it.kind === 'block' ? it.label : it.label.replace(/[*_`#]/g, '')}</span>
            </Row>
          ))}
        </div>
        <PanelHeader title="Bibliotecas em uso" />
        <div className={s.list}>
          {libIds.map((id) => {
            const info = result?.libs?.find((l) => l.id === id);
            return (
              <div key={id} title={info ? displayPath(info.path) : undefined}>
                <Row>{info?.nome ?? id}<span className={s.muted}>{info ? `v${info.versao} · ${info.origem}` : 'não encontrada'}</span></Row>
                {info?.duplicate && <div className={s.libWarn}>{info.duplicate}</div>}
              </div>
            );
          })}
          <Row>Nativas <span className={s.muted}>sempre carregada</span></Row>
        </div>
      </LeftPanel>

      <main className={s.center}>
        {showSource ? <div className={s.withSource}>{page}<SourceView doc={doc} /></div> : page}
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades" aside={sel?.tag} />
        {sel && <PropGrid rows={props(sel, sel.kind === 'block' ? result?.blocks[sel.key] : undefined)} />}
        {result && <div className={s.note}>Calculado em {result.ms.toFixed(1).replace('.', ',')} ms</div>}
      </aside>
    </>
  );
}
