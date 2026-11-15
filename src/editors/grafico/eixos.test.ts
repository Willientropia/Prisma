// Contas do desenho do gráfico 2D: marcas e zoom terminam para qualquer vista (revisão da v0.5.0).
import { describe, expect, it } from 'vitest';
import { niceTicks, zoomView } from './eixos';

describe('eixos do gráfico 2D', () => {
  it('niceTicks termina mesmo com vista estreita demais para a precisão do número', () => {
    for (const [lo, hi] of [[1, 1 + 4e-16], [1000, 1000 + 2e-13], [1e17, 1e17 + 32]]) expect(niceTicks(lo, hi, 5).ticks.length).toBeLessThanOrEqual(12);
    expect(niceTicks(0, 3, 6).ticks).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
  });

  it('zoomView não aproxima além da precisão e afasta normalmente', () => {
    let v = { x: [0, 1] as [number, number], y: [0, 1] as [number, number] };
    for (let i = 0; i < 400; i++) v = zoomView(v, 0.5, 0.5, 1 / 1.15, 1 / 1.15);
    expect(v.x[1] - v.x[0]).toBeGreaterThan(1e-10);
    expect(zoomView({ x: [0, 1], y: [0, 1] }, 0, 0, 2, 1).x).toEqual([0, 2]);
  });
});
