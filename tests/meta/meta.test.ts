// Testes do próprio sistema de testes (ADENDO 03, C9).
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { checkMatriz } from '../../scripts/check-matriz';
import { renderReport } from '../../scripts/report';
import { findUserFiles, ROOT, USER_FILE_DIRS } from '../helpers/files';

const tmp = (name: string) => mkdtempSync(join(tmpdir(), `prisma-${name}-`));

describe('sistema de testes', () => {
  it('[C9-02] check-matriz falha se um ID da matriz ficar sem teste (cópia temporária)', () => {
    const dir = tmp('matriz');
    // IDs montados em tempo de execução: escritos entre colchetes aqui, o próprio check-matriz os contaria
    const f405 = ['F4', '05'].join('-'), z901 = ['Z9', '01'].join('-');
    try {
      cpSync(join(ROOT, 'src'), join(dir, 'src'), { recursive: true });
      cpSync(join(ROOT, 'tests'), join(dir, 'tests'), { recursive: true, filter: (p) => !p.includes('__snapshots__') });
      const before = checkMatriz(dir);
      expect(before.errors.some((e) => e.startsWith(f405))).toBe(false);
      for (const f of before.cited.get(f405)!) rmSync(join(dir, f)); // some com todos os testes desse critério
      expect(checkMatriz(dir).errors).toContain(`${f405} está na matriz sem teste (nenhum "[${f405}]" nos testes nem no MANUAL.md)`);
      writeFileSync(join(dir, 'tests/e2e/x.spec.ts'), `test('[${z901}] critério que não existe', () => {});\n`);
      expect(checkMatriz(dir).errors).toContain(`tests/e2e/x.spec.ts cita [${z901}], que não está na matriz`);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('[C9-03] um .skip, .only ou fixme em qualquer teste faz o lint falhar', async () => {
    const eslint = new ESLint({ cwd: ROOT });
    const errors = async (code: string, filePath: string) => (await eslint.lintText(code, { filePath: join(ROOT, filePath) }))[0].errorCount;
    expect(await errors("import { it } from 'vitest';\nit('a', () => {});\n", 'src/x.test.ts')).toBe(0);
    for (const call of ['it.skip', 'it.only', 'describe.skip']) expect(await errors(`import { it, describe } from 'vitest';\n${call}('a', () => {});\n`, 'src/x.test.ts')).toBeGreaterThan(0);
    for (const call of ['test.skip', 'test.only', 'test.fixme']) expect(await errors(`import { test } from '@playwright/test';\n${call}('a', async () => {});\n`, 'tests/e2e/x.spec.ts')).toBeGreaterThan(0);
  });

  it('[C9-04] arquivo novo em tests/fixtures entra no teste de ida e volta sem mudar código', () => {
    const extra = join(ROOT, 'tests/fixtures/__meta-novo.prsm');
    copyFileSync(join(ROOT, 'tests/fixtures/usina-boa-vista/calculos/cabos-cc.prsm'), extra);
    try {
      expect(findUserFiles(USER_FILE_DIRS)).toContain(extra);
    } finally { rmSync(extra, { force: true }); }
    // o teste de ida e volta (src/format/doc.test.ts) gera um caso por arquivo dessa mesma lista
    expect(readFileSync(join(ROOT, 'src/format/doc.test.ts'), 'utf8')).toContain('findUserFiles(USER_FILE_DIRS)');
  });

  it('[C9-05] caso novo em tests/golden/calculos.yaml vira teste sem mudar código', () => {
    const dir = tmp('golden');
    try {
      writeFileSync(join(dir, 'calculos.yaml'), [
        '- id: F2-01',
        '  descricao: caso novo de teste meta, 2 m vezes 3',
        '  expr: "2 m * 3"',
        '  esperado: {valor: 6, unidade: m, texto: "6 m"}',
        '- id: F2-02',
        '  descricao: outro caso novo, 10 V sobre 4',
        '  expr: "10 V / 4"',
        '  esperado: {valor: 2.5, unidade: V}',
        '',
      ].join('\n'));
      const out = join(dir, 'r.json');
      const r = spawnSync(`npx vitest run --project unit src/engine/golden.test.ts --reporter=json --outputFile.json="${out}"`, { cwd: ROOT, shell: true, env: { ...process.env, PRISMA_GOLDEN_DIR: dir }, encoding: 'utf8' });
      expect(r.status, r.stdout + r.stderr).toBe(0);
      const names = (JSON.parse(readFileSync(out, 'utf8')) as { testResults: { assertionResults: { title: string; status: string }[] }[] }).testResults.flatMap((f) => f.assertionResults);
      expect(names.map((n) => n.title)).toEqual(['[F2-01] caso novo de teste meta, 2 m vezes 3', '[F2-02] outro caso novo, 10 V sobre 4']);
      expect(names.every((n) => n.status === 'passed')).toBe(true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 120_000);

  it('[C9-07] o relatório tem as seções de C6', () => {
    const md = renderReport({
      date: new Date(2026, 10, 7, 14, 40), ok: true,
      tests: { total: 412, failed: 0, skipped: 0 },
      origins: [{ origem: 'F0', criterios: 6, automatizados: 6, manuais: 0, pendentes: 0, falhando: 0 }],
      coverage: { motor: 94, formato: 97, geral: 78 }, minimums: { motor: 90, formato: 90, geral: 70 },
      perf: { recalc: 41, open: 120 }, newTests: 14, steps: [], problems: [],
    });
    for (const s of [
      '# Relatório de verificação, 2026-11-07 14:40',
      'Resultado: APROVADO (412 testes, 0 falhas, 0 pulados)',
      '| Origem | Critérios | Automatizados | Manuais | Falhando |',
      '| F0 | 6 | 6 | 0 | 0 |',
      'Cobertura: motor 94 % (mínimo 90), formato 97 % (mínimo 90), geral 78 % (mínimo 70)',
      'Desempenho: recálculo string-3 41 ms (limite 150), abertura de arquivo 120 ms (limite 500)',
      'Novos testes nesta tarefa: 14',
    ]) expect(md).toContain(s);
    // e o verify grava esse texto em test-results/RELATORIO.md
    expect(readFileSync(join(ROOT, 'scripts/verify.ts'), 'utf8')).toContain("writeFileSync(join(OUT, 'RELATORIO.md'), report)");
  });

  it('[C9-08] o pre-commit roda npm run test e bloqueia commit com teste falhando', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg['simple-git-hooks']).toEqual({ 'pre-commit': 'npm run test', 'pre-push': 'npm run verify' });
    // dentro do próprio gancho o git define GIT_DIR e afins; sem limpar, os comandos git do teste herdam o repositório de fora
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
    // numa worktree ".git" é um arquivo: pergunta ao git onde o gancho está
    const hook = resolve(ROOT, spawnSync('git rev-parse --git-path hooks/pre-commit', { cwd: ROOT, shell: true, encoding: 'utf8', env }).stdout.trim());
    expect(existsSync(hook) && readFileSync(hook, 'utf8')).toContain('npm run test');
    // mesmo gancho num repositório temporário cujo "npm run test" falha: o commit não acontece
    const dir = tmp('hook');
    try {
      const git = (args: string) => spawnSync(`git -c user.name=t -c user.email=t@t -c core.hooksPath=.git/hooks ${args}`, { cwd: dir, shell: true, encoding: 'utf8', env });
      git('init -q');
      copyFileSync(hook, join(dir, '.git/hooks/pre-commit'));
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { test: 'node -e "process.exit(1)"' } }));
      git('add package.json');
      expect(git('commit -q -m teste').status).not.toBe(0);
      expect(git('rev-parse --verify HEAD').status).not.toBe(0); // nenhum commit criado
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('[F00-01] existe npm run verify:rapido: tipos, matriz, Vitest dos arquivos mudados e Playwright da folha e da regressão', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['verify:rapido']).toBe('tsx scripts/verify-rapido.ts');
    const src = readFileSync(join(ROOT, 'scripts/verify-rapido.ts'), 'utf8');
    for (const parte of ['tsc --noEmit', 'checkMatriz', 'vitest related', 'tests/e2e/folha.spec.ts tests/regressao']) expect(src).toContain(parte);
  });

  it('[F00-02] os testes de desempenho C7-01 e C7-02 só rodam no verify:full e continuam existindo', () => {
    const verify = readFileSync(join(ROOT, 'scripts/verify.ts'), 'utf8');
    expect(verify).toContain(`full ? 'npx playwright test' : 'npx playwright test --grep-invert "C7-0[12]"'`);
    expect(verify).toContain('if (full && (perf.recalc == null');
    const spec = readFileSync(join(ROOT, 'tests/e2e/desempenho.spec.ts'), 'utf8');
    expect(spec).toContain('[C7-01]');
    expect(spec).toContain('[C7-02]');
  });

  it('[F00-03] o CLAUDE.md manda usar verify:rapido por ticket, verify no fim do lote e verify:full antes de push', () => {
    expect(readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8')).toContain('verify:rapido por ticket; verify no fim do lote; verify:full antes de push');
  });
});
