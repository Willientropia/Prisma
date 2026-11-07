// Casos de tests/golden/teclado.yaml (ADENDO 03, C3) no navegador: a linha de cálculo de verdade (MathLive)
// e teclado real (Playwright por baixo do Vitest).
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { parse as parseYaml } from 'yaml';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { MathLine, isKnownUnit } from './MathLine';
import golden from '../../tests/golden/teclado.yaml?raw';

type Case = {
  id: string; descricao?: string; contexto: 'folha' | 'caderno'; teclas: string;
  linear?: string; latex_contem?: string[]; latex_nao_contem?: string[]; tela_contem?: string[]; tela_nao_contem?: string[];
};

/** "{Ctrl+G}" e companhia para a sintaxe do user-event. */
export function toUserEvent(keys: string): string {
  return keys.replace(/\{([^}]+)\}|([[{])/g, (_, special: string | undefined, literal: string | undefined) => {
    if (literal) return literal + literal; // { e [ literais
    const parts = special!.split('+');
    const key = parts.pop()!;
    const k = key.length === 1 ? key.toLowerCase() : key === 'Space' ? ' ' : `{${key}}`;
    return parts.reduce((acc, mod) => `{${mod === 'Ctrl' ? 'Control' : mod}>}${acc}{/${mod === 'Ctrl' ? 'Control' : mod}}`, k);
  });
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });

async function mountLine(contexto: Case['contexto']) {
  const writes: string[] = [];
  host = document.createElement('div');
  host.style.cssText = `padding:20px;background:var(${contexto === 'folha' ? '--bg-grid' : '--paper'})`;
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<MathLine raw="" ctx={{ defined: new Set(), isUnit: isKnownUnit }} theme={contexto === 'folha' ? 'dark' : 'paper'} size={20} focused onWrite={(r) => writes.push(r)} />);
  });
  await expect.poll(() => document.activeElement?.tagName, { timeout: 3000 }).toBe('MATH-FIELD');
  const field = host.querySelector('math-field') as HTMLElement & { value: string };
  return { writes, field, shown: () => field.shadowRoot?.querySelector('.ML__latex')?.textContent ?? '' };
}

describe('tests/golden/teclado.yaml', () => {
  for (const c of parseYaml(golden) as Case[]) {
    it(`[${c.id}] ${c.descricao ?? c.teclas}`, async () => {
      const { writes, field, shown } = await mountLine(c.contexto);
      await userEvent.keyboard(toUserEvent(c.teclas));
      if (c.linear !== undefined) await expect.poll(() => writes.at(-1), { timeout: 2000 }).toBe(c.linear);
      for (const p of c.latex_contem ?? []) expect(field.value).toContain(p);
      for (const p of c.latex_nao_contem ?? []) expect(field.value).not.toContain(p);
      for (const p of c.tela_contem ?? []) expect(shown()).toContain(p);
      for (const p of c.tela_nao_contem ?? []) expect(shown()).not.toContain(p);
    });
  }

  it('[B10-01] unidade desenhada em --math-unit', async () => {
    const { field } = await mountLine('folha');
    await userEvent.keyboard(toUserEvent('S:4mm^2{Enter}'));
    await expect.poll(() => field.shadowRoot?.querySelector('.u') !== null).toBe(true);
    const unit = field.shadowRoot!.querySelector('.u') as HTMLElement;
    const want = getComputedStyle(document.documentElement).getPropertyValue('--math-unit').trim();
    const probe = document.createElement('span');
    probe.style.color = want;
    document.body.appendChild(probe);
    expect(getComputedStyle(unit).color).toBe(getComputedStyle(probe).color);
    probe.remove();
  });
});
