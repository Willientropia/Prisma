// ADENDO 04: posição fixa das abas de documento e ribbon com altura reservada.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, PROJ, dev, start, tabs } from './helpers';

const FILES = {
  caderno: `${CALC}/cabos-cc.prsm`,
  folha: `${CALC}/string-3.prsf`,
  tex: `${PROJ}/memorial/memorial.tex`,
  lib: 'C:/Program Files/Prisma/bibliotecas/eletrica.prsl',
};
const RIBBON_TABS = ['Início', 'Inserir', 'Exibir', 'Saída'];

const rect = (page: Page, sel: string) => page.locator(sel).evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, height: r.height }; });
const ribbon = (page: Page) => page.locator('[aria-label="Guias da faixa de opções"]').locator('..');
const ribbonTab = (page: Page, name: string) => page.locator('[aria-label="Guias da faixa de opções"]').getByRole('tab', { name, exact: true });

test('[D6-01] a fileira de abas fica em top = 38 px com 32 px em todas as telas', async ({ page }) => {
  await start(page);
  expect(await rect(page, '[aria-label="Documentos abertos"]')).toEqual({ top: 38, height: 32 });
  for (const [type, file] of Object.entries(FILES)) {
    await dev(page).open(file);
    await expect(tabs(page).last()).toContainText(file.split('/').pop()!);
    expect(await rect(page, '[aria-label="Documentos abertos"]'), type).toEqual({ top: 38, height: 32 });
  }
});

test('[D6-02] clicar em Início e depois na aba do documento, sem mover o mouse, acerta as duas', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  const home = page.locator('[aria-label="Documentos abertos"]').getByRole('tab', { name: 'Início', exact: true });
  const doc = tabs(page).filter({ hasText: 'cabos-cc.prsm' });
  const box = async (l: typeof home) => (await l.boundingBox())!;
  const center = async (l: typeof home) => { const b = await box(l); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const h = await center(home), d = await center(doc);
  const hb = await box(home), db = await box(doc);
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(h.x, h.y);
    await expect(home).toHaveAttribute('aria-selected', 'true');
    expect(await box(doc)).toEqual(db); // a aba do documento não mudou de lugar nem de tamanho
    await page.mouse.click(d.x, d.y);
    await expect(doc).toHaveAttribute('aria-selected', 'true');
    expect(await box(home)).toEqual(hb);
  }
});

test('[D6-03] [D6-04] ribbon com 124 px em todas as guias e tipos; título de grupo inteiro, sem corte', async ({ page }) => {
  await start(page);
  for (const [type, file] of Object.entries(FILES)) {
    await dev(page).open(file);
    for (const name of RIBBON_TABS) {
      await ribbonTab(page, name).click();
      const r = ribbon(page);
      expect(await r.evaluate((e) => e.getBoundingClientRect().height), `${type} / ${name}`).toBe(124);
      const cut = await r.evaluate((rb) => {
        const box = rb.getBoundingClientRect();
        return [...rb.querySelectorAll<HTMLElement>('[class*="groupTitle"]')].filter((t) => {
          const b = t.getBoundingClientRect();
          return b.height === 0 || b.top < box.top || b.bottom > box.bottom - 1 || t.scrollHeight > t.clientHeight || t.scrollWidth > t.clientWidth;
        }).map((t) => t.textContent);
      });
      expect(cut, `${type} / ${name}: títulos cortados`).toEqual([]);
    }
  }
});

test('[D6-05] aba Início só com o ícone de casa, 40 px de largura, sem fechar', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  const home = page.locator('[aria-label="Documentos abertos"] [role="tab"]').first();
  await expect(home).toHaveAttribute('aria-label', 'Início');
  const info = await home.evaluate((e) => ({ w: e.getBoundingClientRect().width, text: (e as HTMLElement).innerText.trim(), svg: e.querySelectorAll('svg').length, buttons: e.querySelectorAll('button').length, path: e.querySelector('path')?.getAttribute('d') }));
  expect(info).toEqual({ w: 40, text: '', svg: 1, buttons: 0, path: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10' });
  await expect(page.locator('[aria-label="Documentos abertos"]').getByRole('button', { name: /fechar/i })).toHaveCount(0);
});
