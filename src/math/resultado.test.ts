// Resultado na tela: o i do complexo é negrito reto, com ou sem coeficiente (E4.2; F09, 17/11).
import { describe, expect, it } from 'vitest';
import { numberLatex } from './resultado';

describe('[F09] numberLatex', () => {
  it('o i sozinho também é negrito reto; texto com i dentro de palavra não muda', () => {
    expect(numberLatex('3 + i')).toBe('3+\\mathbf{i}');
    expect(numberLatex('−i')).toBe('-\\mathbf{i}');
    expect(numberLatex('11 + 56,55·i')).toBe('11+56{,}55\\cdot \\mathbf{i}');
    expect(numberLatex('verdadeiro')).toBe('verdadeiro');
  });
});
