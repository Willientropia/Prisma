// ADENDO 01: ciclo de vida dos arquivos (A9-04 a A9-06).
import { expect, test } from './fixtures';
import { CALC, DOCS, dev, resultTexts, start, tabs } from './helpers';

test('[A9-04] Novo > Caderno cria Caderno1 sem gravar; Ctrl+S abre Salvar como com .prsm', async ({ page }) => {
  await start(page);
  const before = await dev(page).diskSize();
  await page.locator('section[aria-label="Novo"] button').filter({ hasText: 'Caderno' }).first().click();
  await expect(tabs(page).last()).toContainText('Caderno1');
  expect(await dev(page).diskSize()).toBe(before);
  await dev(page).answer(`${DOCS}/Prisma/teste-queda`);
  await page.keyboard.press('Control+s');
  await expect(tabs(page).last()).toContainText('teste-queda.prsm');
  const save = (await dev(page).dialogs()).filter((d) => d.kind === 'save').at(-1)!;
  expect(save.options.defaultPath).toBe(`${DOCS}/Prisma/Caderno1.prsm`);
  expect(save.options.filters?.[0].extensions).toEqual(['prsm']);
  expect(await dev(page).read(`${DOCS}/Prisma/teste-queda.prsm`)).toMatch(/^---\ntipo: caderno\n/);
});

const SAMPLES = [`${CALC}/cabos-cc.prsm`, `${CALC}/string-3.prsf`, 'C:/Program Files/Prisma/bibliotecas/eletrica.prsl', 'C:/Program Files/Prisma/modelos/dimensionamento-fv.prst'];
for (const file of SAMPLES) {
  test(`[A9-05] abrir e salvar sem editar devolve bytes idênticos: ${file.split('/').pop()}`, async ({ page }) => {
    await start(page);
    const before = await dev(page).read(file);
    await dev(page).open(file);
    await expect(tabs(page).last()).toContainText(file.split('/').pop()!);
    await page.keyboard.press('Control+s');
    await expect(page.locator('footer')).toContainText('Salvo');
    expect(await dev(page).read(file)).toBe(before);
  });
}

test('[A9-06] arquivo com CRLF e BOM abre normalmente e é salvo em UTF-8 sem BOM com LF', async ({ page }) => {
  await start(page);
  const file = `${DOCS}/crlf-bom.prsm`;
  const raw = (await dev(page).read(file))!;
  expect(raw.startsWith('\uFEFF') && raw.includes('\r\n')).toBe(true);
  await dev(page).open(file);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
  await page.keyboard.press('Control+s');
  await expect(page.locator('footer')).toContainText('Salvo');
  const saved = (await dev(page).read(file))!;
  expect(saved.startsWith('\uFEFF')).toBe(false);
  expect(saved.includes('\r')).toBe(false);
  expect(saved).toBe(raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
});
