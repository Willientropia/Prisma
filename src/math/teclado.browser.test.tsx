// Casos de tests/golden/teclado.yaml (ADENDO 03, C3) no navegador: a linha de cálculo de verdade (MathLive)
// e teclado real (Playwright por baixo do Vitest).
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type Root } from 'react-dom/client';
import { act, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import '../styles/fonts.css';
import '../styles/tokens.css';
import '../styles/global.css';
import { MathLine, isKnownUnit } from './MathLine';
import golden from '../../tests/golden/teclado.yaml?raw';

type Case = {
  id: string; descricao?: string; contexto: 'folha' | 'caderno'; teclas: string;
  inicial?: string; definidos?: string[]; // A6-1: linha já gravada (raw) e nomes já definidos; a gravação volta para a linha, como na folha
  raw_final?: string; raw_sem?: string[]; sem_resultado?: boolean; sair?: boolean; // linha gravada no fim; nenhum "= resultado" na tela; tirar o foco no fim
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

/** Como a folha: o que o campo grava volta como `raw`; linha de avaliação mostra um resultado de mentira. */
function Harness(p: { inicial: string; definidos: string[]; contexto: Case['contexto']; log: (r: string) => void }) {
  const [raw, setRaw] = useState(p.inicial);
  const result = / = \?/.test(raw) ? { kind: 'eval' as const, numText: '4', text: '4' } : undefined;
  return <MathLine raw={raw} result={result} ctx={{ defined: new Set(p.definidos), isUnit: isKnownUnit }} theme={p.contexto === 'folha' ? 'dark' : 'paper'} size={20} focused
    onWrite={(r) => { p.log(r); setRaw(r); }} />;
}

async function mountLine(contexto: Case['contexto'], inicial = '', definidos: string[] = []) {
  const writes: string[] = [];
  const cur = { raw: inicial };
  host = document.createElement('div');
  host.style.cssText = `padding:20px;background:var(${contexto === 'folha' ? '--bg-grid' : '--paper'})`;
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<Harness inicial={inicial} definidos={definidos} contexto={contexto} log={(r) => { writes.push(r); cur.raw = r; }} />);
  });
  await expect.poll(() => document.activeElement?.tagName, { timeout: 3000 }).toBe('MATH-FIELD');
  const field = host.querySelector('math-field') as HTMLElement & { value: string };
  if (inicial) await new Promise((r) => setTimeout(r, 300)); // o campo põe o cursor no fim alguns quadros depois do foco
  return { writes, cur, host, field, shown: () => field.shadowRoot?.querySelector('.ML__latex')?.textContent ?? '' };
}

describe('tests/golden/teclado.yaml', () => {
  for (const c of parseYaml(golden) as Case[]) {
    it(`[${c.id}] ${c.descricao ?? c.teclas}`, async () => {
      const { writes, cur, host, field, shown } = await mountLine(c.contexto, c.inicial, c.definidos);
      if (c.inicial) { // edição de linha existente: uma tecla por vez, como a pessoa digita (em rajada o MathLive perde Backspace)
        for (const k of toUserEvent(c.teclas).match(/\{[^}]+\}|./g) ?? []) { await userEvent.keyboard(k); await new Promise((r) => setTimeout(r, 40)); }
      } else await userEvent.keyboard(toUserEvent(c.teclas));
      if (c.linear !== undefined) await expect.poll(() => writes.at(-1), { timeout: 2000 }).toBe(c.linear);
      const fieldValue = field.value; const fieldShown = shown();
      if (c.sem_resultado) { await new Promise((r) => setTimeout(r, 400)); expect(host.querySelector('.mresult')).toBeNull(); }
      if (c.sair) { field.blur(); await expect.poll(() => document.activeElement === field, { timeout: 2000 }).toBe(false); }
      for (const p of c.raw_sem ?? []) expect(cur.raw).not.toContain(p);
      if (c.raw_final !== undefined) { await new Promise((r) => setTimeout(r, 400)); expect(cur.raw).toBe(c.raw_final); }
      for (const p of c.latex_contem ?? []) expect(fieldValue).toContain(p);
      for (const p of c.latex_nao_contem ?? []) expect(fieldValue).not.toContain(p);
      for (const p of c.tela_contem ?? []) expect(fieldShown).toContain(p);
      for (const p of c.tela_nao_contem ?? []) expect(fieldShown).not.toContain(p);
    });
  }

  it('[B10-01] unidade desenhada em --math-unit', async () => {
    const { field } = await mountLine('folha');
    await userEvent.keyboard(toUserEvent("S:4'mm^2{Enter}"));
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
