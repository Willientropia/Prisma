// F-CONFIG: formato do resultado no arquivo e na config (exibicao, notacao=, padrão do app).
import { describe, expect, it } from 'vitest';
import { parse } from '../format/doc';
import { DEFAULT_FORMAT, type FormatOpts } from './format';
import { appFormat, blockInputs, exibicao, setExibicao, setRegionFormat, stampFormat } from './prepare';

const FOLHA = '---\ntipo: folha\ntitulo: T\nbibliotecas: []\ncriado: 2026-11-12\nversao_formato: 1\n---\n\n```calc {#a x=40 y=80}\n2*7 = ?\n```\n';

describe('F-CONFIG: notacao no arquivo', () => {
  it('[FCFG-04] exibicao() lê notacao (inválida vira automática) e a região herda a do documento', () => {
    expect(exibicao({ casas: 4, notacao: 'engenharia' }).notation).toBe('engenharia');
    expect(exibicao({ casas: 4, notacao: 'cientifica' }).notation).toBe('cientifica');
    expect(exibicao({ casas: 4, notacao: 'xyz' }).notation).toBe('automatica');
    expect(exibicao({ casas: 4 }).notation).toBe('automatica');
    const reg = (attrs: string) => blockInputs(parse(`---\ntipo: folha\n---\n\`\`\`calc {#a ${attrs}}\n1 = ?\n\`\`\`\n`), true)[0].fmt;
    expect(reg('notacao=cientifica')).toEqual({ notation: 'cientifica' });
    expect(reg('x=1')).toBeUndefined();
    expect(reg('notacao=lixo')).toBeUndefined();
  });

  it('[FCFG-05] setExibicao troca só a linha exibicao e vale na ida e volta', () => {
    const f: FormatOpts = { ...DEFAULT_FORMAT, decimals: 2, notation: 'engenharia' };
    const novo = setExibicao(FOLHA, f);
    // sem a linha: entra antes de versao_formato, o resto fica igual
    expect(novo).toBe(FOLHA.replace('versao_formato: 1\n---', 'exibicao: {casas: 2, modo: decimais, zeros_a_direita: false, limite_exponencial: 5, notacao: engenharia}\nversao_formato: 1\n---'));
    // troca a linha existente, resto igual byte a byte
    const outra = setExibicao(novo, { ...DEFAULT_FORMAT, mode: 'significativos', decimals: 6, trailingZeros: true, notation: 'automatica' });
    expect(outra).toContain('exibicao: {casas: 6, modo: significativos, zeros_a_direita: true, limite_exponencial: 5}\n');
    expect(outra).not.toContain('notacao');
    expect(outra.replace(/^exibicao:.*\n/m, '')).toBe(FOLHA);
    // bloco de várias linhas vira uma linha
    const multi = FOLHA.replace('criado:', 'exibicao:\n  casas: 3\n  modo: decimais\ncriado:');
    const m = setExibicao(multi, DEFAULT_FORMAT);
    expect(m.match(/^exibicao:/gm)).toHaveLength(1);
    expect(m).not.toContain('  casas: 3');
    expect(m).toContain('criado: 2026-11-12\n');
    // ida e volta
    expect(exibicao(parse(novo).meta.exibicao)).toMatchObject({ decimals: 2, mode: 'decimais', trailingZeros: false, expThreshold: 5, notation: 'engenharia' });
    // sem cabeçalho: devolve igual
    expect(setExibicao('só texto\n', f)).toBe('só texto\n');
  });

  it('[FCFG-06] appFormat lê a config e stampFormat só grava quando difere do padrão do SMath', () => {
    expect(appFormat({ casas_decimais: 4, separador_decimal: ',' })).toEqual(DEFAULT_FORMAT);
    expect(appFormat({})).toEqual(DEFAULT_FORMAT);
    expect(appFormat({ casas_decimais: 2 }).decimals).toBe(2);
    expect(appFormat({ casas_decimais: 99 }).decimals).toBe(4);
    expect(appFormat({ casas_decimais: 'x' }).decimals).toBe(4);
    expect(appFormat({ modo_arredondamento: 'significativos', zeros_a_direita: true, notacao: 'cientifica', limite_exponencial: 3 })).toMatchObject({ mode: 'significativos', trailingZeros: true, notation: 'cientifica', expThreshold: 3 });
    expect(appFormat({ notacao: 'lixo', limite_exponencial: 0 })).toEqual(DEFAULT_FORMAT);
    expect(stampFormat(FOLHA, DEFAULT_FORMAT)).toBe(FOLHA);
    expect(stampFormat(FOLHA, appFormat({ notacao: 'automatica' }))).toBe(FOLHA);
    expect(stampFormat(FOLHA, appFormat({ casas_decimais: 2 }))).toBe(FOLHA.replace('versao_formato: 1\n---', 'exibicao: {casas: 2, modo: decimais, zeros_a_direita: false, limite_exponencial: 5}\nversao_formato: 1\n---'));
  });
});

describe('F-CONFIG: formato só da região', () => {
  it('[FCFG-12] setRegionFormat grava os quatro atributos sem aspas e tira todos com null', () => {
    const e = setRegionFormat(FOLHA, 'a', { ...DEFAULT_FORMAT, decimals: 2 })!;
    const novo = FOLHA.slice(0, e.start) + e.insert + FOLHA.slice(e.end);
    expect(novo).toBe(FOLHA.replace('{#a x=40 y=80}', '{#a x=40 y=80 casas=2 modo=decimais zeros_a_direita=nao notacao=automatica}'));
    expect(blockInputs(parse(novo), true)[0].fmt).toEqual({ decimals: 2, mode: 'decimais', trailingZeros: false, notation: 'automatica' });
    const volta = setRegionFormat(novo, 'a', null)!;
    expect(novo.slice(0, volta.start) + volta.insert + novo.slice(volta.end)).toBe(FOLHA);
    expect(setRegionFormat(FOLHA, 'nao-existe', null)).toBeNull();
  });
});
