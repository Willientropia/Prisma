// ADENDO 05, E7 e E8.2: importação dos .sm do usuário e conferência com os resultados guardados pelo SMath.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { blocks, parse } from './doc';
import { fromRpn, importSm } from './smath';
import { nodeToLinear } from './mathlinear';
import { definedBefore, definedNames } from './views';
import { evaluate } from '../engine/evaluate';
import { DEFAULT_FORMAT, shadowNotice } from '../engine/format';
import { compareCorpus, corpusReport, type CorpusFile } from '../../tests/helpers/smath-corpus';
import { ROOT } from '../../tests/helpers/files';

const DIR = join(ROOT, 'tests/fixtures/smath');
const FILES = readdirSync(DIR).filter((f) => f.endsWith('.sm')).sort();
const read = (f: string) => readFileSync(join(DIR, f), 'utf8');
const NATIVE = ['08do10', 'Aula_dia_1_do_10', 'Dia_2.09', 'Exemplo_de_Fatura_A4_-_Verde', 'P_gina1', 'P_gina12', 'Motor', 'Motor_CC'];
const corpus = new Map<string, CorpusFile>();
const of = (f: string) => { if (!corpus.has(f)) corpus.set(f, compareCorpus(f, read(f))); return corpus.get(f)!; };
/** Valor que o Prisma mostrou para a região cuja expressão começa assim. */
const shown = (f: string, start: string) => of(f).compared.find((c) => c.expr.startsWith(start))?.prisma;

afterAll(() => {
  mkdirSync(join(ROOT, 'test-results'), { recursive: true });
  writeFileSync(join(ROOT, 'test-results/smath-corpus.md'), corpusReport(FILES.map(of))); // E8.2, item 3
});

describe('ADENDO 05: importação do SMath e corpus do usuário', () => {
  it('[E8-20] os 17 .sm importam sem travar e sem perder região (contando as não suportadas)', () => {
    expect(FILES).toHaveLength(17);
    for (const f of FILES) {
      const xml = read(f);
      const r = importSm(xml, f.replace(/\.sm$/, ''));
      expect(r.regions, f).toBe((xml.match(/<region\b/g) ?? []).length);
      expect(blocks(parse(r.text)).length, f).toBe(r.regions + r.synthetic);
    }
  });

  it('[E8-23] importar não altera o original: o .sm é só lido', () => {
    for (const f of FILES) {
      const before = createHash('sha256').update(readFileSync(join(DIR, f))).digest('hex');
      importSm(read(f), f);
      expect(createHash('sha256').update(readFileSync(join(DIR, f))).digest('hex'), f).toBe(before);
    }
  });

  for (const n of NATIVE) {
    it(`[E8-21] ${n}.sm (só recursos nativos do SMath) bate 100 % com os resultados do SMath`, () => {
      const diffs = of(`${n}.sm`).compared.filter((c) => !c.ok).map((c) => `${c.id} ${c.expr}: SMath ${c.smath}, Prisma ${c.prisma}`);
      expect(diffs).toEqual([]);
    });
  }

  for (const f of FILES.filter((x) => !NATIVE.includes(x.replace(/\.sm$/, '')))) {
    it(`[E8-22] ${f}: todos os resultados que não dependem de plugin batem (e os corrigidos, com o esperado corrigido)`, () => {
      const diffs = of(f).compared.filter((c) => !c.ok && (!c.plugin || c.fixed)).map((c) => `${c.id} ${c.expr}: SMath ${c.smath}, Prisma ${c.prisma}`);
      expect(diffs).toEqual([]);
    });
  }

  it('[E8-24] 08do10.sm: Z0, Z, |γ|, arg(γ), |Zc|, |i1| e arg(i1) como no SMath', () => {
    const f = '08do10.sm';
    expect(shown(f, 'Z_0 := sqrt(L/C)')).toBe('387,3');
    expect(shown(f, 'Z := Z_.*X')).toBe('11 + 56,55·i');
    expect(shown(f, 'abs(γ)')).toBe('1,475e-3'); // a tela desenha 1,475·10⁻³
    expect(shown(f, 'arg(γ)')).toBe('82,98');
    expect(shown(f, 'abs(Zc)')).toBe('390,6');
    expect(shown(f, 'abs(i_1)')).toBe('113,3');
    expect(shown(f, 'arg(i_1)')).toBe('-24,32');
  });

  it('[E8-25] Exemplo_de_Fatura_A4_-_Verde.sm: Faturado = 7 358,65', () => {
    expect(shown('Exemplo_de_Fatura_A4_-_Verde.sm', 'Faturado')).toBe('7358,65');
  });

  it('[E8-26] P_gina1.sm: Relação_invest.Lucro = 4,295 % e QTD_meses = 23,2828', () => {
    expect(shown('P_gina1.sm', 'Relação_invest.Lucro :=')).toBe('4,295');
    expect(shown('P_gina1.sm', 'QTD_meses')).toBe('23,2828');
  });

  it('[E8-27] Dia_2.09.sm: Zpu_A(...) = 2,3629 % e Zt_1(...) = 990,288 Ω', () => {
    expect(shown('Dia_2.09.sm', 'Zpu_A(')).toBe('2,3629');
    expect(shown('Dia_2.09.sm', 'Zt_1(')).toBe('990,288');
  });
});

// variável do laço e colisão de i e e (a investigação do fft do Teste_Pot_ncia_Com_Harm_nica.sm)
describe('variável do laço e símbolos próprios', () => {
  const run = (...lines: string[]) => evaluate({ libs: [], symbolic: true, format: DEFAULT_FORMAT, blocks: lines.map((l, k) => ({ key: `b${k}`, type: 'calc', lines: [l] })) });

  it('[E8-28] depois do for, i e o vetor de destino ficam definidos para a tela e para o "=" inteligente', () => {
    const r = run('for(i, range(1, 8), q[i] := i)', 'i = ?');
    expect(r.blocks.b1[0].value).toBe(8);
    expect(r.defined).toEqual(expect.arrayContaining(['i', 'q']));
    expect(definedNames('for(i, range(1, 8), q[i] := i)')).toEqual(['i', 'q']);
    const before = definedBefore([{ key: 'a', lines: ['for(i, range(1, 8), q[i] := i)'] }, { key: 'b', lines: ['i = ?'] }]);
    expect(before('b', 0)('i')).toBe(true);
    expect(before('a', 0)('i')).toBe(false);
  });

  it('[E8-29] i ou e definidos pelo usuário geram o aviso com o valor; 𝐢 nunca é a variável', () => {
    const r = run('for(i, range(1, 8), q[i] := i)', '3 + 𝐢 = ?', '3 + i = ?');
    expect(r.shadow).toEqual({ name: 'i', value: '8' });
    expect(r.blocks.b1[0].text).toContain('·i'); // continua complexo
    expect(r.blocks.b2[0].value).toBe(11); // i é a variável
    expect(run('e := 2').shadow).toEqual({ name: 'e', value: '2' });
    expect(run('x := 3 + i').shadow).toBeUndefined();
    // uma vez por documento e nome
    const seen = new Set<string>();
    expect(shadowNotice(seen, 'd1', r.shadow)).toBe('i agora é uma variável (vale 8). A unidade imaginária continua disponível como 𝐢 no ribbon Matemática.');
    expect(shadowNotice(seen, 'd1', r.shadow)).toBeUndefined();
    expect(shadowNotice(seen, 'd2', r.shadow)).toBeDefined();
    expect(shadowNotice(seen, 'd1', { name: 'e', value: '2' })?.startsWith('e agora é uma variável (vale 2). A constante de Euler')).toBe(true);
  });
});

// F04-03: unidade solta do SMath (style="unit" sem número antes) vira unidade explícita na folha
describe('[F04-03] unidade solta importada do SMath', () => {
  const op = (v: string, style?: string) => ({ type: 'operand', args: 0, v, ...(style ? { style } : {}) });
  it('[F04-03] A/100 vira \'A/100; 128 volt * continua 128 volt', () => {
    const solta = fromRpn([op('A', 'unit'), op('100'), { type: 'operator', args: 2, v: '/' }]);
    expect(nodeToLinear(solta.node)).toBe("'A/100");
    const medida = fromRpn([op('128'), op('volt', 'unit'), { type: 'operator', args: 2, v: '*' }]);
    expect(nodeToLinear(medida.node)).toBe('128 volt');
    const produto = fromRpn([op('x'), op('m', 'unit'), { type: 'operator', args: 2, v: '*' }]);
    expect(nodeToLinear(produto.node)).toBe("x*'m");
  });
});
