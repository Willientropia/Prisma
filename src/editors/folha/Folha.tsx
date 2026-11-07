// Folha livre (SPEC 7.2 + ADENDO 02, B6): regiões na grade, editadas no lugar, recalculadas sem clique.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PanelHeader, PropGrid, Row } from '../../components/ui';
import { lines, parse, type BlockSegment } from '../../format/doc';
import { assignments, byPosition } from '../../format/views';
import { fmtNumber } from '../../format/display';
import { idLatex, nodeLatex, parseLinear, parseUnit, unitLatex } from '../../format/mathlinear';
import { recalc } from '../../engine/run';
import { run } from '../../commands/registry';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import { LeftPanel } from '../../shell/ProjectPanel';
import { MathLine, isKnownUnit } from '../../math/MathLine';
import { MathMarkup, type Key } from '../../math/MathField';
import { TextEditor } from '../TextEditor';
import { SourceView } from '../SourceView';
import { blockProps } from '../caderno/Caderno';
import { Plot } from './Plot';
import s from '../editors.module.css';

const GRID = 20;
const snap = (v: number) => Math.max(0, Math.round(v / GRID) * GRID);
const EVALUATED = new Set(['funcao', 'calc', 'verificar']);
const num = (b: BlockSegment, k: string, d = 0) => Number(b.attrs[k] ?? d) || d;

type Region = { key: string; id: string; seg: BlockSegment; start: number; end: number; bodyStart: number };
type Focus = { id: string; line: number } | null;

/** Regiões do arquivo com a posição no texto (para editar só aquele trecho). */
function regionsOf(text: string): Region[] {
  const d = parse(text);
  let pos = d.frontmatterRaw.length;
  const out: Region[] = [];
  d.segments.forEach((seg, si) => {
    const start = pos;
    pos += seg.raw.length;
    if (seg.kind !== 'block') return;
    out.push({ key: `b${si}`, id: seg.id ?? `b${si}`, seg, start, end: pos, bodyStart: start + (lines(seg.raw)[0]?.length ?? 0) });
  });
  return out;
}

/** Troca (ou acrescenta) x= e y= na linha de abertura do bloco. */
export function withPos(fenceLine: string, x: number, y: number): string {
  const nl = /\r?\n$/.exec(fenceLine)?.[0] ?? '';
  const head = fenceLine.slice(0, fenceLine.length - nl.length);
  const m = /\{([^}]*)\}/.exec(head);
  if (!m) return `${head} {x=${x} y=${y}}${nl}`;
  let inner = m[1];
  inner = /\bx=\S+/.test(inner) ? inner.replace(/\bx=\S+/, `x=${x}`) : `${inner} x=${x}`;
  inner = /\by=\S+/.test(inner) ? inner.replace(/\by=\S+/, `y=${y}`) : `${inner} y=${y}`;
  return head.replace(m[0], `{${inner.trim()}}`) + nl;
}

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

export function Folha({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const regions = useMemo(() => regionsOf(doc.text), [doc.text]);
  const ordered = useMemo(() => byPosition(regions.map((r) => r.seg)), [regions]);
  const vars = useMemo(() => assignments(ordered), [ordered]);
  const result = useWorkspace((x) => x.results[doc.id]);
  const projectPath = useWorkspace((x) => x.project?.path);
  const showSource = useWorkspace((x) => x.showSource);
  const { edit, openFile, set, resolveLink } = useWorkspace.getState();
  const stale = useStale();
  const ctx = useMemo(() => ({ defined: new Set(result?.defined ?? []), isUnit: isKnownUnit }), [result]);

  const sheet = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const [focus, setFocus] = useState<Focus>(null);
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const pendingKeys = useRef<Key[]>([]); // teclas digitadas enquanto a região nova monta
  const creating = useRef(false);
  const [msg, setMsg] = useState('Clique na grade e digite para criar uma região.');

  // B10.6: resultados e gráfico aparecem sem nenhum clique
  useEffect(() => { const t = setTimeout(() => void recalc(doc.id), 0); return () => clearTimeout(t); }, [doc.id, doc.text, projectPath]);

  const pagina = (parsed.meta.pagina ?? {}) as { largura?: number; altura?: number };
  const pageW = Number(pagina.largura) || 1200;
  const pageH = Number(pagina.altura) || 1600;

  const textNow = () => useWorkspace.getState().openDocs.find((x) => x.id === doc.id)?.text ?? '';
  const fresh = () => regionsOf(textNow());
  const byId = (id: string) => fresh().find((r) => r.id === id);

  const nextId = (prefix: string) => {
    const used = new Set(fresh().map((r) => r.id));
    let n = 1;
    while (used.has(`${prefix}-${n}`)) n++;
    return `${prefix}-${n}`;
  };
  const appendRegion = (type: string, x: number, y: number) => {
    const id = nextId(type === 'texto' ? 'texto' : 'calc');
    const t = textNow();
    const sep = t.endsWith('\n\n') ? '' : t.endsWith('\n') ? '\n' : '\n\n';
    edit(doc.id, t.length, t.length, `${sep}\`\`\`${type} {#${id} x=${x} y=${y}}\n\n\`\`\`\n`);
    return id;
  };
  const removeRegions = (ids: string[]) => {
    // de trás para a frente, para as posições continuarem valendo
    for (const r of fresh().filter((x) => ids.includes(x.id)).sort((a, b) => b.start - a.start)) {
      const extra = textNow().slice(0, r.start).endsWith('\n\n') ? 1 : 0;
      edit(doc.id, r.start - extra, r.end, '');
    }
    setSelected(new Set());
  };

  const writeLine = (id: string, i: number, raw: string) => {
    const r = byId(id);
    if (!r) return;
    const ls = lines(r.seg.body);
    let start = r.bodyStart;
    for (let k = 0; k < i; k++) start += ls[k].length;
    const cur = (ls[i] ?? '').replace(/\r?\n$/, '');
    const nl = (ls[i] ?? '').length - cur.length;
    if (raw === '') {
      if (ls.length <= 1) return removeRegions([id]); // região vazia some
      edit(doc.id, start, start + cur.length + nl, '');
      return;
    }
    edit(doc.id, start, start + cur.length, raw);
  };

  const moveRegions = (ids: string[], dx: number, dy: number) => {
    for (const r of fresh().filter((x) => ids.includes(x.id))) {
      const first = lines(r.seg.raw)[0];
      edit(doc.id, r.start, r.start + first.length, withPos(first, snap(num(r.seg, 'x') + dx), snap(num(r.seg, 'y') + dy)));
    }
  };

  const at = (e: { clientX: number; clientY: number }) => {
    const rect = sheet.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onSheetDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.target !== sheet.current || e.button !== 0) return;
    const p0 = at(e);
    let moved = false;
    const move = (ev: globalThis.PointerEvent) => {
      const p = at(ev);
      if (!moved && Math.hypot(p.x - p0.x, p.y - p0.y) < 4) return;
      moved = true;
      setBand({ x0: p0.x, y0: p0.y, x1: p.x, y1: p.y });
    };
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) {
        // seleção por retângulo
        const p = at(ev);
        const [l, r, t, b] = [Math.min(p0.x, p.x), Math.max(p0.x, p.x), Math.min(p0.y, p.y), Math.max(p0.y, p.y)];
        const hit = [...sheet.current!.querySelectorAll<HTMLElement>('[data-region]')].filter((el) => {
          const x = el.offsetLeft, y = el.offsetTop;
          return x < r && x + el.offsetWidth > l && y < b && y + el.offsetHeight > t;
        }).map((el) => el.dataset.region!);
        setSelected(new Set(hit));
        setBand(null);
        setCross(null);
      } else {
        // cursor em cruz no ponto da grade mais próximo (como no SMath)
        setSelected(new Set());
        setCross({ x: snap(p0.x), y: snap(p0.y) });
      }
      sheet.current?.focus();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // arrastar pela moldura: move com encaixe na grade
  const onRegionDown = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    e.preventDefault();
    const ids = selected.has(id) ? [...selected] : [id];
    setSelected(new Set(ids));
    setCross(null);
    const p0 = { x: e.clientX, y: e.clientY };
    const move = (ev: globalThis.PointerEvent) => setDrag({ ids, dx: snap(ev.clientX - p0.x), dy: snap(ev.clientY - p0.y) });
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const dx = snap(ev.clientX - p0.x), dy = snap(ev.clientY - p0.y);
      if (dx || dy) moveRegions(ids, dx, dy);
      sheet.current?.focus();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onSheetKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== sheet.current) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size) { e.preventDefault(); removeRegions([...selected]); return; }
    if (e.key === 'Escape') { setCross(null); setSelected(new Set()); return; }
    if (creating.current) { // campo ainda montando: guarda a tecla (inclusive Enter e Ctrl+G) para aplicar quando tiver foco
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) { e.preventDefault(); pendingKeys.current.push({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey }); }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    e.preventDefault();
    if (!cross) return;
    if (e.key === '"') { // " numa área vazia cria região de texto (B4)
      setFocus({ id: appendRegion('texto', cross.x, cross.y), line: -1 });
    } else {
      pendingKeys.current = [{ key: e.key }];
      creating.current = true;
      setFocus({ id: appendRegion('calc', cross.x, cross.y), line: 0 });
    }
    setCross(null);
  };

  /** Shift+Enter: confirma e cria uma região logo abaixo, alinhada à esquerda (B4). */
  const regionBelow = (id: string) => {
    const r = byId(id);
    if (!r) return;
    const el = sheet.current?.querySelector<HTMLElement>(`[data-region="${id}"]`);
    const y = snap(num(r.seg, 'y') + (el?.offsetHeight ?? GRID) + GRID / 2);
    pendingKeys.current = [];
    setFocus({ id: appendRegion('calc', num(r.seg, 'x'), y), line: 0 });
  };

  const regionView = (r: Region) => {
    const b = r.seg;
    const moving = drag?.ids.includes(r.id);
    const style = { left: num(b, 'x') + (moving ? drag!.dx : 0), top: num(b, 'y') + (moving ? drag!.dy : 0) };
    const cls = [s.region, selected.has(r.id) ? s.regionOn : s.regionOff].join(' ');
    const ls = lines(b.body).map((l) => l.replace(/\r?\n$/, ''));
    let content;
    if (EVALUATED.has(b.type)) {
      content = (ls.length ? ls : ['']).map((raw, i) => {
        const mine = focus?.id === r.id && focus.line === i;
        return (
          <div key={i} className={s.regionLine}>
            <MathLine raw={raw} isCheck={b.type === 'verificar'} result={result?.blocks[r.key]?.[i]} stale={stale} ctx={ctx} theme="dark" size={20}
              focused={mine} initialKeys={mine ? pendingKeys.current : undefined} onReady={() => { creating.current = false; }}
              onWrite={(w) => writeLine(r.id, i, w)}
              onEnter={(shift) => { (document.activeElement as HTMLElement | null)?.blur?.(); if (shift) regionBelow(r.id); }}
              onBackspaceEmpty={() => writeLine(r.id, i, '')}
              onFocus={() => { setSelected(new Set([r.id])); setCross(null); }}
              onExit={() => setFocus((f) => (f?.id === r.id ? null : f))} />
          </div>
        );
      });
    } else if (b.type === 'texto') {
      content = (
        <TextEditor markdown={b.body.trim()} autoFocus={focus?.id === r.id} className={s.regionText}
          onChange={(md) => {
            const cur = byId(r.id);
            if (cur) edit(doc.id, cur.bodyStart, cur.bodyStart + cur.seg.body.length, md ? `${md}\n` : '');
          }} />
      );
    } else if (b.type === 'grafico') {
      content = <Plot data={result?.plots?.[r.key]} width={num(b, 'largura', 400)} height={num(b, 'altura', 200)} />;
    } else content = <pre className={s.regionPre}>{b.body}</pre>;
    return (
      <div key={r.key} data-region={r.id} className={cls} style={style} onPointerDown={(e) => onRegionDown(e, r.id)}>
        {content}
      </div>
    );
  };

  const sel = regions.find((r) => selected.has(r.id));
  const fns = regions.filter((r) => r.seg.type === 'funcao');
  const lhsLatex = (body: string) => { try { const l = parseLinear(body.trim().split('\n')[0]); return l.kind === 'def' ? nodeLatex(l.lhs) : ''; } catch { return ''; } };
  const unitMarkup = (u: string) => { try { return unitLatex(parseUnit(u)); } catch { return `\\mathrm{${u}}`; } };

  const command = (v: string) => {
    const ir = /^ir\s+(.+)$/.exec(v);
    if (v === 'calcular') run('calc.tudo');
    else if (ir) {
      const f = resolveLink(ir[1].trim(), doc.path); // mesma regra dos [[links]]: projeto, mesma pasta, caminho relativo
      if (f) void openFile(f); else setMsg(`Arquivo "${ir[1]}" não encontrado.`);
    } else set({ status: `Comando "${v}": ainda não disponível nesta versão` });
  };

  const sheetView = (
    <div className={s.sheetScroll}>
      <div ref={sheet} className={s.sheet} style={{ width: pageW, height: pageH }} tabIndex={0} aria-label="Folha"
        onPointerDown={onSheetDown} onKeyDown={onSheetKey}>
        {regions.map(regionView)}
        {cross && <div className={s.cross} style={{ left: cross.x, top: cross.y }} aria-hidden="true" />}
        {band && <div className={s.band} style={{ left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0) }} />}
      </div>
    </div>
  );

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Variáveis" aside={vars.length} />
        <div className={s.varsHead}><span>Nome</span><span>Valor</span><span>Unid.</span></div>
        {vars.map((v, i) => (
          <div key={v.name + i} className={s.varsRow}>
            <span><MathMarkup latex={idLatex(v.name)} theme="dark" /></span>
            <span>{fmtNumber(v.value)}</span>
            <span>{v.unit && <MathMarkup latex={unitMarkup(v.unit)} theme="dark" />}</span>
          </div>
        ))}
        <div className={s.gap} />
        <PanelHeader title="Funções nesta folha" />
        <div className={s.list}>
          {fns.length === 0 && <div className={s.note}>Nenhuma função definida aqui.</div>}
          {fns.map((f) => <Row key={f.key}><MathMarkup latex={lhsLatex(f.seg.body)} theme="dark" /></Row>)}
        </div>
      </LeftPanel>

      <main className={s.center}>
        {showSource ? <div className={s.withSource}>{sheetView}<SourceView doc={doc} /></div> : sheetView}
        <div className={s.cmdline}>
          <span>{msg}</span>
          <label>Comando:
            <input type="text" placeholder="digite um comando, ex.: ir string-3" aria-label="Comando"
              onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { command(e.currentTarget.value.trim()); e.currentTarget.value = ''; } }} />
          </label>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades da região" />
        {sel ? <PropGrid rows={[['Região', sel.id], ...blockProps(sel.seg).filter(([k]) => !['Id', 'x', 'y', 'largura', 'altura'].includes(k)), ['Posição X', `${num(sel.seg, 'x')} px`], ['Posição Y', `${num(sel.seg, 'y')} px`], ['Selecionadas', String(selected.size)]]} />
          : <div className={s.note}>Clique numa região para editar. Arraste pela moldura para mover; arraste na área vazia para selecionar várias; Delete apaga.</div>}
      </aside>
    </>
  );
}
