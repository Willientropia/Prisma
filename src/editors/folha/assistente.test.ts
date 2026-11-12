// A6-4: itens que a folha dá ao assistente (definições antes da linha, valores, bibliotecas).
import { describe, expect, it } from 'vitest';
import { sheetItems } from './assistente';

describe('A6-4: itens da folha', () => {
  it('[A6-4-11] variável com valor, função do usuário com aridade e definição, função de biblioteca com assinatura', () => {
    const items = sheetItems(
      [
        { name: 's_batata', raw: 's_batata := 2*7', key: 'a', line: 0 },
        { name: 'f', raw: 'f(x) := x + 2', key: 'a', line: 1 },
        { name: 'g', raw: 'g(a, b) := a*b', key: 'a', line: 2 },
      ],
      { a: [{ kind: 'assign', assigned: { text: '14', numText: '14' } }, { kind: 'func' }, { kind: 'func' }] },
      [{ sig: 'ΔV(I, L, S)', lib: 'eletrica', why: 'Queda de tensão em cabo. Use em circuitos CC.' }],
    );
    const by = (n: string) => items.find((x) => x.name === n)!;
    expect(by('s_batata')).toMatchObject({ kind: 'var', title: 'Variável do usuário' });
    expect(by('s_batata').detail).toContain('14');
    expect(by('s_batata').detail).not.toContain('_batata'); // índice desenhado, não "_"
    expect(by('f')).toMatchObject({ kind: 'userfn', arity: 1, title: 'Função do usuário' });
    expect(by('f').detail).toContain('\\coloneq');
    expect(by('g').arity).toBe(2);
    expect(by('ΔV')).toMatchObject({ kind: 'lib', arity: 3, note: 'Queda de tensão em cabo.' });
    expect(by('ΔV').title).toBe('Função de biblioteca (eletrica)');
    // definição com "= ?": o valor vem do próprio resultado da linha (revisor do A6-4)
    const [L] = sheetItems([{ name: 'L', raw: 'L := 25 m = ?', key: 'b', line: 0 }], { b: [{ kind: 'assign', text: '25 m', numText: '25', unitRaw: 'm' }] }, []);
    expect(L.detail).toContain('25');
    expect(L.detail).toContain('\\mathrm{m}');
  });
});
