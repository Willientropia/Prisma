// Corpo das guias matemáticas do ribbon (ADENDO 06, 4.7 e 4.8): quatro tipos de botão e a dica depois de 400 ms parado.
import { useEffect, useRef, useState } from 'react';
import type { MathButton, MathGroup } from '../shell/ribbonMath';
import { StructIconView } from './Icon';
import s from './RibbonMath.module.css';

type Tip = { b: MathButton; x: number; y: number };

export function RibbonMath(p: { groups: MathGroup[]; canInsert: boolean; onInsert: (latex: string) => void }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
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
        onClick={() => !off && b.latex && p.onInsert(b.latex)} /* aria-disabled e não disabled: botão desabilitado também mostra a dica (4.8) */
        onMouseEnter={(e) => enter(b, e.currentTarget)} onMouseLeave={leave}>
        {g.kind === 'grid' || g.kind === 'text' ? b.sym : <>{look}<span>{b.label}</span></>}
      </button>
    );
  };

  return (
    <>
      {p.groups.map((g) => (
        <div key={g.title} className={s.group}>
          <div className={{ big: s.bigRow, small: s.smallCols, grid: s.gridBox, text: s.textBox }[g.kind]} style={g.cols ? { gridTemplateColumns: `repeat(${g.cols}, ${g.kind === 'grid' ? '26px' : 'auto'})` } : undefined}>
            {g.buttons.map((b) => button(g, b))}
          </div>
          <div className={s.title}>{g.title}</div>
        </div>
      ))}
      {tip && (
        <div className={s.tip} role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className={s.tipHead}><span className={s.tipName}>{tip.b.label}</span><span className={s.tipKey}>{tip.b.key || 'sem atalho'}</span></div>
          <div className={s.tipDesc}>{tip.b.desc}</div>
          {!tip.b.latex ? <div className={s.tipOff}>Ainda não disponível</div> : !p.canInsert && <div className={s.tipOff}>Clique numa região de cálculo</div>}
        </div>
      )}
    </>
  );
}
