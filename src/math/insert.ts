// Botões do ribbon matemático (ADENDO 06, 4.8): inserem no campo em edição, no cursor; com seleção, a estrutura a envolve.
import type { MathfieldElement } from 'mathlive';

/** Campo de matemática com foco, ou null. */
export const focusedField = (): MathfieldElement | null => {
  const el = document.activeElement;
  return el && el.tagName === 'MATH-FIELD' ? (el as MathfieldElement) : null;
};

/** Campos que ganharam foco mas ainda não aplicaram as teclas guardadas: a inserção entra na fila deles (BUG-029). */
export const waitingFields = new WeakMap<Element, (latex: string) => void>();

/** Insere o LaTeX no campo com foco e põe o cursor no primeiro quadradinho vazio. false: não há campo em edição. */
export function insertInFocused(latex: string): boolean {
  const mf = focusedField();
  if (!mf) return false;
  const queue = waitingFields.get(mf);
  if (queue) { queue(latex); return true; } // depois de "a+b" digitado antes do foco, não antes

  mf.insert(latex, { selectionMode: 'placeholder', format: 'latex' });
  mf.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true })); // insert() não avisa: sem isso o campo não grava ao confirmar
  mf.focus();
  return true;
}
