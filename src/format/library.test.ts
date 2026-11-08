// Fase 4: mescla base + extensão e edição do .prsl.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addFunction, bumpVersion, extensionText, findDef, newLibraryText, replaceFunction, resolveLibraries, type LibFile } from './library';
import { parse } from './doc';
import { ROOT } from '../../tests/helpers/files';

const BASE = readFileSync(join(ROOT, 'resources/bibliotecas/eletrica.prsl'), 'utf8');
const factory: LibFile = { path: 'C:/Program Files/Prisma/bibliotecas/eletrica.prsl', origem: 'fábrica', text: BASE };
const extPath = 'C:/Users/voce/Documents/Prisma/Bibliotecas/eletrica.usuario.prsl';
const ext = (...defs: string[]): LibFile => ({
  path: extPath, origem: 'usuário',
  text: defs.reduce((t, d, i) => addFunction(t, d, `f${i}`, '[[cabos-cc#dv]]'), extensionText({ id: 'eletrica', nome: 'Elétrica' })),
});

describe('bibliotecas: base + extensão', () => {
  it('[F4-02c] função com o nome de uma de fábrica: vale a da extensão; sem extensão, volta a de fábrica', () => {
    const over = 'ΔV(L, I, S) := 2*ρ_cu*L*I/S*1.1';
    const lib = resolveLibraries([ext(over), factory]).get('eletrica')!;
    expect(lib.defs.filter((d) => d.startsWith('ΔV'))).toEqual([over]);
    expect(lib.functions.map((f) => [f.name, f.from, !!f.overrides, !!f.shadowed])).toEqual([['ΔV', 'extensao', true, false], ['ΔV', 'base', false, true]]);
    expect(resolveLibraries([factory]).get('eletrica')!.defs).toEqual(['ΔV(L, I, S) := 2*ρ_cu*L*I/S']);
  });

  it('[F4-02d] base atualizada com função nova: aparece mesmo com a extensão existindo', () => {
    const updated = addFunction(BASE.replace('versao: 1.4', 'versao: 1.5'), 'P_j(I, R) := I^2*R', 'pj', 'Lei de Joule');
    const lib = resolveLibraries([ext('P_perda(I, R) := 2*I^2*R'), { ...factory, text: updated }]).get('eletrica')!;
    expect(lib.versao).toBe('1.5');
    expect(lib.defs.map((d) => d.split(':=')[0].trim())).toEqual(['ΔV(L, I, S)', 'P_j(I, R)', 'P_perda(I, R)']);
  });

  it('[F4-09] base + extensão não gera aviso de id repetido; dois arquivos independentes geram', () => {
    expect(resolveLibraries([ext('x(a) := a'), factory]).get('eletrica')!.duplicate).toBeUndefined();
    const copy: LibFile = { path: 'C:/Users/voce/Documents/Prisma/Bibliotecas/eletrica.prsl', origem: 'usuário', text: BASE };
    const dup = resolveLibraries([copy, factory]).get('eletrica')!;
    expect(dup.origem).toBe('usuário');
    expect(dup.duplicate).toBe('Também existe em fábrica: C:/Program Files/Prisma/bibliotecas/eletrica.prsl');
  });

  it('[F4-02] extensão e biblioteca nova têm o cabeçalho pedido; de fábrica é somente leitura', () => {
    expect(extensionText({ id: 'eletrica', nome: 'Elétrica' })).toBe('---\ntipo: biblioteca\nnome: Elétrica (minhas funções)\nid: eletrica.usuario\nestende: eletrica\nversao: 0.1\nversao_formato: 1\n---\n');
    expect(parse(newLibraryText('hidraulica')).meta).toMatchObject({ tipo: 'biblioteca', id: 'hidraulica', versao: 0.1 });
    expect(resolveLibraries([factory]).get('eletrica')!.readOnly).toBe(true);
  });

  it('[F4-02f] substituir troca só a definição e a Origem; versão sobe no último número', () => {
    const t = replaceFunction(BASE, 'ΔV', 'ΔV(L, I, S) := 2*ρ_cu*L*I/S*1.1', '[[outro#dv]]');
    expect(findDef(t, 'ΔV')).toBe('ΔV(L, I, S) := 2*ρ_cu*L*I/S*1.1');
    expect(t).toContain('- **Origem:** [[outro#dv]]\n');
    expect(t.replace('*1.1', '').replace('[[outro#dv]]', '[[cabos-cc#dv]]')).toBe(BASE); // nada mais mudou
    expect(parse(bumpVersion(BASE)).meta.versao).toBe(1.5);
    expect(bumpVersion('---\nversao: 0.9\n---\n')).toBe('---\nversao: 0.10\n---\n');
    expect(bumpVersion('---\nversao: 1.4.9\n---\ncorpo versao: 3\n')).toBe('---\nversao: 1.4.10\n---\ncorpo versao: 3\n');
  });
});
