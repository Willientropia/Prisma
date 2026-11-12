// A6-3: o operador "ou" (a || b) e o nome com índice entre aspas (batata_"alo,oi") no motor.
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';

const run = (lines: string[], type = 'calc') => evaluate({ libs: [], blocks: [{ key: 'b', type, lines }] }).blocks.b;
const last = (lines: string[], type?: string) => run(lines, type).at(-1)!;

describe('A6-3: ou (||)', () => {
  it('[A6-3-51] 1 || 0 = ? mostra 1, 0 || 0 mostra 0 (como no SMath)', () => {
    expect(last(['1 || 0 = ?']).text).toBe('1');
    expect(last(['0 || 0 = ?']).text).toBe('0');
    expect(last(['0 || 2 = ?']).text).toBe('1');
  });
  it('[A6-3-51] fica abaixo das comparações: 1 < 2 || 3 < 2 = 1; (1 > 2) || (3 > 2) = 1', () => {
    expect(last(['1 < 2 || 3 < 2 = ?']).text).toBe('1');
    expect(last(['1 > 2 || 3 > 4 = ?']).text).toBe('0');
  });
  it('[A6-3-51] com variáveis e na definição: x := 0 || 1; x = ?', () => {
    expect(last(['a := 0', 'b := 3', 'x := a || b', 'x = ?']).text).toBe('1');
  });
  it('[A6-3-51] numa região de verificação continua condição (verdadeiro/falso decide o selo)', () => {
    const check = (cond: string) => evaluate({ libs: [], blocks: [{ key: 'c', type: 'calc', lines: ['a := 2'] }, { key: 'v', type: 'verificar', lines: [cond] }] }).blocks.v[0];
    expect(check('a < 1 || a > 1').status).toBe('ok');
    expect(check('a < 1 || a > 3').status).toBe('fail');
  });
});

describe('A6-3: índice entre aspas', () => {
  it('[A6-3-72] define e usa batata_"alo,oi"', () => {
    expect(last(['batata_"alo,oi" := 5', 'batata_"alo,oi" = ?']).text).toBe('5');
    expect(last(['x_"a,b" := 2', '2*x_"a,b" + 1 = ?']).text).toBe('5');
  });
  it('[A6-3-72] nome sem aspas continua igual (S_trafo, Relação_invest.Lucro)', () => {
    expect(last(['S_trafo := 7', 'S_trafo = ?']).text).toBe('7');
    expect(last(['Relação_invest.Lucro := 3', 'Relação_invest.Lucro = ?']).text).toBe('3');
  });
  it('[A6-3-72] nome com índice com vírgula que falta aparece como estava escrito, não codificado', () => {
    const r = evaluate({ libs: [], symbolic: true, blocks: [{ key: 'b', type: 'calc', lines: ['y := 2*k_"p,q"', 'y = ?'] }] }).blocks.b.at(-1)!;
    expect(r.missing).toEqual(['k_"p,q"']);
  });
});
