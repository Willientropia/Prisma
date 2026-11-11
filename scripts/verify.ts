// npm run verify (ADENDO 03, C5): tipos + lint + todos os testes (menos test:app) + checklist 4.7
// (testes V-*) + check-matriz + cobertura + relatório. --full acrescenta o app real e os testes de desempenho
// (C7-01 e C7-02, que oscilam com a carga da máquina; F00). Por ticket, use npm run verify:rapido.
// Qualquer falha devolve código diferente de 0.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkMatriz } from './check-matriz';
import { measureCoverage } from './coverage';
import { renderReport, type Origin, type Step } from './report';

const ROOT = join(import.meta.dirname, '..');
const OUT = join(ROOT, 'test-results');
const full = process.argv.includes('--full');
const MIN = { motor: 90, formato: 90, geral: 70 };
const BASELINE = join(ROOT, 'tests/coverage-baseline.json');

const steps: Step[] = [];
const problems: string[] = [];
const titles: { title: string; ok: boolean; skipped?: boolean }[] = [];

function step(name: string, cmd: string, env: Record<string, string> = {}): string {
  console.log(`\n=== ${name}: ${cmd}`);
  const t0 = Date.now();
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, env: { ...process.env, FORCE_COLOR: '0', ...env }, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  process.stdout.write(text);
  const ok = r.status === 0;
  steps.push({ name, ok, ms: Date.now() - t0 });
  if (!ok) problems.push(`${name} falhou (código ${r.status}).`);
  return text;
}
const readJson = <T>(f: string): T | null => (existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : null);

mkdirSync(OUT, { recursive: true });
for (const d of ['coverage', 'coverage-e2e', 'vitest.json', 'playwright.json']) rmSync(join(OUT, d), { recursive: true, force: true });

step('Tipos (tsc --noEmit)', 'npx tsc --noEmit');
step('Lint (inclui proibição de .skip/.only/fixme)', 'npx eslint .');

step('Vitest: unidade, navegador e meta', 'npx vitest run --coverage --reporter=default --reporter=json --outputFile.json=test-results/vitest.json');
type VitestJson = { testResults: { assertionResults: { fullName: string; status: string }[] }[] };
for (const f of readJson<VitestJson>(join(OUT, 'vitest.json'))?.testResults ?? []) for (const a of f.assertionResults) titles.push({ title: a.fullName, ok: a.status === 'passed', skipped: a.status === 'skipped' || a.status === 'pending' || a.status === 'todo' });

const cargo = step('Rust (cargo test)', 'cargo test --manifest-path src-tauri/Cargo.toml');
let rust = { passed: 0, failed: 0, ignored: 0 };
for (const m of cargo.matchAll(/test result: \w+\. (\d+) passed; (\d+) failed; (\d+) ignored/g)) rust = { passed: rust.passed + +m[1], failed: rust.failed + +m[2], ignored: rust.ignored + +m[3] };

step('Playwright: interface, regressão e visual', full ? 'npx playwright test' : 'npx playwright test --grep-invert "C7-0[12]"', { PRISMA_COVERAGE: '1' });
type PwSpec = { title: string; file: string; tests: { status: string; results: { stdout?: { text?: string }[] }[] }[] };
type PwSuite = { specs?: PwSpec[]; suites?: PwSuite[] };
const perf: { recalc: number | null; open: number | null; app?: number | null } = { recalc: null, open: null };
const walk = (s: PwSuite) => {
  for (const sp of s.specs ?? []) for (const t of sp.tests) {
    titles.push({ title: `${sp.file} › ${sp.title}`, ok: t.status === 'expected', skipped: t.status === 'skipped' });
    const out = t.results.flatMap((r) => r.stdout ?? []).map((o) => o.text ?? '').join('');
    const rc = /C7-01: recálculo em (\d+) ms/.exec(out); if (rc) perf.recalc = +rc[1];
    const op = /C7-02: 1 MB aberto em (\d+) ms/.exec(out); if (op) perf.open = +op[1];
  }
  for (const c of s.suites ?? []) walk(c);
};
for (const s of readJson<{ suites: PwSuite[] }>(join(OUT, 'playwright.json'))?.suites ?? []) walk(s);

if (full) {
  step('App real (tauri-driver)', 'npm run test:app');
  type AppJson = { tests: { title: string; ok: boolean }[]; startupMs: number | null };
  const app = readJson<AppJson>(join(OUT, 'app.json'));
  for (const t of app?.tests ?? []) titles.push(t);
  perf.app = app?.startupMs ?? null;
}

// matriz de rastreio
const t0 = Date.now();
const matriz = checkMatriz(ROOT);
console.log(`\n=== Matriz: ${matriz.summary}`);
for (const e of matriz.errors) console.error(`ERRO: ${e}`);
steps.push({ name: 'Matriz de rastreio (check-matriz)', ok: !matriz.errors.length, ms: Date.now() - t0, detail: matriz.errors.length ? `${matriz.errors.length} erros` : undefined });
problems.push(...matriz.errors);

// cobertura somada (Vitest + Playwright), mínimos do C7.5 e valor guardado com folga de 0,5 ponto
const t1 = Date.now();
const { areas } = await measureCoverage();
const baseline = readJson<typeof MIN>(BASELINE) ?? { motor: 0, formato: 0, geral: 0 };
const covProblems: string[] = [];
for (const k of Object.keys(MIN) as (keyof typeof MIN)[]) {
  if (areas[k] < MIN[k]) covProblems.push(`Cobertura de ${k} ${areas[k]} % abaixo do mínimo ${MIN[k]} %.`);
  else if (areas[k] < baseline[k] - 0.5) covProblems.push(`Cobertura de ${k} caiu: ${areas[k]} % (guardado ${baseline[k]} %).`);
}
steps.push({ name: 'Cobertura (mínimos e valor guardado)', ok: !covProblems.length, ms: Date.now() - t1 });
problems.push(...covProblems);

// desempenho (C7.7): os testes C7-* já falham sozinhos; aqui só confere que foram medidos
if (full && (perf.recalc == null || perf.open == null)) problems.push('Desempenho não medido (testes C7-01/C7-02 não rodaram).');

// resultado
const failedIds = new Set(titles.filter((t) => !t.ok && !t.skipped).flatMap((t) => [...t.title.matchAll(/\[([A-Z][A-Z0-9]*-\d+[a-z]?)\]/g)].map((m) => m[1])));
const prefix = (id: string) => id.slice(0, id.lastIndexOf('-'));
const origins = new Map<string, Origin>();
for (const r of matriz.rows) {
  const o = origins.get(prefix(r.id)) ?? { origem: prefix(r.id), criterios: 0, automatizados: 0, manuais: 0, pendentes: 0, falhando: 0 };
  if (r.status === 'pendente') o.pendentes++;
  else {
    o.criterios++;
    if (r.tipo === 'manual') o.manuais++; else if (matriz.cited.has(r.id)) o.automatizados++;
    if (failedIds.has(r.id)) o.falhando++;
  }
  origins.set(o.origem, o);
}
const failed = titles.filter((t) => !t.ok && !t.skipped).length + rust.failed;
const skipped = titles.filter((t) => t.skipped).length + rust.ignored;
const ok = problems.length === 0 && failed === 0 && skipped === 0;
if (skipped) problems.push(`${skipped} testes pulados (proibido pelo C7.3).`);

// novos testes: os que não estavam na última verificação aprovada
const KNOWN = join(OUT, 'testes-aprovados.json');
const before = new Set(readJson<string[]>(KNOWN) ?? []);
const now = titles.map((t) => t.title);
const newTests = before.size ? now.filter((t) => !before.has(t)).length : now.length;
if (ok) {
  writeFileSync(KNOWN, JSON.stringify(now, null, 1));
  const up = Object.fromEntries((Object.keys(MIN) as (keyof typeof MIN)[]).map((k) => [k, Math.max(areas[k], baseline[k])]));
  writeFileSync(BASELINE, `${JSON.stringify(up, null, 2)}\n`); // cobertura subiu: guarda o novo valor
}

const report = renderReport({
  date: new Date(), ok,
  tests: { total: titles.length + rust.passed + rust.failed + rust.ignored, failed, skipped },
  origins: [...origins.values()], coverage: areas, minimums: MIN, perf, newTests, steps, problems,
});
writeFileSync(join(OUT, 'RELATORIO.md'), report);
console.log(`\n${report}`);
process.exit(ok ? 0 : 1);
