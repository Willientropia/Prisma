import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge, PanelHeader, PropGrid, Row, Tag } from '../../components/ui';
import { blocks, lines, parse, type BlockSegment } from '../../format/doc';
import { outline, type OutlineItem } from '../../format/views';
import { basename } from '../../format/display';
import { classify, greek } from '../../engine/syntax';
import { MathView } from '../../engine/render';
import { recalc } from '../../engine/run';
import type { LineResult } from '../../engine/evaluate';
import { register } from '../../commands/registry';
import { useApp, type OpenDoc } from '../../store/app';
import s from '../editors.module.css';

export const BLOCK_LABEL: Record<string, string> = {
  funcao: 'Função', calc: 'Cálculo', verificar: 'Verificação', grafico: 'Gráfico', tabela: 'Tabela', texto: 'Texto', teste: 'Teste',
};
export const blockLabel = (t: string) => BLOCK_LABEL[t] ?? (t || 'Bloco');

export function blockProps(b: BlockSegment): [string, string][] {
  return [['Tipo', blockLabel(b.type)], ['Id', b.id ? `#${b.id}` : 'sem id'], ...Object.entries(b.attrs)];
}

type BlockItem = Extract<OutlineItem, { kind: 'block' }>;
type Editing = { kind: 'text'; start: number } | { kind: 'line'; key: string; line: number; isNew?: boolean } | null;

const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const isComment = (raw: string) => raw.trim().startsWith('#');

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
  return { start, end: start + raw.length, nl: (ls[i] ?? '').length - raw.length, raw };
}

/** [[nota]] e [[nota#id]] viram links internos (SPEC 3.5). */
const wiki = (t: string) => t.replace(/\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, n: string, h = '', label?: string) => `[${label ?? n}](prisma:${encodeURIComponent(n)}${h})`);
const urlTransform = (u: string) => (u.startsWith('prisma:') ? u : defaultUrlTransform(u));

export function Caderno({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const items = useMemo(() => outline(parsed), [parsed]);
  const result = useApp((x) => x.results[doc.id]);
  const files = useApp((x) => x.files);
  const { edit, openFile, set } = useApp.getState();
  const [selStart, setSelStart] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, setPending] = useState<{ offset: number } | null>(null);

  // cálculo automático: reavalia logo depois de cada mudança
  useEffect(() => { const t = setTimeout(() => void recalc(doc.id), 150); return () => clearTimeout(t); }, [doc.id, doc.text, files]);

  const sel = items.find((i) => i.start === selStart) ?? items.find((i) => i.kind === 'block') ?? items[0];
  const user = useMemo(() => new Set(result?.defined ?? []), [result]);
  const libs = Array.isArray(parsed.meta.bibliotecas) ? parsed.meta.bibliotecas.map(String) : [];

  // depois de inserir uma célula: seleciona e abre a edição
  useEffect(() => {
    if (!pending) return;
    const it = items.find((i) => i.start === pending.offset);
    if (!it) return;
    setSelStart(it.start);
    setEditing(it.kind === 'text' ? { kind: 'text', start: it.start } : EVALUATED.has(it.block.type) ? { kind: 'line', key: it.key, line: 0 } : null);
    setPending(null);
    document.querySelector(`[data-start="${it.start}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [items, pending]);

  const insertAfter = (content: string) => {
    const at = sel ? sel.end : doc.text.replace(/\s+$/, '').length;
    edit(doc.id, at, at, `\n\n${content}`);
    setPending({ offset: at + 2 });
  };
  const nextId = (prefix: string) => {
    const used = new Set(blocks(parsed).map((b) => b.id));
    let n = 1;
    while (used.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  };
  const fence = (type: string, prefix: string, body: string) => '```' + `${type} {#${nextId(prefix)}}\n${body}\n` + '```';

  // botões do grupo Células (o registro é global; o caderno ativo responde)
  const CELL_CMDS = ['caderno.texto', 'caderno.calculo', 'caderno.funcao', 'caderno.grafico', 'caderno.verificacao'];
  useEffect(() => {
    register('caderno.texto', { run: () => insertAfter('Novo parágrafo.') });
    register('caderno.calculo', { run: () => insertAfter(fence('calc', 'calc', 'x := 1 m')) });
    register('caderno.funcao', { run: () => insertAfter(fence('funcao', 'funcao', 'f(x) := 2*x')) });
    register('caderno.verificacao', { run: () => insertAfter(fence('verificar', 'verificacao', 'x < 2 m')) });
    register('caderno.grafico', { run: () => insertAfter(fence('grafico', 'grafico', 'titulo: Novo gráfico\nx: {var: x, valores: [1, 2, 3]}\ny: {expr: "f(x)"}')) });
  });
  useEffect(() => () => CELL_CMDS.forEach((id) => register(id, { run: undefined })), []);

  const pick = (it: OutlineItem) => {
    setSelStart(it.start);
    document.querySelector(`[data-start="${it.start}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const openNote = (target: string) => {
    const name = decodeURIComponent(target.split('#')[0]);
    const f = files.find((x) => basename(x.path).startsWith(name + '.'));
    if (f) void openFile(f.path); else set({ status: `Nota "${name}" não encontrada no cofre` });
  };

  const commitText = (it: Extract<OutlineItem, { kind: 'text' }>, value: string) => {
    setEditing(null);
    if (value === it.raw) return;
    if (!value.trim()) {
      const extra = /^(\r?\n){0,2}/.exec(doc.text.slice(it.end))![0].length; // leva junto a linha em branco
      edit(doc.id, it.start, it.end + extra, '');
    } else edit(doc.id, it.start, it.end, value);
  };

  const commitLine = (it: BlockItem, i: number, value: string, newLine: boolean) => {
    const v = greek(value);
    const sp = lineSpan(it, i);
    if (!v.trim()) { // linha vazia: apaga
      edit(doc.id, sp.start, sp.end + sp.nl, '');
      setEditing(null);
      return;
    }
    if (v !== sp.raw || newLine) edit(doc.id, sp.start, sp.end, newLine ? `${v}\n` : v);
    setEditing(newLine ? { kind: 'line', key: it.key, line: i + 1, isNew: true } : null);
  };

  const cancelLine = (it: BlockItem, i: number) => {
    const sp = lineSpan(it, i);
    if (editing?.kind === 'line' && editing.isNew && !sp.raw.trim()) edit(doc.id, sp.start, sp.end + sp.nl, '');
    setEditing(null);
  };

  const addLine = (it: BlockItem) => {
    const at = it.bodyStart + it.block.body.length;
    edit(doc.id, at, at, '\n');
    setEditing({ kind: 'line', key: it.key, line: lines(it.block.body).length, isNew: true });
  };

  const lineView = (it: BlockItem, raw: string, i: number): ReactNode => {
    const ed = editing?.kind === 'line' && editing.key === it.key && editing.line === i;
    if (ed) return <LineInput key={`ed${i}`} initial={raw} onCommit={(v, nl) => commitLine(it, i, v, nl)} onCancel={() => cancelLine(it, i)} />;
    const c = classify(raw, it.block.type === 'verificar');
    const r = result?.blocks[it.key]?.[i];
    const open = () => setEditing({ kind: 'line', key: it.key, line: i });
    if (isComment(raw)) return <span key={i} className={s.lineComment} onClick={open}>{raw.trim().replace(/^#\s*/, '')}</span>;
    if (c.kind === 'empty') return null;
    const err = r?.error;
    return (
      <span key={i} className={err ? s.lineError : s.line} onClick={open} title="Clique para editar">
        {err ? <span className="mono">{raw.trim()}</span> : <MathView src={c.src} user={user} />}
        {!err && c.kind === 'eval' && <> = <b>{r?.text ?? '…'}</b></>}
        {!err && c.kind === 'check' && r?.status && (
          <Badge kind={r.status}>{r.status === 'ok' ? `APROVADO · limite ${r.limit ?? ''}` : r.status === 'warn' ? 'ATENÇÃO · perto do limite' : `REPROVADO · limite ${r.limit ?? ''}`}</Badge>
        )}
        {err && <span className={s.errMsg}>{err}</span>}
      </span>
    );
  };

  const blockView = (it: BlockItem, selected: boolean): ReactNode => {
    const b = it.block;
    const fn = b.type === 'funcao';
    const lib = b.attrs.salvar ?? b.attrs.biblioteca;
    const label = `${blockLabel(b.type).toUpperCase()}${lib ? ` · ${lib.toUpperCase()}` : ''}`;
    const ls = lines(b.body).map((l) => l.replace(/\r?\n$/, ''));

    let body: ReactNode;
    if (!EVALUATED.has(b.type)) body = <pre className={s.blockBody}>{b.body}</pre>;
    else if (fn) body = <div className={`m ${s.fnMath}`}>{ls.map((raw, i) => lineView(it, raw, i))}</div>;
    else {
      // entradas (:=) em grade de 4 colunas; resultados e verificações embaixo, depois de uma linha tracejada
      const groups: { out: boolean; idx: number[] }[] = [];
      ls.forEach((raw, i) => {
        const editingThis = editing?.kind === 'line' && editing.key === it.key && editing.line === i;
        const k = classify(raw, b.type === 'verificar').kind;
        if (k === 'empty' && !editingThis && !isComment(raw)) return;
        const out = editingThis ? groups.at(-1)?.out ?? false : k === 'eval' || k === 'check';
        if (groups.at(-1)?.out === out) groups.at(-1)!.idx.push(i); else groups.push({ out, idx: [i] });
      });
      body = groups.map((g, gi) => (
        <div key={gi} className={`m ${g.out ? s.calcResults : s.calcInputs} ${gi > 0 ? s.dashed : ''}`}>{g.idx.map((i) => lineView(it, ls[i], i))}</div>
      ));
    }
    return (
      <div key={it.key} data-start={it.start} className={[fn ? s.fnBlock : s.calcBlock, selected && s.selectedBlock].filter(Boolean).join(' ')} onClick={() => setSelStart(it.start)}>
        <span className={fn ? s.fnLabel : s.blockLabel}>{label}</span>
        {body}
        {selected && EVALUATED.has(b.type) && <button type="button" className={s.addLine} onClick={(e) => { e.stopPropagation(); addLine(it); }}>Adicionar linha</button>}
      </div>
    );
  };

  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Estrutura do caderno" aside={items.length} />
        <div className={s.list}>
          {items.map((it) => (
            <Row key={it.key} active={it === sel} onClick={() => pick(it)}>
              <Tag tone={it === sel ? 'selected' : undefined}>{it.tag}</Tag><span className={s.ellipsis}>{it.label}</span>
            </Row>
          ))}
        </div>
        <PanelHeader title="Bibliotecas em uso" />
        <div className={s.list}>
          {libs.map((l) => <Row key={l}>{l}</Row>)}
          <Row>Nativas <span className={s.muted}>sempre carregada</span></Row>
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.workspace}>
          <article className={s.page}>
            {parsed.metaError && <p className={s.paperError}>Frontmatter inválido: {parsed.metaError}</p>}
            {result?.libErrors.map((e) => <p key={e} className={s.paperError}>{e}</p>)}
            {items.map((it) => {
              const selected = it === sel;
              if (it.kind === 'block') return blockView(it, selected);
              if (editing?.kind === 'text' && editing.start === it.start)
                return <TextInput key={it.key} initial={it.raw} onCommit={(v) => commitText(it, v)} onCancel={() => setEditing(null)} />;
              return (
                <div key={it.key} data-start={it.start} className={[s.prose, selected && s.selectedBlock].filter(Boolean).join(' ')}
                  onClick={() => { setSelStart(it.start); setEditing({ kind: 'text', start: it.start }); }} title="Clique para editar">
                  <Markdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noreferrer"
                          onClick={(e) => { e.stopPropagation(); if (href?.startsWith('prisma:')) { e.preventDefault(); openNote(href.slice(7)); } }}>{children}</a>
                      ),
                    }}>
                    {wiki(it.raw)}
                  </Markdown>
                </div>
              );
            })}
          </article>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades" aside={sel?.tag} />
        {sel && <PropGrid rows={props(sel, sel.kind === 'block' ? result?.blocks[sel.key] : undefined)} />}
        {result && <div className={s.note}>Calculado em {result.ms.toFixed(1).replace('.', ',')} ms</div>}
      </aside>
    </>
  );
}

/** Linha de cálculo em edição: Enter confirma e abre a próxima, Ctrl+Enter só confirma, Esc cancela. */
function LineInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string, newLine: boolean) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input ref={ref} className={s.lineInput} value={v} spellCheck={false} aria-label="Linha de cálculo"
      onChange={(e) => setV(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); done.current = true; onCommit(v, !e.ctrlKey && !e.metaKey); }
        else if (e.key === 'Escape') { done.current = true; onCancel(); }
      }}
      onBlur={() => { if (!done.current) { done.current = true; onCommit(v, false); } }} />
  );
}

/** Texto em edição (Markdown cru): Ctrl+Enter ou sair do campo confirma, Esc cancela. */
function TextInput({ initial, onCommit, onCancel }: { initial: string; onCommit: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <textarea ref={ref} className={s.textInput} value={v} rows={Math.max(2, v.split('\n').length + 1)} aria-label="Texto em Markdown"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); done.current = true; onCommit(v); }
        else if (e.key === 'Escape') { done.current = true; onCancel(); }
      }}
      onBlur={() => { if (!done.current) { done.current = true; onCommit(v); } }} />
  );
}
