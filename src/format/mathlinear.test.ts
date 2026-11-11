import { spawnSync } from 'node:child_process';
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

// T01 / BUG-008: "." solto travava o conversor em laço infinito. Cada entrada roda num processo
// próprio com prazo, porque um laço síncrono não pode ser interrompido dentro do vitest.
describe('[T01-01][BUG-008] ponto solto não trava', () => {
  for (const s of ['2.', 'x.', '.', 'Relação.', 'batata.', '2{,}']) {
    it(JSON.stringify(s), () => {
      const code = `import { toLinear, MathSyntaxError } from './src/format/mathlinear'; const t0 = performance.now(); try { toLinear(${JSON.stringify(s)}); } catch (e) { if (!(e instanceof MathSyntaxError)) throw e; } console.log(performance.now() - t0);`;
      const r = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: ROOT, timeout: 5000, encoding: 'utf8' });
      expect(r.error, 'travou').toBeUndefined();
      expect(r.status, r.stderr).toBe(0);
      expect(Number(r.stdout.trim())).toBeLessThan(100);
    });
  }
});

describe('[T02-01] nome com dígito', () => {
  it('R1, I1, xy2pol, sys2mat e log10 fazem ida e volta e não viram produto', () => {
    for (const l of ['R1 := 5', 'I1 + I2', 'xy2pol(z)', 'sys2mat(v)', 'log10(x)', '2*R1']) expect(toLinear(toLatex(l))).toBe(l);
    expect(toLinear('2R1')).toBe('2*R1'); // digitado: o dígito não vira unidade nem produto
  });
});

describe('[T03-01][BUG-010] texto entre aspas', () => {
  it('mantém os espaços, inclusive repetidos, na ida e volta', () => {
    for (const l of ['a := "3º Harmônica"', 'a := "um  dois   três"', 'mat("Nº de harmônicas", 1)']) expect(toLinear(toLatex(l))).toBe(l);
  });
});

// F04: número e letras sem apóstrofo é produto (nome é variável); unidade só explícita
describe('[F04-01] nome colado ao número é produto', () => {
  it('[F04-01] 9j, 2x e 4mm^2 digitados gravam multiplicação', () => {
    expect(toLinear('9j')).toBe('9*j');
    expect(toLinear('2x')).toBe('2*x');
    expect(toLinear('4\\mathrm{mm}')).toBe('4*mm');
    expect(toLinear('S\\coloneq4mm^{2}')).toBe('S := 4*mm^2');
    expect(toLinear('2R1')).toBe('2*R1');
  });
});

describe('[F04-02] unidade explícita', () => {
  it("[F04-02] unidade solta com apóstrofo faz ida e volta, sozinha e dentro de expressão", () => {
    for (const l of ["x*'m", "'A/100", "1/'degC", "k := 2*'m", "y := 3*'Ω*'mm^2/'m", "v := w/'s^2"]) expect(toLinear(toLatex(l)), l).toBe(l);
    expect(toLatex("x*'m")).toContain('\\class{u}{\\mathrm{m}}');
  });
  it('[F04-02] unidade marcada na tela (\\class{u}) vira número + unidade só quando vem logo depois do número', () => {
    expect(toLinear('4\\class{u}{\\mathrm{mm}}^{2}')).toBe('4 mm^2');
    expect(toLinear('x\\cdot\\class{u}{\\mathrm{m}}')).toBe("x*'m");
    expect(toLinear('5\\class{u}{\\mathrm{kV}}\\cdot\\class{u}{\\mathrm{A}}')).toBe('5 kV*A');
    expect(toLinear('L\\coloneq25\\,\\class{u}{\\mathrm{m}}')).toBe('L := 25 m');
  });
});

describe('[F04-04] arquivos antigos abrem iguais', () => {
  it('[F04-04] número + espaço + unidade, conversão e 2 x legado', () => {
    for (const l of ['L := 25 m', 'ρ := 0.0179 Ω*mm^2/m', 'α := 0.00393 1/°C', 'HSP := 5.4 h/dia', 'ΔV(L, I, S) = ? mV', 'x := 2 x', 'T := 25 °C', 'P := 5 kV*A']) expect(toLinear(toLatex(l)), l).toBe(l);
    // com contexto da tela: variável definida vence a unidade (2 h com h := 3), unidade conhecida continua unidade
    const ctx = { defined: new Set(['x', 'h']), isUnit: (n: string) => ['m', 'V', 'h'].includes(n) };
    expect(toLatex('2 x', ctx)).toBe('2\\,x');
    expect(toLatex('2 h', ctx)).toBe('2\\,h');
    expect(toLatex('2 m', ctx)).toContain('\\class{u}{\\mathrm{m}}');
  });
});
