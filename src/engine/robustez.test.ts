// A6-ROBUSTEZ (ADENDO 06): entradas que travavam ou estouravam a pilha terminam com mensagem em português.
// As que podem travar rodam em outro processo, que o teste mata no prazo; assim a falha não pendura a suíte.
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import type { LineResult } from './evaluate';

const ROOT = join(import.meta.dirname, '..', '..');
const KILL_MS = 6_000; // só o cálculo (BUG-037)
const START_MS = 60_000; // partida do Node e do tsx, numa máquina ocupada

/**
 * Roda a avaliação noutro processo e mata no prazo. Os KILL_MS contam só o cálculo: começam quando o processo
 * avisa "pronto", depois de o Node e o tsx carregarem o motor, como o prazo do worker no BUG-032 (BUG-037).
 * A partida tem teto próprio, folgado, para uma máquina ocupada não pendurar a suíte.
 */
function runChild(lines: string[], symbolic: boolean, opts: { partidaMs?: number } = {}): Promise<{ ms: number; out: LineResult[] }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'tests/helpers/eval-cli.ts'], { cwd: ROOT, env: { ...process.env, PRISMA_EVAL_PARTIDA_MS: String(opts.partidaMs ?? 0) } });
    let [stdout, stderr, killed] = ['', '', ''];
    const kill = (why: string) => { killed = why; child.kill('SIGKILL'); };
    const startTimer = setTimeout(() => kill(`não começou a calcular em ${START_MS / 1000} s`), START_MS);
    let calcTimer: ReturnType<typeof setTimeout> | undefined;
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => {
      stderr += c;
      if (!calcTimer && stderr.includes('pronto\n')) { clearTimeout(startTimer); calcTimer = setTimeout(() => kill(`não terminou em ${KILL_MS / 1000} s`), KILL_MS); }
    });
    child.on('close', (code) => {
      clearTimeout(startTimer); clearTimeout(calcTimer);
      if (killed || code !== 0) reject(new Error(killed || `saiu com código ${code} (${stderr})`));
      else resolve(JSON.parse(stdout));
    });
    child.stdin.end(JSON.stringify({ lines, symbolic }));
  });
}
const chain = (n: number, step: (k: number) => string) => Array.from({ length: n }, (_, k) => step(k + 1));

describe('[A6-ROBUSTEZ-01] cadeia de definições com nome indefinido (math.simplify)', { timeout: 30_000 }, () => {
  it('b1 := b0*2 + 1 ... b20 = ? na folha termina em tempo limitado @tempo', async () => {
    const { ms, out } = await runChild([...chain(20, (k) => `b${k} := b${k - 1}*2 + 1`), 'b20 = ?'], true);
    expect(ms).toBeLessThan(3000);
    expect(out.at(-1)!.symbolic).toContain('b0'); // continua em aberto, sem erro
  });
  it('c1 := c0*R + V = ? em cadeia termina em tempo limitado', async () => {
    const { ms, out } = await runChild(chain(20, (k) => `c${k} := c${k - 1}*R + V = ?`), true);
    expect(ms).toBeLessThan(3000);
    expect(out.at(-1)!.symbolic).toContain('c0');
  });
});

describe('[A6-ROBUSTEZ-02] cálculo aninhado tem prazo', { timeout: 30_000 }, () => {
  it('integral dentro de integral termina com mensagem de tempo limite', async () => {
    const { ms, out } = await runChild(['integral(integral(sin(1/(x*y)), y, 0, 0.001), x, 0, 0.001) = ?'], false);
    expect(ms).toBeLessThan(5000);
    expect(out[0].error).toMatch(/tempo limite/);
  });
  it('sum dentro de sum: o limite vale para a conta toda', async () => {
    const { ms, out } = await runChild(['sum(sum(i*j, j, 1, 900000), i, 1, 900000) = ?'], false);
    expect(ms).toBeLessThan(5000);
    expect(out[0].error).toMatch(/tempo limite/);
  });
});

describe('[F06] laços com limite no worker (B7 da AUDITORIA-FABLE)', { timeout: 30_000 }, () => {
  it('range(1, 1/0): erro em português na hora, sem alocar sem fim', async () => {
    const { ms, out } = await runChild(['range(1, 1/0) = ?'], false);
    expect(ms).toBeLessThan(1000);
    expect(out[0].error).toBe('range: elementos demais (máximo de 1 000 000)');
  });
  it('range(1, 10^8): o mesmo erro, sem gastar 15 s', async () => {
    const { ms, out } = await runChild(['range(1, 10^8) = ?'], false);
    expect(ms).toBeLessThan(1000);
    expect(out[0].error).toBe('range: elementos demais (máximo de 1 000 000)');
  });
  it('for com 1 000 000 de voltas tem o prazo da linha', async () => {
    const { ms, out } = await runChild(['for(i, range(1, 10^6), q[i] := i^2) = ?'], false);
    expect(ms).toBeLessThan(3000);
    expect(out[0].error).toMatch(/tempo limite/);
  });
  it('range e for pequenos continuam iguais', async () => {
    const { out } = await runChild(['v := range(1, 4)', 'for(i, range(1, 3), w[i] := 2*i)', 'w = ?', 'range(0, 0.3, 0.1) = ?', 'range(5, 1) = ?'], false);
    expect(out[0].error).toBeUndefined();
    expect(out[2].text).toBe('[2 | 4 | 6]');
    expect(out[3].text).toBe('[0 | 0,1 | 0,2 | 0,3]');
    expect(out[4].text).toBe('[5 | 4 | 3 | 2 | 1]');
  });
  it('range com limite NaN dá erro de limite, não de elementos demais', async () => {
    expect((await runChild(['range(0, 0/0) = ?'], false)).out[0].error).toBe('range: limites inválidos');
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
  // F07 (B11): função que chama a si mesma, direta ou por outra, para antes de estourar a pilha e diz o nome
  for (const symbolic of [true, false]) {
    const run = (lines: string[]) => evaluate({ libs: [], symbolic, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
    it(`[F07] f(x) := f(x) + 1 e f(2) = ? avisa a definição circular (${symbolic ? 'folha' : 'caderno'})`, () => {
      expect(run(['f(x) := f(x) + 1', 'f(2) = ?'])[1].error).toBe('Definição circular: f depende de si mesmo');
    });
    it(`[F07] recursão por dentro de map(): a mesma mensagem, curta (${symbolic ? 'folha' : 'caderno'})`, () => {
      expect(run(['f(a) := a + map([1, 2], f)', 'f(1) = ?'])[1].error).toBe('Definição circular: f depende de si mesmo');
    });
    it(`[F07] g chama h e h chama g: definição circular (${symbolic ? 'folha' : 'caderno'})`, () => {
      expect(run(['g(x) := h(x)', 'h(x) := g(x)', 'g(1) = ?'])[2].error).toMatch(/^Definição circular: [gh] depende de si mesmo$/);
    });
  }
  it('[F07] funções encadeadas sem ciclo continuam iguais', () => {
    const lines = ['f0(x) := 2*x', ...chain(300, (k) => `f${k}(x) := f${k - 1}(x) + 1`), 'f300(1) = ?', 'f0(f0(3)) = ?'];
    const r = evaluate({ libs: [], symbolic: false, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
    expect([r.at(-2)!.text, r.at(-1)!.text]).toEqual(['302', '12']);
  });
  it('cadeia longa de nomes em aberto: termina em tempo limitado e sem erro em inglês @tempo', async () => {
    const { ms, out } = await runChild([...chain(1000, (k) => `d${k} := d${k - 1} + 1`), 'd1000 = ?'], true);
    expect(ms).toBeLessThan(5000);
    expect(out.at(-1)!.error ?? '').not.toMatch(/call stack/);
    expect(out.at(-1)!.symbolic).toContain('d0');
  });
});

describe('[BUG-037] o prazo de 6 s do processo conta só o cálculo, não a partida do Node', { timeout: 30_000 }, () => {
  it('partida de 7 s numa máquina ocupada e conta trivial: termina com o resultado, sem estourar o prazo', async () => {
    const { out } = await runChild(['1 + 1 = ?'], false, { partidaMs: 7_000 });
    expect(out[0].numText).toBe('2');
  });
});
