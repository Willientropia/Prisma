import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { blocks, parse, parseInfo, serialize } from './doc';
import { assignments, byPosition, libFunctions, outline, texOutline } from './views';

const EX = join(import.meta.dirname, '../../resources/exemplos');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const examples = walk(EX).filter((f) => f.endsWith('.md'));
const read = (rel: string) => readFileSync(join(EX, rel), 'utf8');

describe('ida e volta sem alterar bytes', () => {
  it('encontra os três exemplos da seção 3', () => expect(examples).toHaveLength(3));

  for (const f of examples) {
    const text = readFileSync(f, 'utf8');
    it(f.slice(EX.length + 1), () => {
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
    const d = parse(read('Sol Tech/Boa Vista/cabos-cc.caderno.md'));
    expect(d.meta).toMatchObject({ tipo: 'caderno', bibliotecas: ['eletrica'], versao_formato: 1 });
    expect(blocks(d).map((b) => [b.type, b.id])).toEqual([['funcao', 'dv'], ['calc', 'trecho'], ['verificar', 'criterio']]);
    expect(blocks(d)[0].attrs).toEqual({ nome: 'ΔV', salvar: 'eletrica' });
    expect(outline(d).map((o) => o.tag)).toEqual(['TIT', 'TXT', 'FUN', 'TXT', 'CAL', 'VER', 'TXT']);
    expect(assignments(blocks(d)).map((a) => `${a.name}=${a.value} ${a.unit}`)).toEqual(['L=25 m', 'I=12 A', 'S=6 mm^2', 'V_mp=400 V']);
  });

  it('cerca de 4 crases contém cerca de 3', () => {
    const d = parse('````md\n```calc\nx := 1\n```\n````\n');
    expect(blocks(d)).toHaveLength(1);
    expect(blocks(d)[0].body).toBe('```calc\nx := 1\n```\n');
  });

  it('folha: posições e ordem (y, x)', () => {
    const d = parse(read('Sol Tech/Boa Vista/string-3.folha.md'));
    expect(d.meta.pagina).toEqual({ largura: 1200, altura: 1600, grade: 20 });
    expect(byPosition(blocks(d)).map((b) => b.id)).toEqual(['t1', 'dv-por-secao', 's', 'entradas', 'resultado']);
    expect(parseInfo('grafico {#g x=420 rotulo="limite 1 %"}')).toEqual({ type: 'grafico', id: 'g', attrs: { x: '420', rotulo: 'limite 1 %' } });
  });

  it('biblioteca: constantes e funções', () => {
    const d = parse(read('bibliotecas/eletrica.lib.md'));
    expect(d.meta.constantes).toEqual({ ρ_cu: '0.0179 Ω*mm^2/m', α_cu: '0.00393 1/°C' });
    const [fn] = libFunctions(d);
    expect(fn.sig).toBe('ΔV(L, I, S)');
    expect(fn.formula).toBe('ΔV(L, I, S) := 2*ρ_cu*L*I/S');
    expect(fn.fields['Retorna']).toBe('V');
    expect(fn.fields['Fonte']).toBe('Lei de Ohm');
    expect(fn.tests).toEqual(['ΔV(25 m, 12 A, 6 mm^2) ≈ 1.79 V']);
  });

  it('LaTeX: seções numeradas', () => {
    const t = texOutline(read('Sol Tech/Boa Vista/memorial/memorial.tex'));
    expect(t.map((s) => `${s.number} ${s.title}`)).toEqual(['1 Introdução', '2 Condutores CC', '2.1 Critério de queda', '3 Proteção']);
  });
});
