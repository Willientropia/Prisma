import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { latexToLine, lineToLinear, parseLinear, toLatex, toLinear, unitFromMathjs } from './mathlinear';
import { blocks, lines, parse } from './doc';

// ADENDO 02, tabela B9 (coluna "No arquivo")
const B9 = [
  'S := 4 mm^2',
  'L := 32 m',
  'I := 11.5 A',
  'V_mp := 400 V',
  'ΔV(L, I, S) := 2*ρ_cu*L*I/S',
  'ΔV(L, I, S) = ? V',
  'ΔV(L, I, S)/V_mp = ? %',
  '(a + b)/(c + d)',
  'sqrt(x^2 + y^2)',
  'x <= 1 %',
  'T := 25 °C',
  'M := [1, 2; 3, 4]',
  'abs(x)',
];

describe('B10.10: toLinear(toLatex(x)) === x', () => {
  for (const x of B9) it(x, () => expect(toLinear(toLatex(x))).toBe(x));

  it('todas as linhas de cálculo dos exemplos', () => {
    const EX = join(import.meta.dirname, '../../resources/exemplos/Usina Boa Vista/calculos');
    for (const f of ['cabos-cc.prsm', 'string-3.prsf']) {
      for (const b of blocks(parse(readFileSync(join(EX, f), 'utf8')))) {
        if (!['calc', 'funcao', 'verificar'].includes(b.type)) continue;
        for (const l of lines(b.body).map((x) => x.trim()).filter(Boolean)) expect(toLinear(toLatex(l))).toBe(l);
      }
    }
  });

  it('mais casos', () => {
    for (const x of ['E_mes(P, HSP, PR) := P*HSP*PR*30 dia', 'HSP := 5.4 h/dia', 'α_cu := 0.00393 1/°C', 'ρ := 0.0179 Ω*mm^2/m', 'x := -(a + b)', 'y := a - (b - c)', 'f(x) := x^2 - 2', 'root(f, 1) = ?', 'z := sin(30 °)', 'P := 2^(n + 1)'])
      expect(toLinear(toLatex(x))).toBe(x);
  });
});

describe('LaTeX produzido pelo MathLive ao digitar', () => {
  const cases: [string, string][] = [
    ['S\\coloneq4mm^2', 'S := 4 mm^2'], // B10.1, antes da classificação
    ['V_{mp}\\coloneq400V', 'V_mp := 400 V'], // B10.2
    ['\\frac{\\left(a+b\\right)}{2}', '(a + b)/2'], // B10.3
    ['I\\coloneq11,5A', 'I := 11.5 A'], // B10.5
    ['I\\coloneq11{,}5A', 'I := 11.5 A'],
    ['2\\cdot r\\cdot L\\cdot\\frac{I}{S}', '2*r*L*I/S'],
    ['f\\left(x;y\\right)', 'f(x, y)'],
    ['25\\degree C', '25 °C'],
    ['1\\%', '1 %'],
    ['x\\le1', 'x <= 1'],
    ['\\Delta V\\left(L;I;S\\right)', 'ΔV(L, I, S)'],
    ['4\\,\\class{u}{\\mathrm{mm}}^{2}', '4 mm^2'],
    ['2\\left(x+1\\right)', '2*(x + 1)'],
    ['\\sqrt{x}', 'sqrt(x)'],
    ['\\left\\lvert x\\right\\rvert', 'abs(x)'],
    ['\\class{undef}{y}+1', 'y + 1'],
    ['\\operatorname{sin}\\left(x\\right)', 'sin(x)'],
    ['\\rho_{\\mathrm{cu}}', 'ρ_cu'],
  ];
  for (const [latex, linear] of cases) it(latex, () => expect(toLinear(latex)).toBe(linear));

  it('expressão incompleta é erro (não grava)', () => {
    for (const l of ['S\\coloneq', '\\frac{a}{\\placeholder{}}', '2+', '\\left(a']) expect(() => toLinear(l)).toThrow();
  });
});

describe('tela', () => {
  it('unidade em azul, índice reto, divisão como fração, vírgula decimal', () => {
    expect(toLatex('S := 4 mm^2')).toBe('S\\;\\coloneq\\;4\\,\\class{u}{\\mathrm{mm}^{2}}');
    expect(toLatex('V_mp := 400 V')).toBe('V_{\\mathrm{mp}}\\;\\coloneq\\;400\\,\\class{u}{\\mathrm{V}}');
    expect(toLatex('I := 11.5 A')).toContain('11{,}5');
    expect(toLatex('(a + b)/(c + d)')).toBe('\\frac{a+b}{c+d}');
    expect(toLatex('ρ := 0.0179 Ω*mm^2/m')).toContain('\\frac{\\mathrm{\\Omega}\\cdot \\mathrm{mm}^{2}}{\\mathrm{m}}');
  });

  it('variável não definida ganha a classe undef; parâmetro e definida, não', () => {
    const ctx = { defined: new Set(['L']) };
    expect(toLatex('L*x = ?', ctx)).toBe('L\\cdot \\class{undef}{x}=?');
    expect(toLatex('f(x) := x*L', ctx)).toBe('f(x)\\;\\coloneq\\;x\\cdot L');
  });

  it('unidade do math.js para a do arquivo', () => {
    expect(unitFromMathjs('(ohm mm^2) / m')).toBe('Ω*mm^2/m');
    expect(unitFromMathjs('kWh')).toBe('kWh');
  });

  it('linha eval guarda a unidade pedida', () => {
    expect(latexToLine('x=?\\,\\class{u}{\\mathrm{mV}}')).toEqual(parseLinear('x = ? mV'));
    expect(lineToLinear(parseLinear('x  =  ?  V'))).toBe('x = ? V');
  });
});
