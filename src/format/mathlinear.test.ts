import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { latexToLine, lineToLinear, parseLinear, toLatex, toLinear, unitFromMathjs } from './mathlinear';
import { blocks, lines, parse } from './doc';
import { loadGolden, ROOT, walk } from '../../tests/helpers/files';
import { readFileSync } from 'node:fs';

type ConvCase = { id: string; linear: string; digitado?: string; tela_contem?: string[] };

// tests/golden/conversao.yaml (ADENDO 02 B9; ADENDO 03 C3)
describe('tests/golden/conversao.yaml', () => {
  for (const c of loadGolden<ConvCase>(join(ROOT, 'tests/golden/conversao.yaml'))) {
    if (c.digitado !== undefined) {
      it(`[${c.id}] MathLive "${c.digitado}" grava "${c.linear}"`, () => expect(toLinear(c.digitado!)).toBe(c.linear));
    } else {
      it(`[${c.id}] ida e volta: ${c.linear}`, () => {
        expect(toLinear(toLatex(c.linear))).toBe(c.linear);
        for (const part of c.tela_contem ?? []) expect(toLatex(c.linear)).toContain(part);
      });
    }
  }
});

describe('conversor: regras', () => {
  it('[B10-10] ida e volta de todas as linhas de cálculo dos arquivos de exemplo', () => {
    const files = walk(join(ROOT, 'tests/fixtures')).filter((f) => /\.prs[mf]$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      for (const b of blocks(parse(readFileSync(f, 'utf8')))) {
        if (!['calc', 'funcao', 'verificar'].includes(b.type)) continue;
        for (const l of lines(b.body).map((x) => x.trim()).filter(Boolean)) expect(toLinear(toLatex(l)), f).toBe(l);
      }
    }
  });

  it('[B10-10] expressão incompleta é recusada (não vai para o arquivo)', () => {
    for (const l of ['S\\coloneq', '\\frac{a}{\\placeholder{}}', '2+', '\\left(a']) expect(() => toLinear(l)).toThrow();
  });

  it('[B10-01] tela: ≔ com espaço, unidade em azul; [B10-02] índice reto', () => {
    expect(toLatex('S := 4 mm^2')).toBe('S\\;\\coloneq\\;4\\,\\class{u}{\\mathrm{mm}^{2}}');
    expect(toLatex('V_mp := 400 V')).toBe('V_{\\mathrm{mp}}\\;\\coloneq\\;400\\,\\class{u}{\\mathrm{V}}');
  });

  it('[B10-01] variável não definida ganha a classe undef; parâmetro e definida, não', () => {
    const ctx = { defined: new Set(['L']) };
    expect(toLatex('L*x = ?', ctx)).toBe('L\\cdot \\class{undef}{x}=?');
    expect(toLatex('f(x) := x*L', ctx)).toBe('f(x)\\;\\coloneq\\;x\\cdot L');
  });

  it('[B10-08] unidade do math.js para a do arquivo; linha eval guarda a unidade pedida', () => {
    expect(unitFromMathjs('(ohm mm^2) / m')).toBe('Ω*mm^2/m');
    expect(unitFromMathjs('kWh')).toBe('kWh');
    expect(latexToLine('x=?\\,\\class{u}{\\mathrm{mV}}')).toEqual(parseLinear('x = ? mV'));
    expect(lineToLinear(parseLinear('x  =  ?  V'))).toBe('x = ? V');
  });
});
