import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluate, type BlockInput, type EvalInput, type LibInput } from './evaluate';
import { classify, greek } from './syntax';
import { fmtNum, prettyUnit } from './format';
import { math } from './math';
import { blocks, lines, parse } from '../format/doc';
import { byPosition } from '../format/views';

const RES = join(import.meta.dirname, '../../resources');
const EX = join(import.meta.dirname, '../../tests/fixtures/usina-boa-vista');
const ELETRICA: LibInput = { id: 'eletrica', constants: [['ρ_cu', '0.0179 Ω*mm^2/m'], ['α_cu', '0.00393 1/°C']], functions: ['ΔV(L, I, S) := 2*ρ_cu*L*I/S'] };

/** Avalia linhas soltas num bloco calc e devolve o resultado de cada uma. */
const run = (src: string[], libs: LibInput[] = [ELETRICA]) => evaluate({ libs, blocks: [{ key: 'b', type: 'calc', lines: src }] }).blocks.b;
const last = (src: string[], libs?: LibInput[]) => run(src, libs).at(-1)!;
const near = (got: number | undefined, want: number, tol = 0.005) => expect(Math.abs((got ?? NaN) - want) / want).toBeLessThanOrEqual(tol);

describe('SPEC seção 8: testes obrigatórios', () => {
  it('[F2-01] ΔV(25 m, 12 A, 6 mm^2) com ρ_cu = 0,0179 Ω·mm²/m = 1,79 V', () => {
    const r = last(['ΔV(25 m, 12 A, 6 mm^2) = ? V']);
    near(r.value, 1.79);
    expect(r.text).toBe('1,79 V');
  });

  it('[F2-02] ΔV(32 m, 11.5 A, 4 mm^2) = 3,29 V', () => {
    const r = last(['ΔV(32 m, 11.5 A, 4 mm^2) = ? V']);
    near(r.value, 3.29);
    expect(r.text).toBe('3,29 V');
  });

  it('[F2-03] 3,29 V / 400 V = 0,82 %', () => {
    const r = last(['3.29 V / 400 V = ? %']);
    near(r.value, 0.8225);
    expect(r.text).toBe('0,82 %');
  });

  it('[F2-04] E_mes(5.5 kWp, 5.4 h/dia, 0.8) = P·HSP·PR·30 dia = 712,8 kWh', () => {
    const r = last(['E_mes(P, HSP, PR) := P*HSP*PR*30 dia', 'E_mes(5.5 kWp, 5.4 h/dia, 0.8) = ? kWh']);
    near(r.value, 712.8);
    expect(r.text).toBe('712,80 kWh');
  });

  it('[F2-05] ρ_T(70 °C) = ρ_cu·(1 + 0,00393·50) = 0,0214 Ω·mm²/m', () => {
    const r = last(['ρ_T(T) := ρ_cu*(1 + α_cu*(T - 20 °C))', 'ρ_T(70 °C) = ?']);
    near(r.value, 0.0214);
    expect(r.text).toBe('0,0214 Ω·mm²/m');
  });

  it('[F2-06] 1 m + 1 A dá erro de unidade', () => {
    expect(last(['1 m + 1 A = ?']).error).toBe('Unidades incompatíveis: m + A');
    expect(last(['x := 1 m + 1 A']).error).toBe('Unidades incompatíveis: m + A');
  });
});

describe('regras do motor', () => {
  it('[F2-08] usar antes de definir é erro (como no SMath)', () => {
    const r = run(['y := x + 1', 'x := 2']);
    expect(r[0].error).toBe('Variável não definida: x');
    expect(r[1].error).toBeUndefined();
  });

  it('[F2-09] simplifica a unidade do resultado sem unidade pedida', () => {
    expect(last(['ΔV(25 m, 12 A, 6 mm^2) = ?']).text).toBe('1,79 V');
  });

  it('[F2-09] pedir unidade incompatível é erro', () => {
    expect(last(['2 m = ? V']).error).toBe('Não é possível converter m em V');
  });

  it('[F2-15] comentário, linha vazia e grego por \\nome', () => {
    expect(run(['# só comentário', '', 'a := 2 # metade', 'a*2 = ?']).map((l) => l.kind)).toEqual(['empty', 'empty', 'assign', 'eval']);
    expect(greek('\\rho_cu := 1 \\Omega')).toBe('ρ_cu := 1 Ω');
  });

  it('[F2-14] verificação: APROVADO, ATENÇÃO perto do limite e REPROVADO', () => {
    const check = (lim: string) => evaluate({ libs: [], blocks: [{ key: 'v', type: 'verificar', lines: [`0.82 / 100 < ${lim}`] }] }).blocks.v[0];
    expect(check('2 %')).toMatchObject({ status: 'ok', text: '0,82 %', limit: '2 %' });
    expect(check('1 %')).toMatchObject({ status: 'warn', text: '0,82 %' });
    expect(check('0.5 %').status).toBe('fail');
  });

  it('[F2-15] classifica as linhas', () => {
    expect(classify('L := 25 m')).toMatchObject({ kind: 'assign', name: 'L', src: 'L = 25 m' });
    expect(classify('ΔV(L, I, S) := 2*ρ_cu*L*I/S')).toMatchObject({ kind: 'func', name: 'ΔV' });
    expect(classify('ΔV(L, I, S)/V_mp = ? %')).toMatchObject({ kind: 'eval', target: '%' });
    expect(classify('x <= 2 m', true)).toMatchObject({ kind: 'check', limit: '2 m' });
  });

  it('[F2-16] formata números e unidades', () => {
    expect([fmtNum(1.7899999), fmtNum(712.8), fmtNum(0.02141), fmtNum(0), fmtNum(1e-7), fmtNum(-3.5)]).toEqual(['1,79', '712,80', '0,0214', '0,00', '1,00e-7', '-3,50']);
    expect([fmtNum(2 * 0.0179 * 25 * 12 / 4), fmtNum(-2.685), fmtNum(0.125), fmtNum(5, { decimals: 3, sep: '.' })]).toEqual(['2,69', '-2,69', '0,13', '5.000']);
    expect(prettyUnit('(ohm mm^2) / m')).toBe('Ω·mm²/m');
  });
});

describe('funções nativas', () => {
  const v = (expr: string, pre: string[] = []) => last([...pre, `${expr} = ?`], []);
  it('[F2-10] elementares', () => {
    expect(v('sqrt(16)').value).toBe(4);
    expect(v('ln(exp(2))').value).toBeCloseTo(2);
    expect(v('log(1000)').value).toBeCloseTo(3);
    expect(v('sin(30 deg)').value).toBeCloseTo(0.5);
    expect(v('round(2.567, 1)').value).toBe(2.6);
    expect(v('mean([1, 2, 3])').value).toBe(2);
  });
  it('[F2-10] root, integral, derivada, interpolação, polyroots, sistemas e matrizes', () => {
    const f = ['f(x) := x^2 - 2'];
    expect(v('root(f, 1)', f).value).toBeCloseTo(Math.SQRT2, 9);
    expect(v('root(f, 0, 2)', f).value).toBeCloseTo(Math.SQRT2, 9);
    expect(v('integral(f, 0, 3)', f).value).toBeCloseTo(3, 6);
    expect(v('deriv(f, 3)', f).value).toBeCloseTo(6, 5);
    expect(v('interp([0, 10], [0, 100], 2.5)').value).toBeCloseTo(25);
    expect(math.format(math.evaluate('polyroots([1, -3, 2])'))).toBe('[2, 1]');
    expect(math.format(math.evaluate('solve([[2, 1], [1, 3]], [3, 5])'))).toBe('[[0.8], [1.4]]');
    expect(v('det([[1, 2], [3, 4]])').value).toBeCloseTo(-2);
  });
  it('[F2-10] root com unidades', () => {
    expect(v('root(g, 1 m)', ['g(x) := x^2 - 4 m^2']).text).toBe('2,00 m');
  });
});

// Lê o arquivo de exemplo como o app lê: blocos em ordem, biblioteca de fábrica.
function inputFrom(rel: string, order: (b: ReturnType<typeof blocks>) => ReturnType<typeof blocks> = (b) => b): EvalInput {
  const doc = parse(readFileSync(join(EX, rel), 'utf8'));
  const bs: BlockInput[] = order(blocks(doc)).map((b) => ({ key: b.id ?? '', type: b.type, lines: lines(b.body) }));
  const lib = parse(readFileSync(join(RES, 'bibliotecas/eletrica.prsl'), 'utf8'));
  const constants = Object.entries(lib.meta.constantes as object).map(([k, x]) => [k, String(x)] as [string, string]);
  const functions = blocks(lib).filter((b) => b.type === 'funcao').flatMap((b) => lines(b.body));
  return { libs: [{ id: 'eletrica', constants, functions }], blocks: bs };
}

describe('exemplos da seção 3', () => {
  it('[F2-07] cabos-cc: 1,79 V, 0,45 % e APROVADO', () => {
    const r = evaluate(inputFrom('calculos/cabos-cc.prsm'));
    expect(r.libErrors).toEqual([]);
    expect(r.blocks.trecho.filter((l) => l.kind === 'eval').map((l) => l.text)).toEqual(['1,79 V', '0,45 %']);
    expect(r.blocks.criterio[0]).toMatchObject({ status: 'ok', text: '0,45 %', limit: '1 %' });
  });

  it('[F3-01] [F3-05] string-3 (ordem y, x): 3,29 V, 0,82 %', () => {
    const r = evaluate(inputFrom('calculos/string-3.prsf', byPosition));
    expect(r.blocks.resultado.map((l) => l.text)).toEqual(['3,29 V', '0,82 %']);
  });
});

describe('ADENDO 02: gráfico e partes do resultado', () => {
  it('[F3-03] [B10-06] string-3: ΔV % × seção, com limite, avaliado com todas as definições da folha', () => {
    const r = evaluate(inputFrom('calculos/string-3.prsf', byPosition));
    const p = Object.values(r.plots ?? {})[0];
    expect(p.error).toBeUndefined();
    expect(p.xs).toEqual([2.5, 4, 6, 10]);
    expect(p.ys.map((y) => Number(y!.toFixed(2)))).toEqual([1.32, 0.82, 0.55, 0.33]);
    expect(p.limite).toEqual({ valor: 1, rotulo: 'limite 1 %' });
  });

  it('[B10-08] resultado traz número e unidade separados', () => {
    expect(last(['ΔV(25 m, 12 A, 6 mm^2) = ? mV'])).toMatchObject({ numText: '1790,00', unitRaw: 'mV' });
    expect(last(['3.29 V / 400 V = ? %'])).toMatchObject({ numText: '0,82', unitRaw: '%' });
  });
});
