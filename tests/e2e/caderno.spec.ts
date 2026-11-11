// Fase 2: caderno, motor no worker, painéis Estrutura e Propriedades.
import { expect, test } from './fixtures';
import { CALC, DOCS, dev, resultTexts, start } from './helpers';

test('[F2-07] [F4-01] cabos-cc mostra 1,79 V, 0,45 % e APROVADO (biblioteca Elétrica de fábrica)', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,4475%']);
  await expect(page.locator('article')).toContainText('APROVADO · limite 1 %');
  await expect(page.locator('aside').first()).toContainText(/Elétrica\s*v1\.4 · fábrica/);
});

test('[F2-11] avaliação que passa de 2 s é interrompida e o erro aparece na linha, sem travar a interface', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/lento.prsm`, '---\ntipo: caderno\ntitulo: Lento\nversao_formato: 1\n---\n\n```calc {#c}\na := 2 m\n' + Array(30).fill('sum(1:10000000)').join(' + ') + ' = ?\n```\n');
  await dev(page).open(`${DOCS}/lento.prsm`);
  await expect(page.locator('article .mline-error')).toHaveAttribute('title', /Tempo esgotado/, { timeout: 8000 });
  await expect(page.getByRole('tab', { name: 'Exibir', exact: true })).toBeEnabled(); // interface respondendo
});

test('[F2-12] [F2-13] Estrutura lista os blocos com selo; clicar seleciona e mostra as propriedades', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  const tree = page.locator('aside').first();
  expect((await tree.locator('button').allInnerTexts()).slice(0, 7).map((t) => t.split('\n')[0])).toEqual(['TIT', 'TXT', 'FUN', 'TXT', 'CAL', 'VER', 'TXT']);
  await tree.locator('button').filter({ hasText: 'trecho' }).click();
  const props = page.locator('aside').nth(1);
  await expect(props).toContainText('CAL');
  await expect(props).toContainText(/Tipo\s*Cálculo/);
  await expect(props).toContainText(/Id\s*#trecho/);
  await expect(props).toContainText(/Resultados\s*2/);
});

test('[V-07] página do caderno branca e bloco de função com --paper-accent', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  const color = (v: string) => page.evaluate((v) => { const s = document.createElement('i'); s.style.color = `var(${v})`; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; }, v);
  expect(await page.locator('article').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');
  const fn = page.locator('article [class*="fnBlock"]').first();
  expect(await fn.evaluate((e) => getComputedStyle(e).borderTopColor)).toBe(await color('--paper-accent'));
});

test('[F3-10] [F3-12] atributo atencao= no bloco verificar muda o selo; texto "<ESTADO> · limite <limite>"', async ({ page }) => {
  await start(page);
  const fence = '```';
  const doc = (attr: string) => `---\ntipo: caderno\ntitulo: Selo\nversao_formato: 1\n---\n\n${fence}verificar {#v${attr}}\n0.85 < 1\n${fence}\n`;
  await dev(page).write(`${DOCS}/selo-a.prsm`, doc(''));
  await dev(page).open(`${DOCS}/selo-a.prsm`);
  await expect(page.locator('article')).toContainText('ATENÇÃO · limite 1'); // margem padrão de 20 %
  await dev(page).write(`${DOCS}/selo-b.prsm`, doc(' atencao=10%'));
  await dev(page).open(`${DOCS}/selo-b.prsm`);
  await expect(page.locator('article')).toContainText('APROVADO · limite 1');
  await expect(page.locator('article')).not.toContainText('ATENÇÃO');
});
