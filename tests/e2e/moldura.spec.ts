// Moldura nas regiões selecionadas (ADENDO 05, E5; em lote: pedido do usuário, 14/11).
import { expect, test } from './fixtures';
import { DOCS, dev, start } from './helpers';

test('Moldura (Início → Organizar) liga e desliga em todas as selecionadas; Ctrl+Z desfaz de uma vez', async ({ page }) => {
  await start(page);
  await dev(page).open(`${DOCS}/referencia-integral-grafico.prsf`);
  const folha = page.getByLabel('Folha');
  const [f, i] = [(await page.locator('[data-region="F"]').boundingBox())!, (await page.locator('[data-region="int"]').boundingBox())!];
  // laço na área vazia em volta das duas regiões de cálculo
  await page.mouse.move(f.x - 15, f.y - 10);
  await page.mouse.down();
  await page.mouse.move(Math.max(f.x + f.width, i.x + i.width) + 15, i.y + i.height + 10, { steps: 6 });
  await page.mouse.up();
  const moldura = page.getByRole('button', { name: 'Moldura', exact: true });
  await moldura.click();
  await expect.poll(() => dev(page).text()).toContain('```calc {#F x=40 y=40 moldura}');
  expect(await dev(page).text()).toContain('```calc {#int x=40 y=100 moldura}');
  expect(await dev(page).text()).not.toContain('#g1 x=40 y=180 largura=320 altura=240 moldura'); // o gráfico não estava selecionado
  await moldura.click();
  await expect.poll(() => dev(page).text()).not.toContain('moldura');
  await moldura.click();
  await expect.poll(() => (dev(page).text().then((t) => t.match(/moldura/g)?.length ?? 0))).toBe(2);
  await folha.click({ position: { x: 900, y: 700 } });
  await page.keyboard.press('Control+z');
  await expect.poll(() => dev(page).text()).not.toContain('moldura'); // as duas de uma vez
});
