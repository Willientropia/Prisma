// Leituras derivadas do documento para os painéis. Não alteram o arquivo.
import type { DocType } from '../constants';
import { lines, type BlockSegment, type PrismaDoc } from './doc';

/** Valor de `tipo` no cabeçalho (ADENDO 01, A1). */
export type Tipo = 'caderno' | 'folha' | 'biblioteca' | 'modelo' | 'projeto' | 'tex';

export const EXT_TIPO: Record<string, Tipo> = { prsm: 'caderno', prsf: 'folha', prsl: 'biblioteca', prst: 'modelo', prsp: 'projeto', tex: 'tex' };
export const TIPO_EXT: Record<Tipo, string> = { caderno: 'prsm', folha: 'prsf', biblioteca: 'prsl', modelo: 'prst', projeto: 'prsp', tex: 'tex' };
/** Editor que abre cada tipo. Modelo abre no editor do tipo-base (modelo_de). */
export const TIPO_EDITOR: Partial<Record<Tipo, DocType>> = { caderno: 'caderno', folha: 'folha', biblioteca: 'lib', tex: 'tex' };
export const EDITOR_TIPO: Record<DocType, Tipo> = { caderno: 'caderno', folha: 'folha', lib: 'biblioteca', tex: 'tex' };

export const extOf = (path: string) => (/\.([^./\\]+)$/.exec(path)?.[1] ?? '').toLowerCase();
/** Tipo pela extensão (para recentes, árvore e diálogos); null se não for do Prisma nem .tex. */
export const tipoByExt = (path: string): Tipo | null => EXT_TIPO[extOf(path)] ?? null;

export type Opened = { tipo: Tipo; editor: DocType | null; warnings: string[]; readOnly: boolean };
export const SUPPORTED_FORMAT = 1;

/** Decide como abrir: o `tipo` do cabeçalho manda; se não bater com a extensão, avisa (A1). */
export function classifyFile(path: string, meta: Record<string, unknown>): Opened {
  const ext = extOf(path);
  const byExt = EXT_TIPO[ext];
  if (byExt === 'tex') return { tipo: 'tex', editor: 'tex', warnings: [], readOnly: false };
  const warnings: string[] = [];
  const head = typeof meta.tipo === 'string' && meta.tipo in TIPO_EXT ? (meta.tipo as Tipo) : undefined;
  const tipo = head ?? byExt;
  if (!tipo) return { tipo: 'caderno', editor: null, warnings: [`Arquivo sem tipo reconhecido: .${ext}`], readOnly: true };
  if (head && byExt && head !== byExt) warnings.push(`O tipo do arquivo (${head}) não corresponde à extensão .${ext}.`);
  if (!head) warnings.push('Cabeçalho sem o campo tipo; aberto pela extensão.');
  let readOnly = false;
  const v = Number(meta.versao_formato);
  if (meta.versao_formato === undefined) warnings.push('Cabeçalho sem versao_formato.');
  else if (v > SUPPORTED_FORMAT) { readOnly = true; warnings.push(`Formato versão ${v} é mais novo que o suportado (${SUPPORTED_FORMAT}): aberto em somente leitura.`); }
  const base = tipo === 'modelo' && typeof meta.modelo_de === 'string' ? (meta.modelo_de as Tipo) : tipo;
  return { tipo, editor: TIPO_EDITOR[base] ?? null, warnings, readOnly };
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

/** Regiões com y diferente em menos disto contam como a mesma linha (ADENDO 05, E3.1). */
export const SAME_ROW_PX = 4;

/** Folha: ordem de leitura. De cima para baixo; na mesma linha (y a menos de 4 px), da esquerda para a direita. */
export function byPosition(blocks: BlockSegment[]): BlockSegment[] {
  const n = (b: BlockSegment, k: string) => Number(b.attrs[k] ?? 0);
  const byY = [...blocks].sort((a, b) => n(a, 'y') - n(b, 'y') || n(a, 'x') - n(b, 'x'));
  const out: BlockSegment[] = [];
  for (let i = 0; i < byY.length;) {
    const top = n(byY[i], 'y');
    let j = i;
    while (j < byY.length && n(byY[j], 'y') - top < SAME_ROW_PX) j++;
    out.push(...byY.slice(i, j).sort((a, b) => n(a, 'x') - n(b, 'x')));
    i = j;
  }
  return out;
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

/** Nome definido numa linha linear: "x := 2", "f(a, b) := a + b", "Z_0 := sqrt(L/C) = ?". */
export const definedName = (raw: string): string | null => /^\s*([^\s(:=#]+)\s*(?:\([^)]*\))?\s*:=/.exec(raw)?.[1] ?? null;

/**
 * Para o "=" inteligente (ADENDO 05, E2.1): before(chave, linha)(nome) diz se o nome já foi definido
 * antes daquela linha, na ordem de avaliação dada. extra: nomes que valem desde o início (bibliotecas).
 */
export function definedBefore(blocks: { key: string; lines: string[] }[], extra: Iterable<string> = []) {
  const first = new Map<string, number>();
  const ord = new Map<string, number>();
  let n = 0;
  for (const b of blocks) b.lines.forEach((l, i) => {
    ord.set(`${b.key}:${i}`, n);
    const name = definedName(l);
    if (name && !first.has(name)) first.set(name, n);
    n++;
  });
  const always = new Set(extra);
  return (key: string, line: number) => {
    const here = ord.get(`${key}:${line}`) ?? n;
    return (name: string) => always.has(name) || (first.get(name) ?? Infinity) < here;
  };
}
