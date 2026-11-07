// Cobertura de linhas somando Vitest (unidade + navegador) e Playwright (interface), por área (C7.5).
// Uma linha conta como coberta se algum teste, de qualquer camada, executou um comando nela.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import convert from 'ast-v8-to-istanbul';
import { parseAstAsync } from 'vite';

const ROOT = join(import.meta.dirname, '..');
type FileCov = { path: string; statementMap: Record<string, { start: { line: number } }>; s: Record<string, number> };
type V8Entry = { url: string; source?: string; functions: { functionName: string; isBlockCoverage: boolean; ranges: { startOffset: number; endOffset: number; count: number }[] }[] };

export const AREAS = { motor: 'src/engine/', formato: 'src/format/', geral: 'src/' } as const;
export type Coverage = Record<keyof typeof AREAS, number>;

const relSrc = (p: string) => relative(ROOT, p).replace(/\\/g, '/');
const excluded = (rel: string) => /\.test\.tsx?$|\.d\.ts$|^src\/main\.tsx$|^src\/dev\//.test(rel);

export async function measureCoverage(): Promise<{ areas: Coverage; files: Record<string, [number, number]> }> {
  const lines = new Map<string, Map<number, boolean>>(); // arquivo -> linha -> coberta
  const add = (f: FileCov) => {
    const rel = relSrc(f.path);
    if (!rel.startsWith('src/') || excluded(rel)) return;
    const m = lines.get(rel) ?? new Map<number, boolean>();
    for (const [k, st] of Object.entries(f.statementMap)) m.set(st.start.line, (m.get(st.start.line) ?? false) || f.s[k] > 0);
    lines.set(rel, m);
  };

  const vitest = join(ROOT, 'test-results/coverage/coverage-final.json');
  if (existsSync(vitest)) for (const f of Object.values(JSON.parse(readFileSync(vitest, 'utf8')) as Record<string, FileCov>)) add(f);

  const dir = join(ROOT, 'test-results/coverage-e2e');
  const ast = new Map<string, ReturnType<typeof parseAstAsync>>();
  if (existsSync(dir)) for (const name of readdirSync(dir)) {
    for (const e of JSON.parse(readFileSync(join(dir, name), 'utf8')) as V8Entry[]) {
      if (!e.source) continue;
      const path = join(ROOT, new URL(e.url).pathname.replace(/^\//, ''));
      const inline = /\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([A-Za-z0-9+/=]+)\s*$/.exec(e.source);
      if (!ast.has(e.url)) ast.set(e.url, parseAstAsync(e.source));
      const data = await convert({
        code: e.source,
        ast: ast.get(e.url)!,
        coverage: { url: pathToFileURL(path).href, functions: e.functions },
        sourceMap: inline ? JSON.parse(Buffer.from(inline[1], 'base64').toString('utf8')) : undefined,
      });
      for (const f of Object.values(data) as FileCov[]) add({ ...f, path: f.path.startsWith('file:') ? fileURLToPath(f.path) : f.path });
    }
  }

  const files: Record<string, [number, number]> = {};
  for (const [f, m] of lines) files[f] = [[...m.values()].filter(Boolean).length, m.size];
  const pct = (prefix: string) => {
    let c = 0, t = 0;
    for (const [f, [cov, tot]] of Object.entries(files)) if (f.startsWith(prefix)) { c += cov; t += tot; }
    return t ? Math.round((1000 * c) / t) / 10 : 0;
  };
  return { areas: { motor: pct(AREAS.motor), formato: pct(AREAS.formato), geral: pct(AREAS.geral) }, files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await measureCoverage();
  console.log(r.areas);
  if (process.argv.includes('--files')) for (const [f, [c, t]] of Object.entries(r.files).sort()) console.log(`${((100 * c) / t).toFixed(0).padStart(4)} % ${c}/${t} ${f}`);
}
