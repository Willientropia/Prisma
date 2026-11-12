// Parse/serialize comum a .prsm, .prsf, .prsl, .prst e .prsp (SPEC 3.2 a 3.7, ADENDO 01).
// Todo segmento guarda o texto original: serialize(parse(t)) === t, byte a byte.
import { parse as parseYaml } from 'yaml';

export type TextSegment = { kind: 'text'; raw: string };
export type BlockSegment = {
  kind: 'block';
  raw: string; // cerca de abertura + corpo + cerca de fechamento, com as quebras originais
  type: string; // funcao, calc, verificar, grafico, tabela, texto, teste...
  id?: string;
  attrs: Record<string, string>;
  body: string; // linhas entre as cercas
};
export type Segment = TextSegment | BlockSegment;

export type PrismaDoc = {
  frontmatterRaw: string; // inclui as linhas '---'; vazio se o arquivo não tem frontmatter
  meta: Record<string, unknown>;
  metaError?: string;
  segments: Segment[];
};

/** Divide mantendo o terminador de cada linha ('\n', '\r\n' ou nada na última). */
export function lines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

const strip = (l: string) => l.replace(/\r?\n$/, '');
const OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** Como os arquivos Prisma são gravados (ADENDO 01, A1): UTF-8 sem BOM e quebra LF. */
export const normalizeForSave = (text: string) => text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

export function parse(input: string): PrismaDoc {
  // BOM (de outro editor) fica guardado no frontmatterRaw: serialize devolve os mesmos bytes
  const bom = input.startsWith('﻿') ? '﻿' : '';
  const text = input.slice(bom.length);
  const ls = lines(text);
  let i = 0;
  let frontmatterRaw = bom;
  let meta: Record<string, unknown> = {};
  let metaError: string | undefined;

  if (ls.length && strip(ls[0]) === '---') {
    const end = ls.findIndex((l, k) => k > 0 && /^(---|\.\.\.)\s*$/.test(strip(l)));
    if (end > 0) {
      frontmatterRaw = bom + ls.slice(0, end + 1).join('');
      try {
        const v = parseYaml(ls.slice(1, end).join(''));
        if (v && typeof v === 'object' && !Array.isArray(v)) meta = v as Record<string, unknown>;
      } catch (e) {
        metaError = e instanceof Error ? e.message : String(e);
      }
      i = end + 1;
    }
  }

  const segments: Segment[] = [];
  let text_ = '';
  const flush = () => { if (text_) { segments.push({ kind: 'text', raw: text_ }); text_ = ''; } };

  while (i < ls.length) {
    const m = OPEN.exec(strip(ls[i]));
    // crases na info string não abrem cerca de crase (CommonMark)
    if (!m || (m[1][0] === '`' && m[2].includes('`'))) { text_ += ls[i++]; continue; }
    const fence = m[1];
    const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`);
    let j = i + 1;
    while (j < ls.length && !close.test(strip(ls[j]))) j++;
    const bodyLines = ls.slice(i + 1, j);
    const raw = ls.slice(i, Math.min(j + 1, ls.length)).join('');
    flush();
    segments.push({ kind: 'block', raw, body: bodyLines.join(''), ...parseInfo(m[2]) });
    i = j + 1; // cerca sem fechamento vai até o fim do arquivo
  }
  flush();
  return { frontmatterRaw, meta, metaError, segments };
}

export function serialize(doc: PrismaDoc): string {
  return doc.frontmatterRaw + doc.segments.map((s) => s.raw).join('');
}

/** "funcao {#dv nome=ΔV salvar=eletrica}" -> tipo, id e atributos. Valores aceitam aspas. */
export function parseInfo(info: string): { type: string; id?: string; attrs: Record<string, string> } {
  const t = info.trim();
  const type = /^[^\s{]*/.exec(t)![0];
  const attrs: Record<string, string> = {};
  let id: string | undefined;
  const braces = /\{([^}]*)\}/.exec(t);
  if (braces) {
    // atributo sem valor (desativado, moldura, recolhida, travada; ADENDO 05) vale ""
    for (const m of braces[1].matchAll(/#([^\s}]+)|([^\s="]+)=(?:"([^"]*)"|(\S+))|([^\s="#]+)/g)) {
      if (m[1]) id = m[1];
      else if (m[5]) attrs[m[5]] = '';
      else attrs[m[2]] = m[3] ?? m[4];
    }
  }
  return { type, id, attrs };
}

/**
 * Liga, desliga ou troca um atributo na linha de abertura do bloco, sem mexer no resto:
 * value true = atributo sem valor ("desativado"), null = remove, texto = nome="texto" (quote=false: nome=texto, para valores simples como casas=2).
 */
export function withAttr(fenceLine: string, name: string, value: string | true | null, quote = true): string {
  const nl = /\r?\n$/.exec(fenceLine)?.[0] ?? '';
  const head = fenceLine.slice(0, fenceLine.length - nl.length);
  const m = /\{([^}]*)\}/.exec(head);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\export const blocks = (doc: PrismaDoc) =>');
  const re = new RegExp(`(^|\\s)${esc}(=(?:"[^"]*"|\\S+))?(?=\\s|$)`);
  const piece = value === true ? name : value === null ? '' : quote ? `${name}="${value.replace(/"/g, "'")}"` : `${name}=${value}`;
  if (!m) return value === null ? fenceLine : `${head} {${piece}}${nl}`;
  let inner = m[1];
  inner = re.test(inner) ? inner.replace(re, piece ? `$1${piece}` : '') : piece ? `${inner} ${piece}` : inner;
  return head.replace(m[0], `{${inner.replace(/\s+/g, ' ').trim()}}`) + nl;
}

export const blocks = (doc: PrismaDoc) => doc.segments.filter((s): s is BlockSegment => s.kind === 'block');
