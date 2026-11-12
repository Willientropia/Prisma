// A6-4 (ADENDO 06, Parte 3): assistente dinâmico na folha.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { dev, resultTexts, start } from './helpers';

const fence = '```';
const F = 'C:/Users/voce/Documents/assistente.prsf';
const sheetText = (body: string) => `---\ntipo: folha\ntitulo: Assistente\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n${body}`;
const region = (key: string, y: number, line: string) => `${fence}calc {#${key} x=40 y=${y}}\n${line}\n${fence}\n\n`;

/** Abre uma folha com as regiões dadas e clica num ponto vazio (região nova). */
async function open(page: Page, regions = '', at = { x: 100, y: 300 }) {
  await start(page);
  if (regions) { await dev(page).write(F, sheetText(regions)); await dev(page).open(F); }
  else await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: at });
}
const list = (page: Page) => page.getByRole('listbox', { name: 'Assistente dinâmico' });
const options = (page: Page) => list(page).getByRole('option');
const optionNames = (page: Page) => options(page).evaluateAll((os) => os.map((o) => o.getAttribute('data-name')));
const selected = (page: Page) => list(page).locator('[role="option"][aria-selected="true"]');
const detail = (page: Page) => page.locator('[data-assist-detail]');
const body = async (page: Page) => (await dev(page).text()).split('---\n').slice(2).join('---\n');
const config = (page: Page) => page.evaluate(() => (window as unknown as { prismaDev: { config(): string } }).prismaDev.config());

test('[A6-4-40] 06-10: folha vazia, s abre a lista com s e S; detalhe "Segundo (Tempo)" e "Tab para inserir"', async ({ page }) => {
  await open(page);
  await page.keyboard.type('s', { delay: 30 });
  await expect(list(page)).toBeVisible();
  const names = await optionNames(page);
  expect(names).toContain('s');
  expect(names).toContain('S');
  await expect(selected(page)).toHaveAttribute('data-name', 's');
  await expect(detail(page)).toContainText('Segundo (Tempo)');
  await expect(detail(page)).toContainText('Tab para inserir');
});

test('[A6-4-41] 06-11: com f(x) ≔ x+2 acima, f mostra a função do usuário primeiro, com a definição', async ({ page }) => {
  await open(page, region('a', 40, 'f(x) := x + 2'));
  await page.keyboard.type('f', { delay: 30 });
  await expect(selected(page)).toHaveAttribute('data-name', 'f');
  await expect(selected(page)).toContainText('Função do usuário');
  await expect.poll(async () => (await detail(page).textContent())?.replace(/\s/g, '')).toContain('f(x)≔x+2');
});

test('[A6-4-42] 06-12: com s_batata ≔ 2·7 acima, s_batata vem antes das unidades, com 14 no detalhe', async ({ page }) => {
  await open(page, region('a', 40, 's_batata := 2*7') + region('b', 100, 's_batata = ?'));
  await expect.poll(() => resultTexts(page)).toEqual(['14']); // o valor só entra no detalhe depois do cálculo
  await page.getByLabel('Folha').click({ position: { x: 100, y: 300 } });
  await page.keyboard.type('s', { delay: 30 });
  await expect(selected(page)).toHaveAttribute('data-name', 's_batata');
  await expect(detail(page)).toContainText('14');
});

test('[A6-4-44] 06-14: s, seta para baixo e Enter aceitam o item escolhido; a região continua em edição', async ({ page }) => {
  await open(page);
  await page.keyboard.type('s', { delay: 30 });
  await expect(list(page)).toBeVisible();
  await page.keyboard.press('ArrowDown');
  const chosen = await selected(page).getAttribute('data-name');
  expect(chosen).not.toBe('s');
  await page.keyboard.press('Enter');
  await expect(list(page)).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('MATH-FIELD');
  await page.keyboard.type('1', { delay: 30 }); // função aceita: o cursor está no argumento
  await page.keyboard.press('Enter');
  await expect.poll(() => body(page)).toContain(`${chosen}(1)`);
});

test('[A6-4-45] 06-15: variável definida mais abaixo não aparece', async ({ page }) => {
  await open(page, region('z', 400, 'zz := 5'), { x: 100, y: 100 });
  await page.keyboard.type('z', { delay: 30 });
  await expect(list(page)).toBeVisible(); // Hz contém z
  expect(await optionNames(page)).not.toContain('zz');
});

test('[A6-4-46] 06-16: Exibir → Assistente dinâmico desliga a lista e grava na config; Ctrl+Espaço ainda abre', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Exibir', exact: true }).click();
  await page.getByRole('button', { name: 'Assistente dinâmico' }).click();
  await expect.poll(() => config(page)).toContain('assistente_dinamico: false');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 300 } });
  await page.keyboard.type('s', { delay: 30 });
  await page.waitForTimeout(200);
  await expect(list(page)).toBeHidden();
  await page.keyboard.press('Control+Space');
  await expect(list(page)).toBeVisible();
});

test('[A6-4-14] desligado vale para a folha seguinte (lido da config)', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: 'Exibir', exact: true }).click();
  await page.getByRole('button', { name: 'Assistente dinâmico' }).click();
  await expect.poll(() => config(page)).toContain('assistente_dinamico: false');
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 300 } });
  await page.keyboard.type('s', { delay: 30 });
  await page.waitForTimeout(200);
  await expect(list(page)).toBeHidden();
  await page.getByRole('tab', { name: 'Exibir', exact: true }).click();
  await page.getByRole('button', { name: 'Assistente dinâmico' }).click();
  await expect.poll(() => config(page)).toContain('assistente_dinamico: true');
});

test('[A6-4-10] campo de unidade: a lista abre na hora, só com unidades; mm e Tab gravam L = ? mm', async ({ page }) => {
  await open(page, region('a', 40, "L := 25 m"));
  await page.keyboard.type('L=', { delay: 30 });
  await expect.poll(() => resultTexts(page)).toEqual(['25m']); // o marcador só existe com o resultado na tela
  await page.keyboard.press('ArrowRight');
  await expect(list(page)).toBeVisible();
  const kinds = await options(page).evaluateAll((os) => [...new Set(os.map((o) => o.getAttribute('data-kind')))]);
  expect(kinds).toEqual(['unit']);
  await expect(detail(page)).toContainText('Tab para inserir');
  await page.keyboard.type('mm', { delay: 30 });
  await expect(selected(page)).toHaveAttribute('data-name', 'mm');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect.poll(() => body(page)).toContain('L = ? mm');
});

test('[A6-4-12] A6-3-52 (parte): x mostra xy2pol primeiro, como função nativa', async ({ page }) => {
  await open(page);
  await page.keyboard.type('x', { delay: 30 });
  await expect(selected(page)).toHaveAttribute('data-name', 'xy2pol');
  await expect(selected(page)).toContainText('Função nativa');
});

test('[A6-2-59] 2.1 com a lista aberta: Ctrl+Enter, Shift+Enter e Ctrl+Espaço aceitam; Shift+Tab fecha', async ({ page }) => {
  const step = async (y: number, typed: string, key: string, after: string, want: string) => {
    await page.getByLabel('Folha').click({ position: { x: 100, y } });
    await page.keyboard.type(typed, { delay: 30 });
    await expect(list(page)).toBeVisible();
    await page.keyboard.press(key);
    await expect(list(page)).toBeHidden();
    if (after) await page.keyboard.type(after, { delay: 30 });
    await page.keyboard.press('Enter');
    await expect.poll(() => body(page)).toContain(want);
  };
  await open(page);
  await page.keyboard.press('Escape');
  await step(100, 'y:sq', 'Control+Enter', '4', 'y := sqrt(4)');
  await step(200, 'w:sq', 'Shift+Enter', '9', 'w := sqrt(9)');
  await step(300, 'z:s', 'Control+Space', '', "z := 's");
  await page.getByLabel('Folha').click({ position: { x: 100, y: 400 } });
  await page.keyboard.type('b', { delay: 30 });
  await expect(list(page)).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(list(page)).toBeHidden();
});

test('[A6-2-59] depois de Esc fechar a lista, Ctrl+Enter e Shift+Enter não a reabrem nem aceitam', async ({ page }) => {
  await open(page);
  await page.keyboard.type('y:s', { delay: 30 });
  await expect(list(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list(page)).toBeHidden();
  await page.keyboard.press('Control+Enter');
  await expect(list(page)).toBeHidden();
  expect(await page.evaluate(() => (document.activeElement as unknown as { value?: string })?.value ?? '')).not.toContain('class{u}'); // s continua variável
  await page.getByLabel('Folha').click({ position: { x: 100, y: 200 } });
  await page.keyboard.type('w:s', { delay: 30 });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Shift+Enter');
  await expect(list(page)).toBeHidden();
  await expect.poll(() => body(page)).toContain('w := s\n');
});

test('[A6-4-13] botão direito na lista não abre o menu da região', async ({ page }) => {
  await open(page);
  await page.keyboard.type('s', { delay: 30 });
  await list(page).locator('[data-name="s"]').click({ button: 'right' });
  await page.waitForTimeout(200);
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(list(page)).toBeVisible();
});

test('[A6-4-13] duplo clique num item aceita', async ({ page }) => {
  await open(page);
  await page.keyboard.type('y:sq', { delay: 30 });
  await list(page).locator('[data-name="sqrt"]').dblclick();
  await page.keyboard.type('4', { delay: 30 });
  await page.keyboard.press('Enter');
  await expect.poll(() => body(page)).toContain('y := sqrt(4)');
});
