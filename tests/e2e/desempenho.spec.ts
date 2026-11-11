// ADENDO 03, C7.7: orçamentos de desempenho também são testes.
import { expect, test } from './fixtures';
import { CALC, DOCS, armTimer, dev, focusField, resultTexts, start, tabs, timerMs } from './helpers';

test('[C7-01] recálculo da string-3 em até 150 ms depois da última tecla', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,29V', '0,82%']);
  await focusField(page, page.locator('[data-region="s"] math-field'));
  await page.keyboard.press('Control+a');
  await armTimer(page, ['2,20V', '0,55%']);
  await page.keyboard.type("S:6'mm^2", { delay: 30 });
  await expect.poll(() => timerMs(page)).not.toBeNull();
  const ms = (await timerMs(page))!;
  console.log(`C7-01: recálculo em ${ms.toFixed(0)} ms`);
  expect(ms).toBeLessThanOrEqual(150);
});

test('[C7-02] [BUG-006] abrir um .prsm de 1 MB em até 500 ms', async ({ page }) => {
  await start(page);
  const para = 'Memorial descritivo do trecho de cabos, com as hipóteses de cálculo e as referências normativas. '.repeat(10);
  let body = '';
  for (let i = 0; body.length < 1_000_000; i++) body += `## Seção ${i}\n\n${para}\n\n`;
  await dev(page).write(`${DOCS}/grande.prsm`, `---\ntipo: caderno\ntitulo: Grande\nversao_formato: 1\n---\n\n${body}`);
  const ms = await page.evaluate(async (p) => {
    const t0 = performance.now();
    await (window as unknown as { prismaDev: { open(p: string): Promise<void> } }).prismaDev.open(p);
    await new Promise<void>((r) => { const tick = () => (document.querySelector('article') ? r() : requestAnimationFrame(tick)); tick(); });
    return performance.now() - t0;
  }, `${DOCS}/grande.prsm`);
  await expect(tabs(page).last()).toContainText('grande.prsm');
  console.log(`C7-02: 1 MB aberto em ${ms.toFixed(0)} ms`);
  expect(ms).toBeLessThanOrEqual(500);
});
