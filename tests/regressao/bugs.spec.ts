// Regressão: cada bug corrigido ganha um teste que falhava antes da correção (CLAUDE.md, ADENDO 03 C7).
import type { Page } from '@playwright/test';
import { expect, test } from '../e2e/fixtures';
import { CALC, DOCS, dev, fieldValues, focusField, resultTexts, start, tabs } from '../e2e/helpers';

test('[BUG-001] Backspace numa linha vazia do caderno apaga só ela, não a linha de baixo', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/cabos-cc.prsm`);
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,4475%']);
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
  await page.keyboard.type("comprimento:1234'm"); // sem intervalo entre as teclas
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('comprimento := 1234 m');
});

test('[BUG-003] o marcador de unidade troca a unidade em vez de juntar ("VmV")', async ({ page }) => {
  await start(page);
  await dev(page).open(`${CALC}/string-3.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
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
  await expect.poll(() => resultTexts(page)).toEqual(['1,79V', '0,4475%']);
  await focusField(page, page.locator('article math-field').nth(4));
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('V_mp=', { delay: 40 });
  await page.locator('article h1').first().click(); // sai do campo
  await expect.poll(() => dev(page).text()).toMatch(/V_mp := 400 V\nV_mp = \?/);
  await expect.poll(() => resultTexts(page)).toContain('400V');
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
  await expect.poll(() => resultTexts(page)).toEqual(['3,2936V', '0,8234%']);
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

test('[BUG-022] arrastar várias regiões até a borda para o grupo quando a mais à esquerda e a mais alta chegam nela, sem empilhar (F-LAYOUT)', async ({ page }) => {
  await start(page);
  const f = '```';
  const head = '---\ntipo: folha\ntitulo: Borda\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n';
  const file = `${DOCS}/borda.prsf`;
  await dev(page).write(file, `${head}${f}calc {#a x=60 y=60}\na := 1\n${f}\n\n${f}calc {#b x=200 y=120}\nb := 2\n${f}\n`);
  await dev(page).open(file);
  const sheet = (await page.getByLabel('Folha').boundingBox())!;
  await page.mouse.move(sheet.x + 10, sheet.y + 20); // laço em volta das duas
  await page.mouse.down();
  await page.mouse.move(sheet.x + 500, sheet.y + 300, { steps: 5 });
  await page.mouse.up();
  const box = (await page.locator('[data-region="a"]').boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + 1);
  await page.mouse.down();
  await page.mouse.move(box.x - 99, box.y - 99, { steps: 5 });
  await page.mouse.move(box.x - 199, box.y - 199, { steps: 5 }); // 200 para a esquerda e para cima: passa da borda
  await page.mouse.up();
  // o grupo anda só 60 (até a de cima e a da esquerda tocarem a borda); a distância entre as duas continua 140 x 60
  await expect.poll(() => dev(page).text()).toContain(`${f}calc {#a x=0 y=0}`);
  expect(await dev(page).text()).toContain(`${f}calc {#b x=140 y=60}`);
});

// F03 (AUDITORIA B5/B6): documento somente leitura (versao_formato maior que o suportado) recusa a edição,
// então o campo novo nunca monta; antes, o teclado ficava preso para sempre.
const READONLY = `${CALC}/futuro`;
const listenKeys = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __kd: boolean[] };
  w.__kd = [];
  addEventListener('keydown', (e) => { setTimeout(() => w.__kd.push(e.defaultPrevented), 0); /* depois de todos os ouvintes */ }, true); // captura: o ouvinte de holdKeys para a propagação
});
const lastPrevented = (page: Page) => page.evaluate(() => { const k = (window as unknown as { __kd: boolean[] }).__kd; return k[k.length - 1]; });

test('[BUG-013] [F03-01] folha cuja região nova não monta não engole o teclado para sempre', async ({ page }) => {
  await start(page);
  await dev(page).write(`${READONLY}.prsf`, '---\ntipo: folha\ntitulo: Futuro\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 99\n---\n');
  await dev(page).open(`${READONLY}.prsf`);
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.press('a'); // tenta criar região: recusada, o campo nunca monta
  await listenKeys(page);
  await page.keyboard.press('b');
  expect(await lastPrevented(page)).toBe(true); // ainda dentro do prazo, a tecla espera o campo
  await page.waitForTimeout(2300);
  await page.keyboard.press('Control+b');
  expect(await lastPrevented(page)).toBe(false); // prazo vencido: a folha voltou a tratar as teclas
});

test('[BUG-013] [F03-02] caderno cuja linha nova não monta solta o teclado do app em até 1 s', async ({ page }) => {
  await start(page);
  await dev(page).write(`${READONLY}.prsm`, '---\ntipo: caderno\ntitulo: Futuro\nbibliotecas: []\nunidades: SI\nversao_formato: 99\n---\n\n# Futuro\n\n```calc\nx := 1\n```\n');
  await dev(page).open(`${READONLY}.prsm`);
  await focusField(page, page.locator('article math-field').first());
  await page.keyboard.press('End');
  await page.keyboard.press('Enter'); // holdKeys(), mas a edição é recusada e nenhum campo monta
  // observa se a tecla chega ao campo (que ainda tem o foco): o MathLive trata Ctrl+B por conta própria, então defaultPrevented não serve
  await page.keyboard.press('7');
  expect((await fieldValues(page))[0]).not.toContain('7'); // dentro do prazo, holdKeys guarda a tecla
  await page.waitForTimeout(1300);
  await page.keyboard.press('8');
  await expect.poll(async () => (await fieldValues(page))[0]).toContain('8'); // prazo vencido: a tecla volta ao campo
});

test('[BUG-014] [F04-01] na folha, nome que coincide com unidade (L) fica em aberto e 9j é produto', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('s:10*L=', { delay: 30 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('s := 10*L = ?');
  // L não é litro: o resultado fica em aberto, com a dica, e sem número nem unidade
  await expect(page.locator('.mresult-symbolic')).toHaveCount(1);
  await expect(page.locator('[title="L ainda não foi definido"]')).toHaveCount(1);
  await expect(page.locator('.mresult-value .u')).toHaveCount(0);
  await page.getByLabel('Folha').click({ position: { x: 100, y: 300 } });
  await page.keyboard.type('z:9j', { delay: 30 });
  await page.keyboard.press('Enter');
  await expect.poll(() => dev(page).text()).toContain('z := 9*j');
});

// A6-FIX (teste manual do lote F-A6)
async function sheetWith(page: Page, lines: string[]) {
  await start(page);
  await dev(page).newDoc('folha');
  let y = 60;
  for (const l of lines) {
    await page.getByLabel('Folha').click({ position: { x: 100, y } });
    await page.keyboard.type(l, { delay: 30 });
    await page.keyboard.press('Enter');
    y += 70;
  }
  await page.getByLabel('Folha').click({ position: { x: 100, y } });
}

// o "/" digitado depressa (sem intervalo entre as teclas) chegava ao MathLive antes de ele fechar o índice e saía como barra solta
for (const delay of [0, 30]) {
  test(`[BUG-018] "/" depois de nome com índice monta a fração na hora: V.o/T.total (${delay} ms entre teclas)`, async ({ page }) => {
    await sheetWith(page, ['V.o:1', 'T.total:5']);
    await page.keyboard.type('V.o/T.total', { delay });
    const val = async () => (await fieldValues(page)).at(-1)!;
    await expect.poll(val).toContain('\\frac{');
    expect(await val()).not.toMatch(/\}\/|\/\\/); // nenhuma barra solta no meio do campo
    await page.keyboard.press('=');
    await expect.poll(() => dev(page).text()).toContain('V_o/T_total = ?');
    await expect.poll(() => resultTexts(page).then((r) => r.at(-1))).toBe('0,2');
  });
}

// BUG-019: %, ‰ e ppm no campo de unidade do resultado convertem (não são unidades do math.js; ‰ e ppm autorizados pelo usuário em 12/11)
// Tab com a lista aberta aceita o item (A6-4) e um segundo Tab, Enter ou o clique fora confirma.
// Sem intervalo entre as teclas (0 ms) o Tab chegava antes do "input" do % ou do ‰ e aceitava o item da lista do campo vazio por cima dele
for (const delay of [40, 0]) for (const [unit, shown] of [['%', '20%'], ['‰', '200‰'], ['ppm', '2⋅105ppm']]) for (const confirm of [['Enter'], ['Tab', 'Tab'], ['Tab', 'clique fora']]) {
  test(`[BUG-019] V_o/T_total = 0,2 com ${unit} no campo de unidade (${confirm.join(' + ')}, ${delay} ms entre teclas) mostra ${shown}`, async ({ page }) => {
    await sheetWith(page, ['V.o:1', 'T.total:5']);
    await page.keyboard.type('V.o/T.total=', { delay: 30 });
    await expect.poll(() => resultTexts(page).then((r) => r.at(-1))).toBe('0,2');
    const line = page.locator('.mline').filter({ has: page.locator('.mresult-value') }).last();
    await line.hover();
    await line.locator('.unit-marker').click();
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('.unit-input'))).toBe(true);
    await page.keyboard.type(unit, { delay });
    for (const k of confirm) {
      if (k === 'clique fora') await page.getByLabel('Folha').click({ position: { x: 600, y: 500 } });
      else await page.keyboard.press(k);
    }
    await expect.poll(() => resultTexts(page).then((r) => r.at(-1))).toBe(shown);
    await expect.poll(() => dev(page).text()).toContain(`V_o/T_total = ? ${unit}`);
  });
}

// BUG-020: linha que o formato linear não lia (I_o:=5A) aparecia crua, com ":=" na tela
const folhaCom = (...lines: string[]) => `---\ntipo: folha\ntitulo: Folha1\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\ncriado: 2026-11-07\nversao_formato: 1\n---\n\n${lines.map((l, i) => `\`\`\`calc {#calc-${i + 1} x=100 y=${60 + i * 80}}\n${l}\n\`\`\`\n`).join('\n')}`;
const telaDosCampos = (page: Page) => page.evaluate(() => [...document.querySelectorAll('math-field')].map((m) => (m.shadowRoot?.querySelector('.ML__latex') as HTMLElement | null)?.innerText ?? '').join('\n'));

test('[BUG-020] arquivo com I_o:=5A abre como I_o ≔ 5·A, sem texto cru', async ({ page }) => {
  await start(page);
  await dev(page).write(`${CALC}/bug20.prsf`, folhaCom('I_o:=5A'));
  await dev(page).open(`${CALC}/bug20.prsf`);
  await expect.poll(async () => (await fieldValues(page))[0]).toContain('\\coloneq');
  expect((await fieldValues(page))[0]).toContain('5\\cdot');
  const tela = await telaDosCampos(page);
  expect(tela).not.toContain(':=');
  expect(tela).toContain('≔');
});

test('[BUG-020] linha ilegível aparece marcada como erro, nunca com ":=" ou texto cru', async ({ page }) => {
  await start(page);
  await dev(page).write(`${CALC}/bug20b.prsf`, folhaCom('I_o := 5 $ A'));
  await dev(page).open(`${CALC}/bug20b.prsf`);
  await expect(page.locator('.mline-unreadable')).toHaveText('Não foi possível ler esta linha');
  await expect(page.locator('.mline-error')).toHaveCount(1);
  expect(await telaDosCampos(page)).not.toContain(':=');
  await expect(page.getByLabel('Folha')).not.toContainText(':=');
  expect(await dev(page).text()).toContain('I_o := 5 $ A'); // o arquivo não é tocado
  // confirmar o campo vazio (Enter, Esc, Tab) não apaga a linha que não deu para ler
  for (const key of ['Enter', 'Escape', 'Tab']) {
    await page.locator('math-field').first().click();
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
    expect(await dev(page).text(), `depois de ${key}`).toContain('I_o := 5 $ A');
  }
});

// A6-FIX2-04 (achado 5 do Fable nº 1): a linha ilegível nunca é sobrescrita nem apagada sem o usuário confirmar
const ILEGIVEL = 'I_o := 5 $ A';
const aviso = (page: Page) => page.getByRole('alertdialog', { name: 'Linha que não foi lida' });
async function abrirIlegivel(page: Page, nome: string) {
  await start(page);
  await dev(page).write(`${CALC}/${nome}.prsf`, folhaCom(ILEGIVEL));
  await dev(page).open(`${CALC}/${nome}.prsf`);
  await expect(page.locator('.mline-unreadable')).toBeVisible();
  await focusField(page, page.locator('math-field').first());
}

test('[A6-FIX2-04] digitar x, apagar, digitar ( e sair não apaga a linha ilegível', async ({ page }) => {
  await abrirIlegivel(page, 'fix2a');
  await page.keyboard.type('x');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('(');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  expect(await dev(page).text()).toContain(ILEGIVEL);
});

test('[A6-FIX2-04] Backspace no campo vazio de uma linha ilegível pergunta antes de apagar', async ({ page }) => {
  await abrirIlegivel(page, 'fix2b');
  await page.keyboard.press('Backspace');
  await expect(aviso(page)).toBeVisible();
  await aviso(page).getByRole('button', { name: 'Manter a linha' }).click();
  await expect(aviso(page)).toHaveCount(0);
  expect(await dev(page).text()).toContain(ILEGIVEL);
  await focusField(page, page.locator('math-field').first());
  await page.keyboard.press('Backspace');
  await aviso(page).getByRole('button', { name: 'Apagar' }).click();
  await expect.poll(() => dev(page).text()).not.toContain(ILEGIVEL);
});

test('[A6-FIX2-04] digitar numa linha ilegível só troca o texto depois de confirmar', async ({ page }) => {
  await abrirIlegivel(page, 'fix2c');
  await page.keyboard.type('x');
  await page.waitForTimeout(500); // passa do LIVE_MS: antes, o texto original já tinha sido trocado
  expect(await dev(page).text()).toContain(ILEGIVEL);
  await page.keyboard.press('Enter'); // com x digitado a lista do assistente está aberta e o Tab a aceitaria
  await expect(aviso(page)).toBeVisible();
  await expect(aviso(page)).toContainText(ILEGIVEL);
  await aviso(page).getByRole('button', { name: 'Manter a linha' }).click();
  expect(await dev(page).text()).toContain(ILEGIVEL);
  await expect(page.locator('.mline-unreadable')).toBeVisible();
  expect(await fieldValues(page)).toEqual(['']); // o campo volta ao estado de linha ilegível, sem o x
  await focusField(page, page.locator('math-field').first());
  await page.keyboard.type('y');
  await page.keyboard.press('Enter'); // com x digitado a lista do assistente está aberta e o Tab a aceitaria
  await aviso(page).getByRole('button', { name: 'Substituir' }).click();
  await expect.poll(() => dev(page).text()).not.toContain(ILEGIVEL);
  expect(await dev(page).text()).toContain('\ny\n');
});

test('[A6-FIX2-04] nome e Espaço numa linha ilegível não trocam a região por texto', async ({ page }) => {
  await abrirIlegivel(page, 'fix2d');
  await page.keyboard.type('abc');
  await page.keyboard.press(' ');
  await page.waitForTimeout(500);
  expect(await dev(page).text()).toContain(ILEGIVEL);
  expect(await dev(page).text()).not.toContain('abc');
});

// A6-FIX2-02: 2e3 passa pela tela do MathLive sem virar 2*e3
test('[A6-FIX2-02] editar a linha x := 2e3 = ? mantém 2e3 e o valor', async ({ page }) => {
  await start(page);
  await dev(page).write(`${CALC}/fix2e.prsf`, folhaCom('x := 2e3 = ?'));
  await dev(page).open(`${CALC}/fix2e.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['2000']);
  await focusField(page, page.locator('math-field').first());
  await page.keyboard.press('End');
  await page.keyboard.type('+1');
  await expect.poll(() => dev(page).text()).toContain('x := 2e3 + 1 = ?');
  await expect.poll(() => resultTexts(page)).toEqual(['2001']);
});

// A6-FIX2-01: a/2x é a/(2x) na tela, no arquivo e no motor
test('[A6-FIX2-01] editar y := a/2x não muda o valor (a/(2x), não (a/2)·x)', async ({ page }) => {
  await start(page);
  await dev(page).write(`${CALC}/fix2f.prsf`, folhaCom('a := 6', 'x := 3', 'y := a/2x = ?'));
  await dev(page).open(`${CALC}/fix2f.prsf`);
  await expect.poll(() => resultTexts(page)).toEqual(['1']);
  await focusField(page, page.locator('math-field').nth(2));
  await page.keyboard.press('End');
  await page.keyboard.type('+0');
  await expect.poll(() => dev(page).text()).toContain('y := a/(2*x) + 0 = ?');
  await expect.poll(() => resultTexts(page)).toEqual(['1']);
});

test('[BUG-023] Ctrl+W apertado enquanto a região nova monta não fecha o documento: a tecla fica só com a região', async ({ page }) => {
  await start(page);
  await dev(page).newDoc('folha');
  const abertas = await tabs(page).count();
  await page.getByLabel('Folha').click({ position: { x: 100, y: 100 } });
  await page.keyboard.type('L:5'); // sem pausa: a região ainda está montando
  await page.keyboard.press('Control+w');
  await expect(page.getByRole('dialog', { name: 'Catálogo de unidades' })).toBeVisible(); // a tecla foi para o campo
  await expect(page.getByRole('button', { name: 'Não salvar' })).toHaveCount(0); // o fechar do documento não foi disparado
  expect(await tabs(page).count()).toBe(abertas);
});
