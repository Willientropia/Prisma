// Botões do ribbon matemático (ADENDO 06, 4.8): inserem no campo em edição, no cursor; com seleção, a estrutura a envolve.
import type { MathfieldElement } from 'mathlive';

/** Campo de matemática com foco, ou null. */
export const focusedField = (): MathfieldElement | null => {
  const el = document.activeElement;
  return el && el.tagName === 'MATH-FIELD' ? (el as MathfieldElement) : null;
};

/** Insere o LaTeX no campo com foco e põe o cursor no primeiro quadradinho vazio. false: não há campo em edição. */
export function insertInFocused(latex: string): boolean {
  const mf = focusedField();
  if (!mf) return false;
  mf.insert(latex, { selectionMode: 'placeholder', format: 'latex' });
  mf.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true })); // insert() não avisa: sem isso o campo não grava ao confirmar
  mf.focus();
  return true;
}
