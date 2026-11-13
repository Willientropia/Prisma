// npm run verify:rapido (F00): o que se roda a cada ticket. Tipos + matriz + Vitest só dos arquivos mudados
// + Playwright da folha e da regressão. Não substitui o verify (fim do lote) nem o verify:full (antes de push).
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { checkMatriz } from './check-matriz';

const ROOT = join(import.meta.dirname, '..');
const sh = (cmd: string) => spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const run = (name: string, cmd: string): boolean => {
  console.log(`\n=== ${name}: ${cmd}`);
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, stdio: 'inherit', env: { ...process.env, FORCE_COLOR: '0' } });
  return r.status === 0;
};

/** Arquivos de código mudados em relação ao último commit (inclui os ainda não rastreados). */
export const changedSources = (): string[] => {
  const list = (cmd: string) => (sh(cmd).stdout ?? '').split(/\r?\n/).filter(Boolean);
  const files = new Set([...list('git diff --name-only HEAD'), ...list('git ls-files --others --exclude-standard')]);
  return [...files].filter((f) => /\.(ts|tsx)$/.test(f) && /^(src|tests|scripts)\//.test(f));
};

const results: [string, boolean][] = [];
results.push(['Tipos', run('Tipos (tsc --noEmit)', 'npx tsc --noEmit')]);

console.log('\n=== Matriz de rastreio');
const matriz = checkMatriz(ROOT);
console.log(matriz.summary);
for (const e of matriz.errors) console.warn(`AVISO: ${e}`); // protocolo enxuto (12/11): não bloqueia

const changed = changedSources();
results.push(['Vitest dos arquivos mudados', changed.length === 0 ? (console.log('\n=== Vitest: nenhum arquivo de código mudado'), true) : run('Vitest dos arquivos mudados', `npx vitest related --run ${changed.map((f) => `"${f}"`).join(' ')}`)]);

results.push(['Playwright: folha e regressão', run('Playwright: folha e regressão', 'npx playwright test --project=e2e tests/e2e/folha.spec.ts tests/regressao')]);

console.log('\n=== verify:rapido');
for (const [name, ok] of results) console.log(`${ok ? 'ok    ' : 'FALHOU'} ${name}`);
const ok = results.every(([, o]) => o);
console.log(ok ? '\nAPROVADO (rápido). Falta o verify no fim do lote e o verify:full antes de push.' : '\nREPROVADO.');
process.exit(ok ? 0 : 1);
