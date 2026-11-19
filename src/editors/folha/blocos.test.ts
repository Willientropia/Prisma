// Blocos da folha: copiar, recortar e colar (F14, checklist C1 a C3) e áreas pela posição (F17).
import { describe, expect, it } from 'vitest';
import { areaSpans, clipBlocks, clipText, placeBlocks, withPos } from './blocos';
import { parse, type BlockSegment } from '../../format/doc';

const FOLHA = [
  '---',
  'tipo: folha',
  '---',
  '',
  '```calc {#entradas x=40 y=80}',
  'L := 32 m',
  '```',
  '',
  '```area {#a titulo="Área" y=200}',
  '```',
  '',
  '```calc {#calc-2 x=100 y=240 moldura desativado casas=2 descricao="nota"}',
  'x := 2',
  '```',
  '',
  '```fim-area {#a y=300}',
  '```',
  '',
].join('\n');

describe('[F14] blocos copiados e colados', () => {
  it('[F14-01] o texto copiado são os blocos do arquivo, que voltam a ser lidos como regiões (sem as linhas de área)', () => {
    const bs = clipBlocks(FOLHA);
    expect(bs.map((b) => b.id)).toEqual(['entradas', 'calc-2']);
    const text = clipText(bs.map((b) => b.raw));
    expect(text).toBe('```calc {#entradas x=40 y=80}\nL := 32 m\n```\n\n```calc {#calc-2 x=100 y=240 moldura desativado casas=2 descricao="nota"}\nx := 2\n```\n');
    expect(clipBlocks(text).map((b) => b.body)).toEqual(['L := 32 m\n', 'x := 2\n']);
  });

  it('[F14-02] texto sem bloco de região não cola nada', () => {
    expect(clipBlocks('x := 2')).toEqual([]);
    expect(clipBlocks('```area {#a y=0}\n```\n')).toEqual([]);
    expect(clipBlocks('')).toEqual([]);
  });

  it('[F14-03] ao colar, o canto do grupo vai para o ponto escolhido e as distâncias entre as regiões ficam', () => {
    const { text, ids } = placeBlocks(clipBlocks(FOLHA), new Set(['entradas', 'calc-1', 'calc-2']), { x: 400, y: 600 });
    expect(ids).toEqual(['entradas-1', 'calc-3']);
    expect(text).toBe(
      '```calc {#entradas-1 x=400 y=600}\nL := 32 m\n```\n\n' +
        '```calc {#calc-3 x=460 y=760 moldura desativado casas=2 descricao="nota"}\nx := 2\n```\n',
    );
  });

  it('[F14-04] colar duas vezes a mesma região não repete id, nem dentro do mesmo colar', () => {
    const one = clipBlocks('```calc {#s x=0 y=0}\nS := 4 mm^2\n```\n```calc {#s x=0 y=40}\nT := 1\n```\n');
    expect(placeBlocks(one, new Set(['s', 's-1']), { x: 0, y: 0 }).ids).toEqual(['s-2', 's-3']);
  });

  it('[F14-06] recortar e colar mantém o id quando ele está livre', () => {
    const { text, ids } = placeBlocks(clipBlocks('```calc {#s x=230 y=76}\nS := 4 mm^2\n```\n'), new Set(['entradas']), { x: 600, y: 500 });
    expect(ids).toEqual(['s']);
    expect(text).toBe('```calc {#s x=600 y=500}\nS := 4 mm^2\n```\n');
  });

  it('[F14-05] região sem id ganha um, com o nome do tipo', () => {
    const { text, ids } = placeBlocks(clipBlocks('```texto {x=20 y=20}\nolá\n```\n'), new Set(), { x: 40, y: 40 });
    expect(ids).toEqual(['texto-1']);
    expect(text).toBe('```texto {#texto-1 x=40 y=40}\nolá\n```\n');
  });

  it('withPos troca x e y sem mexer no resto da linha de abertura', () => {
    expect(withPos('```calc {#s x=230 y=76 moldura}\n', 280, 120)).toBe('```calc {#s x=280 y=120 moldura}\n');
    expect(withPos('```calc\n', 20, 40)).toBe('```calc {x=20 y=40}\n');
  });
});

describe('[F17] área vale pela posição na tela', () => {
  const regs = (text: string) => parse(text).segments.filter((s): s is BlockSegment => s.kind === 'block').map((seg, i) => ({ id: seg.id ?? `b${i}`, seg }));
  const F = '```';
  it('[F17-01] é da área a região entre as duas linhas, mesmo escrita fora do trecho da área no arquivo', () => {
    const text = [
      `${F}calc {#antes x=40 y=160}`, 'a := 1', F, '',
      `${F}area {#rms titulo="RMS" y=100}`, F, '',
      `${F}calc {#dentro x=40 y=140}`, 'b := 2', F, '',
      `${F}fim-area {#rms y=220}`, F, '',
      `${F}calc {#embaixo x=40 y=260}`, 'c := 3', F, '',
      `${F}calc {#tambem x=300 y=200}`, 'd := 4', F, '',
    ].join('\n');
    expect(areaSpans(regs(text), 20)).toEqual([{ id: 'rms', top: 100, bottom: 220, members: ['antes', 'dentro', 'tambem'] }]);
  });
  it('[F17-02] sem a linha de baixo, a área fica só com a linha do título', () => {
    expect(areaSpans(regs(`${F}area {#a y=100}\n${F}\n\n${F}calc {#c x=0 y=110}\nx := 1\n${F}\n`), 20)).toEqual([{ id: 'a', top: 100, bottom: 120, members: ['c'] }]);
  });
});
