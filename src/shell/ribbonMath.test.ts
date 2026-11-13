// A6-5/A6-6: tudo o que um botão habilitado do ribbon insere é lido pela folha (quadradinhos trocados por nomes).
import { describe, expect, it } from 'vitest';
import { latexToLine } from '../format/mathlinear';
import { MATH_RIBBON } from './ribbonMath';

describe('[A6-6-01] botões das guias matemáticas inserem o que o leitor lê', () => {
  for (const [tab, groups] of Object.entries(MATH_RIBBON)) {
    it(`[A6-6-01] ${tab}`, () => {
      const bad: string[] = [];
      for (const g of groups) for (const b of g.buttons) {
        if (!b.latex) continue;
        const filled = b.latex.replace(/#@/g, 'y').replace(/#[0?]/g, 'x');
        const line = /^[=<>]|^\\(ne|le|ge|lor|coloneq) $/.test(b.latex) ? `a${filled}b` : `z\\coloneq ${filled}`; // operador: entre dois nomes
        try { latexToLine(line); } catch (e) { bad.push(`${b.label}: ${(e as Error).message}`); }
      }
      expect(bad).toEqual([]);
    });
  }
  it('[A6-6-02] as três guias novas têm conteúdo (4.3 a 4.5)', () => {
    expect(MATH_RIBBON.matrizes.map((g) => g.title)).toEqual(['Inserir', 'Elementos', 'Operações', 'Funções de matriz']);
    expect(MATH_RIBBON.logica.map((g) => g.title)).toEqual(['Comparação', 'Lógica', 'Programação', 'Controle']);
    expect(MATH_RIBBON.simbolos.map((g) => g.buttons.length)).toEqual([24, 24, 10]);
  });
});
