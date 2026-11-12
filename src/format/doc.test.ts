import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocks, normalizeForSave, parse, parseInfo, serialize, withAttr } from './doc';
import { assignments, byPosition, classifyFile, libFunctions, outline, tipoByExt, texOutline } from './views';
import { joinPath, relativePath, shortenPath } from './display';
import { findUserFiles, rel, ROOT, USER_FILE_DIRS } from '../../tests/helpers/files';

// Ida e volta (ADENDO 03, C3): os arquivos são descobertos sozinhos em tests/fixtures e nos recursos
// de fábrica. Arquivo novo na pasta já entra no teste.
const RES = join(ROOT, 'resources');
const EX = join(ROOT, 'tests/fixtures/usina-boa-vista');
const examples = findUserFiles(USER_FILE_DIRS);
const read = (r: string) => readFileSync(join(EX, r), 'utf8');
const readRes = (r: string) => readFileSync(join(RES, r), 'utf8');

describe('ida e volta sem alterar bytes', () => {
  it('[A9-05] há exemplo de cada um dos 5 tipos', () => expect([...new Set(examples.map((f) => f.slice(-4)))].sort()).toEqual(['prsf', 'prsl', 'prsm', 'prsp', 'prst']));

  for (const f of examples) {
    const text = readFileSync(f, 'utf8');
    it(`[A9-05] ${rel(f)}`, () => {
      expect(serialize(parse(text))).toBe(text);
      const crlf = text.replace(/\r?\n/g, '\r\n');
      expect(serialize(parse(crlf))).toBe(crlf);
      const noFinalNewline = text.trimEnd();
      expect(serialize(parse(noFinalNewline))).toBe(noFinalNewline);
    });
  }

  it('[A9-06] tests/fixtures/crlf-bom.prsm (gravado por outro editor) abre e sai em UTF-8 sem BOM com LF', () => {
    const raw = readFileSync(join(ROOT, 'tests/fixtures/crlf-bom.prsm'), 'utf8');
    expect(raw.startsWith('﻿')).toBe(true);
    expect(raw).toContain('\r\n');
    const d = parse(raw);
    expect(d.meta.tipo).toBe('caderno');
    expect(serialize(d)).toBe(raw);
    const saved = normalizeForSave(serialize(d));
    expect(saved.startsWith('﻿')).toBe(false);
    expect(saved).not.toContain('\r');
  });

  it('[A9-11] um .prsm é texto legível: UTF-8, cabeçalho YAML, texto e blocos', () => {
    const t = read('calculos/cabos-cc.prsm');
    expect(t.startsWith('---\ntipo: caderno\n')).toBe(true);
    expect(t).toMatch(/^# Queda de tensão/m);
    expect(t).toContain('```calc {#trecho}\nL := 25 m');
    expect(/[\x00-\x08\x0E-\x1F]/.test(t)).toBe(false); // nada binário
  });

  it('[A9-05] casos de borda', () => {
    for (const t of [
      '', '\n', 'só texto', '---\nsem fechamento', '```calc {#a}\nsem fechamento',
      '````md\n```calc\nx := 1\n```\n````\n', '~~~calc {#b}\nx := 1\n~~~\n', '---\n: yaml inválido [\n---\ntexto\n',
      '   ```calc\nx\n   ```\n', '```a`b\nnão é cerca\n```\n',
    ]) expect(serialize(parse(t))).toBe(t);
  });
});

describe('leitura dos blocos', () => {
  it('[A9-05] caderno: frontmatter, blocos e atributos', () => {
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

  it('[A9-05] cerca de 4 crases contém cerca de 3', () => {
    const d = parse('````md\n```calc\nx := 1\n```\n````\n');
    expect(blocks(d)).toHaveLength(1);
    expect(blocks(d)[0].body).toBe('```calc\nx := 1\n```\n');
  });

  it('[F3-05] folha: posições e ordem (y, x)', () => {
    const d = parse(read('calculos/string-3.prsf'));
    expect(d.meta.pagina).toEqual({ largura: 1200, altura: 1600, grade: 20 });
    // #criterio (y=330) entrou no exemplo a pedido do usuário ao fechar a fase 3 (F3-02)
    expect(byPosition(blocks(d)).map((b) => b.id)).toEqual(['t1', 'dv-por-secao', 's', 'entradas', 'resultado', 'criterio']);
    expect(parseInfo('grafico {#g x=420 rotulo="limite 1 %"}')).toEqual({ type: 'grafico', id: 'g', attrs: { x: '420', rotulo: 'limite 1 %' } });
  });

  it('[F4-05] biblioteca: constantes e funções', () => {
    const d = parse(readRes('bibliotecas/eletrica.prsl'));
    expect(d.meta.constantes).toEqual({ ρ_cu: '0.0179 Ω*mm^2/m', α_cu: '0.00393 1/°C' });
    const [fn] = libFunctions(d);
    expect(fn.sig).toBe('ΔV(L, I, S)');
    expect(fn.formula).toBe('ΔV(L, I, S) := 2*ρ_cu*L*I/S');
    expect(fn.fields['Retorna']).toBe('V');
    expect(fn.fields['Fonte']).toBe('Lei de Ohm');
    expect(fn.tests).toEqual(['ΔV(25 m, 12 A, 6 mm^2) ≈ 1.79 V']);
  });

  it('[F0-05] LaTeX: seções numeradas', () => {
    const t = texOutline(read('memorial/memorial.tex'));
    expect(t.map((s) => `${s.number} ${s.title}`)).toEqual(['1 Introdução', '2 Condutores CC', '2.1 Critério de queda', '3 Proteção']);
  });
});

describe('ADENDO 01: codificação, tipo e caminhos', () => {
  it('[A9-06] abre com BOM e CRLF; salva em UTF-8 sem BOM com LF', () => {
    const lf = read('calculos/cabos-cc.prsm');
    const outro = '\uFEFF' + lf.replace(/\n/g, '\r\n');
    const d = parse(outro);
    expect(d.meta.tipo).toBe('caderno');
    expect(blocks(d)).toHaveLength(3);
    expect(serialize(d)).toBe(outro); // sem editar, o parser devolve o que leu
    expect(normalizeForSave(serialize(d))).toBe(lf); // ao gravar: sem BOM, LF
    expect(normalizeForSave(lf)).toBe(lf); // arquivo já certo: bytes idênticos
  });

  it('[A9-05] tipo pelo cabeçalho, com aviso se a extensão não bate', () => {
    expect(classifyFile('C:/a/x.prsm', { tipo: 'caderno', versao_formato: 1 })).toMatchObject({ editor: 'caderno', warnings: [], readOnly: false });
    expect(classifyFile('C:/a/x.prsm', { tipo: 'folha', versao_formato: 1 })).toMatchObject({ editor: 'folha', warnings: ['O tipo do arquivo (folha) não corresponde à extensão .prsm.'] });
    expect(classifyFile('C:/a/x.prsm', { tipo: 'caderno', versao_formato: 2 }).readOnly).toBe(true);
    expect(classifyFile('C:/a/m.prst', { tipo: 'modelo', modelo_de: 'folha', versao_formato: 1 })).toMatchObject({ tipo: 'modelo', editor: 'folha' });
    expect(classifyFile('C:/a/p.prsp', { tipo: 'projeto', versao_formato: 1 })).toMatchObject({ tipo: 'projeto', editor: null });
    expect(classifyFile('C:/a/m.tex', {})).toMatchObject({ tipo: 'tex', editor: 'tex' });
    expect([tipoByExt('a.PRSL'), tipoByExt('a.md')]).toEqual(['biblioteca', null]);
  });

  it('[A9-07] caminhos relativos ao projeto', () => {
    expect(joinPath('C:/P/Usina', 'calculos/a.prsm')).toBe('C:/P/Usina/calculos/a.prsm');
    expect(joinPath('C:/P/Usina', '../outra/x.prsm')).toBe('C:/P/outra/x.prsm');
    expect(relativePath('C:/P/Usina', 'C:/P/Usina/calculos/a.prsm')).toBe('calculos/a.prsm');
    expect(relativePath('C:/P/Usina', 'C:/P/outra/x.prsm')).toBe('../outra/x.prsm');
    expect(relativePath('C:/P/Usina', 'D:/x.prsm')).toBe('D:/x.prsm');
    expect(shortenPath('C:/Users/p/Sol Tech/Boa Vista/calculos')).toBe(['...', 'Sol Tech', 'Boa Vista', 'calculos'].join('\\'));
  });

  it('[A9-07] projeto de exemplo lista arquivos que existem, com caminho relativo', () => {
    const p = parse(read('usina-boa-vista.prsp'));
    const all = [...(p.meta.arquivos as string[]), ...(p.meta.documentos as string[])];
    for (const rel of all) expect(statSync(join(EX, rel)).isFile()).toBe(true);
  });
});

describe('ADENDO 05: atributos da região', () => {
  it('[E8-16] [E8-30] atributos sem valor (desativado, moldura, recolhida) e descricao="..." são lidos e trocados sem mexer no resto', () => {
    expect(parseInfo('calc {#a x=40 y=80 desativado moldura descricao="Tensão de linha"}').attrs).toEqual({ x: '40', y: '80', desativado: '', moldura: '', descricao: 'Tensão de linha' });
    expect(withAttr('```calc {#a x=40 y=80}\n', 'desativado', true)).toBe('```calc {#a x=40 y=80 desativado}\n');
    expect(withAttr('```calc {#a x=40 desativado y=80}\n', 'desativado', null)).toBe('```calc {#a x=40 y=80}\n');
    expect(withAttr('```calc {#a x=40 descricao="x"}\n', 'descricao', 'Nova')).toBe('```calc {#a x=40 descricao="Nova"}\n');
    expect(withAttr('```area {#r titulo="Valores RMS" y=711}\n', 'recolhida', true)).toBe('```area {#r titulo="Valores RMS" y=711 recolhida}\n');
  });
});

describe('FCFG: atributo sem aspas', () => {
  it('[FCFG-07] withAttr com quote=false grava casas=2 sem aspas; o padrão continua com aspas', () => {
    expect(withAttr('```calc {#a x=40}\n', 'casas', '2', false)).toBe('```calc {#a x=40 casas=2}\n');
    expect(withAttr('```calc {#a x=40 casas=4}\n', 'casas', '2', false)).toBe('```calc {#a x=40 casas=2}\n');
    expect(withAttr('```calc {#a x=40}\n', 'descricao', 'Nova')).toBe('```calc {#a x=40 descricao="Nova"}\n');
  });
});
