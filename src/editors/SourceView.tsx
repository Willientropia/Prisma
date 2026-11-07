// Exibir > Código-fonte (ADENDO 02, B1): o arquivo inteiro em texto, lado a lado. Para usuário avançado.
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { Annotation } from '@codemirror/state';
import { useWorkspace, type OpenDoc } from '../store/workspace';
import s from './editors.module.css';

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--bg-code)', color: 'var(--tex-text)', fontSize: '12.5px' },
  '.cm-content': { fontFamily: "'JetBrains Mono', monospace", caretColor: 'var(--accent-light)' },
  '.cm-gutters': { backgroundColor: 'var(--bg-code)', color: 'var(--text-linenum)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--hover)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'var(--selection)' },
}, { dark: true });

const external = Annotation.define<boolean>(); // mudança vinda da parte visual

export function SourceView({ doc }: { doc: OpenDoc }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const edit = useWorkspace((x) => x.edit);
  const id = useRef(doc.id);
  id.current = doc.id;

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      doc: doc.text,
      extensions: [
        basicSetup, theme, EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (!u.docChanged || u.transactions.every((t) => t.annotation(external))) return;
          edit(id.current, 0, useWorkspace.getState().openDocs.find((d) => d.id === id.current)?.text.length ?? 0, u.state.doc.toString());
        }),
      ],
    });
    view.current = v;
    return () => v.destroy();
  }, []);

  // o arquivo mudou pela parte visual: atualiza o código sem gerar edição de volta
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== doc.text) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: doc.text }, annotations: external.of(true) });
  }, [doc.text]);

  return <div ref={host} className={s.source} aria-label="Código-fonte" />;
}

