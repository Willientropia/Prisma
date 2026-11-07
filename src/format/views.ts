// Leituras derivadas do documento para os painéis. Não alteram o arquivo.
import type { DocType } from '../constants';
import { lines, type BlockSegment, type PrismaDoc } from './doc';

export function docType(path: string): DocType | null {
  if (path.endsWith('.caderno.md')) return 'caderno';
  if (path.endsWith('.folha.md')) return 'folha';
  if (path.endsWith('.lib.md')) return 'lib';
  if (path.endsWith('.tex')) return 'tex';
  return null;
}

const TAGS: Record<string, string> = { funcao: 'FUN', calc: 'CAL', verificar: 'VER', grafico: 'GRA', tabela: 'TAB', texto: 'TXT', teste: 'TST' };
export const blockTag = (type: string) => TAGS[type] ?? 'BLO';

// start/end: posição no texto do arquivo (end sem a quebra de linha final), para editar só aquele trecho.
export type OutlineItem =
  | { kind: 'text'; key: string; tag: 'TIT' | 'TXT'; label: string; raw: string; text: string; level: number; start: number; end: number }
  | { kind: 'block'; key: string; tag: string; label: string; block: BlockSegment; start: number; end: number; bodyStart: number };

const noNl = (s: string) => s.replace(/\r?\n$/, '');

/** Estrutura do caderno: títulos, parágrafos e blocos, na ordem do arquivo. */
export function outline(doc: PrismaDoc): OutlineItem[] {
  const out: OutlineItem[] = [];
  const full = doc.frontmatterRaw + doc.segments.map((s) => s.raw).join('');
  let pos = doc.frontmatterRaw.length;
  doc.segments.forEach((seg, si) => {
    const segStart = pos;
    pos += seg.raw.length;
    if (seg.kind === 'block') {
      const bodyStart = segStart + (lines(seg.raw)[0]?.length ?? 0);
      out.push({ kind: 'block', key: `b${si}`, tag: blockTag(seg.type), label: seg.id ?? seg.type, block: seg, start: segStart, end: segStart + noNl(seg.raw).length, bodyStart });
      return;
    }
    // parágrafo = linhas não vazias seguidas; título (#) é sempre um item sozinho
    let at = segStart;
    let para: { start: number; end: number } | null = null;
    let pi = 0;
    const flush = () => {
      if (!para) return;
      const text = full.slice(para.start, para.end);
      const h = /^(#{1,6})\s+(.*)$/.exec(text);
      const shown = h ? h[2] : text;
      out.push({ kind: 'text', key: `t${si}.${pi++}`, tag: h ? 'TIT' : 'TXT', label: shown.length > 42 ? shown.slice(0, 40) + '…' : shown, raw: text, text: shown, level: h ? h[1].length : 0, ...para });
      para = null;
    };
    for (const l of lines(seg.raw)) {
      const content = noNl(l);
      if (!content.trim()) flush();
      else {
        if (/^#{1,6}\s/.test(content)) flush();
        para = para ? { start: para.start, end: at + content.length } : { start: at, end: at + content.length };
        if (/^#{1,6}\s/.test(content)) flush();
      }
      at += l.length;
    }
    flush();
  });
  return out;
}

export type Assignment = { name: string; value: string; unit: string; block: string };

/** Atribuições numéricas "L := 25 m" dos blocos calc, na ordem de avaliação. */
export function assignments(blocks: BlockSegment[]): Assignment[] {
  return blocks.filter((b) => b.type === 'calc').flatMap((b) =>
    lines(b.body).flatMap((l) => {
      const m = /^\s*([^\s(:=]+)\s*:=\s*(-?[\d.]+(?:e-?\d+)?)\s*(.*?)\s*$/.exec(l.replace(/#.*/, ''));
      return m ? [{ name: m[1], value: m[2], unit: m[3], block: b.id ?? '' }] : [];
    }),
  );
}

/** Folha: avaliação de cima para baixo e da esquerda para a direita (y, depois x). */
export function byPosition(blocks: BlockSegment[]): BlockSegment[] {
  const n = (b: BlockSegment, k: string) => Number(b.attrs[k] ?? 0);
  return [...blocks].sort((a, b) => n(a, 'y') - n(b, 'y') || n(a, 'x') - n(b, 'x'));
}

export type LibFunction = {
  sig: string;
  description: string;
  formula: string;
  fields: Record<string, string>; // Parâmetros, Retorna, Por que e quando usar, Fonte, Origem
  tests: string[];
};

/** Biblioteca: cada seção ## é uma função (SPEC 3.7). */
export function libFunctions(doc: PrismaDoc): LibFunction[] {
  const fns: LibFunction[] = [];
  let cur: LibFunction | undefined;
  for (const seg of doc.segments) {
    if (seg.kind === 'block') {
      if (!cur) continue;
      if (seg.type === 'funcao') cur.formula = seg.body.trim();
      if (seg.type === 'teste') cur.tests.push(...lines(seg.body).map((l) => l.trim()).filter(Boolean));
      continue;
    }
    for (const raw of lines(seg.raw)) {
      const l = raw.trim();
      const h = /^##\s+(.*)$/.exec(l);
      if (h) { cur = { sig: h[1], description: '', formula: '', fields: {}, tests: [] }; fns.push(cur); continue; }
      if (!cur || !l) continue;
      const f = /^[-*]\s+\*\*(.+?):\*\*\s*(.*)$/.exec(l);
      if (f) cur.fields[f[1]] = f[2];
      else if (!cur.description && !l.startsWith('#')) cur.description = l;
    }
  }
  return fns;
}

export type TexSection = { line: number; level: number; title: string; number: string };

/** Seções de um .tex (\section, \subsection, \subsubsection), numeradas como o LaTeX faria. */
export function texOutline(text: string): TexSection[] {
  const count = [0, 0, 0];
  const out: TexSection[] = [];
  lines(text).forEach((l, i) => {
    const m = /^\s*\\(section|subsection|subsubsection)(\*?)\{([^}]*)\}/.exec(l);
    if (!m) return;
    const level = ['section', 'subsection', 'subsubsection'].indexOf(m[1]);
    let number = '';
    if (!m[2]) {
      count[level]++;
      count.fill(0, level + 1);
      number = count.slice(0, level + 1).join('.');
    }
    out.push({ line: i + 1, level, title: m[3], number });
  });
  return out;
}
