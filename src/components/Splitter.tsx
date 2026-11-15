// Divisória arrastável na borda de um painel lateral (pedido do usuário, 14/11): arrastar muda a largura,
// setas do teclado mudam de 16 em 16 px, duplo clique volta à largura padrão.
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import s from './Splitter.module.css';

type Props = {
  side: 'left' | 'right'; // borda em que fica: a do painel esquerdo é a da direita dele, e vice-versa
  width: number; min: number; max: number; label: string;
  onMove: (w: number) => void; // durante o arrasto (sem gravar)
  onCommit: (w: number) => void; // ao soltar, na seta ou no duplo clique
  onReset: () => void;
};

export function Splitter(p: Props) {
  const drag = useRef<{ x0: number; w0: number; w: number } | null>(null);
  const clamp = (w: number) => Math.round(Math.min(p.max, Math.max(p.min, w)));
  const dir = p.side === 'left' ? 1 : -1; // painel esquerdo cresce para a direita; o direito, para a esquerda
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x0: e.clientX, w0: p.width, w: p.width };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.w = clamp(d.w0 + dir * (e.clientX - d.x0));
    p.onMove(d.w);
  };
  const up = () => { const d = drag.current; drag.current = null; if (d && d.w !== d.w0) p.onCommit(d.w); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = { ArrowLeft: -16, ArrowRight: 16 }[e.key];
    if (!k) return;
    e.preventDefault();
    p.onCommit(clamp(p.width + dir * k));
  };
  return (
    <div role="separator" aria-orientation="vertical" aria-label={p.label} aria-valuenow={p.width} aria-valuemin={p.min} aria-valuemax={p.max} tabIndex={0}
      className={p.side === 'left' ? s.atRight : s.atLeft}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onLostPointerCapture={up} onKeyDown={key} onDoubleClick={p.onReset} />
  );
}
