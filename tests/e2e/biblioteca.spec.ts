// Fase 4: bibliotecas (tela, testes, salvar=, extensão do usuário, de fábrica somente leitura, busca).
import { createHash } from 'node:crypto';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, DOCS, PROJ, dev, fieldValues, focusField, resultTexts, start, tabs } from './helpers';

const FACTORY = 'C:/Program Files/Prisma/bibliotecas/eletrica.prsl';
const EXT = `${DOCS}/Prisma/Bibliotecas/eletrica.usuario.prsl`;
const fence = '```';
const caderno = (salvar: string, def: string, id = 'pj') =>
  `---\ntipo: caderno\ntitulo: Perdas\nbibliotecas: [eletrica]\nversao_formato: 1\n---\n\n${fence}funcao {#${id} salvar=${salvar}}\n${def}\n${fence}\n`;
const sha = (t: string | null) => createHash('sha256').update(t ?? '').digest('hex');

async function saveToLib(page: Page, file: string, text: string) {
  await dev(page).write(file, text);
  await dev(page).open(file);
  await expect(tabs(page).last()).toContainText(file.split('/').pop()!);
  await page.getByRole('button', { name: 'Salvar na biblioteca' }).click();
}

test('[F4-05] tela de biblioteca: assinatura, fórmula renderizada, parâmetros, uso e testes', async ({ page }) => {
  await start(page);
  await dev(page).open(FACTORY);
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

test('[F4-04] os testes de eletrica rodam e passam na tela da biblioteca', async ({ page }) => {
  await start(page);
  await dev(page).open(FACTORY);
  await expect(page.locator('main [class*="testsRow"]').first()).toContainText('aprovado');
  await expect(page.locator('footer')).toContainText('Testes: 1 de 1 aprovados');
  await page.getByRole('button', { name: 'Testar' }).click();
  await expect(page.locator('footer')).toContainText('Testes: 1 de 1 aprovados');
});

test('[F4-02] [F4-02a] salvar=eletrica cria a extensão em Documentos e não toca no arquivo de fábrica', async ({ page }) => {
  await start(page);
  const before = sha(await dev(page).read(FACTORY));
  expect(await dev(page).read(EXT)).toBeNull();
  await saveToLib(page, `${DOCS}/perdas.prsm`, caderno('eletrica', 'P_perda(I, R) := 2*I^2*R'));
  await expect(page.locator('footer')).toContainText('1 nova(s)');
  const ext = (await dev(page).read(EXT))!;
  expect(ext).toMatch(/^---\ntipo: biblioteca\nnome: Elétrica \(minhas funções\)\nid: eletrica\.usuario\nestende: eletrica\nversao: 0\.1\nversao_formato: 1\n---\n/);
  expect(ext).toContain('## P_perda(I, R)\n\n```funcao {#pj}\nP_perda(I, R) := 2*I^2*R\n```\n\n- **Origem:** [[perdas#pj]]\n');
  expect(sha(await dev(page).read(FACTORY))).toBe(before);
  // de novo, igual: não faz nada
  await page.getByRole('button', { name: 'Salvar na biblioteca' }).click();
  await expect(page.locator('footer')).toContainText('0 nova(s), 0 substituída(s), 1 sem mudança');
});

test('[F4-02b] [F4-03] a função salva aparece na biblioteca eletrica e funciona numa folha sem import extra', async ({ page }) => {
  await start(page);
  await saveToLib(page, `${DOCS}/perdas.prsm`, caderno('eletrica', 'P_perda(I, R) := 2*I^2*R'));
  await expect(page.locator('footer')).toContainText('1 nova(s)');
  await dev(page).open(FACTORY);
  const row = page.locator('aside').first().getByRole('button', { name: /P_perda\(I, R\)/ });
  await expect(row).toContainText('minhas funções');
  await row.click();
  await expect(page.locator('main h2')).toHaveText('P_perda(I, R)');
  await dev(page).write(`${DOCS}/perdas.prsf`, `---\ntipo: folha\ntitulo: Perdas\nbibliotecas: [eletrica]\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n${fence}calc {#p x=40 y=40}\nP_perda(10 A, 2 Ω) = ? W\n${fence}\n`);
  await dev(page).open(`${DOCS}/perdas.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['400W']);
});

test('[F4-02c] função com o nome de uma de fábrica: vale a da extensão; sem a extensão volta a de fábrica', async ({ page }) => {
  await start(page);
  await dev(page).write(EXT, `---\ntipo: biblioteca\nnome: Elétrica (minhas funções)\nid: eletrica.usuario\nestende: eletrica\nversao: 0.1\nversao_formato: 1\n---\n\n## ΔV(L, I, S)\n\n${fence}funcao {#dv}\nΔV(L, I, S) := 4*ρ_cu*L*I/S\n${fence}\n`);
  // caderno que usa o ΔV só da biblioteca (o cabos-cc define o próprio, que vence a da biblioteca)
  const usa = `${DOCS}/usa-dv.prsm`;
  await dev(page).write(usa, `---\ntipo: caderno\ntitulo: Usa ΔV\nbibliotecas: [eletrica]\nversao_formato: 1\n---\n\n${fence}calc {#c}\nΔV(25 m, 12 A, 6 mm^2) = ? V\n${fence}\n`);
  await dev(page).open(usa);
  await expect.poll(() => resultTexts(page)).toEqual(['3,58V']);
  await dev(page).open(FACTORY);
  const left = page.locator('aside').first();
  await expect(left.getByRole('button').nth(0)).toContainText('substitui a de fábrica');
  await expect(left.getByRole('button').nth(1)).toContainText('de fábrica, substituída'); // a de fábrica continua acessível, abaixo
  await expect(page.locator('footer')).not.toContainText('Também existe'); // mescla não é id repetido
  await dev(page).remove(EXT);
  await tabs(page).filter({ hasText: 'usa-dv.prsm' }).click();
  await page.getByRole('button', { name: 'Calcular tudo' }).click();
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V']);
});

test('[F4-02e] salvar=<id inexistente> abre o diálogo de criação; com projeto aberto oferece o projeto', async ({ page }) => {
  await start(page);
  await saveToLib(page, `${DOCS}/bomba.prsm`, caderno('hidraulica', 'H(Q) := 2*Q'));
  const dlg = page.getByRole('alertdialog', { name: 'Salvar na biblioteca' });
  await expect(dlg).toContainText('A biblioteca hidraulica não existe. Criar em:');
  expect(await dlg.getByRole('button').allInnerTexts()).toEqual(['Documentos', 'Cancelar']);
  await dlg.getByRole('button', { name: 'Documentos' }).click();
  expect(await dev(page).read(`${DOCS}/Prisma/Bibliotecas/hidraulica.prsl`)).toMatch(/^---\ntipo: biblioteca\nnome: hidraulica\nid: hidraulica\nversao: 0\.1\n/);
  // com projeto aberto, "Projeto atual" aparece primeiro
  await dev(page).open(`${PROJ}/usina-boa-vista.prsp`);
  await saveToLib(page, `${DOCS}/vento.prsm`, caderno('eolica', 'Pv(v) := v^3'));
  const dlg2 = page.getByRole('alertdialog', { name: 'Salvar na biblioteca' });
  expect(await dlg2.getByRole('button').allInnerTexts()).toEqual(['Projeto atual', 'Documentos', 'Cancelar']);
  await dlg2.getByRole('button', { name: 'Projeto atual' }).click();
  await expect.poll(() => dev(page).read(`${PROJ}/bibliotecas/eolica.prsl`)).toContain('Pv(v) := v^3');
  await expect.poll(() => dev(page).read(`${PROJ}/usina-boa-vista.prsp`)).toContain('bibliotecas/eolica.prsl');
});

test('[F4-02f] redefinir com fórmula diferente abre a comparação; Substituir sobe a versão e atualiza a Origem', async ({ page }) => {
  await start(page);
  await saveToLib(page, `${DOCS}/perdas.prsm`, caderno('eletrica', 'P_perda(I, R) := 2*I^2*R'));
  await expect(page.locator('footer')).toContainText('1 nova(s)');
  await saveToLib(page, `${DOCS}/perdas-novo.prsm`, caderno('eletrica', 'P_perda(I, R) := 3*I^2*R', 'pn'));
  const dlg = page.getByRole('alertdialog', { name: 'Função já existe na biblioteca' });
  await expect(dlg).toContainText('Na biblioteca');
  await expect(dlg).toContainText('No caderno');
  await expect(dlg).not.toContainText(':=');
  expect(await dlg.getByRole('button').allInnerTexts()).toEqual(['Substituir', 'Manter a antiga', 'Cancelar']);
  await dlg.getByRole('button', { name: 'Substituir' }).click();
  await expect.poll(() => dev(page).read(EXT)).toContain('versao: 0.2\n');
  const ext = (await dev(page).read(EXT))!;
  expect(ext).toContain('P_perda(I, R) := 3*I^2*R');
  expect(ext).not.toContain('2*I^2*R');
  expect(ext).toContain('- **Origem:** [[perdas-novo#pn]]');
});

test('[F4-07b] [F4-07c] Ctrl+S no arquivo de fábrica não grava e abre "Salvar como" em Documentos', async ({ page }) => {
  await start(page);
  const MODEL = 'C:/Program Files/Prisma/modelos/dimensionamento-fv.prst';
  for (const [file, dir] of [[FACTORY, `${DOCS}/Prisma/Bibliotecas`], [MODEL, `${DOCS}/Prisma/Modelos`]]) {
    const before = sha(await dev(page).read(file));
    await dev(page).open(file);
    await dev(page).answer(null); // cancela o "Salvar como"
    await page.keyboard.press('Control+s');
    await expect(page.locator('footer')).toContainText('Arquivo de fábrica é somente leitura. Salve uma cópia.');
    const dlg = (await dev(page).dialogs()).filter((d) => d.kind === 'save').at(-1)!;
    expect(dlg.options.defaultPath).toBe(`${dir}/${file.split('/').pop()}`);
    expect(sha(await dev(page).read(file))).toBe(before);
  }
  // escolhendo um lugar, a cópia é gravada e a aba passa a ser a cópia, editável
  await dev(page).open(FACTORY);
  await dev(page).answer(`${DOCS}/Prisma/Bibliotecas/minha-eletrica.prsl`);
  await page.keyboard.press('Control+s');
  const copy = tabs(page).filter({ hasText: 'minha-eletrica.prsl' });
  await expect(copy).toHaveAttribute('aria-selected', 'true');
  await expect(copy).not.toContainText('somente leitura');
  expect(await dev(page).read(`${DOCS}/Prisma/Bibliotecas/minha-eletrica.prsl`)).toBe(await dev(page).read(FACTORY));
});

test('[F4-08] função do caderno diferente da biblioteca: aviso no rótulo; clicar salva e o aviso some', async ({ page }) => {
  await start(page);
  await saveToLib(page, `${DOCS}/perdas.prsm`, caderno('eletrica', 'P_perda(I, R) := 2*I^2*R'));
  const article = page.locator('article');
  await expect(article).toContainText('FUNÇÃO · ELETRICA');
  await expect(article).not.toContainText('ALTERADA');
  // edita a fórmula no caderno: o rótulo avisa
  await dev(page).write(`${DOCS}/perdas.prsm`, caderno('eletrica', 'P_perda(I, R) := 3*I^2*R'));
  const warn = article.getByRole('button', { name: 'FUNÇÃO · ELETRICA · ALTERADA, NÃO SALVA NA BIBLIOTECA' });
  await expect(warn).toBeVisible();
  // clicar no rótulo salva (Substituir na comparação) e o aviso some
  await warn.click();
  await page.getByRole('alertdialog', { name: 'Função já existe na biblioteca' }).getByRole('button', { name: 'Substituir' }).click();
  await expect(warn).toHaveCount(0);
  await expect(article).toContainText('FUNÇÃO · ELETRICA');
  expect(await dev(page).read(EXT)).toContain('P_perda(I, R) := 3*I^2*R');
});

test('[F4-07] [F4-07a] biblioteca de fábrica: somente leitura, com cadeado, e botões de alteração desabilitados', async ({ page }) => {
  await start(page);
  await dev(page).open(FACTORY);
  const label = page.locator('main').getByText('fábrica · somente leitura');
  await expect(label).toBeVisible();
  expect(await label.locator('path').getAttribute('d')).toBe('M6 11h12v10H6zM8 11V7a4 4 0 018 0v4');
  const hint = 'Biblioteca de fábrica. Suas funções vão para a extensão em Documentos';
  for (const [tab, name] of [['Início', 'Nova função'], ['Início', 'Importar'], ['Saída', 'Publicar versão']]) {
    await page.locator('[aria-label="Guias da faixa de opções"]').getByRole('tab', { name: tab, exact: true }).click();
    const b = page.getByRole('button', { name, exact: true });
    await expect(b).toBeDisabled();
    await expect(b).toHaveAttribute('title', hint);
  }
  await page.keyboard.press('Control+s');
  await expect(page.locator('footer')).toContainText('somente leitura');
  // no caderno, o painel Bibliotecas em uso mostra o mesmo rótulo
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  const inUse = page.locator('aside').first().getByText(/fábrica · somente leitura/);
  await expect(inUse).toBeVisible();
  expect(await inUse.locator('path').getAttribute('d')).toBe('M6 11h12v10H6zM8 11V7a4 4 0 018 0v4');
});

test('[F4-06] Ctrl+K e "Inserir função" buscam funções das bibliotecas e inserem a escolhida', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,4475%']);
  await page.getByRole('button', { name: 'Inserir função' }).click();
  const dlg = page.getByRole('dialog', { name: 'Inserir função' });
  await expect(dlg.getByRole('option')).toContainText(['Elétrica']);
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  // num campo: Ctrl+K, busca pela descrição, Enter insere a chamada
  await focusField(page, page.locator('article math-field').nth(4)); // V_mp := 400 V
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+k');
  await expect(dlg).toBeVisible();
  await page.keyboard.type('queda de tensao', { delay: 20 });
  await expect(dlg.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(dlg).toHaveCount(0);
  await expect.poll(async () => (await fieldValues(page)).some((v) => v.includes('\\Delta') && v.includes('V(L'))).toBe(true);
});
