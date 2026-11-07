import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocks, normalizeForSave, parse, parseInfo, serialize } from './doc';
import { assignments, byPosition, classifyFile, libFunctions, outline, tipoByExt, texOutline } from './views';
import { joinPath, relativePath, shortenPath } from './display';

// exemplos de projeto, bibliotecas e modelos de fábrica: os 5 tipos do ADENDO 01
const RES = join(import.meta.dirname, '../../resources');
const EX = join(RES, 'exemplos/Usina Boa Vista');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const examples = ['exemplos', 'bibliotecas', 'modelos'].flatMap((d) => walk(join(RES, d))).filter((f) => /.prs[mflpt]$/.test(f));
const read = (rel: string) => readFileSync(join(EX, rel), 'utf8');
const readRes = (rel: string) => readFileSync(join(RES, rel), 'utf8');

describe('ida e volta sem alterar bytes', () => {
  it('há exemplo de cada um dos 5 tipos', () => expect(examples.map((f) => f.slice(-4)).sort()).toEqual(['prsf', 'prsl', 'prsm', 'prsp', 'prst']));

  for (const f of examples) {
    const text = readFileSync(f, 'utf8');
    it(f.slice(RES.length + 1), () => {
      expect(serialize(parse(text))).toBe(text);
      const crlf = text.replace(/\n/g, '\r\n');
      expect(serialize(parse(crlf))).toBe(crlf);
      const noFinalNewline = text.trimEnd();
      expect(serialize(parse(noFinalNewline))).toBe(noFinalNewline);
    });
  }

  it('casos de borda', () => {
    for (const t of [
      '', '\n', 'só texto', '---\nsem fechamento', '```calc {#a}\nsem fechamento',
      '````md\n```calc\nx := 1\n```\n````\n', '~~~calc {#b}\nx := 1\n~~~\n', '---\n: yaml inválido [\n---\ntexto\n',
      '   ```calc\nx\n   ```\n', '```a`b\nnão é cerca\n```\n',
    ]) expect(serialize(parse(t))).toBe(t);
  });
});

describe('leitura dos blocos', () => {
  it('caderno: frontmatter, blocos e atributos', () => {
    const d = parse(read('calculos/cabos-cc.prsm'));
    expect(d.meta).toMatchObject({ tipo: 'caderno', bibliotecas: ['eletrica'], versao_formato: 1 });
    expect(blocks(d).map((b) => [b.type, b.id])).toEqual([['funcao', 'dv'], ['calc', 'trecho'], ['verificar', 'criterio']]);
    expect(blocks(d)[0].attrs).toEqual({ nome: 'ΔV', salvar: 'eletrica' });
    const items = outline(d);
    expect(items.map((o) => o.tag)).toEqual(['TIT', 'TXT', 'FUN', 'TXT', 'CAL', 'VER', 'TXT']);
    // cada item aponta para o trecho exato do arquivo
    const text = serialize(d);
    expect(text.slice(items[0].start, items[0].end)).toBe('# Queda de tensão nos cabos CC');
    expect(text.slice(items[2].start, items[2].end)).toBe('```funcao {#dv nome=ΔV salvar=eletrica}\nΔV(L, I, S) := 2*ρ_cu*L*I/S\n```');
    const fn = items[2];
    expect(fn.kind === 'block' && text.slice(fn.bodyStart, fn.bodyStart + fn.block.body.length)).toBe('ΔV(L, I, S) := 2*ρ_cu*L*I/S\n');
    expect(assignments(blocks(d)).map((a) => `${a.name}=${a.value} ${a.unit}`)).toEqual(['L=25 m', 'I=12 A', 'S=6 mm^2', 'V_mp=400 V']);
  });

  it('cerca de 4 crases contém cerca de 3', () => {
    const d = parse('````md\n```calc\nx := 1\n```\n````\n');
    expect(blocks(d)).toHaveLength(1);
    expect(blocks(d)[0].body).toBe('```calc\nx := 1\n```\n');
  });

  it('folha: posições e ordem (y, x)', () => {
    const d = parse(read('calculos/string-3.prsf'));
    expect(d.meta.pagina).toEqual({ largura: 1200, altura: 1600, grade: 20 });
    expect(byPosition(blocks(d)).map((b) => b.id)).toEqual(['t1', 'dv-por-secao', 's', 'entradas', 'resultado']);
    expect(parseInfo('grafico {#g x=420 rotulo="limite 1 %"}')).toEqual({ type: 'grafico', id: 'g', attrs: { x: '420', rotulo: 'limite 1 %' } });
  });

  it('biblioteca: constantes e funções', () => {
    const d = parse(readRes('bibliotecas/eletrica.prsl'));
    expect(d.meta.constantes).toEqual({ ρ_cu: '0.0179 Ω*mm^2/m', α_cu: '0.00393 1/°C' });
    const [fn] = libFunctions(d);
    expect(fn.sig).toBe('ΔV(L, I, S)');
    expect(fn.formula).toBe('ΔV(L, I, S) := 2*ρ_cu*L*I/S');
    expect(fn.fields['Retorna']).toBe('V');
    expect(fn.fields['Fonte']).toBe('Lei de Ohm');
    expect(fn.tests).toEqual(['ΔV(25 m, 12 A, 6 mm^2) ≈ 1.79 V']);
  });

  it('LaTeX: seções numeradas', () => {
    const t = texOutline(read('memorial/memorial.tex'));
    expect(t.map((s) => `${s.number} ${s.title}`)).toEqual(['1 Introdução', '2 Condutores CC', '2.1 Critério de queda', '3 Proteção']);
  });
});

describe('ADENDO 01: codificação, tipo e caminhos', () => {
  it('abre com BOM e CRLF; salva em UTF-8 sem BOM com LF', () => {
    const lf = read('calculos/cabos-cc.prsm');
    const outro = '\uFEFF' + lf.replace(/\n/g, '\r\n');
    const d = parse(outro);
    expect(d.meta.tipo).toBe('caderno');
    expect(blocks(d)).toHaveLength(3);
    expect(serialize(d)).toBe(outro); // sem editar, o parser devolve o que leu
    expect(normalizeForSave(serialize(d))).toBe(lf); // ao gravar: sem BOM, LF
    expect(normalizeForSave(lf)).toBe(lf); // arquivo já certo: bytes idênticos
  });

  it('tipo pelo cabeçalho, com aviso se a extensão não bate', () => {
    expect(classifyFile('C:/a/x.prsm', { tipo: 'caderno', versao_formato: 1 })).toMatchObject({ editor: 'caderno', warnings: [], readOnly: false });
    expect(classifyFile('C:/a/x.prsm', { tipo: 'folha', versao_formato: 1 })).toMatchObject({ editor: 'folha', warnings: ['O tipo do arquivo (folha) não corresponde à extensão .prsm.'] });
    expect(classifyFile('C:/a/x.prsm', { tipo: 'caderno', versao_formato: 2 }).readOnly).toBe(true);
    expect(classifyFile('C:/a/m.prst', { tipo: 'modelo', modelo_de: 'folha', versao_formato: 1 })).toMatchObject({ tipo: 'modelo', editor: 'folha' });
    expect(classifyFile('C:/a/p.prsp', { tipo: 'projeto', versao_formato: 1 })).toMatchObject({ tipo: 'projeto', editor: null });
    expect(classifyFile('C:/a/m.tex', {})).toMatchObject({ tipo: 'tex', editor: 'tex' });
    expect([tipoByExt('a.PRSL'), tipoByExt('a.md')]).toEqual(['biblioteca', null]);
  });

  it('caminhos relativos ao projeto', () => {
    expect(joinPath('C:/P/Usina', 'calculos/a.prsm')).toBe('C:/P/Usina/calculos/a.prsm');
    expect(joinPath('C:/P/Usina', '../outra/x.prsm')).toBe('C:/P/outra/x.prsm');
    expect(relativePath('C:/P/Usina', 'C:/P/Usina/calculos/a.prsm')).toBe('calculos/a.prsm');
    expect(relativePath('C:/P/Usina', 'C:/P/outra/x.prsm')).toBe('../outra/x.prsm');
    expect(relativePath('C:/P/Usina', 'D:/x.prsm')).toBe('D:/x.prsm');
    expect(shortenPath('C:/Users/p/Sol Tech/Boa Vista/calculos')).toBe(['...', 'Sol Tech', 'Boa Vista', 'calculos'].join('\\'));
  });

  it('projeto de exemplo lista arquivos que existem, com caminho relativo', () => {
    const p = parse(read('usina-boa-vista.prsp'));
    const all = [...(p.meta.arquivos as string[]), ...(p.meta.documentos as string[])];
    for (const rel of all) expect(statSync(join(EX, rel)).isFile()).toBe(true);
  });
});
