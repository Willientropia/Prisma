// ADENDO 02: edição matemática visual (critérios B10 e B7).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC as P, armTimer, dev, fieldValues, focusField, resultTexts, start, timerMs } from './helpers';

/** Folha nova; clica num ponto vazio da grade e digita (cria a região ali, como no SMath). */
async function typeInNewSheet(page: Page, keys: string, at = { x: 100, y: 100 }) {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: at });
  await page.keyboard.type(keys, { delay: 40 });
}

test(`[B10-01] S:4'mm^2 Enter vira S ≔ 4 mm² (mm² em azul) e o arquivo grava S := 4 mm^2`, async ({ page }) => {
  await typeInNewSheet(page, "S:4'mm^2");
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('S := 4 mm^2');
  // forma canônica na tela (o MathLive pode guardar ^2 ou ^{2})
  expect((await fieldValues(page))[0]).toMatch(/^S\\;\\coloneq\\;4\\,\\class\{u\}\{\\mathrm\{mm\}\^\{?2\}?\}$/);
  const unit = await page.evaluate(() => {
    const u = document.querySelector('math-field')!.shadowRoot!.querySelector('.u') as HTMLElement;
    return { text: u.textContent, color: getComputedStyle(u).color };
  });
  expect(unit.text).toBe('mm2');
  expect(unit.color).toBe('rgb(143, 180, 255)'); // --math-unit
});

test(`[B10-02] V_mp:400'V vira V com índice reto mp; arquivo V_mp := 400 V`, async ({ page }) => {
  await typeInNewSheet(page, "V_mp:400'V");
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('V_mp := 400 V');
  expect((await fieldValues(page))[0]).toContain('V_{\\mathrm{mp}}');
});

test('[B10-03] (a+b)/2 vira fração com a+b em cima, sem parênteses', async ({ page }) => {
  await typeInNewSheet(page, '(a+b)/2');
  const live = (await fieldValues(page))[0];
  expect(live).toContain('\\frac{');
  expect(live).not.toContain('\\left(');
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('(a + b)/2');
});

test('[B10-04] r Ctrl+G vira ρ', async ({ page }) => {
  await typeInNewSheet(page, 'r');
  await page.keyboard.press('Control+g');
  await expect.poll(async () => (await fieldValues(page))[0]).toContain('\\rho');
});

test(`[B10-05] I:11,5'A mostra I ≔ 11,5 A e grava I := 11.5 A`, async ({ page }) => {
  await typeInNewSheet(page, "I:11,5'A");
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('I := 11.5 A');
  const shown = await page.evaluate(() => document.querySelector('math-field')!.shadowRoot!.textContent ?? '');
  expect(shown).toContain('11,5');
});

test('[B10-06] string-3 sem clicar em nada: 3,29 V, 0,82 % e o gráfico com 4 seções e linha de limite', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const fig = page.locator('figure');
  await expect(fig.locator('canvas')).toHaveCount(1);
  await expect(fig).toHaveAttribute('aria-label', /2,50: 1,32; 4,00: 0,82; 6,00: 0,55; 10,00: 0,33/);
  await expect(fig).toContainText('limite 1 %');
});

test('[B10-07] mudar S de 4 para 6 atualiza para 2,20 V e 0,55 % logo depois da última tecla', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  await focusField(page, page.locator('[data-region="s"] math-field'));
  await page.keyboard.press('Control+a');
  await armTimer(page, ['2,20V', '0,55%']);
  await page.keyboard.type("S:6'mm^2", { delay: 30 });
  await expect.poll(() => resultTexts(page)).toEqual(['2,20V', '0,55%']);
  const ms = (await timerMs(page))!; // medido dentro da página, da última tecla ao resultado novo
  console.log(`B10-07: resultado novo ${ms.toFixed(0)} ms depois da última tecla`);
  expect(ms).toBeLessThanOrEqual(150);
});

test('[B10-08] marcador de unidade + mV converte para mV e grava = ? mV', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const first = page.locator('.mline').filter({ has: page.locator('.mresult-value') }).first();
  await first.hover();
  await first.locator('.unit-marker').click();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
  await page.keyboard.type('mV', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('ΔV(L, I, S) = ? mV');
  await expect.poll(() => resultTexts(page)).toEqual(['3293,60mV', '0,82%']);
});

test('[B10-09] nenhum ":=", "^", "?" ou "_" na tela (caderno e folha)', async ({ page }) => {
  await start(page);
  for (const f of [`${P}/cabos-cc.prsm`, `${P}/string-3.prsf`]) {
    await dev(page).open(f);
    await expect.poll(() => page.locator('.mresult-value').count()).toBeGreaterThan(0);
    const visible = await page.evaluate(() => {
      // texto da área central (fora o texto livre do usuário) + o que os campos MathLive desenham
      const main = document.querySelector('main')!.cloneNode(true) as HTMLElement;
      main.querySelectorAll('.prose-editor, input').forEach((e) => e.remove());
      const fields = [...document.querySelectorAll('main math-field')].map((m) => (m.shadowRoot?.querySelector('.ML__latex') as HTMLElement | null)?.innerText ?? '');
      const panels = [...document.querySelectorAll('aside')].map((a) => (a as HTMLElement).innerText);
      return [main.innerText, ...fields, ...panels].join('\n');
    });
    for (const bad of [':=', '^', '?', '_']) expect(visible, `${f} mostra "${bad}"`).not.toContain(bad);
  }
});

test('[B10-11] clicar numa expressão e sair sem editar não muda nenhum pixel', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  const region = page.locator('[data-region="entradas"]');
  await page.mouse.move(5, 5);
  const before = await region.screenshot();
  await region.locator('math-field').first().click();
  await page.keyboard.press('Escape');
  await page.getByLabel('Folha').click({ position: { x: 900, y: 1000 } });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  const after = await region.screenshot();
  expect(after.equals(before)).toBe(true);
});

test('[B7-01] no caderno, Enter cria a próxima linha; Backspace numa linha vazia apaga e volta', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  const before = await dev(page).text();
  const lastInput = page.locator('article math-field').nth(4); // V_mp := 400 V
  await focusField(page, lastInput);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await dev(page).text()).includes('V_mp := 400 V\n\nΔV')).toBe(true);
  await page.keyboard.type('k:2', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('V_mp := 400 V\nk := 2\n');
  // a linha nova criada pelo Enter está vazia: Backspace apaga e volta para "k := 2"
  await page.keyboard.press('Backspace');
  await expect.poll(() => dev(page).text()).toBe(before.replace('V_mp := 400 V\n', 'V_mp := 400 V\nk := 2\n'));
});

test('[B7-02] texto editado formatado vira Markdown no arquivo', async ({ page }) => {
  await start(page);
  await dev(page).open(`${P}/cabos-cc.prsm`);
  const para = page.locator('.prose-editor').filter({ hasText: 'O fator 2' });
  await para.click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Home');
  await page.keyboard.press('Control+b');
  await page.keyboard.type('Nota:', { delay: 30 });
  await page.keyboard.press('Control+b');
  await page.keyboard.type(' ', { delay: 30 });
  await expect.poll(() => dev(page).text()).toContain('**Nota:** O fator 2');
  // nenhum símbolo de Markdown aparece na tela
  await expect(para).not.toContainText('**');
});
