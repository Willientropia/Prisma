// Fase 4 (o que já existe da tela de biblioteca).
import { expect, test } from './fixtures';
import { dev, start } from './helpers';

test('[F4-05] tela de biblioteca: assinatura, fórmula renderizada, parâmetros, uso e testes', async ({ page }) => {
  await start(page);
  await dev(page).open('C:/Program Files/Prisma/bibliotecas/eletrica.prsl');
  const main = page.locator('main');
  await expect(main.locator('h2')).toHaveText('ΔV(L, I, S)');
  await expect(main.locator('.mmarkup').first()).toBeVisible(); // fórmula como matemática
  await expect(main).not.toContainText(':=');
  await expect(main).toContainText('L comprimento do trecho [m]');
  await expect(main).toContainText('circuito CC de ida e volta');
  await expect(main).toContainText(/TESTES DA FUNÇÃO/i);
  const meta = page.locator('aside').nth(1);
  for (const t of [/Biblioteca\s*Elétrica/, /Versão\s*1\.4/, /Retorna\s*V/, /Fonte\s*Lei de Ohm/]) await expect(meta).toContainText(t);
});
