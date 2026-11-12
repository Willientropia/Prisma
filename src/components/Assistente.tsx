// Assistente dinâmico (ADENDO 06, 3.4): lista colada embaixo do cursor e painel de detalhe. Só props; quem decide é o campo.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { MathMarkup } from '../math/MathField';
import css from './Assistente.module.css';

export type AssistRow = { key: string; name: string; kind: 'var' | 'userfn' | 'lib' | 'native' | 'unit' | 'const'; nameLatex: string; category: string };
export type AssistDetail = { nameLatex: string; title: string; line2?: string; note?: string };

const ICON: Record<AssistRow['kind'], IconName> = { var: 'varbox', userfn: 'fnbox', lib: 'lib', native: 'fnboxup', unit: 'ruler', const: 'sigma' };

export function Assistente(p: {
  rows: AssistRow[]; sel: number; detail: AssistDetail | null; x: number; y: number; theme: 'paper' | 'dark';
  onSelect: (i: number) => void; onAccept: (i: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => { (list.current?.children[p.sel] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' }); }, [p.sel]);
  return createPortal(
    // mousedown sem efeito: o campo matemático continua com o foco enquanto se escolhe com o mouse
    <div className={css.wrap} style={{ left: p.x, top: p.y }} onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <div ref={list} className={css.list} role="listbox" aria-label="Assistente dinâmico">
        {p.rows.map((r, i) => (
          <div key={r.key} role="option" aria-selected={i === p.sel} data-name={r.name} data-kind={r.kind}
            className={`${css.item}${i === p.sel ? ` ${css.on}` : ''}`} onClick={() => p.onSelect(i)} onDoubleClick={() => p.onAccept(i)}>
            <span className={`${css.icon} ${css[r.kind]}`}><Icon name={ICON[r.kind]} size={14} /></span>
            <MathMarkup latex={r.nameLatex} theme={p.theme} className={css.name} />
            <span className={css.cat}>{r.category}</span>
          </div>
        ))}
      </div>
      {p.detail && (
        <div className={css.detail} data-assist-detail>
          <div className={css.line}><MathMarkup latex={p.detail.nameLatex} theme={p.theme} /><span> · {p.detail.title}</span></div>
          {p.detail.line2 && <div className={css.line}><MathMarkup latex={p.detail.line2} theme={p.theme} /></div>}
          {p.detail.note && <div className={css.line}>{p.detail.note}</div>}
          <div className={css.hint}>Tab para inserir</div>
        </div>
      )}
    </div>,
    document.body,
  );
}
