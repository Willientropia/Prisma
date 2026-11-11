// ADENDO 05: a folha livre com o comportamento do SMath (digitação e avaliação).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { dev, fieldValues, resultTexts, start } from './helpers';

/** Folha nova; clica num ponto vazio da grade e digita linha a linha, cada uma terminada com Enter. */
async function sheet(page: Page, ...linhas: string[]) {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  for (const l of linhas) { await page.keyboard.type(l, { delay: 30 }); await page.keyboard.press('Enter'); }
}
/** Linhas de cálculo da folha, na ordem do arquivo, sem as cercas das regiões (cada Enter cria a próxima região). */
const body = async (page: Page) => (await dev(page).text()).split('---\n').slice(2).join('---\n')
  .split('\n').filter((l) => l && !l.startsWith('```')).map((l) => `${l}\n`).join('');

test('[E8-01] [E8-02] [E8-03] x=2, s,tensao=10*x e s,tensao= como no SMath', async ({ page }) => {
  await sheet(page, 'x=2', 's,tensao=10*x', 's,tensao=');
  await expect.poll(() => body(page)).toContain('x := 2\ns_tensao := 10*x\ns_tensao = ?\n');
  const shown = await fieldValues(page);
  expect(shown[0]).toMatch(/^x\\;\\coloneq\\;2$/);
  expect(shown[1]).toContain('s_{\\mathrm{tensao}}');
  expect(shown[1]).toContain('\\coloneq');
  await expect.poll(() => resultTexts(page)).toEqual(['20']);
});

test('[E8-04] editar x para 3 atualiza s_tensao para 30 sem clique', async ({ page }) => {
  await sheet(page, 'x=2', 's,tensao=10*x', 's,tensao=');
  await expect.poll(() => resultTexts(page)).toEqual(['20']);
  const fields = page.locator('[data-region] math-field');
  await fields.first().click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('MATH-FIELD');
  await page.keyboard.press('End');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('3', { delay: 30 });
  await expect.poll(() => resultTexts(page)).toEqual(['30']);
});

test('[E8-07] s= sem x definido mostra 10·x, sem erro, com x sublinhado', async ({ page }) => {
  await sheet(page, 's=10*x', 's=');
  await expect.poll(() => body(page)).toContain('s := 10*x\ns = ?\n');
  const r = page.locator('.mresult-symbolic');
  await expect(r).toBeVisible();
  await expect(page.locator('.mline-error')).toHaveCount(0);
  expect(await r.locator('.undef').count()).toBeGreaterThan(0);
  await expect(r.locator('xpath=..')).toHaveAttribute('title', 'x ainda não foi definido');
});

test('[E8-08] x= com x definido: o que se digita depois vai para o marcador de conversão', async ({ page }) => {
  await sheet(page, 'x=2');
  await page.keyboard.type('x=5', { delay: 30 });
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
  await expect.poll(() => body(page)).toContain('x := 2\nx = ?');
  const unit = await page.evaluate(() => (document.activeElement as unknown as { value: string }).value);
  expect(unit).toBe('5');
});

test('[E8-09] x:3 redefine x mesmo já definido', async ({ page }) => {
  await sheet(page, 'x=2', 'x:3', 'x=');
  await expect.poll(() => body(page)).toContain('x := 2\nx := 3\nx = ?\n');
  await expect.poll(() => resultTexts(page)).toEqual(['3']);
});

test(`[E8-10] S.trafo:5'kV*'A vira S com índice trafo e grava S_trafo := 5 kV*A`, async ({ page }) => {
  await sheet(page, "S.trafo:5'kV*'A");
  await expect.poll(() => body(page)).toContain('S_trafo := 5 kV*A\n');
  expect((await fieldValues(page))[0]).toContain('S_{\\mathrm{trafo}}');
});

test('[E8-11] Z,0=sqrt(L/C)= com L e C definidos mostra a definição e o resultado', async ({ page }) => {
  await sheet(page, 'L=1,5*10^-3', 'C=0,01*10^-6', 'Z,0=sqrt(L/C)=');
  await expect.poll(() => body(page)).toContain('Z_0 := sqrt(L/C) = ?');
  await expect.poll(() => resultTexts(page)).toEqual(['387,2983']);
});

test('[E8-12] f(a;b)=a+b define a função e f(2;3)= dá 5', async ({ page }) => {
  await sheet(page, 'f(a;b)=a+b', 'f(2;3)=');
  await expect.poll(() => body(page)).toContain('f(a, b) := a + b\nf(2, 3) = ?\n');
  await expect.poll(() => resultTexts(page)).toEqual(['5']);
});

// --- item 2: complexos, formato do SMath e conversão por expressão ---
const fence = '```';
const smathSheet = (rows: string[]) =>
  `---\ntipo: folha\ntitulo: SMath\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nexibicao: {casas: 4, modo: significativos, zeros_a_direita: false, limite_exponencial: 3}\nversao_formato: 1\n---\n\n` +
  rows.map((r, k) => `${fence}calc {#r${k} x=40 y=${40 + k * 60}}\n${r}\n${fence}\n`).join('\n');
async function openSheet(page: Page, rows: string[]) {
  await start(page);
  await dev(page).write('C:/Users/voce/Documents/smath.prsf', smathSheet(rows));
  await dev(page).open('C:/Users/voce/Documents/smath.prsf');
}
const shownLatex = (page: Page) => page.locator('.mresult-value').evaluateAll((els) => els.map((e) => e.innerHTML));

test('[E8-14] complexo: z := (0,11 + i·0,5655)·100 mostra 11 + 56,55·i, com i em negrito reto', async ({ page }) => {
  await openSheet(page, ['z := (0.11 + i*0.5655)*100', 'z = ?']);
  await expect.poll(() => resultTexts(page)).toEqual(['11+56,55⋅i']);
  const html = (await shownLatex(page))[0];
  expect(html).toContain('ML__mathbf'); // i em negrito reto
});

test('[E8-15] arg(z) com o marcador em deg mostra o ângulo em graus', async ({ page }) => {
  await openSheet(page, ['z := (0.11 + i*0.5655)*100', 'arg(z) = ?']);
  await expect.poll(() => resultTexts(page)).toEqual(['1,379']);
  const marker = page.locator('.mline').filter({ has: page.locator('.mresult-value') }).first();
  await marker.hover();
  await marker.locator('.unit-marker').click();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
  await page.keyboard.type('deg', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('arg(z) = ? deg');
  await expect.poll(() => resultTexts(page)).toEqual(['78,99deg']);
});

test('[E8-18] notação científica na tela: 1,475·10⁻³, nunca "e-3"', async ({ page }) => {
  await openSheet(page, ['g := 0.0014752', 'g = ?']);
  await expect.poll(() => resultTexts(page)).toEqual(['1,475⋅10−3']);
  expect((await resultTexts(page))[0]).not.toContain('e');
});

test('[E8-19] o marcador aceita expressão: 10^-6', async ({ page }) => {
  await openSheet(page, ['Y := (0.2 + 3.77*i)*10^-6', 'Y = ?']);
  const marker = page.locator('.mline').filter({ has: page.locator('.mresult-value') }).first();
  await expect(marker).toBeVisible();
  await marker.hover();
  await marker.locator('.unit-marker').click();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
  await page.keyboard.type('10^-6', { delay: 40 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('Y = ? 10^(-6)');
  await expect.poll(() => resultTexts(page)).toEqual(['(0,2+3,77⋅i)⋅10−6']);
});

// --- item 3: desativar, moldura, descrição e áreas ---
const sheetText = (body: string) => `---\ntipo: folha\ntitulo: Item 3\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n${body}`;
const F = 'C:/Users/voce/Documents/item3.prsf';

test('[E8-16] região desativada não define nada; o menu de contexto liga e desliga', async ({ page }) => {
  await start(page);
  await dev(page).write(F, sheetText(`${fence}calc {#a x=40 y=40}\nx := 2\n${fence}\n\n${fence}calc {#b x=40 y=100}\nx := 5\n${fence}\n\n${fence}calc {#c x=40 y=160}\nx = ?\n${fence}\n`));
  await dev(page).open(F);
  await expect.poll(() => resultTexts(page)).toEqual(['5']);
  await page.locator('[data-region="b"]').click({ button: 'right', position: { x: 2, y: 2 } });
  await page.getByRole('menuitem', { name: 'Desativar avaliação' }).click();
  await expect.poll(() => dev(page).text()).toContain('```calc {#b x=40 y=100 desativado}');
  await expect.poll(() => resultTexts(page)).toEqual(['2']); // a região desativada não define x
  expect(await page.locator('[data-region="b"]').evaluate((e) => getComputedStyle(e).opacity)).toBe('0.45');
  await page.locator('[data-region="b"]').click({ button: 'right', position: { x: 2, y: 2 } });
  await page.getByRole('menuitem', { name: 'Ativar avaliação' }).click();
  await expect.poll(() => resultTexts(page)).toEqual(['5']);
});

test('[E8-30] moldura e descrição da região', async ({ page }) => {
  await start(page);
  await dev(page).write(F, sheetText(`${fence}calc {#a x=40 y=60 moldura descricao="Tensão de linha"}\nV := 2\n${fence}\n`));
  await dev(page).open(F);
  const r = page.locator('[data-region="a"]');
  await expect(r).toContainText('Tensão de linha');
  const muted = await page.evaluate(() => { const s = document.createElement('i'); s.style.color = 'var(--text-muted)'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  expect(await r.evaluate((e) => getComputedStyle(e).borderTopColor)).toBe(muted);
});

test('[E8-17] área recolhida: as regiões de dentro continuam valendo e as de baixo sobem', async ({ page }) => {
  await start(page);
  await dev(page).write(F, sheetText(
    `${fence}area {#rms titulo="Valores RMS" y=100 recolhida}\n${fence}\n\n${fence}calc {#dentro x=40 y=140}\ny := 3\n${fence}\n\n${fence}fim-area {#rms y=220}\n${fence}\n\n${fence}calc {#baixo x=40 y=260}\ny = ?\n${fence}\n`));
  await dev(page).open(F);
  await expect.poll(() => resultTexts(page)).toEqual(['3']); // definida dentro da área recolhida
  await expect(page.locator('[data-region="dentro"]')).toHaveCount(0);
  await expect(page.locator('[data-area="rms"]')).toContainText('Valores RMS');
  const top = () => page.locator('[data-region="baixo"]').evaluate((e) => parseFloat((e as HTMLElement).style.top));
  expect(await top()).toBe(260 - (220 - 100 - 20)); // subiu o espaço da área, menos a linha do título
  await page.getByRole('button', { name: 'Expandir área' }).click();
  await expect.poll(() => dev(page).text()).toContain('```area {#rms titulo="Valores RMS" y=100}');
  await expect(page.locator('[data-region="dentro"]')).toHaveCount(1);
  await expect.poll(top).toBe(260);
});

test('[E8-17] Inserir > Organizar > Área envolve as regiões selecionadas', async ({ page }) => {
  await start(page);
  await dev(page).write(F, sheetText(`${fence}calc {#a x=40 y=60}\nx := 2\n${fence}\n\n${fence}calc {#b x=40 y=120}\nx = ?\n${fence}\n`));
  await dev(page).open(F);
  await expect.poll(() => resultTexts(page)).toEqual(['2']);
  const box = (await page.locator('[data-region="a"]').boundingBox())!;
  await page.mouse.click(box.x + 1, box.y + 1); // clique na moldura seleciona a região
  await page.locator('[aria-label="Guias da faixa de opções"]').getByRole('tab', { name: 'Inserir', exact: true }).click();
  await page.getByRole('button', { name: 'Área', exact: true }).click();
  await expect.poll(() => dev(page).text()).toMatch(/```area \{#area-1 titulo="Área" y=40\}\n```\n\n```calc \{#a x=40 y=60\}\nx := 2\n```\n\n```fim-area \{#area-1 y=\d+\}\n```/);
  await expect(page.locator('[data-area="area-1"]')).toBeVisible();
  await expect.poll(() => resultTexts(page)).toEqual(['2']);
});

// --- item 4: abrir .sm do SMath ---
const SM = 'C:/Users/voce/Documents/smath';

test('[E8-23] abrir 08do10.sm cria 08do10.prsf ao lado, com os resultados do SMath, sem alterar o .sm', async ({ page }) => {
  await start(page);
  const before = await dev(page).read(`${SM}/08do10.sm`);
  await dev(page).open(`${SM}/08do10.sm`);
  await expect(page.locator('[aria-label="Documentos abertos"] [role="tab"]').last()).toContainText('08do10.prsf');
  await expect(page.locator('footer')).toContainText('Importado: 29 regiões');
  expect(await dev(page).read(`${SM}/08do10.sm`)).toBe(before); // o original não muda
  const prsf = (await dev(page).read(`${SM}/08do10.prsf`))!;
  expect(prsf).toMatch(/^---\ntipo: folha\n/);
  expect(prsf).toContain('exibicao: {casas: 4, modo: significativos, zeros_a_direita: false, limite_exponencial: 3}');
  expect(prsf).toContain('Z_0 := sqrt(L/C) = ?');
  await expect.poll(async () => (await resultTexts(page)).includes('387,3')).toBe(true);
  // abrir de novo pergunta antes de sobrescrever (sem esperar a abertura: ela espera a resposta do diálogo)
  await page.evaluate((p) => { void (window as unknown as { prismaDev: { open(p: string): Promise<void> } }).prismaDev.open(p); }, `${SM}/08do10.sm`);
  const dlg = page.getByRole('alertdialog', { name: 'Importar do SMath' });
  await expect(dlg).toContainText('Já existe 08do10.prsf');
  await dlg.getByRole('button', { name: 'Cancelar' }).click();
  expect(await dev(page).read(`${SM}/08do10.sm`)).toBe(before);
});

test('[E8-20] região de plugin fica no lugar, desativada, com o aviso; imagem extraída para <nome>_arquivos', async ({ page }) => {
  await start(page);
  await dev(page).open(`${SM}/Test_ExcelOUT_1.sm`);
  await expect(page.locator('footer')).toContainText('não suportadas (excel_OUT)');
  await expect(page.locator('main')).toContainText('Não suportado: excel_OUT (plugin do SMath)');
  expect(await dev(page).read(`${SM}/Test_ExcelOUT_1.prsf`)).toContain('```smath-original {#');
  await dev(page).open(`${SM}/Motor_CC.sm`);
  const img = (await dev(page).read(`${SM}/Motor_CC.prsf`))!.match(/```imagem \{[^}]*\}\n([^\n]+)\n/)![1];
  expect(img).toMatch(/^Motor_CC_arquivos\/.+\.png$/);
  expect(await dev(page).read(`${SM}/${img}`)).toMatch(/^iVBORw0KGgo/); // PNG em base64
  await expect(page.locator('main img')).toHaveCount(1);
});

test('[E8-31] vetor e matriz aparecem como matriz na tela', async ({ page }) => {
  await openSheet(page, ['M := mat(1, 2, 3, 4, 2, 2)', 'M = ?']);
  const r = page.locator('.mresult-value');
  await expect(r).toHaveCount(1);
  // o MathLive monta a matriz por colunas no DOM: [1 2; 3 4] sai como 1 3 2 4
  await expect.poll(() => r.innerText().then((t) => t.replace(/[\s​]+/g, ''))).toBe('[1324]');
  expect(await r.locator('.ML__mtable').count()).toBe(1);
});

test('[E8-28] depois do for, i continua definido com o último valor (8)', async ({ page }) => {
  await openSheet(page, ['for(i, range(1, 8), q[i] := i)', 'i = ?']);
  await expect.poll(() => resultTexts(page)).toContain('8');
});

test('[E8-29] i definido pelo laço: aviso na barra de status; 𝐢 continua imaginário', async ({ page }) => {
  await openSheet(page, ['for(i, range(1, 8), q[i] := i)', 'z := 3 + 𝐢', 'z = ?']);
  await expect(page.locator('footer')).toContainText('i agora é uma variável (vale 8). A unidade imaginária continua disponível como 𝐢 no ribbon Matemática.');
  await expect.poll(() => resultTexts(page)).toContain('3+1⋅i');
  expect((await shownLatex(page)).join('')).toContain('ML__mathbf');
});
