// ADENDO 03, C2: confere a matriz de rastreio contra os testes.
// Falha se um ID ativo não tem teste, se um teste cita ID desconhecido, ou se etapa concluída tem pendente.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

export type Row = { id: string; tipo: string; status: string };
export type Result = { errors: string[]; summary: string; rows: Row[]; cited: Map<string, string[]> };

const ID = /^[A-Z][A-Z0-9]*-\d+$/;
const prefix = (id: string) => id.slice(0, id.lastIndexOf('-'));

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === 'node_modules' || f === '__snapshots__') return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Linhas de tabela Markdown como listas de células. */
const cells = (md: string) => md.split('\n').filter((l) => l.startsWith('|')).map((l) => l.split(/(?<!\\)\|/).slice(1, -1).map((c) => c.trim()));

export function checkMatriz(root: string): Result {
  const errors: string[] = [];
  const md = readFileSync(join(root, 'tests/MATRIZ.md'), 'utf8');
  const rows: Row[] = cells(md).filter((c) => c.length === 5 && ID.test(c[0])).map((c) => ({ id: c[0], tipo: c[3], status: c[4] }));
  const stages = cells(md).filter((c) => c.length === 3 && c[0] !== 'Etapa' && !c[0].startsWith('---'))
    .map((c) => ({ name: c[0], prefixes: c[1].split(',').map((p) => p.trim()), status: c[2] }));

  // [ID] nos testes (Vitest, Playwright, WebdriverIO), id: nos YAML de tests/golden e itens do MANUAL.md
  const cited = new Map<string, string[]>();
  const cite = (id: string, file: string) => cited.set(id, [...(cited.get(id) ?? []), relative(root, file).replace(/\\/g, '/')]);
  const testFiles = [...walk(join(root, 'src')), ...walk(join(root, 'tests'))].filter((f) => /\.(test|spec|e2e)\.tsx?$/.test(f));
  for (const f of testFiles) for (const m of readFileSync(f, 'utf8').matchAll(/\[([A-Z][A-Z0-9]*-\d+)\]/g)) cite(m[1], f);
  for (const f of walk(join(root, 'tests/golden')).filter((f) => f.endsWith('.yaml'))) for (const m of readFileSync(f, 'utf8').matchAll(/^\s*-?\s*id:\s*([A-Z][A-Z0-9]*-\d+)\s*$/gm)) cite(m[1], f);
  const manual = join(root, 'tests/MANUAL.md');
  if (existsSync(manual)) for (const m of readFileSync(manual, 'utf8').matchAll(/^#+\s*\[([A-Z][A-Z0-9]*-\d+)\]/gm)) cite(m[1], manual);

  const known = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    if (r.status !== 'pendente' && !cited.has(r.id)) errors.push(`${r.id} está na matriz sem teste (nenhum "[${r.id}]" nos testes nem no MANUAL.md)`);
    const stage = stages.find((s) => s.prefixes.includes(prefix(r.id)));
    if (!stage) errors.push(`${r.id}: nenhuma etapa da tabela "Etapas" cobre o prefixo ${prefix(r.id)}`);
    else if (stage.status === 'concluída' && r.status === 'pendente') errors.push(`${r.id} está pendente, mas a etapa "${stage.name}" está concluída`);
  }
  for (const [id, files] of cited) if (!known.has(id)) errors.push(`${files[0]} cita [${id}], que não está na matriz`);

  // contagem por origem: F0 13/13, A9 11/11 (2 manuais) ...
  const by = new Map<string, { total: number; ok: number; manual: number; pend: number }>();
  for (const r of rows) {
    const b = by.get(prefix(r.id)) ?? { total: 0, ok: 0, manual: 0, pend: 0 };
    b.total++;
    if (r.status === 'pendente') b.pend++;
    else if (cited.has(r.id)) b.ok++;
    if (r.tipo === 'manual' && r.status !== 'pendente') b.manual++;
    by.set(prefix(r.id), b);
  }
  const summary = [...by].map(([p, b]) => `${p} ${b.ok}/${b.total - b.pend}${b.manual ? ` (${b.manual} ${b.manual > 1 ? 'manuais' : 'manual'})` : ''}${b.pend ? ` + ${b.pend} pendente${b.pend > 1 ? 's' : ''}` : ''}`).join(', ');
  return { errors, summary, rows, cited };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = checkMatriz(join(import.meta.dirname, '..'));
  console.log(`Matriz: ${r.summary}`);
  for (const e of r.errors) console.error(`ERRO: ${e}`);
  process.exit(r.errors.length ? 1 : 0);
}
