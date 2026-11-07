// ADENDO 03, C4: telas com imagem aprovada (1440 × 900, escala 1, relógio fixo, sem animação nem cursor).
// Imagem aprovada só muda quando a mudança visual foi pedida (C4); o commit diz qual pedido.
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '../e2e/fixtures';
import { CALC, PROJ, dev, resultTexts, start } from '../e2e/helpers';

/** Espera fontes e quadros assentarem; o tempo de cálculo (muda a cada execução) fica mascarado. */
async function shot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 899);
  await expect(page).toHaveScreenshot(name, { mask: [page.getByText(/^Calculado em /)] });
}

test('[F0-11] tela inicial', async ({ page }) => {
  await start(page);
  await shot(page, 'inicio.png');
});

test('[F0-11] caderno cabos-cc, guia Início', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  await shot(page, 'caderno-inicio.png');
});

test('[F0-11] caderno cabos-cc, guia Exibir', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  await page.getByRole('tab', { name: 'Exibir', exact: true }).click();
  await shot(page, 'caderno-exibir.png');
});

test('[F0-11] folha string-3 com resultados', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  await shot(page, 'folha.png');
});

test('[F0-11] documento LaTeX (PDF fica para a fase 5)', async ({ page }) => {
  await start(page);
  await dev(page).open(`${PROJ}/memorial/memorial.tex`);
  await expect(page.locator('main')).toContainText('documentclass');
  await shot(page, 'latex.png');
});

test('[F0-11] biblioteca eletrica com ΔV selecionada', async ({ page }) => {
  await start(page);
  await dev(page).open('C:/Program Files/Prisma/bibliotecas/eletrica.prsl');
  await expect(page.locator('main h2')).toHaveText('ΔV(L, I, S)');
  await shot(page, 'biblioteca.png');
});

test('[F0-11] diálogo Exportar', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  const search = page.getByPlaceholder('Buscar comando ou função');
  await search.fill('Exportar');
  await search.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Exportar' })).toBeVisible();
  await shot(page, 'exportar.png');
});

test('[F0-11] menu do app aberto', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Menu do Prisma' }).click();
  await expect(page.getByRole('menuitem').first()).toBeVisible();
  await shot(page, 'menu.png');
});

test('[F0-11] painel Projeto aberto', async ({ page }) => {
  await start(page);
  await dev(page).open(`${PROJ}/usina-boa-vista.prsp`);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  await page.getByRole('tablist', { name: 'Painel esquerdo' }).getByRole('tab', { name: 'Projeto' }).click();
  await expect(page.locator('aside').first()).toContainText(/Arquivos\s*2/);
  await shot(page, 'projeto.png');
});

test('[C9-06] mudar uma cor em tokens.css passa da tolerância do teste visual', async ({ page }) => {
  // Não mexe na imagem aprovada: compara a tela de hoje com a mesma tela usando um tokens.css alterado.
  await start(page);
  await page.evaluate(() => document.fonts.ready);
  const normal = (await page.screenshot()).toString('base64');
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  const changed = tokens.replace('--bg-app: #15131c;', '--bg-app: #1c1324;');
  expect(changed).not.toBe(tokens);
  await page.addStyleTag({ content: changed });
  const altered = (await page.screenshot()).toString('base64');
  const ratio = await page.evaluate(async ([a, b]) => {
    const px = async (s: string) => {
      const img = new Image(); img.src = `data:image/png;base64,${s}`; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
      return g.getImageData(0, 0, img.width, img.height).data;
    };
    const [p, q] = [await px(a), await px(b)];
    let diff = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i] !== q[i] || p[i + 1] !== q[i + 1] || p[i + 2] !== q[i + 2]) diff++;
    return diff / (p.length / 4);
  }, [normal, altered] as const);
  console.log(`C9-06: ${(ratio * 100).toFixed(1)} % dos pixels mudaram (tolerância 1 %)`);
  expect(ratio).toBeGreaterThan(0.01); // maxDiffPixelRatio de playwright.config.ts
});
