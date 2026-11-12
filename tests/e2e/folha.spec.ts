// Fase 3 (o que já existe da folha livre) e ADENDO 02 B6.
import { expect, test } from './fixtures';
import { CALC, dev, resultTexts, start, tabs } from './helpers';

test('[F3-01] [F3-03] string-3 mostra 3,29 V e 0,82 %; gráfico com linha de limite', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
  const fig = page.locator('figure');
  await expect(fig).toContainText('limite 1 %');
  await expect(fig.locator('canvas')).toHaveCount(1);
});

test('[F3-04] arrastar a região pela moldura move com encaixe na grade de 20 px', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
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
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
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
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
  await expect(page.locator('[data-region="criterio"]')).toContainText('ATENÇÃO · limite 1 %');
});

// A6-3: Espaço numa região de um nome só vira texto (correção do teste manual da v0.2.0, conferida no SMath)
test('[A6-3-40] folha: batata, Espaço, casa vira uma região de texto "batata casa", sem região de cálculo', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('batata casa', { delay: 40 });
  await expect.poll(() => dev(page).text()).toContain('```texto {');
  await expect.poll(() => dev(page).text()).toContain('batata casa');
  expect(await dev(page).text()).not.toContain('```calc');
  expect(await page.locator('[data-region] math-field').count()).toBe(0);
});

test('[A6-3-41] folha: a+b, Espaço continua ampliando a seleção e a região segue de cálculo', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('a+b /2', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('(a + b)/2');
  expect(await dev(page).text()).not.toContain('```texto');
});

// F-CONFIG: menu de formatação do resultado (app, documento e região)
const FCFG_FILE = `${CALC}/fcfg.prsf`;
const fcfgSheet = (extra = '') => `---\ntipo: folha\ntitulo: F\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\n${extra}versao_formato: 1\n---\n\n\`\`\`calc {#r x=40 y=80}\n12345.678 m = ? m\n\`\`\`\n\n\`\`\`calc {#q x=40 y=200}\n1/3 = ?\n\`\`\`\n`;
const fcfgOpen = async (page: import('@playwright/test').Page) => {
  await start(page);
  await dev(page).write(FCFG_FILE, fcfgSheet());
  await dev(page).open(FCFG_FILE);
  await expect.poll(() => resultTexts(page)).toEqual(['12345,678m', '0,3333']);
};
const fcfgConfig = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { prismaDev: { config(): string } }).prismaDev.config());

test('[FCFG-10] folha: botão direito na área vazia > Formato do documento > engenharia grava notacao no cabeçalho e muda o resultado', async ({ page }) => {
  await fcfgOpen(page);
  const antes = await dev(page).text();
  await page.getByLabel('Folha').click({ button: 'right', position: { x: 700, y: 500 } });
  await page.getByRole('menuitem', { name: 'Formato do documento...' }).click();
  const dlg = page.getByRole('dialog', { name: 'Formato do resultado' });
  await dlg.getByLabel('Notação', { exact: true }).selectOption('engenharia');
  await dlg.getByRole('button', { name: 'OK' }).click();
  await expect(dlg).toHaveCount(0);
  await expect.poll(() => dev(page).text()).toContain('exibicao: {casas: 4, modo: decimais, zeros_a_direita: false, limite_exponencial: 5, notacao: engenharia}\nversao_formato: 1\n---');
  expect((await dev(page).text()).replace(/exibicao:.*\n/, '')).toBe(antes); // o resto do arquivo não muda
  await expect.poll(() => resultTexts(page).then((a) => a[0])).toMatch(/^12,3457.*10.*3.*m$/);
  await expect.poll(() => resultTexts(page).then((a) => a[1])).toMatch(/^333,3333.*10.*3$/); // 1/3 também em engenharia: 333,3333·10⁻³
});

test('[FCFG-11] Configurações grava o padrão do app só para documentos novos', async ({ page }) => {
  await fcfgOpen(page);
  const id = await page.evaluate(() => (window as unknown as { prismaDev: { state(): { active: string } } }).prismaDev.state().active);
  await page.evaluate(() => (window as unknown as { prismaDev: { state(): { activate(i: string): void } } }).prismaDev.state().activate('home'));
  await page.getByRole('button', { name: 'Configurações' }).click();
  const dlg = page.getByRole('dialog', { name: 'Configurações' });
  await dlg.getByLabel('Casas decimais', { exact: true }).fill('2');
  await dlg.getByLabel('Mostrar zeros à direita').check();
  await dlg.getByRole('button', { name: 'OK' }).click();
  await expect(dlg).toHaveCount(0);
  const cfg = await fcfgConfig(page);
  expect(cfg).toContain('casas_decimais: 2');
  expect(cfg).toContain('zeros_a_direita: true');
  expect(cfg).toContain('separador_decimal: ","'); // o resto da config fica
  expect(cfg).toContain('# Configuração do Prisma');
  await dev(page).newDoc('folha');
  await expect.poll(() => dev(page).text()).toContain('exibicao: {casas: 2, modo: decimais, zeros_a_direita: true, limite_exponencial: 5}');
  await page.evaluate((i) => (window as unknown as { prismaDev: { state(): { activate(i: string): void } } }).prismaDev.state().activate(i), id);
  await expect.poll(() => resultTexts(page)).toEqual(['12345,678m', '0,3333']); // a folha antiga, sem exibicao, segue com o padrão do SMath
});

test('[FCFG-12] botão direito num resultado: formato só daquela região; "Usar o do documento" desfaz', async ({ page }) => {
  await fcfgOpen(page);
  const box = (await page.locator('[data-region="r"]').boundingBox())!;
  await page.mouse.click(box.x + 1, box.y + 1, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Formato do resultado...' }).click();
  const dlg = page.getByRole('dialog', { name: 'Formato do resultado' });
  await dlg.getByLabel('Casas decimais', { exact: true }).fill('2');
  await dlg.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => dev(page).text()).toContain('```calc {#r x=40 y=80 casas=2 modo=decimais zeros_a_direita=nao notacao=automatica}');
  expect(await dev(page).text()).toContain('```calc {#q x=40 y=200}');
  await expect.poll(() => resultTexts(page)).toEqual(['12345,68m', '0,3333']);
  await page.mouse.click(box.x + 1, box.y + 1, { button: 'right' });
  await page.getByRole('menuitem', { name: 'Formato do resultado...' }).click();
  await page.getByRole('dialog', { name: 'Formato do resultado' }).getByRole('button', { name: 'Usar o do documento' }).click();
  await expect.poll(() => dev(page).text()).toContain('```calc {#r x=40 y=80}');
  await expect.poll(() => resultTexts(page)).toEqual(['12345,678m', '0,3333']);
});
