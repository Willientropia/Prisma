import type { ReactNode } from 'react';
import logoUrl from '../../resources/brand/prisma-logo.svg';
import { APP_NAME } from '../constants';
import s from './ui.module.css';

/** Logo principal (seção 4.6). O SVG vem de resources/brand, nunca redesenhado aqui. */
export function Logo({ size }: { size: number }) {
  return <img src={logoUrl} width={size} height={size} alt="" className={s.logo} />;
}

/** Logo + nome escrito, espaço de 32 % da altura do logo. */
export function Wordmark({ size, fontSize }: { size: number; fontSize: number }) {
  return (
    <span className={s.wordmark} style={{ gap: size * 0.32 }}>
      <Logo size={size} />
      <span style={{ fontSize }}>{APP_NAME}</span>
    </span>
  );
}

/** Selo de tipo (CAD, FOL...). Sem cor: selo neutro de aba inativa. */
export function Tag({ children, color, tone }: { children: ReactNode; color?: string; tone?: 'selected' }) {
  const cls = tone === 'selected' ? s.tagSelected : color ? s.tagColored : s.tag;
  return <span className={cls} style={color ? { background: color } : undefined}>{children}</span>;
}

export function PanelHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return <div className={s.panelHeader}><span>{title}</span>{aside != null && <span className={s.panelAside}>{aside}</span>}</div>;
}

export function PropGrid({ rows }: { rows: [string, string][] }) {
  return <>{rows.map(([k, v]) => <div key={k} className={s.kv}><span>{k}</span><span>{v}</span></div>)}</>;
}

type RowProps = { children: ReactNode; active?: boolean; onClick?: () => void; height?: 28 | 32 | 34 | 40; className?: string };

/** Linha de lista em painel (28 px; 34 na navegação inicial; 40 em listas de ação). */
export function Row({ children, active, onClick, height = 28, className }: RowProps) {
  const cls = [active ? s.rowOn : s.row, className].filter(Boolean).join(' ');
  if (!onClick) return <div className={cls} style={{ minHeight: height }}>{children}</div>;
  return <button type="button" className={cls} style={{ minHeight: height }} onClick={onClick}>{children}</button>;
}

export function Badge({ kind, children }: { kind: 'ok' | 'warn'; children: ReactNode }) {
  return <span className={kind === 'ok' ? s.badgeOk : s.badgeWarn}>{children}</span>;
}
