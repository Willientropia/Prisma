// Texto do caderno editado já formatado (ADENDO 02, B1 e B7): TipTap, gravado como Markdown.
import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

/** Editor com foco mais recente: os botões do grupo Texto do ribbon agem nele. */
export let activeTextEditor: Editor | null = null;

/** [[nota]] / [[nota#id]] / [[nota|rótulo]] viram links prisma: no editor e voltam ao gravar. */
const toEditor = (md: string) => md.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => `[${label ?? target.split('#')[0]}](prisma:${encodeURI(target)})`);
const fromEditor = (md: string) =>
  md.replace(/\[([^\]]*)\]\(prisma:([^)]+)\)/g, (_, label: string, href: string) => {
    const target = decodeURI(href);
    return label === target.split('#')[0] ? `[[${target}]]` : `[[${target}|${label}]]`;
  });

type Props = {
  markdown: string;
  className?: string;
  autoFocus?: boolean;
  onChange: (md: string) => void; // só quando o usuário edita
  resolveLink?: (target: string) => string | null;
  onOpenLink?: (target: string) => void;
};

export function TextEditor({ markdown, className, autoFocus, onChange, resolveLink, onOpenLink }: Props) {
  const cb = useRef({ onChange, resolveLink, onOpenLink });
  cb.current = { onChange, resolveLink, onOpenLink };
  const timer = useRef(0);
  // último Markdown que editor e arquivo têm em comum: comparar com ele evita serializar o texto todo
  // a cada render (num .prsm de 1 MB isso sozinho passava de 400 ms, C7-02)
  const synced = useRef(markdown);

  const markLinks = (ed: Editor) => {
    ed.view.dom.querySelectorAll('a[href^="prisma:"]').forEach((a) => {
      const ok = cb.current.resolveLink?.(decodeURI(a.getAttribute('href')!.slice(7))) ?? true;
      a.classList.toggle('broken-link', !ok);
      a.setAttribute('title', ok ? 'Ctrl+clique para abrir' : 'Arquivo não encontrado');
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Link.configure({ openOnClick: false, autolink: false, protocols: ['prisma'] }),
      Markdown.configure({ html: false, linkify: false, breaks: false, transformPastedText: true }),
    ],
    content: toEditor(markdown),
    onCreate: ({ editor: ed }) => markLinks(ed),
    onFocus: ({ editor: ed }) => { activeTextEditor = ed; },
    onUpdate: ({ editor: ed }) => {
      markLinks(ed);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const md = fromEditor((ed.storage as { markdown: { getMarkdown(): string } }).markdown.getMarkdown());
        synced.current = md;
        cb.current.onChange(md);
      }, 300);
    },
    editorProps: {
      handleClickOn: (_view, _pos, _node, _nodePos, event) => {
        const a = (event.target as HTMLElement).closest('a');
        const href = a?.getAttribute('href');
        if (href?.startsWith('prisma:') && (event.ctrlKey || event.metaKey)) { cb.current.onOpenLink?.(decodeURI(href.slice(7))); return true; }
        return false;
      },
    },
  });

  // mudança vinda de fora (outra edição, arquivo alterado no disco): só aplica fora de edição
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    if (markdown !== synced.current) { editor.commands.setContent(toEditor(markdown), false); synced.current = markdown; }
    markLinks(editor);
  }, [markdown, editor]);

  useEffect(() => { if (autoFocus && editor && !editor.isFocused) editor.commands.focus('end'); }, [autoFocus, editor]);

  useEffect(() => () => { clearTimeout(timer.current); if (activeTextEditor === editor) activeTextEditor = null; }, [editor]);

  return <EditorContent editor={editor} className={`prose-editor ${className ?? ''}`} />;
}
