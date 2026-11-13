// Corpo das guias matemáticas do ribbon (ADENDO 06, 4.7 e 4.8): quatro tipos de botão, dica depois de 400 ms parado
// e, em janela estreita, grupos recolhidos da direita para a esquerda, cada um num botão com menu (a altura não muda).
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MathButton, MathGroup } from '../shell/ribbonMath';
import { Icon, StructIconView } from './Icon';
import s from './RibbonMath.module.css';

type Tip = { b: MathButton; x: number; y: number };
const FOLD_W = 90; // largura do grupo recolhido (botão de 72 px + margens), igual ao CSS de .fold

export function RibbonMath(p: { groups: MathGroup[]; canInsert: boolean; onInsert: (latex: string) => void }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [folded, setFolded] = useState(0); // quantos grupos, contados da direita, estão recolhidos
  const [open, setOpen] = useState<{ i: number; x: number; y: number } | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // mede os grupos abertos no primeiro desenho (o Shell remonta o componente a cada guia) e recolhe o que não cabe
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const widths = [...el.children].map((c) => (c as HTMLElement).offsetWidth);
    const fit = () => {
      let k = 0;
      const need = (n: number) => widths.slice(0, widths.length - n).reduce((a, b) => a + b, 0) + n * FOLD_W;
      while (k < widths.length && need(k) > el.clientWidth) k++;
      setFolded(k);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const enter = (b: MathButton, el: HTMLElement) => {
    clearTimeout(timer.current);
    const r = el.getBoundingClientRect();
    timer.current = window.setTimeout(() => setTip({ b, x: r.left, y: r.bottom + 4 }), 400);
  };
  const leave = () => { clearTimeout(timer.current); setTip(null); };

  const button = (g: MathGroup, b: MathButton) => {
    const off = !b.latex || !p.canInsert;
    const look = b.icon ? <StructIconView name={b.icon} size={g.kind === 'big' ? 26 : 16} stroke={g.kind === 'big' ? 1.5 : 1.8} />
      : <span className={g.kind === 'big' ? s.bigSym : s.smallSym}>{b.sym}</span>;
    const cls = { big: s.big, small: s.small, grid: s.grid, text: s.text }[g.kind];
    return (
      <button key={b.label} type="button" className={cls} aria-disabled={off} aria-label={b.label}
        onMouseDown={(e) => e.preventDefault() /* o foco fica no campo em edição */}
        onClick={() => { if (!off && b.latex) { setOpen(null); p.onInsert(b.latex); } }} /* aria-disabled e não disabled: botão desabilitado também mostra a dica (4.8) */
        onMouseEnter={(e) => enter(b, e.currentTarget)} onMouseLeave={leave}>
        {g.kind === 'grid' || g.kind === 'text' ? b.sym : <>{look}<span>{b.label}</span></>}
      </button>
    );
  };
  const body = (g: MathGroup) => (
    <div className={{ big: s.bigRow, small: s.smallCols, grid: s.gridBox, text: s.textBox }[g.kind]} style={g.cols ? { gridTemplateColumns: `repeat(${g.cols}, ${g.kind === 'grid' ? '26px' : 'auto'})` } : undefined}>
      {g.buttons.map((b) => button(g, b))}
    </div>
  );
  const firstFolded = p.groups.length - folded;

  return (
    <div ref={row} className={s.row}>
      {p.groups.map((g, i) => (
        <div key={g.title} className={s.group}>
          {i < firstFolded ? body(g) : (
            <button type="button" className={`${s.big} ${s.fold}`} aria-haspopup="menu" aria-expanded={open?.i === i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOpen(open?.i === i ? null : { i, x: r.left, y: r.bottom + 2 }); }}>
              <span className={s.foldName}>{g.title}</span><Icon name="chevron" size={14} stroke={1.8} className={s.foldIcon} />
            </button>
          )}
          <div className={s.title}>{g.title}</div>
        </div>
      ))}
      {open && p.groups[open.i] && (
        <>
          <div className={s.shade} onMouseDown={(e) => { e.preventDefault(); setOpen(null); }} />
          <div className={s.pop} role="menu" aria-label={p.groups[open.i].title} style={{ left: open.x, top: open.y }}>{body(p.groups[open.i])}</div>
        </>
      )}
      {tip && (
        <div className={s.tip} role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className={s.tipHead}><span className={s.tipName}>{tip.b.label}</span><span className={s.tipKey}>{tip.b.key || 'sem atalho'}</span></div>
          <div className={s.tipDesc}>{tip.b.desc}</div>
          {!tip.b.latex ? <div className={s.tipOff}>Ainda não disponível</div> : !p.canInsert && <div className={s.tipOff}>Clique numa região de cálculo</div>}
        </div>
      )}
    </div>
  );
}
