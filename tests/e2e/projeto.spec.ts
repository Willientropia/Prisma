// ADENDO 01: projetos (A9-07 a A9-09).
import { expect, test } from './fixtures';
import { CALC, DOCS, PROJ, dev, resultTexts, start } from './helpers';

test('[A9-07] criar projeto gera .prsp e .gitignore; mover a pasta e abrir o .prsp funciona', async ({ page }) => {
  await start(page);
  await dev(page).answer(`${DOCS}/Prisma/Usina Nova.prsp`);
  await page.locator('section[aria-label="Novo"] button').filter({ hasText: 'Projeto' }).first().click();
  await expect(page.locator('section[aria-label="Projeto"]')).toContainText('Projeto: Usina Nova');
  expect(await dev(page).read(`${DOCS}/Prisma/Usina Nova/usina-nova.prsp`)).toMatch(/^---\ntipo: projeto\nnome: "Usina Nova"\n/);
  expect(await dev(page).read(`${DOCS}/Prisma/Usina Nova/.gitignore`)).toBe('.prisma-cache/\n');

  // projeto portátil: move a pasta inteira para outro disco e abre de lá
  await dev(page).moveDir(PROJ, 'D:/Arquivo/Usina Boa Vista');
  await dev(page).open('D:/Arquivo/Usina Boa Vista/usina-boa-vista.prsp');
  const panel = page.locator('section[aria-label="Projeto"]');
  await expect(panel).toContainText('Projeto: Usina Boa Vista');
  await expect(panel).not.toContainText('não encontrado');
  await panel.getByRole('button', { name: /cabos-cc\.prsm/ }).dblclick();
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,45%']);
});

test('[A9-08] arquivo listado no .prsp e apagado do disco aparece como "não encontrado"', async ({ page }) => {
  await start(page);
  await dev(page).open(`${PROJ}/usina-boa-vista.prsp`);
  await dev(page).remove(`${CALC}/string-3.prsf`);
  await dev(page).open(`${PROJ}/usina-boa-vista.prsp`); // relê o projeto
  await expect(page.locator('section[aria-label="Projeto"] button').filter({ hasText: 'string-3.prsf' })).toContainText('não encontrado');
});

test('[A9-09] tela inicial sem "cofre"; recentes incluem projetos e marcam arquivos que sumiram', async ({ page }) => {
  await start(page);
  await expect(page.locator('body')).not.toContainText(/cofre/i);
  await dev(page).open(`${PROJ}/usina-boa-vista.prsp`);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await dev(page).remove(`${CALC}/string-3.prsf`);
  await page.locator('[aria-label="Documentos abertos"] [role="tab"]').first().click();
  const recents = page.locator('section[aria-label="Recentes"]');
  await expect(recents.locator('button').filter({ hasText: 'usina-boa-vista.prsp' })).toContainText('PRJ');
  await expect(recents.locator('button').filter({ hasText: 'string-3.prsf' })).toContainText('não encontrado');
  await expect(page.locator('body')).not.toContainText(/cofre/i);
});
