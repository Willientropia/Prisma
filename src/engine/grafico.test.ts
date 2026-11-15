import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { refine, type Graph2D } from './grafico';

const graph = (defs: string[], body: string) =>
  evaluate({ libs: [], blocks: [{ key: 'c', type: 'calc', lines: defs }, { key: 'g', type: 'grafico', lines: [body] }] }).plots!.g as Graph2D;
/** y da linha desenhada em x (interpolação entre os pontos vizinhos). */
const at = (s: Graph2D['series'][number], x: number) => {
  const i = s.xs.findIndex((v) => v >= x);
  const [x0, x1, y0, y1] = [s.xs[i - 1], s.xs[i], s.ys[i - 1]!, s.ys[i]!];
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};
const F = 'F(x) := abs(1 + e^(5*(x - 2)))';

describe('gráfico 2D de função (ADENDO 06, 5.4)', () => {
  it('[06-38] caso 5.1: passa por (0; 1) e (2; 2) e chega a 3 perto de x = 2,14', () => {
    const g = graph([F], 'tipo: 2d\nseries: ["F(x)"]\nx: {min: 0, max: 3}\ny: {min: 0, max: 3}\n');
    expect(g.error).toBeUndefined();
    const s = g.series[0];
    const px = 3 / 240; // 1 px na vista 0 a 3 com 240 px
    expect(Math.abs(at(s, 0.0001) - 1)).toBeLessThan(px);
    expect(Math.abs(at(s, 2) - 2)).toBeLessThan(px);
    expect(Math.abs(at(s, 2 + Math.log(2) / 5) - 3)).toBeLessThan(px);
    expect(g.rotulos).toEqual({ x: 'x', y: 'y' });
    expect(g.auto).toEqual({ x: false, y: false });
  });

  it('a variável livre pode ter qualquer nome e vira o rótulo do eixo', () => {
    const g = graph([], 'series: ["sin(t)"]\n');
    expect(g.rotulos.x).toBe('t');
    expect(g.rotuloVar).toBe(true); // a tela desenha o nome em notação matemática
    expect(graph([], 'series: ["sin(t)"]\nx: {rotulo: tempo}\n').rotuloVar).toBe(false);
    expect(g.x).toEqual([-5, 5]); // sem informação: −5 a 5
    expect(g.auto).toEqual({ x: true, y: true });
    expect(g.y[0]).toBeCloseTo(-1.1, 2); // y ajustado com 5 % de folga
    expect(g.y[1]).toBeCloseTo(1.1, 2);
  });

  it('[06-39] 1/(x − 1) não liga os lados da assíntota', () => {
    const g = graph([], 'series: ["1/(x - 1)"]\nx: {min: 0, max: 3}\ny: {min: -10, max: 10}\n');
    const { xs, ys } = g.series[0];
    for (let i = 1; i < xs.length; i++) {
      const [a, b] = [ys[i - 1], ys[i]];
      if (a !== null && b !== null) expect(xs[i - 1] < 1 && xs[i] > 1).toBe(false);
    }
    expect(ys.some((y) => y === null)).toBe(true);
  });

  it('[06-42] duas variáveis livres dão o erro de 5.4', () => {
    expect(graph([], 'series: ["x + t"]\n').error).toBe('O gráfico 2D precisa de uma única variável livre (encontradas: x, t)');
  });

  it('várias séries, matriz n × 2 e refinamento limitado a 4 000 pontos', () => {
    const g = graph([], 'series: ["x^2", "[0, 1; 1, 3; 2, 2]", "sin(1/x)"]\n');
    expect(g.series).toHaveLength(3);
    expect(g.series[1].xs).toEqual([0, 1, 2]);
    expect(g.series[1].ys).toEqual([1, 3, 2]);
    expect(g.series[2].xs.length).toBeLessThanOrEqual(4000);
  });

  it('raiz de negativo só quebra a linha, sem erro', () => {
    const g = graph([], 'series: ["sqrt(x)"]\n');
    expect(g.error).toBeUndefined();
    expect(g.series[0].ys[0]).toBeNull();
    expect(g.series[0].ys.at(-1)).toBeCloseTo(Math.sqrt(5), 6);
  });

  it('redefinir a função muda a curva; o formato antigo (var e valores) continua', () => {
    expect(at(graph(['F(x) := 2*x'], 'series: ["F(x)"]\n').series[0], 1)).toBeCloseTo(2, 6);
    const old = evaluate({ libs: [], blocks: [{ key: 'g', type: 'grafico', lines: ['x: {var: x, valores: [1, 2]}\ny: {expr: "x^2"}\n'] }] }).plots!.g;
    expect('tipo' in old).toBe(false);
    expect((old as { ys: number[] }).ys).toEqual([1, 4]);
  });

  it('o refinamento para no prazo: série pesada fica com os pontos iniciais (revisão da v0.5.0)', () => {
    const slow = (x: number) => { const t = performance.now(); while (performance.now() - t < 0.5); return Math.sin(50 * x); };
    const xs = Array.from({ length: 41 }, (_, i) => i / 4), ys = xs.map(Math.sin);
    const t0 = performance.now();
    const r = refine(slow, xs, ys, 2, performance.now() + 20);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(r.xs.length).toBeGreaterThanOrEqual(xs.length);
  });
});
