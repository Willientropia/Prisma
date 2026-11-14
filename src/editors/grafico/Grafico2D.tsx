// Gráfico 2D de função (ADENDO 06, 5.4) na folha e no caderno: desenho em SVG, campo das séries embaixo,
// roda para zoom no ponteiro, mover com a ferramenta ou o botão do meio, duplo clique volta à vista automática.
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { Graph2D } from '../../engine/grafico';
import { fmtNum } from '../../engine/format';
import { setView, type View } from '../../format/grafico';
import { latexToLine, nodeLatex, nodeToLinear, parseLinear } from '../../format/mathlinear';
import { MathField, MathMarkup, type Key } from '../../math/MathField';
import { LIVE_MS } from '../../math/MathLine';
import { niceTicks, pathOf, px, py, tickText, unpx, zoomView, type Frame } from './eixos';
import s from './grafico.module.css';

export type GraphTool = 'mover' | 'zoom' | null;
const M = { left: 46, right: 12, top: 10, bottom: 36 }; // margens da área de desenho (números e rótulos dos eixos)
const WHEEL = 1.15; // fator por passo da roda
const SAVE_MS = 250; // a vista vai para o arquivo quando o zoom ou o movimento param
const MIN_W = 160, MIN_H = 120, SNAP = 10;
const AUTO: View = { x: [-5, 5], y: [-5, 5] };

/** Separa os itens do campo pelo ";" de fora dos parênteses (o de dentro separa argumentos). */
function splitTop(latex: string): string[] {
  const out = [''];
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const ch = latex[i];
    if ('({['.includes(ch)) depth++;
    else if (')}]'.includes(ch)) depth--;
    if (ch === ';' && depth === 0 && latex[i - 1] !== '\\') out.push('');
    else out[out.length - 1] += ch;
  }
  return out.map((x) => x.trim()).filter(Boolean);
}
const itemLatex = (x: string) => {
  try { const l = parseLinear(x); return nodeLatex(l.kind === 'def' ? l.rhs : l.expr); } catch { return `\\text{${x.replace(/[\\{}]/g, '')}}`; }
};
const seriesLatex = (list: string[]) => list.map(itemLatex).join(';\\ ');
/** Do campo para as séries do arquivo; null: algum item incompleto. */
function fromLatex(latex: string): string[] | null {
  const out: string[] = [];
  for (const piece of splitTop(latex)) {
    try { const l = latexToLine(piece); if (l.kind === 'def') return null; out.push(nodeToLinear(l.expr)); } catch { return null; }
  }
  return out;
}

type FieldProps = { list: string[]; theme: 'dark' | 'paper'; focused?: boolean; initialKeys?: Key[]; onReady?: () => void; onWrite: (list: string[]) => void; onFocus?: () => void; onExit?: () => void; onEnter?: () => void };
function SeriesField(p: FieldProps) {
  const [bad, setBad] = useState(false);
  const live = useRef(0);
  useEffect(() => () => clearTimeout(live.current), []);
  const key = p.list.join('\n');
  const latex = useMemo(() => seriesLatex(p.list), [key]);
  const write = (l: string) => {
    const r = fromLatex(l);
    setBad(r === null);
    if (r && r.join('\n') !== key) p.onWrite(r);
  };
  return (
    <div className={s.field}>
      <MathField latex={latex} ctx={{}} theme={p.theme} size={18} focused={p.focused} initialKeys={p.initialKeys} onReady={p.onReady} invalid={bad} ariaLabel="Expressão do gráfico"
        onInput={(l) => { clearTimeout(live.current); live.current = window.setTimeout(() => write(l), LIVE_MS); }}
        onCommit={(l, how) => { clearTimeout(live.current); write(l); if (how === 'escape') p.onExit?.(); else if (how !== 'blur') p.onEnter?.(); }}
        onFocus={p.onFocus} onLeave={p.onExit} />
    </div>
  );
}

type Props = {
  data?: Graph2D; body: string; list: string[]; width: number; height: number; theme: 'dark' | 'paper';
  tool: GraphTool; active: boolean; // selecionado: a roda faz zoom (sem seleção, a roda rola a página)
  focused?: boolean; initialKeys?: Key[]; onReady?: () => void;
  onBody: (body: string) => void; onSeries: (list: string[]) => void; onResize: (w: number, h: number) => void;
  onSelect?: () => void; onFieldFocus?: () => void; onExit?: () => void; onEnter?: () => void;
};
type Drag = { kind: 'pan' | 'zoom' | 'e' | 's' | 'se'; x0: number; y0: number; f0: Frame; c0: { x: number; y: number }; size0: [number, number] };

export function Grafico2D(p: Props) {
  const d = p.data;
  const [over, setOver] = useState<View | null>(null); // vista durante o zoom ou o movimento, antes de ir ao arquivo
  const [size, setSize] = useState<[number, number] | null>(null); // tamanho durante o arrasto da borda
  const save = useRef(0);
  const drag = useRef<Drag | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const clip = `gc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [W, H] = size ?? [p.width, p.height];
  const view = over ?? (d ? { x: d.x, y: d.y } : AUTO);
  const f: Frame = { left: M.left, top: M.top, w: Math.max(10, W - M.left - M.right), h: Math.max(10, H - M.top - M.bottom), view };
  const now = useRef({ p, f });
  now.current = { p, f };

  useEffect(() => { if (!save.current) setOver(null); }, [d]); // a vista gravada voltou do cálculo
  useEffect(() => setSize(null), [p.width, p.height]);
  useEffect(() => () => clearTimeout(save.current), []);
  const showView = (v: View) => {
    setOver(v);
    clearTimeout(save.current);
    save.current = window.setTimeout(() => { save.current = 0; now.current.p.onBody(setView(now.current.p.body, v)); }, SAVE_MS);
  };

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      const { p: q, f: fr } = now.current;
      if (!q.active) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const c = unpx(fr, e.clientX - r.left, e.clientY - r.top);
      const k = e.deltaY > 0 ? WHEEL : 1 / WHEEL;
      showView(zoomView(fr.view, c.x, c.y, e.ctrlKey ? 1 : k, e.shiftKey ? 1 : k)); // Shift só x, Ctrl só y
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const start = (kind: Drag['kind'], e: PointerEvent<Element>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const r = svg.current!.getBoundingClientRect();
    drag.current = { kind, x0: e.clientX, y0: e.clientY, f0: f, c0: unpx(f, e.clientX - r.left, e.clientY - r.top), size0: [W, H] };
  };
  const move = (e: PointerEvent<Element>) => {
    const g = drag.current;
    if (!g) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0, v = g.f0.view;
    if (g.kind === 'pan') {
      const ux = (dx / g.f0.w) * (v.x[1] - v.x[0]), uy = (dy / g.f0.h) * (v.y[1] - v.y[0]);
      showView({ x: [v.x[0] - ux, v.x[1] - ux], y: [v.y[0] + uy, v.y[1] + uy] });
    } else if (g.kind === 'zoom') {
      const k = Math.exp(dy / 100); // arrastar para baixo afasta
      showView(zoomView(v, g.c0.x, g.c0.y, k, k));
    } else {
      const snap = (x: number, min: number) => Math.max(min, Math.round(x / SNAP) * SNAP);
      setSize([g.kind === 's' ? g.size0[0] : snap(g.size0[0] + dx, MIN_W), g.kind === 'e' ? g.size0[1] : snap(g.size0[1] + dy, MIN_H)]);
    }
  };
  const end = () => {
    const g = drag.current;
    drag.current = null;
    if (g && (g.kind === 'e' || g.kind === 's' || g.kind === 'se') && size && (size[0] !== p.width || size[1] !== p.height)) p.onResize(size[0], size[1]);
  };
  const handlers = { onPointerMove: move, onPointerUp: end, onLostPointerCapture: end };

  const xt = niceTicks(view.x[0], view.x[1], Math.max(2, Math.floor(f.w / 60)));
  const yt = niceTicks(view.y[0], view.y[1], Math.max(2, Math.floor(f.h / 36)));
  const tick = (v: number) => tickText(fmtNum(Number(v.toPrecision(12))));
  const color = (i: number) => `var(--plot-${p.theme === 'paper' ? 'paper-' : ''}s${(i % 5) + 1})`;
  const series = d?.series ?? [];
  return (
    <figure className={`${s.graph} ${p.theme === 'paper' ? s.paper : s.dark}`} style={{ width: W }} data-grafico="2d">
      <div className={s.box} style={{ width: W, height: H }}>
      <svg ref={svg} width={W} height={H} className={s.svg} data-view={JSON.stringify(view)} data-frame={JSON.stringify([f.left, f.top, f.w, f.h])}
        onPointerDown={(e) => {
          p.onSelect?.();
          if (e.button === 1 || (e.button === 0 && p.tool === 'mover')) start('pan', e);
          else if (e.button === 0 && p.tool === 'zoom') start('zoom', e);
        }}
        onMouseDown={(e) => e.button === 1 && e.preventDefault() /* botão do meio não liga a rolagem automática */}
        onDoubleClick={() => { clearTimeout(save.current); save.current = 0; setOver(null); p.onBody(setView(p.body, null)); }}
        {...handlers}>
        <defs><clipPath id={clip}><rect x={f.left} y={f.top} width={f.w} height={f.h} /></clipPath></defs>
        <rect className={s.bg} x={0.5} y={0.5} width={W - 1} height={H - 1} />
        {(d?.grade ?? true) && (
          <g className={s.grid}>
            {xt.ticks.map((t) => <line key={`x${t}`} x1={px(f, t)} x2={px(f, t)} y1={f.top} y2={f.top + f.h} />)}
            {yt.ticks.map((t) => <line key={`y${t}`} x1={f.left} x2={f.left + f.w} y1={py(f, t)} y2={py(f, t)} />)}
          </g>
        )}
        <rect className={s.area} x={f.left} y={f.top} width={f.w} height={f.h} />
        {xt.ticks.map((t) => <text key={`nx${t}`} className={s.num} x={px(f, t)} y={f.top + f.h + 14} textAnchor="middle">{tick(t)}</text>)}
        {yt.ticks.map((t) => <text key={`ny${t}`} className={s.num} x={f.left - 5} y={py(f, t) + 4} textAnchor="end">{tick(t)}</text>)}
        <text className={s.label} x={f.left + f.w / 2} y={H - 5} textAnchor="middle">{d?.rotulos.x ?? 'x'}</text>
        <text className={s.label} transform={`translate(13 ${f.top + f.h / 2}) rotate(-90)`} textAnchor="middle">{d?.rotulos.y ?? 'y'}</text>
        <g clipPath={`url(#${clip})`}>
          {series.map((q, i) => (
            <g key={i} data-series={i} style={{ stroke: color(i), fill: color(i) }}>
              {(d?.linhas ?? true) && <path className={s.line} d={pathOf(f, q.xs, q.ys)} />}
              {d?.pontos && q.xs.map((x, k) => (q.ys[k] === null ? null : <circle key={k} cx={px(f, x)} cy={py(f, q.ys[k]!)} r={2.4} />))}
            </g>
          ))}
        </g>
      </svg>
      {d?.legenda && series.length > 0 && ( // em notação matemática, como o campo: nunca o texto cru com _ (CLAUDE.md)
        <div className={s.legend} style={{ top: f.top + 6, right: W - f.left - f.w + 6 }}>
          {series.map((q, i) => (
            <div key={i} className={s.legendItem}>
              <MathMarkup latex={itemLatex(q.expr)} theme={p.theme} size={11} />
              <span className={s.swatch} style={{ background: color(i) }} />
            </div>
          ))}
        </div>
      )}
      <div className={s.resizeE} onPointerDown={(e) => start('e', e)} {...handlers} />
      <div className={s.resizeS} onPointerDown={(e) => start('s', e)} {...handlers} />
      <div className={s.resizeSE} onPointerDown={(e) => start('se', e)} {...handlers} />
      </div>
      {d?.error && <div className={s.error}>{d.error}</div>}
      <SeriesField list={p.list} theme={p.theme} focused={p.focused} initialKeys={p.initialKeys} onReady={p.onReady} onWrite={p.onSeries} onFocus={p.onFieldFocus} onExit={p.onExit} onEnter={p.onEnter} />
    </figure>
  );
}
