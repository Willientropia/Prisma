// Bibliotecas: busca, mescla base + extensão e edição do texto do .prsl (Fase 4).
// Puro (sem disco nem math.js): usado pelo motor, pela tela da biblioteca e pelo "Salvar na biblioteca".
import { lines, parse, type BlockSegment, type PrismaDoc } from './doc';
import { libFunctions, type LibFunction } from './views';

export type LibOrigin = 'projeto' | 'usuário' | 'fábrica';
export type LibFile = { path: string; origem: LibOrigin; text: string };

/** Função como aparece na tela: a da extensão que substitui a de fábrica vem logo acima dela. */
export type LibFn = LibFunction & { name: string; from: 'base' | 'extensao'; overrides?: boolean; shadowed?: boolean; path: string };

export type ResolvedLib = {
  id: string;
  nome: string;
  versao: string;
  origem: LibOrigin;
  path: string;
  readOnly: boolean; // de fábrica: nunca se grava nela
  duplicate?: string; // outro arquivo independente com o mesmo id (ADENDO 01)
  extension?: { path: string; versao: string; text: string };
  constants: [string, string][];
  defs: string[]; // definições em vigor, para o motor (base sem as substituídas + extensão)
  functions: LibFn[];
};

/** Nome definido numa linha: "ΔV(L, I, S) := ..." -> "ΔV"; "k := 2" -> "k". */
export const fnName = (def: string) => /^\s*([^\s(:=]+)/.exec(def)?.[1] ?? '';
/** Assinatura (lado esquerdo do :=). */
export const fnSig = (def: string) => def.split(':=')[0].trim();
/** Mesma definição, ignorando espaços. */
export const sameDef = (a: string, b: string) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');

const defsOf = (d: PrismaDoc) => d.segments.flatMap((s) => (s.kind === 'block' && s.type === 'funcao' ? lines(s.body).map((l) => l.replace(/\r?\n$/, '')).filter((l) => l.trim()) : []));
const constsOf = (d: PrismaDoc): [string, string][] => {
  const c = d.meta.constantes;
  return c && typeof c === 'object' ? Object.entries(c).map(([k, v]) => [k, String(v)]) : [];
};

/**
 * Bibliotecas por id, na ordem de busca dada (projeto, Documentos, fábrica). Arquivo com `estende: <id>`
 * é extensão: soma as funções à base e vence nas de mesmo nome. Só dois arquivos independentes com o
 * mesmo id geram o aviso de duplicada.
 */
export function resolveLibraries(files: LibFile[]): Map<string, ResolvedLib> {
  const out = new Map<string, ResolvedLib>();
  const exts: (LibFile & { doc: PrismaDoc; base: string })[] = [];
  for (const f of files) {
    const doc = parse(f.text);
    const base = doc.meta.estende;
    if (typeof base === 'string' && base) { exts.push({ ...f, doc, base }); continue; }
    const id = String(doc.meta.id ?? '');
    if (!id) continue;
    const prev = out.get(id);
    if (prev) { prev.duplicate ??= `Também existe em ${f.origem}: ${f.path}`; continue; }
    out.set(id, {
      id, nome: String(doc.meta.nome ?? id), versao: String(doc.meta.versao ?? ''), origem: f.origem, path: f.path, readOnly: f.origem === 'fábrica',
      constants: constsOf(doc), defs: defsOf(doc),
      functions: libFunctions(doc).map((fn) => ({ ...fn, name: fnName(fn.formula), from: 'base', path: f.path })),
    });
  }
  for (const e of exts) {
    const lib = out.get(e.base);
    if (!lib || lib.extension) continue; // extensão sem base, ou segunda extensão: ignorada
    lib.extension = { path: e.path, versao: String(e.doc.meta.versao ?? ''), text: e.text };
    const extDefs = defsOf(e.doc);
    const extNames = new Set(extDefs.map(fnName));
    lib.defs = [...lib.defs.filter((d) => !extNames.has(fnName(d))), ...extDefs];
    const consts = new Map([...lib.constants, ...constsOf(e.doc)]);
    lib.constants = [...consts];
    const extFns: LibFn[] = libFunctions(e.doc).map((fn) => ({ ...fn, name: fnName(fn.formula), from: 'extensao', path: e.path }));
    const baseNames = new Set(lib.functions.map((f) => f.name));
    const merged: LibFn[] = [];
    for (const b of lib.functions) {
      const over = extFns.find((x) => x.name === b.name);
      if (over) merged.push({ ...over, overrides: true }, { ...b, shadowed: true });
      else merged.push(b);
    }
    merged.push(...extFns.filter((x) => !baseNames.has(x.name)));
    lib.functions = merged;
  }
  return out;
}

/** Cabeçalho da extensão de uma biblioteca de fábrica (Documentos\Prisma\Bibliotecas\<id>.usuario.prsl). */
export const extensionText = (base: { id: string; nome: string }) =>
  `---\ntipo: biblioteca\nnome: ${base.nome} (minhas funções)\nid: ${base.id}.usuario\nestende: ${base.id}\nversao: 0.1\nversao_formato: 1\n---\n`;

/** Biblioteca nova criada pelo diálogo "A biblioteca <id> não existe". */
export const newLibraryText = (id: string) => `---\ntipo: biblioteca\nnome: ${id}\nid: ${id}\nversao: 0.1\nversao_formato: 1\n---\n`;

const fence = '```';
/** Seção nova (SPEC 3.7) com a definição e a origem no caderno. */
export const fnSection = (def: string, blockId: string, origem: string) =>
  `\n## ${fnSig(def)}\n\n${fence}funcao {#${blockId}}\n${def}\n${fence}\n\n- **Origem:** ${origem}\n`;

export function addFunction(text: string, def: string, blockId: string, origem: string): string {
  return `${text.endsWith('\n') ? text : `${text}\n`}${fnSection(def, blockId, origem)}`;
}

/** Definição em vigor no arquivo para esse nome (primeira linha de bloco funcao que a define). */
export function findDef(text: string, name: string): string | undefined {
  return defsOf(parse(text)).find((d) => fnName(d) === name);
}

/** Troca a definição de `name` e a linha **Origem:** da seção dela; o resto do arquivo fica igual. */
export function replaceFunction(text: string, name: string, def: string, origem: string): string {
  const doc = parse(text);
  const segs = doc.segments.map((s) => s.raw);
  const k = doc.segments.findIndex((s) => s.kind === 'block' && s.type === 'funcao' && lines(s.body).some((l) => fnName(l) === name));
  if (k < 0) throw new Error(`Função ${name} não encontrada`);
  const block = doc.segments[k] as BlockSegment;
  const ls = lines(block.raw);
  const body = lines(block.body).map((l) => (fnName(l) === name ? `${def}\n` : l)).join('');
  segs[k] = `${ls[0]}${body}${ls[ls.length - 1]}`;
  let found = false;
  for (let j = k + 1; j < segs.length && !found; j++) {
    if (doc.segments[j].kind !== 'text') continue;
    const before = segs[j].split(/^(?=##\s)/m)[0]; // só até a próxima seção
    const fixed = before.replace(/^(\s*[-*]\s+\*\*Origem:\*\*).*$/m, (_, h: string) => { found = true; return `${h} ${origem}`; });
    segs[j] = fixed + segs[j].slice(before.length);
    if (/^##\s/m.test(segs[j].slice(before.length))) break;
  }
  if (!found) segs[k] += `\n- **Origem:** ${origem}\n`;
  return doc.frontmatterRaw + segs.join('');
}

/** versao: 0.1 -> 0.2, 1.4.9 -> 1.4.10 (só no cabeçalho). */
export function bumpVersion(text: string): string {
  const doc = parse(text);
  const fm = doc.frontmatterRaw.replace(/^(versao:\s*["']?)(\d+(?:\.\d+)*)(["']?\s*)$/m, (_, a: string, v: string, b: string) => {
    const p = v.split('.');
    p[p.length - 1] = String(Number(p[p.length - 1]) + 1);
    return `${a}${p.join('.')}${b}`;
  });
  return fm + text.slice(doc.frontmatterRaw.length);
}
