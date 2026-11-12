import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { latexToLine, latexToUnit, lineToLinear, parseLinear, toLatex, toLinear, unitFromMathjs, unitToLinear } from './mathlinear';
import { blocks, lines, parse } from './doc';
import { loadGolden, ROOT, walk } from '../../tests/helpers/files';
import { readFileSync } from 'node:fs';
import { math } from '../engine/math';

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

describe('[BUG-019] ‰ e ppm no arquivo e no campo', () => {
  it('[BUG-019] "= ? ‰" e "= ? ppm" fazem ida e volta e aparecem como unidade', () => {
    for (const l of ['x = ? ‰', 'x = ? ppm', 'x = ? %', 'f(a) = ? ‰']) expect(toLinear(toLatex(l)), l).toBe(l);
    expect(latexToUnit('\\mathrm{‰}').terms[0].name).toBe('‰');
    expect(latexToUnit('‰').terms[0].name).toBe('‰');
    expect(unitToLinear(latexToUnit('ppm'))).toBe('ppm');
  });
});

describe('[BUG-020] número colado em nome é produto', () => {
  it('[BUG-020] 5A lê como 5*A e 9j como 9*j, como o que é digitado (F04); I_o:=5A mostra 5·A', () => {
    expect(lineToLinear(parseLinear('I_o:=5A'))).toBe('I_o := 5*A');
    expect(lineToLinear(parseLinear('z := 9j'))).toBe('z := 9*j');
    expect(lineToLinear(parseLinear('y := 5A^2'))).toBe('y := 5*A^2');
    expect(lineToLinear(parseLinear('y := 2sin(x)'))).toBe('y := 2*sin(x)');
    expect(toLatex('I_o:=5A')).toContain('5\\cdot');
    expect(toLatex('I_o:=5A')).not.toContain(':');
  });
  it('[BUG-020] o produto implícito segue o motor: 1/2x é (1/2)*x e 2x/3 é (2*x)/3', () => {
    expect(lineToLinear(parseLinear('y := 1/2x'))).toBe('y := 1/2*x');
    expect(lineToLinear(parseLinear('y := 2x/3'))).toBe('y := 2*x/3');
    expect(toLatex('y := 1/2x')).toContain('\\frac{1}{2}\\cdot');
  });
});

// A6-FIX2: a tela segue o motor (math.js). O que o math.js lê de um jeito, o leitor lê do mesmo jeito.
const mathStr = (s: string) => math.parse(s).toString({ parenthesis: 'all', implicit: 'show' });
const rhsOf = (s: string) => s.replace(/^.*:=\s*/, '');
const viaFile = (s: string) => lineToLinear(parseLinear(s));
const viaTela = (s: string) => toLinear(toLatex(s));

describe('[A6-FIX2-01] produto colado: a tela segue o motor', () => {
  const casos = ['y := a/2x', 'y := 2x/3y', 'y := 1/2x', 'y := 2x/3', 'y := a/2x/3', 'y := 2/3x', 'y := x/2y', 'y := a/2x*b', 'y := -1/2x', 'y := 1/2 sin(x)', 'y := 1/2 (x)', 'y := 2/3 sin(x)'];
  for (const c of casos) {
    it(`[A6-FIX2-01] ${c}: mesma árvore do math.js no arquivo e depois de passar pela tela`, () => {
      expect(mathStr(rhsOf(viaFile(c))), 'arquivo regravado').toBe(mathStr(rhsOf(c)));
      expect(mathStr(rhsOf(viaTela(c))), 'tela e volta').toBe(mathStr(rhsOf(c)));
    });
  }
  it('[A6-FIX2-01] a/2x mostra a/(2·x), com 2x embaixo da barra', () => {
    expect(toLatex('y := a/2x')).toContain('\\frac{a}{2\\cdot x}');
    expect(toLatex('y := 2x/3y')).toContain('\\frac{2\\cdot x}{3\\cdot y}');
    expect(toLatex('y := 1/2x')).toContain('\\frac{1}{2}\\cdot');
  });
});

describe('[A6-FIX2-02] notação científica sobrevive à edição', () => {
  it('[A6-FIX2-02] 2e3, 2e3 m, 1e-3x e 1.5e-3 fazem ida e volta pela tela', () => {
    expect(viaTela('x := 2e3')).toBe('x := 2e3');
    expect(viaTela('x := 2e3 m')).toBe('x := 2e3 m');
    expect(viaTela('y := 1e-3x')).toBe('y := 1e-3*x');
    expect(viaTela('y := 1.5e-3')).toBe('y := 1.5e-3');
    expect(viaTela('y := 2E+3 + 1')).toBe('y := 2E+3 + 1');
    expect(toLatex('x := 2e3')).not.toContain('2e3'); // e3 solto na tela seria lido de volta como o nome e3 (2*e3)
  });
  it('[A6-FIX2-02] 2e e 2e_3 digitados na tela continuam produto', () => {
    expect(toLinear('2e')).toBe('2*e');
    expect(toLinear('2e_{3}')).toBe('2*e_3');
  });
});

describe('[A6-FIX2-03] % e ° colados no número são unidade', () => {
  it('[A6-FIX2-03] 5% lê como 5 %, sem produto', () => {
    expect(viaFile('x := 5%')).toBe('x := 5 %');
    expect(viaTela('x := 5%')).toBe('x := 5 %');
    expect(toLatex('x := 5%')).not.toContain('\\cdot');
    expect(toLatex('x := 5%')).toContain('\\class{u}{\\mathrm{\\%}}');
  });
  it('[A6-FIX2-03] 25°C e 90° colados são unidade, 25 °C com espaço continua igual', () => {
    expect(viaFile('t := 25°C')).toBe('t := 25 °C');
    expect(viaTela('t := 25°C')).toBe('t := 25 °C');
    expect(viaFile('a := 90°')).toBe('a := 90 °');
    expect(viaTela('t := 25 °C')).toBe('t := 25 °C');
  });
});

describe('[A6-FIX2-05] o leitor linear lê tudo o que o motor lê (A6-LEITOR)', () => {
  const casos: [string, string][] = [
    ['y := 3(x)', 'y := 3*(x)'],
    ['y := 2 sin(x)', 'y := 2*sin(x)'],
    ['y := 2(a+b)', 'y := 2*(a + b)'],
    ['y := (a+b)(c+d)', 'y := (a + b)*(c + d)'],
    ['y := 2 (a+b)', 'y := 2*(a + b)'],
    ['y := 2(a+b)(c)', 'y := 2*(a + b)*(c)'],
    ['y := (a+b)c', 'y := (a + b)*c'],
  ];
  for (const [src, canon] of casos) {
    it(`[A6-FIX2-05] ${src} abre como produto (${canon}) e faz ida e volta`, () => {
      expect(viaFile(src)).toBe(canon);
      expect(viaFile(canon)).toBe(canon); // forma canônica estável: linear -> linear
      expect(viaTela(src)).toBe(canon);
      expect(viaTela(canon)).toBe(canon); // linear -> LaTeX -> linear
      expect(mathStr(rhsOf(canon)), 'mesma árvore do math.js').toBe(mathStr(rhsOf(src)));
    });
  }
  it('[A6-FIX2-05] as linhas de fórmula dos arquivos de exemplo e de resources não mudam', () => {
    const files = [...walk(join(ROOT, 'tests/fixtures')), ...walk(join(ROOT, 'resources'))].filter((f) => /\.prs[mfl]$/.test(f)); // o modelo (.prst) tem {{campos}}, não fórmulas
    let n = 0;
    for (const f of files) {
      for (const b of blocks(parse(readFileSync(f, 'utf8')))) {
        if (!['calc', 'funcao', 'verificar'].includes(b.type)) continue;
        for (const l of lines(b.body).map((x) => x.trim()).filter(Boolean)) {
          n++;
          expect(viaFile(l), `${f}: linear -> linear`).toBe(l);
          expect(viaTela(l), `${f}: linear -> LaTeX -> linear`).toBe(l);
        }
      }
    }
    expect(n).toBeGreaterThan(10);
  });
});
