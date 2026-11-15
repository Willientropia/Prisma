import { describe, expect, it } from 'vitest';
import { forget, record, redo, rename, undo } from './historico';

describe('desfazer do documento', () => {
  it('volta na ordem, junta edições rápidas num passo e refaz', () => {
    forget('d');
    record('d', 'a', 0, 1000); // "a" -> "ab"
    record('d', 'ab', 0, 1300); // digitação na mesma linha: mesmo passo
    record('d', 'abc', 0, 5000); // bem depois: passo novo
    expect(undo('d', 'abcd')).toBe('abc');
    expect(undo('d', 'abc')).toBe('a');
    expect(undo('d', 'a')).toBeNull();
    expect(redo('d', 'a')).toBe('abc');
    expect(redo('d', 'abc')).toBe('abcd');
    expect(redo('d', 'abcd')).toBeNull();
  });

  it('ações em lugares diferentes do texto são passos separados mesmo seguidas (zoom e depois mover)', () => {
    forget('f');
    record('f', 'v0', 300, 1000); // vista do gráfico
    record('f', 'v1', 300, 1200); // a mesma vista gravada de novo: mesmo passo
    record('f', 'v2', 10, 1500); // mover região: outro lugar, passo novo
    expect(undo('f', 'v3')).toBe('v2');
    expect(undo('f', 'v2')).toBe('v0');
  });

  it('várias edições da mesma ação (mover três regiões) são um passo só', () => {
    forget('g');
    record('g', 's0', 10, 2000);
    record('g', 's1', 80, 2001);
    record('g', 's2', 150, 2002);
    expect(undo('g', 's3')).toBe('s0');
  });

  it('Salvar como leva o histórico para o id novo e não deixa nada no antigo (revisão da v0.6.0)', () => {
    forget('novo:C1'); forget('C:/x.prsm');
    record('novo:C1', 'a', 0, 0);
    rename('novo:C1', 'C:/x.prsm');
    expect(undo('novo:C1', 'ab')).toBeNull();
    expect(undo('C:/x.prsm', 'ab')).toBe('a');
  });

  it('edição nova depois de desfazer apaga o refazer', () => {
    forget('e');
    record('e', 'x', 0, 0);
    expect(undo('e', 'xy')).toBe('x');
    record('e', 'x', 0, 10_000);
    expect(redo('e', 'xz')).toBeNull();
  });
});
