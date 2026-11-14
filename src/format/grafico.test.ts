import { describe, expect, it } from 'vitest';
import { NEW_GRAPH, seriesOf, setAxis, setFlag, setSeries, setView } from './grafico';

const REF = 'tipo: 2d\nseries: ["F(x)"]\nx: {min: 0, max: 3, rotulo: x}\ny: {min: 0, max: 3, rotulo: y}\ngrade: true\n';

describe('corpo do gráfico 2D (ADENDO 06, 5.4)', () => {
  it('séries entre aspas, na forma do ADENDO', () => {
    expect(setSeries(NEW_GRAPH, ['F(x)', 'f(a, b)'])).toBe('tipo: 2d\nseries: ["F(x)", "f(a, b)"]\ngrade: true\n');
    expect(seriesOf(REF)).toEqual(['F(x)']);
  });

  it('[06-41] vista ajustada grava min e max mantendo o rótulo; a automática tira os dois', () => {
    const v = setView(REF, { x: [0.123456, 2.5], y: [-1, 4.0004] });
    expect(v).toBe('tipo: 2d\nseries: ["F(x)"]\nx: {min: 0.123, max: 2.5, rotulo: x}\ny: {min: -1, max: 4, rotulo: y}\ngrade: true\n');
    expect(setView(v, null)).toBe('tipo: 2d\nseries: ["F(x)"]\nx: {rotulo: x}\ny: {rotulo: y}\ngrade: true\n');
    expect(setView(setView(NEW_GRAPH, { x: [0, 3], y: [0, 3] }), null)).toBe(NEW_GRAPH);
  });

  it('eixo e chaves de exibição', () => {
    expect(setAxis(NEW_GRAPH, 'x', { min: 0, max: 10, rotulo: 't' })).toBe('tipo: 2d\nseries: []\ngrade: true\nx: {min: 0, max: 10, rotulo: t}\n');
    expect(setFlag(NEW_GRAPH, 'grade', false)).toBe('tipo: 2d\nseries: []\ngrade: false\n');
  });
});
