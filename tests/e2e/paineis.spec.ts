// Painéis da janela (pedido do usuário, 14/11): largura arrastável, mostrar e esconder, faixa recolhida e modo foco.
import { expect, test } from './fixtures';
import { dev, start } from './helpers';

const width = (page: import('@playwright/test').Page, sel: string) => page.locator(sel).first().evaluate((e) => Math.round(e.getBoundingClientRect().width));

test('arrastar a divisória muda a largura do painel direito e grava no config; duplo clique volta ao padrão', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  const sep = page.getByRole('separator', { name: 'Largura do painel direito' });
  const box = (await sep.boundingBox())!;
  await page.mouse.move(box.x + 3, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x - 97, box.y + 200, { steps: 5 });
  await page.mouse.up();
  await expect(sep).toHaveAttribute('aria-valuenow', '375');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--panel-right'))).toBe('375px');
  await sep.dblclick();
  await expect(sep).toHaveAttribute('aria-valuenow', '275');
});

test('Exibir: esconder o painel esquerdo e a linha de comando; modo foco esconde tudo e Ctrl+Shift+F volta', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab', { name: 'Exibir' }).click();
  const esquerdo = page.getByRole('separator', { name: 'Largura do painel esquerdo' });
  await expect(esquerdo).toBeVisible();
  await page.getByRole('button', { name: 'Painel esquerdo' }).click();
  await expect(esquerdo).toBeHidden();
  await page.getByRole('button', { name: 'Linha de comando' }).click();
  await expect(page.getByText('Comando:')).toBeHidden();
  await page.getByRole('button', { name: 'Modo foco' }).click();
  await expect(page.getByRole('tablist', { name: 'Guias da faixa de opções' })).toBeHidden();
  await expect(page.getByRole('separator', { name: 'Largura do painel direito' })).toBeHidden();
  await expect(page.getByText('Modo foco · Ctrl+Shift+F para sair')).toBeVisible();
  await page.keyboard.press('Control+Shift+F');
  await expect(page.getByRole('tablist', { name: 'Guias da faixa de opções' })).toBeVisible();
  await expect(page.getByRole('separator', { name: 'Largura do painel direito' })).toBeVisible();
  await expect(esquerdo).toBeHidden(); // o que estava escondido antes do modo foco continua escondido
  await page.getByRole('button', { name: 'Painel esquerdo' }).click();
  await expect(esquerdo).toBeVisible();
});

test('Ctrl+F1 recolhe a faixa até as guias; clicar numa guia abre de novo', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('caderno');
  const faixa = page.getByRole('button', { name: 'Texto', exact: true });
  await expect(faixa).toBeVisible();
  const h0 = await width(page, 'article');
  await page.keyboard.press('Control+F1');
  await expect(faixa).toBeHidden();
  expect(await width(page, 'article')).toBe(h0);
  await page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab', { name: 'Início' }).click();
  await expect(faixa).toBeVisible();
  await page.keyboard.press('Control+F1');
  await expect(faixa).toBeHidden();
  await page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab', { name: 'Início' }).dblclick(); // recolhida: duplo clique abre e fica aberta
  await page.waitForTimeout(300);
  await expect(faixa).toBeVisible();
  await page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab', { name: 'Início' }).dblclick(); // aberta: duplo clique recolhe
  await expect(faixa).toBeHidden();
});
