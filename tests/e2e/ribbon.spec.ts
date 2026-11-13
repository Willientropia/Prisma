// ADENDO 06, Parte 4 (A6-5): guias do ribbon e guia Matemática.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, dev, fieldValues, start, tabs } from './helpers';

const guias = (page: Page) => page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab');
const ORDEM = ['Início', 'Matemática', 'Matrizes', 'Lógica e programação', 'Símbolos', 'Inserir', 'Exibir', 'Saída'];

test('[06-25] caderno e folha mostram as 8 guias na ordem de 4.1; ribbon com 124 px e nenhum título de grupo cortado', async ({ page }) => {
  await start(page);
  for (const tipo of ['caderno', 'folha'] as const) {
    await dev(page).newDoc(tipo);
    await expect(guias(page)).toHaveText(ORDEM);
  }
  await guias(page).filter({ hasText: 'Matemática' }).click();
  const ribbon = page.locator('[role="tablist"][aria-label="Guias da faixa de opções"]').locator('..');
  expect((await ribbon.boundingBox())!.height).toBe(124);
  const cortados = await ribbon.locator('div').evaluateAll((els) => els.filter((e) => /Definir e avaliar|Estruturas|Constantes|Funções|Catálogo|Cálculo|Condições/.test(e.textContent ?? '') && e.childElementCount === 0 && e.scrollWidth > e.clientWidth).length);
  expect(cortados).toBe(0);
});

test('[06-26] com a região em edição, Fração com a + b selecionado põe a + b no numerador e o cursor no denominador', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('a+b');
  await page.keyboard.press('Space'); // amplia a seleção para a + b (2.3)
  await guias(page).filter({ hasText: 'Matemática' }).click();
  await page.getByRole('button', { name: 'Fração', exact: true }).click();
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('(a + b)/2');
});

test('[06-27] folha sem edição: clicar π cria a região no cursor em cruz', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await guias(page).filter({ hasText: 'Matemática' }).click();
  await expect(page.getByRole('button', { name: 'Pi' })).toHaveAttribute('aria-disabled', 'true'); // sem cruz nem edição: nada onde inserir
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.getByRole('button', { name: 'Pi' }).click();
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toMatch(/calc \{#\S+ x=100 y=100\}\nπ\n/);
});

test('[06-28] a dica de Fração mostra o nome, o atalho e a frase', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await guias(page).filter({ hasText: 'Matemática' }).click();
  await page.getByRole('button', { name: 'Fração', exact: true }).hover();
  const dica = page.getByRole('tooltip');
  await expect(dica).toContainText('Fração');
  await expect(dica).toContainText('/');
  await expect(dica).toContainText('Cria uma fração com o termo à esquerda no numerador.');
});

test('[A6-5-01] cada tipo de documento lembra a última guia usada (4.8)', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await guias(page).filter({ hasText: 'Matemática' }).click();
  await dev(page).newDoc('caderno');
  await expect(guias(page).filter({ hasText: 'Início' })).toHaveAttribute('aria-selected', 'true');
  await tabs(page).filter({ hasText: 'Folha' }).first().click();
  await expect(guias(page).filter({ hasText: 'Matemática' })).toHaveAttribute('aria-selected', 'true');
});

test('[06-30] Alt e depois M abre a guia Matemática', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.keyboard.press('Alt');
  await page.keyboard.press('m');
  await expect(guias(page).filter({ hasText: 'Matemática' })).toHaveAttribute('aria-selected', 'true');
});

test('[06-31] janela com 1024 px: grupos recolhidos e todos os botões acessíveis', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await start(page);
  await dev(page).newDoc('folha');
  await guias(page).filter({ hasText: 'Matemática' }).click();
  const recolhidos = page.locator('button[aria-haspopup="menu"]');
  expect(await recolhidos.count()).toBeGreaterThan(0);
  const vistos = new Set(await page.locator('button[aria-label]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent && e.getBoundingClientRect().right <= innerWidth).map((e) => e.getAttribute('aria-label')!)));
  for (let i = 0; i < (await recolhidos.count()); i++) {
    await recolhidos.nth(i).click();
    for (const l of await page.getByRole('menu').locator('button[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')!))) vistos.add(l);
    await page.mouse.click(5, 700); // clicar fora fecha o menu
    await expect(page.getByRole('menu')).toHaveCount(0);
  }
  for (const b of ['Definir', 'Fração', 'Pi', 'sin( )', 'Todas as funções', 'Somatório', 'Integral', 'Por partes', 'a ≤ x ≤ b']) expect(vistos, b).toContain(b);
});

test('[A6-6-05] guia Símbolos: clicar α com a cruz cria a região com α; ∂ ainda não está disponível', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await guias(page).filter({ hasText: 'Símbolos' }).click();
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await expect(page.getByRole('button', { name: 'Símbolo ∂' })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('button', { name: 'Letra grega α', exact: true }).click();
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toMatch(/calc \{#\S+ x=100 y=100\}\nα\n/);
});

test('[06-33] Ctrl+E, buscar "queda", Enter: insere ΔV(□; □; □)', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await page.getByLabel('Folha').click({ position: { x: 600, y: 500 } }); // cruz numa área vazia
  await page.keyboard.press('Control+e');
  const dlg = page.getByRole('dialog', { name: 'Catálogo de funções' });
  await expect(dlg).toBeVisible();
  await page.keyboard.type('queda');
  await page.keyboard.press('Enter');
  await expect(dlg).toHaveCount(0);
  await expect.poll(async () => (await fieldValues(page)).some((v) => v.includes('\Delta') && (v.match(/\placeholder/g) ?? []).length === 3)).toBe(true);
});

test('[A6-7-01] Ctrl+W na expressão abre o catálogo de unidades e insere a escolhida; fora dela, Ctrl+W continua fechando o documento', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('L:5');
  await expect.poll(async () => (await fieldValues(page)).some((v) => v.endsWith('5'))).toBe(true); // a região já está em edição
  await page.keyboard.press('Control+w');
  const dlg = page.getByRole('dialog', { name: 'Catálogo de unidades' });
  await expect(dlg).toBeVisible();
  await dlg.getByRole('option', { name: 'Comprimento', exact: true }).click();
  await page.keyboard.type('metro');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('L := 5 m');
  const abertas = await tabs(page).count();
  await page.getByLabel('Folha').click({ position: { x: 400, y: 400 } });
  await page.keyboard.press('Control+w'); // fora da expressão: fecha o documento (com alteração, pergunta antes)
  await page.getByRole('button', { name: 'Não salvar' }).click();
  await expect(tabs(page)).toHaveCount(abertas - 1);
});
