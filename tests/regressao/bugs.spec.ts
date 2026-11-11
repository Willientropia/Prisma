// Regressão: cada bug corrigido ganha um teste que falhava antes da correção (CLAUDE.md, ADENDO 03 C7).
import { expect, test } from '../e2e/fixtures';
import { CALC, DOCS, dev, focusField, resultTexts, start, tabs } from '../e2e/helpers';

test('[BUG-001] Backspace numa linha vazia do caderno apaga só ela, não a linha de baixo', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  const before = await dev(page).text();
  await focusField(page, page.locator('article math-field').nth(4)); // V_mp := 400 V
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await dev(page).text()).includes('V_mp := 400 V\n\nΔV')).toBe(true);
  await page.keyboard.press('Backspace');
  await expect.poll(() => dev(page).text()).toBe(before);
});

test('[BUG-002] teclas digitadas logo depois de criar uma região na folha não se perdem', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('comprimento:1234m'); // sem intervalo entre as teclas
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('comprimento := 1234 m');
});

test('[BUG-003] o marcador de unidade troca a unidade em vez de juntar ("VmV")', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const first = page.locator('.mline').filter({ has: page.locator('.mresult-value') }).first();
  await first.hover();
  await first.locator('.unit-marker').click();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
  await page.keyboard.type('mV', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('ΔV(L, I, S) = ? mV\n');
  expect(await dev(page).text()).not.toContain('VmV');
});

test('[BUG-004] pedir resultado com "=" e sair do campo mantém o "= ?"', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  await focusField(page, page.locator('article math-field').nth(4));
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('V_mp=', { delay: 40 });
  await page.locator('article h1').first().click(); // sai do campo
  await expect.poll(() => dev(page).text()).toMatch(/V_mp := 400 V\nV_mp = \?/);
  await expect.poll(() => resultTexts(page)).toContain('400,00V');
});

test('[BUG-005] na folha, "ir <nome>" acha o arquivo da mesma pasta sem projeto aberto', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  const cmd = page.getByLabel('Comando');
  await cmd.fill('ir cabos-cc');
  await cmd.press('Enter');
  await expect(tabs(page).last()).toContainText('cabos-cc.prsm');
});

test('[BUG-011] arrastar a região da folha para a esquerda e para cima a move; a posição final nunca fica negativa', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const drag = async (dx: number, dy: number) => {
    const box = (await page.locator('[data-region="s"]').boundingBox())!;
    await page.mouse.move(box.x + 1, box.y + 1); // a moldura, fora do campo
    await page.mouse.down();
    await page.mouse.move(box.x + 1 + dx / 2, box.y + 1 + dy / 2, { steps: 4 });
    await page.mouse.move(box.x + 1 + dx, box.y + 1 + dy, { steps: 4 });
    await page.mouse.up();
  };
  await drag(-60, -40); // de x=240 y=80
  await expect.poll(() => dev(page).text()).toContain('```calc {#s x=180 y=40}');
  await drag(-400, -400); // passa da borda: trava em 0
  await expect.poll(() => dev(page).text()).toContain('```calc {#s x=0 y=0}');
});

test('[BUG-012] arrastar várias regiões selecionadas move todas e não corrompe o arquivo', async ({ page }) => {
  await start(page);
  const f = '```';
  const reg = (id: string, y: number, body: string) => `${f}calc {#${id} x=60 y=${y}}\n${body}\n${f}\n`;
  const head = '---\ntipo: folha\ntitulo: Arrasto\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n';
  const file = `${DOCS}/arrasto.prsf`;
  await dev(page).write(file, `${head}${reg('a', 60, 'a := 1')}\n${reg('b', 120, 'b := 2')}\n${reg('c', 180, 'c := 3')}`);
  await dev(page).open(file);
  const sheet = (await page.getByLabel('Folha').boundingBox())!;
  await page.mouse.move(sheet.x + 10, sheet.y + 20); // laço em volta das 3 regiões
  await page.mouse.down();
  await page.mouse.move(sheet.x + 400, sheet.y + 300, { steps: 5 });
  await page.mouse.up();
  const box = (await page.locator('[data-region="a"]').boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(box.x + 41, box.y + 21, { steps: 5 });
  await page.mouse.up();
  // x passa de 2 para 3 dígitos: a linha de abertura de cada região muda de tamanho
  const moved = (id: string, y: number, body: string) => `${f}calc {#${id} x=100 y=${y}}\n${body}\n${f}\n`;
  await expect.poll(() => dev(page).text()).toBe(`${head}${moved('a', 80, 'a := 1')}\n${moved('b', 140, 'b := 2')}\n${moved('c', 200, 'c := 3')}`);
});
