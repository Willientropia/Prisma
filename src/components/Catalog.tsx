// Catálogo de funções (Ctrl+E) e de unidades (Ctrl+W), ADENDO 06, 4.9: categorias, lista com busca e detalhe; Enter ou duplo clique insere.
import { useState, type ReactNode } from 'react';
import type { CatalogItem } from '../shell/catalogo';
import s from './Catalog.module.css';

const norm = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function Catalog(p: { title: string; categories: string[]; items: CatalogItem[]; recent: string[]; math: (latex: string) => ReactNode; onPick: (it: CatalogItem) => void; onClose: () => void }) {
  const [cat, setCat] = useState('Todas');
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const cats = ['Todas', 'Recentes', ...p.categories];
  const pool = cat === 'Todas' ? p.items : cat === 'Recentes' ? p.recent.map((k) => p.items.find((x) => x.cat + x.name === k)).filter((x): x is CatalogItem => !!x) : p.items.filter((x) => x.cat === cat);
  const shown = pool.filter((x) => norm(`${x.sig} ${x.cat} ${x.desc}`).includes(norm(q)));
  const sel = shown[Math.min(i, shown.length - 1)];
  return (
    <div className={s.overlay} onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div role="dialog" aria-modal="true" aria-label={p.title} className={s.dialog}>
        <div className={s.head}>{p.title}</div>
        <div className={s.body}>
          <div role="listbox" aria-label="Categorias" className={s.cats}>
            {cats.map((c) => <button key={c} type="button" role="option" aria-selected={c === cat} className={c === cat ? s.catOn : s.cat} onMouseDown={(e) => e.preventDefault() /* a busca continua com o foco */} onClick={() => { setCat(c); setI(0); }}>{c}</button>)}
          </div>
          <div className={s.mid}>
            <input autoFocus className={s.search} placeholder="Buscar" aria-label="Buscar no catálogo" value={q}
              onChange={(e) => { setQ(e.target.value); setI(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, shown.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)); }
                if (e.key === 'Enter' && sel) { e.preventDefault(); p.onPick(sel); }
                if (e.key === 'Escape') { e.stopPropagation(); p.onClose(); }
              }} />
            <div role="listbox" aria-label="Itens" className={s.list}>
              {shown.length === 0 && <div className={s.empty}>Nada encontrado</div>}
              {shown.map((x, k) => (
                <button key={x.cat + x.sig} type="button" role="option" aria-selected={x === sel} className={x === sel ? s.itemOn : s.item}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => setI(k)} onDoubleClick={() => p.onPick(x)}>
                  <span className={s.sig}>{x.sig}</span><span className={s.itemCat}>{x.cat}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={s.detail}>
            {sel && <>
              <div className={s.detSig}>{sel.sig}</div>
              <div className={s.detMath}>{p.math(sel.formula)}</div>
              <div className={s.detDesc}>{sel.desc}</div>
              <div className={s.detHint}>Enter ou duplo clique insere</div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
