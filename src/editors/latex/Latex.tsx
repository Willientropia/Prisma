import { useEffect, useMemo } from 'react';
import { PanelHeader, Row } from '../../components/ui';
import { lines } from '../../format/doc';
import { texOutline } from '../../format/views';
import { dirname } from '../../format/display';
import { LeftPanel } from '../../shell/ProjectPanel';
import { useWorkspace, type OpenDoc } from '../../store/workspace';
import s from '../editors.module.css';

/** Realce mínimo: comandos \x e comentários %. CodeMirror chega na fase 5. */
function highlight(line: string) {
  const c = /(^|[^\\])%/.exec(line);
  const code = c ? line.slice(0, c.index + c[1].length) : line;
  const comment = c ? line.slice(c.index + c[1].length) : '';
  const parts = code.split(/(\\[a-zA-Z@]+)/);
  return <>{parts.map((p, i) => (i % 2 ? <span key={i} className={s.kw}>{p}</span> : p))}{comment && <span className={s.cm}>{comment}</span>}</>;
}

export function Latex({ doc }: { doc: OpenDoc }) {
  const ls = useMemo(() => lines(doc.text).map((l) => l.replace(/\r?\n$/, '')), [doc.text]);
  const sections = useMemo(() => texOutline(doc.text), [doc.text]);
  const dir = doc.path ? dirname(doc.path) : '';
  const siblings = useWorkspace((x) => x.dirFiles[dir]);
  const inProject = useWorkspace((x) => !!x.projectPathOf(doc.path));
  const loadDir = useWorkspace((x) => x.loadDir);
  useEffect(() => { if (dir) void loadDir(dir); }, [dir, loadDir]);
  const goto = (n: number) => document.querySelector(`[data-line="${n}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  return (
    <>
      <LeftPanel doc={doc} className={s.left}>
        <PanelHeader title="Documento" />
        <div className={s.list}>
          {sections.map((x) => (
            <Row key={x.line} onClick={() => goto(x.line)} className={x.level ? s.indent : undefined}>{x.number ? `${x.number}  ` : ''}{x.title}</Row>
          ))}
          {sections.length === 0 && <div className={s.note}>Nenhuma seção.</div>}
        </div>
        <PanelHeader title="Arquivos do projeto" />
        <div className={s.list}>
          {(siblings ?? []).map((f) => <Row key={f} className={s.mono}>{f}</Row>)}
          {!doc.path && <div className={s.note}>Salve o documento para ver a pasta.</div>}
        </div>
      </LeftPanel>

      <main className={s.center}>
        <div className={s.split}>
          <div className={s.code}>
            <div className={s.codeLines}>
              {ls.map((l, i) => (
                <div key={i} data-line={i + 1} className={/\\(resultado|figura)\{/.test(l) ? `${s.codeRow} ${s.inserted}` : s.codeRow}>
                  <span className={s.ln}>{i + 1}</span><span className={s.codeText}>{highlight(l)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={s.pdfPane}><div className={s.pdfEmpty}>PDF ainda não compilado</div></div>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Resultados disponíveis" />
        <div className={s.note}>Escolha o que inserir no documento. Nada é sincronizado sem você pedir.</div>
        <div className={s.note}>{inProject ? 'Nenhum resultado calculado no projeto ainda.' : 'Adicione este documento a um projeto para inserir resultados.'}</div>
        <div className={s.gap} />
        <PanelHeader title="Saída da compilação" />
        <div className={s.compileOut}>Ainda não compilado.</div>
      </aside>
    </>
  );
}
