// Painel Projeto (ADENDO 01, A6): árvore do .prsp com Arquivos, Documentos e Bibliotecas.
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { Tag } from '../components/ui';
import { TIPO_INFO, type DocType } from '../constants';
import { tipoByExt } from '../format/views';
import { basename, displayPath, joinPath } from '../format/display';
import { platform } from '../platform';
import { useWorkspace, activeDoc, type ProjectList, type OpenDoc } from '../store/workspace';
import s from './project.module.css';

type MenuItem = { label: string; run: () => void };
type MenuState = { x: number; y: number; items: MenuItem[] } | null;

/** Menu de contexto simples na posição do clique. Fecha com Esc ou clique fora. */
function ContextMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  useEffect(() => {
    if (!menu) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [menu, onClose]);
  if (!menu) return null;
  return (
    <>
      <div className={s.backdrop} onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className={s.menu} role="menu" style={{ left: menu.x, top: menu.y }}>
        {menu.items.map((it) => (
          <button key={it.label} type="button" role="menuitem" className={s.mi} onClick={() => { onClose(); it.run(); }}>{it.label}</button>
        ))}
      </div>
    </>
  );
}

const GROUPS: [ProjectList, string][] = [['arquivos', 'Arquivos'], ['documentos', 'Documentos'], ['bibliotecas', 'Bibliotecas']];
const NEW: [DocType, string][] = [['caderno', 'Novo caderno no projeto'], ['folha', 'Nova folha no projeto'], ['tex', 'Novo documento LaTeX no projeto'], ['lib', 'Nova biblioteca no projeto']];

export function ProjectTree() {
  const ws = useWorkspace();
  const p = ws.project;
  const [menu, setMenu] = useState<MenuState>(null);
  if (!p) return null;

  const at = (e: MouseEvent, items: MenuItem[]) => { e.preventDefault(); e.stopPropagation(); setMenu({ x: e.clientX, y: e.clientY, items }); };
  const panelMenu: MenuItem[] = [
    { label: 'Adicionar arquivo existente', run: () => void ws.projectAddExisting() },
    ...NEW.map(([t, label]) => ({ label, run: () => void ws.projectNewFile(t) })),
  ];

  return (
    <div className={s.tree} onContextMenu={(e) => at(e, panelMenu)}>
      {GROUPS.map(([k, title]) => (
        <div key={k}>
          <div className={s.group}>{title}<span className={s.count}>{p.lists[k].length}</span></div>
          {p.lists[k].length === 0 && <div className={s.empty}>Nenhum</div>}
          {p.lists[k].map((rel) => {
            const abs = joinPath(p.dir, rel);
            const exists = p.exists[rel] !== false;
            const t = tipoByExt(rel);
            const items: MenuItem[] = exists
              ? [
                  { label: 'Abrir', run: () => void ws.openFile(abs) },
                  { label: 'Renomear', run: () => void ws.projectRename(rel) },
                  { label: 'Remover do projeto', run: () => void ws.projectRemove(rel) },
                  { label: 'Mostrar no Explorador', run: () => void platform.reveal(abs) },
                ]
              : [
                  { label: 'Localizar...', run: () => void ws.projectLocate(rel) },
                  { label: 'Remover do projeto', run: () => void ws.projectRemove(rel) },
                ];
            return (
              <button key={rel} type="button" className={exists ? s.item : s.missing} title={displayPath(abs)}
                onDoubleClick={() => exists && void ws.openFile(abs)}
                onKeyDown={(e) => e.key === 'Enter' && exists && void ws.openFile(abs)}
                onContextMenu={(e) => at(e, items)}>
                {t && <Tag color={exists ? TIPO_INFO[t]?.color : undefined}>{TIPO_INFO[t]?.tag}</Tag>}
                <span className={s.name}>{basename(rel)}</span>
                {!exists && <span className={s.notFound}>não encontrado</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className={s.hint}>Duplo clique abre. Botão direito: mais opções.</div>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </div>
  );
}

/**
 * Painel esquerdo dos editores. Com o documento ativo dentro do projeto aberto, ganha as guias
 * Estrutura e Projeto (32 px, estilo das guias do ribbon); fora de projeto, só a Estrutura.
 */
export function LeftPanel({ doc, className, children }: { doc: OpenDoc; className: string; children: ReactNode }) {
  const inProject = useWorkspace((x) => !!x.projectPathOf(doc.path));
  const isActive = useWorkspace((x) => activeDoc(x)?.id === doc.id);
  const [tab, setTab] = useState<'estrutura' | 'projeto'>('estrutura');
  if (!inProject || !isActive) return <aside className={className}>{children}</aside>;
  return (
    <aside className={className}>
      <div role="tablist" aria-label="Painel esquerdo" className={s.tabs}>
        {(['estrutura', 'projeto'] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? s.tabOn : s.tab} onClick={() => setTab(t)}>
            {t === 'estrutura' ? 'Estrutura' : 'Projeto'}
          </button>
        ))}
      </div>
      {tab === 'estrutura' ? children : <ProjectTree />}
    </aside>
  );
}
