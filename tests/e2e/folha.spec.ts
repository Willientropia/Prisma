// Fase 3 (o que já existe da folha livre) e ADENDO 02 B6.
import { expect, test } from './fixtures';
import { CALC, dev, resultTexts, start, tabs } from './helpers';

test('[F3-01] [F3-03] string-3 mostra 3,29 V e 0,82 %; gráfico com linha de limite', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const fig = page.locator('figure');
  await expect(fig).toContainText('limite 1 %');
  await expect(fig.locator('canvas')).toHaveCount(1);
});

test('[F3-04] arrastar a região pela moldura move com encaixe na grade de 20 px', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const region = page.locator('[data-region="s"]');
  const box = (await region.boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + 1); // a moldura (borda + folga), fora do campo
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 20, { steps: 4 });
  await page.mouse.move(box.x + 48, box.y + 33, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => dev(page).text()).toContain('```calc {#s x=280 y=120}');
});

test('[F3-05] a ordem é por posição: região movida para baixo dos resultados deixa de valer para eles', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const region = page.locator('[data-region="s"]');
  const box = (await region.boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(box.x + 1, box.y + 120, { steps: 5 });
  await page.mouse.move(box.x + 1, box.y + 230, { steps: 5 });
  await page.mouse.up();
  // E3.3: S ficou depois dos resultados e não é mais a unidade siemens; os 2 resultados ficam em aberto, sem erro
  await expect(page.locator('[data-region="resultado"] .mresult-symbolic')).toHaveCount(2);
  await expect(page.locator('[data-region="resultado"] [title="S ainda não foi definido"]')).toHaveCount(2);
  await expect(page.locator('[data-region="resultado"] .mline-error')).toHaveCount(0);
  expect(Number(/\{#s x=\d+ y=(\d+)\}/.exec((await dev(page).text())!)?.[1])).toBeGreaterThan(230); // abaixo de #resultado
});

test('[F3-06] tabela de variáveis com nome, valor e unidade', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  const rows = await page.locator('aside').first().evaluate((a) => [...a.querySelectorAll('div')].filter((d) => d.children.length === 3 && d.querySelector('.mmarkup')).map((d) => [...d.children].map((c) => (c as HTMLElement).innerText.replace(/[\s​]/g, ''))));
  expect(rows).toEqual([['S', '4', 'mm2'], ['L', '32', 'm'], ['I', '11,5', 'A'], ['Vmp', '400', 'V']]);
});

test('[F3-07] linha de comando: "ir cabos-cc" abre o arquivo', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  const cmd = page.getByLabel('Comando');
  await cmd.fill('ir cabos-cc');
  await cmd.press('Enter');
  await expect(tabs(page).last()).toContainText('cabos-cc.prsm');
});

test('[F3-02] [F3-12] string-3 mostra ATENÇÃO · limite 1 % na região de verificação', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  await expect(page.locator('[data-region="criterio"]')).toContainText('ATENÇÃO · limite 1 %');
});
