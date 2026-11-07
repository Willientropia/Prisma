import { useMemo, useState } from 'react';
import { PanelHeader, PropGrid, Row, Tag } from '../../components/ui';
import { parse, type BlockSegment } from '../../format/doc';
import { outline, type OutlineItem } from '../../format/views';
import type { OpenDoc } from '../../store/app';
import s from '../editors.module.css';

export const BLOCK_LABEL: Record<string, string> = {
  funcao: 'Função', calc: 'Cálculo', verificar: 'Verificação', grafico: 'Gráfico', tabela: 'Tabela', texto: 'Texto', teste: 'Teste',
};
export const blockLabel = (t: string) => BLOCK_LABEL[t] ?? (t || 'Bloco');

export function blockProps(b: BlockSegment): [string, string][] {
  return [
    ['Tipo', blockLabel(b.type)],
    ['Id', b.id ? `#${b.id}` : 'sem id'],
    ...Object.entries(b.attrs),
    ['Linhas', String(b.body.split('\n').filter((l) => l.trim()).length)],
  ];
}

const props = (it: OutlineItem): [string, string][] =>
  it.kind === 'block' ? blockProps(it.block)
    : it.tag === 'TIT' ? [['Tipo', 'Título'], ['Nível', String(it.level)]]
    : [['Tipo', 'Texto'], ['Palavras', String(it.text.split(/\s+/).length)]];

const scrollTo = (key: string) => document.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

// Fase 1: mostra o arquivo como está (texto cru e corpo dos blocos). Fase 2 renderiza Markdown, matemática e resultados.
export function Caderno({ doc }: { doc: OpenDoc }) {
  const parsed = useMemo(() => parse(doc.text), [doc.text]);
  const items = useMemo(() => outline(parsed), [parsed]);
  const [selKey, setSel] = useState<string | null>(null);
  const sel = items.find((i) => i.key === selKey) ?? items.find((i) => i.kind === 'block') ?? items[0];
  const libs = Array.isArray(parsed.meta.bibliotecas) ? (parsed.meta.bibliotecas as unknown[]).map(String) : [];
  const pick = (key: string) => { setSel(key); scrollTo(key); };

  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Estrutura do caderno" aside={items.length} />
        <div className={s.list}>
          {items.map((it) => (
            <Row key={it.key} active={it === sel} onClick={() => pick(it.key)}>
              <Tag tone={it === sel ? 'selected' : undefined}>{it.tag}</Tag><span className={s.ellipsis}>{it.label}</span>
            </Row>
          ))}
        </div>
        <PanelHeader title="Bibliotecas em uso" />
        <div className={s.list}>
          {libs.map((l) => <Row key={l}>{l}</Row>)}
          <Row>Nativas <span className={s.muted}>sempre carregada</span></Row>
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.workspace}>
          <article className={s.page}>
            {parsed.metaError && <p className={s.paperError}>Frontmatter inválido: {parsed.metaError}</p>}
            {items.map((it) => {
              const cls = (base?: string) => [base, it === sel && s.selectedBlock].filter(Boolean).join(' ') || undefined;
              const common = { 'data-key': it.key, onClick: () => setSel(it.key) };
              if (it.kind === 'text') {
                if (it.tag === 'TIT') return it.level === 1
                  ? <h1 key={it.key} {...common} className={cls()}>{it.text}</h1>
                  : <h2 key={it.key} {...common} className={cls(s.pageH2)}>{it.text}</h2>;
                return <p key={it.key} {...common} className={cls(s.prose)}>{it.text}</p>;
              }
              const b = it.block;
              const fn = b.type === 'funcao';
              const lib = b.attrs.salvar ?? b.attrs.biblioteca;
              return (
                <div key={it.key} {...common} className={cls(fn ? s.fnBlock : s.calcBlock)}>
                  <span className={fn ? s.fnLabel : s.blockLabel}>{blockLabel(b.type).toUpperCase()}{lib ? ` · ${lib.toUpperCase()}` : ''}{b.id ? ` · #${b.id}` : ''}</span>
                  <pre className={s.blockBody}>{b.body}</pre>
                </div>
              );
            })}
          </article>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades" aside={sel?.tag} />
        {sel && <PropGrid rows={props(sel)} />}
      </aside>
    </>
  );
}
