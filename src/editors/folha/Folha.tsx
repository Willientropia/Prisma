// Mais de 300 linhas: a folha reúne as regiões, a seleção e os menus num componente e já passava do limite antes do A6-3.
// Folha livre (SPEC 7.2 + ADENDO 02, B6): regiões na grade, editadas no lugar, recalculadas sem clique.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PanelHeader, PropGrid, Row } from '../../components/ui';
import { lines, parse, withAttr, type BlockSegment } from '../../format/doc';
import { assignments, byPosition, definedBefore, definedNames } from '../../format/views';
import { dirname, fmtNumber } from '../../format/display';
import { idLatex, nodeLatex, parseLinear, parseUnit, unitLatex } from '../../format/mathlinear';
import { recalc } from '../../engine/run';
import { run } from '../../commands/registry';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import { ContextMenu, LeftPanel, type MenuState } from '../../shell/ProjectPanel';
import { platform } from '../../platform';
import { Icon } from '../../components/Icon';
import { register } from '../../commands/registry';
import { MathLine, isKnownUnit } from '../../math/MathLine';
import { MathMarkup, takeHeldKeys, type Key } from '../../math/MathField';
import { TextEditor } from '../TextEditor';
import { SourceView } from '../SourceView';
import { blockProps } from '../caderno/Caderno';
import { Plot } from './Plot';
import { sheetItems, type LibFn } from './assistente';
import { baseItems, sortItems } from '../../math/assistente';
import { allFunctions } from '../../commands/library';
import s from '../editors.module.css';

const GRID = 20;
/** Imagem extraída de um .sm, ao lado da folha (<nome>_arquivos/...). */
function SheetImage({ dir, path, width, height }: { dir: string; path: string; width?: number; height?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    let alive = true;
    const ext = path.split('.').pop()?.toLowerCase() === 'jpg' ? 'jpeg' : path.split('.').pop()?.toLowerCase() ?? 'png';
    platform.readBase64(dir ? `${dir}/${path}` : path).then((b) => alive && setSrc(`data:image/${ext};base64,${b}`)).catch(() => alive && setBad(true));
    return () => { alive = false; };
  }, [dir, path]);
  if (bad) return <div className={s.regionImported}>Imagem não encontrada: {path}</div>;
  return src ? <img src={src} alt={path} width={width} height={height} draggable={false} /> : null;
}

/** Altura da linha de título de uma área (E6). */
const AREA_HEAD = 20;
const snap = (v: number) => Math.round(v / GRID) * GRID; // deslocamentos podem ser negativos
const pos = (v: number) => Math.max(0, snap(v)); // posição final nunca fica antes da borda
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
  const { edit, openFile, set, resolveLink, loadDir } = useWorkspace.getState();
  // "ir <nome>" procura também na pasta da folha (BUG-005: a pasta nunca era listada)
  useEffect(() => { if (doc.path) void loadDir(dirname(doc.path)); }, [doc.path, loadDir]);
  const stale = useStale();
  const ctx = useMemo(() => ({ defined: new Set(result?.defined ?? []), isUnit: isKnownUnit }), [result]);
  // nomes definidos antes de cada linha, na ordem de leitura da folha (ADENDO 05, E2.1 e E3.1)
  const before = useMemo(() => {
    const ordered = byPosition(regions.filter((r) => !('desativado' in r.seg.attrs)).map((r) => r.seg)).map((seg) => ({ key: regions.find((r) => r.seg === seg)!.key, lines: lines(seg.body).map((l) => l.replace(/\r?\n$/, '')) }));
    const own = new Set(ordered.flatMap((b) => b.lines.flatMap(definedNames)));
    return definedBefore(ordered, (result?.defined ?? []).filter((d) => !own.has(d)));
  }, [regions, result]);
  // assistente dinâmico (A6-4): funções das bibliotecas em vigor; Exibir > Assistente dinâmico liga e desliga
  const assistOn = useWorkspace((x) => x.config.assistente_dinamico !== false);
  const [libFns, setLibFns] = useState<LibFn[]>([]);
  const libKey = (result?.libs ?? []).map((l) => `${l.id}@${l.versao}`).join(',');
  useEffect(() => { let alive = true; void allFunctions().then((fs) => alive && setLibFns(fs)).catch(() => {}); return () => { alive = false; }; }, [libKey]);
  const itemsFor = (key: string, line: number) => () => {
    const defined = new Set(result?.defined ?? []);
    return sortItems([...sheetItems(before.list(key, line), result?.blocks, libFns.filter((f) => defined.has(f.sig.split('(')[0].trim()))), ...baseItems()]);
  };

  const sheet = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [crossState, setCrossState] = useState<{ x: number; y: number } | null>(null);
  // ref junto do estado: a tecla digitada logo depois do Enter já encontra a cruz nova (ADENDO 05)
  const crossRef = useRef<{ x: number; y: number } | null>(null);
  const setCross = (c: { x: number; y: number } | null) => { crossRef.current = c; setCrossState(c); };
  const cross = crossState;
  const [focus, setFocus] = useState<Focus>(null);
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [band, setBand] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const pendingKeys = useRef<Key[]>([]); // teclas digitadas enquanto a região nova monta
  const [spaceFor, setSpaceFor] = useState<string | null>(null); // região que acabou de virar texto: o espaço do Espaço entra no texto
  const creating = useRef(false);
  const creatingTimer = useRef(0);
  const doneCreating = () => { clearTimeout(creatingTimer.current); creating.current = false; };
  const [msg, setMsg] = useState('Clique na grade e digite para criar uma região.');

  // B10.6: resultados e gráfico aparecem sem nenhum clique
  useEffect(() => { const t = setTimeout(() => void recalc(doc.id), 0); return () => clearTimeout(t); }, [doc.id, doc.text, projectPath]);

  const pagina = (parsed.meta.pagina ?? {}) as { largura?: number; altura?: number };
  const pageW = Number(pagina.largura) || 1200;
  const pageH = Number(pagina.altura) || 1600;

  // Áreas (ADENDO 05, E6): blocos area ... fim-area, na ordem do arquivo. Recolhida, as regiões de dentro
  // somem (mas continuam sendo avaliadas) e as de baixo sobem para ocupar o espaço.
  const areas = useMemo(() => {
    const out: { region: Region; members: Set<string>; top: number; bottom: number; collapsed: boolean; locked: boolean; titulo: string }[] = [];
    const open: typeof out = [];
    for (const r of regions) {
      if (r.seg.type === 'area') {
        const a = { region: r, members: new Set<string>(), top: num(r.seg, 'y'), bottom: num(r.seg, 'y') + AREA_HEAD, collapsed: 'recolhida' in r.seg.attrs, locked: 'travada' in r.seg.attrs, titulo: r.seg.attrs.titulo ?? '' };
        out.push(a); open.push(a);
      } else if (r.seg.type === 'fim-area') {
        const k = open.map((a) => a.region.id).lastIndexOf(r.id);
        const a = k >= 0 ? open.splice(k, 1)[0] : open.pop();
        if (a) a.bottom = Math.max(a.bottom, num(r.seg, 'y', a.bottom));
      } else for (const a of open) { a.members.add(r.id); a.bottom = Math.max(a.bottom, num(r.seg, 'y') + AREA_HEAD * 2); }
    }
    return out;
  }, [regions]);
  /** Quanto uma posição y sobe por causa das áreas recolhidas acima dela. */
  const shiftAt = (y: number, self?: string) => areas.reduce((acc, a) => (a.collapsed && a.bottom <= y && a.region.id !== self ? acc + Math.max(0, a.bottom - a.top - AREA_HEAD) : acc), 0);
  const hidden = (id: string) => areas.some((a) => a.collapsed && a.members.has(id));
  const locked = (id: string) => areas.some((a) => a.locked && a.members.has(id));

  const [menu, setMenu] = useState<MenuState>(null);
  /** Troca um atributo da linha de abertura (desativado, moldura, descricao, recolhida, travada). */
  const setAttr = (id: string, name: string, value: string | true | null) => {
    const r = byId(id);
    if (!r) return;
    const first = lines(r.seg.raw)[0];
    edit(doc.id, r.start, r.start + first.length, withAttr(first, name, value));
  };
  const regionMenu = (e: React.MouseEvent, r: Region) => {
    e.preventDefault();
    e.stopPropagation();
    const a = r.seg.attrs;
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: 'desativado' in a ? 'Ativar avaliação' : 'Desativar avaliação', run: () => setAttr(r.id, 'desativado', 'desativado' in a ? null : true) },
      { label: 'moldura' in a ? 'Tirar moldura' : 'Moldura', run: () => setAttr(r.id, 'moldura', 'moldura' in a ? null : true) },
      ...(EVALUATED.has(r.seg.type) ? [{ label: 'Formato do resultado...', run: () => set({ formatDialog: { scope: 'region', docId: doc.id, regionId: r.id } }) }] : []),
      { label: 'Descrição...', run: async () => {
        const q = await useWorkspace.getState().ask({ title: 'Descrição da região', message: 'Comentário curto mostrado acima da região (vazio tira):', input: a.descricao ?? '', buttons: [{ id: 'ok', label: 'OK', primary: true }, { id: 'cancel', label: 'Cancelar' }] });
        if (q.id === 'ok') setAttr(r.id, 'descricao', q.value.trim() || null);
      } },
    ] });
  };
  const areaMenu = (e: React.MouseEvent, a: (typeof areas)[number]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items: [
      { label: a.collapsed ? 'Expandir área' : 'Recolher área', run: () => setAttr(a.region.id, 'recolhida', a.collapsed ? null : true) },
      { label: a.locked ? 'Destravar área' : 'Travar área', run: () => setAttr(a.region.id, 'travada', a.locked ? null : true) },
      { label: 'Renomear área...', run: async () => {
        const q = await useWorkspace.getState().ask({ title: 'Área', message: 'Título da área:', input: a.titulo, buttons: [{ id: 'ok', label: 'OK', primary: true }, { id: 'cancel', label: 'Cancelar' }] });
        if (q.id === 'ok') setAttr(a.region.id, 'titulo', q.value.trim() || null);
      } },
    ] });
  };

  /** Inserir > Organizar > Área: envolve as regiões selecionadas (E6). */
  const wrapInArea = () => {
    const sel = fresh().filter((r) => selected.has(r.id) && r.seg.type !== 'area' && r.seg.type !== 'fim-area');
    if (!sel.length) return set({ status: 'Selecione as regiões que vão para dentro da área' });
    const t = textNow();
    const top = Math.max(0, snap(Math.min(...sel.map((r) => num(r.seg, 'y'))) - GRID));
    const bottom = snap(Math.max(...sel.map((r) => num(r.seg, 'y') + (sheet.current?.querySelector<HTMLElement>(`[data-region="${r.id}"]`)?.offsetHeight ?? GRID))) + GRID / 2);
    const id = nextId('area');
    let rest = t;
    for (const r of [...sel].sort((a, b) => b.start - a.start)) rest = rest.slice(0, r.start) + rest.slice(r.end);
    const at = sel.reduce((m, r) => Math.min(m, r.start), Infinity);
    const before = t.slice(0, at).length - sel.filter((r) => r.start < at).reduce((n, r) => n + (r.end - r.start), 0);
    const inner = sel.map((r) => r.seg.raw.replace(/\n*$/, '\n')).join('\n');
    const block = `\`\`\`area {#${id} titulo="Área" y=${top}}\n\`\`\`\n\n${inner}\n\`\`\`fim-area {#${id} y=${bottom}}\n\`\`\`\n`;
    edit(doc.id, 0, t.length, rest.slice(0, before) + block + rest.slice(before));
  };
  useEffect(() => { register('folha.area', { label: 'Área', run: wrapInArea }); return () => register('folha.area', { run: undefined }); });

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

  /** Espaço numa região de cálculo com só um nome: vira região de texto, com a palavra, o espaço e o cursor no fim (A6-3). */
  const toText = (id: string, word: string) => {
    const r = byId(id);
    if (!r) return;
    const head = lines(r.seg.raw)[0].replace(/^```calc/, '```texto');
    edit(doc.id, r.start, r.bodyStart + r.seg.body.length, `${head}${word}\n`);
    setSpaceFor(id);
    setFocus({ id, line: -1 });
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

  /** Deslocamento do grupo: para quando a região mais à esquerda ou a mais alta chega na borda, sem empilhar (BUG-022). */
  const groupDelta = (ids: string[], dx: number, dy: number) => {
    const rs = fresh().filter((x) => ids.includes(x.id));
    if (!rs.length) return { dx, dy };
    return { dx: Math.max(dx, -Math.min(...rs.map((r) => num(r.seg, 'x')))), dy: Math.max(dy, -Math.min(...rs.map((r) => num(r.seg, 'y')))) };
  };

  const moveRegions = (ids: string[], dx: number, dy: number) => {
    // de trás para a frente: a linha de abertura muda de tamanho (x=60 vira x=100) e deslocaria as posições seguintes
    for (const r of fresh().filter((x) => ids.includes(x.id)).sort((a, b) => b.start - a.start)) {
      const first = lines(r.seg.raw)[0];
      edit(doc.id, r.start, r.start + first.length, withPos(first, pos(num(r.seg, 'x') + dx), pos(num(r.seg, 'y') + dy)));
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
        setCross({ x: pos(p0.x), y: pos(p0.y) });
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
    const move = (ev: globalThis.PointerEvent) => setDrag({ ids, ...groupDelta(ids, snap(ev.clientX - p0.x), snap(ev.clientY - p0.y)) });
    const up = (ev: globalThis.PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const { dx, dy } = groupDelta(ids, snap(ev.clientX - p0.x), snap(ev.clientY - p0.y));
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
    const at = crossRef.current;
    if (!at) return;
    if (e.key === '"') { // " numa área vazia cria região de texto (B4)
      setFocus({ id: appendRegion('texto', at.x, at.y), line: -1 });
    } else {
      pendingKeys.current = [{ key: e.key }];
      creating.current = true;
      creatingTimer.current = window.setTimeout(doneCreating, 2000); // prazo: se o campo não montar, a folha volta a aceitar teclas (F03)
      setFocus({ id: appendRegion('calc', at.x, at.y), line: 0 });
    }
    setCross(null);
  };

  /** Enter: confirma e põe a cruz logo abaixo da região, como no SMath; o que se digitar cria a próxima (ADENDO 05). */
  const crossBelow = (id: string) => {
    const r = byId(id);
    if (!r) return;
    const el = sheet.current?.querySelector<HTMLElement>(`[data-region="${id}"]`);
    setSelected(new Set());
    setCross({ x: num(r.seg, 'x'), y: snap(num(r.seg, 'y') + (el?.offsetHeight ?? GRID) + GRID / 2) });
    sheet.current?.focus();
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
    // prévia já encaixada na grade, igual ao que fica ao soltar
    const lift = shiftAt(num(b, 'y'));
    const style = moving ? { left: pos(num(b, 'x') + drag!.dx), top: pos(num(b, 'y') + drag!.dy) - lift } : { left: num(b, 'x'), top: num(b, 'y') - lift };
    const cls = [s.region, selected.has(r.id) ? s.regionOn : s.regionOff, 'desativado' in b.attrs && s.regionDisabled, 'moldura' in b.attrs && s.regionFrame].filter(Boolean).join(' ');
    const ls = lines(b.body).map((l) => l.replace(/\r?\n$/, ''));
    let content;
    if (EVALUATED.has(b.type)) {
      content = (ls.length ? ls : ['']).map((raw, i) => {
        const mine = focus?.id === r.id && focus.line === i;
        return (
          <div key={i} className={s.regionLine}>
            <MathLine raw={raw} isCheck={b.type === 'verificar'} result={result?.blocks[r.key]?.[i]} stale={stale} ctx={{ ...ctx, before: before(r.key, i) }} theme="dark" size={20} assist={{ items: itemsFor(r.key, i), auto: assistOn }}
              focused={mine} initialKeys={mine ? pendingKeys.current : undefined} onReady={doneCreating}
              onWrite={(w) => writeLine(r.id, i, w)}
              onToText={b.type === 'calc' && ls.length <= 1 ? (word) => toText(r.id, word) : undefined}
              onEnter={(shift) => { (document.activeElement as HTMLElement | null)?.blur?.(); if (shift) regionBelow(r.id); else crossBelow(r.id); }}
              onBackspaceEmpty={() => writeLine(r.id, i, '')}
              onFocus={() => { setSelected(new Set([r.id])); setCross(null); }}
              onExit={() => setFocus((f) => (f?.id === r.id ? null : f))} />
          </div>
        );
      });
    } else if (b.type === 'texto') {
      content = (
        <TextEditor markdown={b.body.trim()} autoFocus={focus?.id === r.id} typedBefore={spaceFor === r.id ? () => { setSpaceFor(null); return ` ${takeHeldKeys().filter((k) => k.key.length === 1 && !k.ctrlKey && !k.metaKey).map((k) => k.key).join('')}`; } : undefined} className={s.regionText}
          onChange={(md) => {
            const cur = byId(r.id);
            if (cur) edit(doc.id, cur.bodyStart, cur.bodyStart + cur.seg.body.length, md ? `${md}\n` : '');
          }} />
      );
    } else if (b.type === 'grafico') {
      content = <Plot data={result?.plots?.[r.key]} width={num(b, 'largura', 400)} height={num(b, 'altura', 200)} />;
    } else if (b.type === 'smath-original') {
      // região do SMath sem equivalente (E7.1): fica no lugar, com o aviso; o XML original está no bloco
      content = <div className={s.regionUnsupported}>{b.attrs.descricao ?? 'Não suportado (região do SMath)'}</div>;
    } else if (b.type === 'imagem') {
      content = <SheetImage dir={doc.path ? dirname(doc.path) : ''} path={b.body.trim()} width={num(b, 'largura', 0) || undefined} height={num(b, 'altura', 0) || undefined} />;
    } else if (b.type === 'tabela' && /^origem: smath/m.test(b.body)) {
      content = <div className={s.regionImported}>Tabela importada do SMath (os dados ainda não são mostrados)</div>;
    } else content = <pre className={s.regionPre}>{b.body}</pre>;
    return (
      <div key={r.key} data-region={r.id} className={cls} style={style} onPointerDown={(e) => onRegionDown(e, r.id)} onContextMenu={(e) => regionMenu(e, r)}
        {...(locked(r.id) ? ({ inert: '' } as object) : {})} /* área travada: nada de dentro recebe foco (E6) */ title={'desativado' in b.attrs ? 'Avaliação desativada' : undefined}>
        {b.attrs.descricao && b.type !== 'smath-original' && <div className={s.regionDesc}>{b.attrs.descricao}</div>}
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
        onPointerDown={onSheetDown} onKeyDown={onSheetKey}
        onContextMenu={(e) => { // área vazia: formato do documento (F-CONFIG)
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY, items: [{ label: 'Formato do documento...', run: () => set({ formatDialog: { scope: 'doc', docId: doc.id } }) }] });
        }}>
        {regions.filter((r) => r.seg.type !== 'area' && r.seg.type !== 'fim-area' && !hidden(r.id)).map(regionView)}
        {areas.map((a) => {
          const top = a.top - shiftAt(a.top, a.region.id);
          return (
            <div key={a.region.key} data-area={a.region.id} className={s.area} style={{ top, height: a.collapsed ? AREA_HEAD : a.bottom - a.top }} onContextMenu={(e) => areaMenu(e, a)}>
              <div className={s.areaHead}>
                <button type="button" className={s.areaToggle} aria-label={a.collapsed ? 'Expandir área' : 'Recolher área'} aria-expanded={!a.collapsed}
                  onPointerDown={(e) => e.stopPropagation()} onClick={() => setAttr(a.region.id, 'recolhida', a.collapsed ? null : true)}>
                  <Icon name="chevron" size={14} stroke={2} className={a.collapsed ? undefined : s.areaOpen} />
                </button>
                <span className={s.areaTitle}>{a.titulo}</span>
                {a.locked && <Icon name="lock" size={12} stroke={2} />}
              </div>
            </div>
          );
        })}
        {cross && <div className={s.cross} style={{ left: cross.x, top: cross.y }} aria-hidden="true" />}
        {band && <div className={s.band} style={{ left: Math.min(band.x0, band.x1), top: Math.min(band.y0, band.y1), width: Math.abs(band.x1 - band.x0), height: Math.abs(band.y1 - band.y0) }} />}
      </div>
    </div>
  );

  return (
    <>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
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
