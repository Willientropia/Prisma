// A6-ROBUSTEZ (ADENDO 06): entradas que travavam ou estouravam a pilha terminam com mensagem em português.
// As que podem travar rodam em outro processo, que o teste mata no prazo; assim a falha não pendura a suíte.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import type { LineResult } from './evaluate';

const ROOT = join(import.meta.dirname, '..', '..');
const KILL_MS = 6_000;

function runChild(lines: string[], symbolic: boolean): { ms: number; out: LineResult[] } {
  const r = spawnSync(process.execPath, ['--import', 'tsx', 'tests/helpers/eval-cli.ts'], { cwd: ROOT, input: JSON.stringify({ lines, symbolic }), encoding: 'utf8', timeout: KILL_MS, killSignal: 'SIGKILL' });
  if (r.error || r.status !== 0) throw new Error(`não terminou em ${KILL_MS / 1000} s (${r.error?.message ?? r.stderr})`);
  return JSON.parse(r.stdout);
}
const chain = (n: number, step: (k: number) => string) => Array.from({ length: n }, (_, k) => step(k + 1));

describe('[A6-ROBUSTEZ-01] cadeia de definições com nome indefinido (math.simplify)', { timeout: 30_000 }, () => {
  it('b1 := b0*2 + 1 ... b20 = ? na folha termina em tempo limitado', () => {
    const { ms, out } = runChild([...chain(20, (k) => `b${k} := b${k - 1}*2 + 1`), 'b20 = ?'], true);
    expect(ms).toBeLessThan(3000);
    expect(out.at(-1)!.symbolic).toContain('b0'); // continua em aberto, sem erro
  });
  it('c1 := c0*R + V = ? em cadeia termina em tempo limitado', () => {
    const { ms, out } = runChild(chain(20, (k) => `c${k} := c${k - 1}*R + V = ?`), true);
    expect(ms).toBeLessThan(3000);
    expect(out.at(-1)!.symbolic).toContain('c0');
  });
});

describe('[A6-ROBUSTEZ-02] cálculo aninhado tem prazo', { timeout: 30_000 }, () => {
  it('integral dentro de integral termina com mensagem de tempo limite', () => {
    const { ms, out } = runChild(['integral(integral(sin(1/(x*y)), y, 0, 0.001), x, 0, 0.001) = ?'], false);
    expect(ms).toBeLessThan(5000);
    expect(out[0].error).toMatch(/tempo limite/);
  });
  it('sum dentro de sum: o limite vale para a conta toda', () => {
    const { ms, out } = runChild(['sum(sum(i*j, j, 1, 900000), i, 1, 900000) = ?'], false);
    expect(ms).toBeLessThan(5000);
    expect(out[0].error).toMatch(/tempo limite/);
  });
});

describe('[A6-ROBUSTEZ-03] definição circular', { timeout: 30_000 }, () => {
  const sym = (lines: string[]) => evaluate({ libs: [], symbolic: true, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
  it('x := x + 1 e x = ? avisa a definição circular em português', () => {
    const r = sym(['x := x + 1', 'x = ?']);
    expect(r[0].error ?? r[1].error).toBe('Definição circular: x depende de si mesmo');
  });
  it('a := b + 1, b := a + 1, b = ? avisa a definição circular em português', () => {
    const r = sym(['a := b + 1', 'b := a + 1', 'b = ?']);
    const e = r.map((l) => l.error).find(Boolean);
    expect(e).toMatch(/^Definição circular: \w depende de si mesmo$/);
  });
  it('expressão com 20 mil parênteses aninhados: estouro de pilha vem em português', () => {
    const r = sym(['('.repeat(20000) + '1' + ')'.repeat(20000) + ' = ?']);
    expect(r[0].error).toBe('A expressão tem níveis demais para calcular');
  });
  it('cadeia longa de nomes em aberto: termina em tempo limitado e sem erro em inglês', () => {
    const { ms, out } = runChild([...chain(1000, (k) => `d${k} := d${k - 1} + 1`), 'd1000 = ?'], true);
    expect(ms).toBeLessThan(5000);
    expect(out.at(-1)!.error ?? '').not.toMatch(/call stack/);
    expect(out.at(-1)!.symbolic).toContain('d0');
  });
});
