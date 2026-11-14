// Gráfico 2D de função (ADENDO 06, 5.4 e 4.6): critérios 06-29 e 06-37 a 06-42.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { DOCS, armTimer, dev, focusField, resultTexts, start } from './helpers';

const REF = `${DOCS}/referencia-integral-grafico.prsf`; // tests/fixtures (06-44)
const f = '```';
const folha = (body: string) => `---\ntipo: folha\ntitulo: G\nbibliotecas: []\npagina: {largura: 1200, altura: 1600, grade: 20}\nversao_formato: 1\n---\n\n${body}`;
const DEF_F = `${f}calc {#F x=40 y=40}\nF(x) := abs(1 + e^(5*(x - 2)))\n${f}\n`;
const graph = (series: string, extra = '') => `${f}grafico {#g1 x=40 y=180 largura=320 altura=240}\ntipo: 2d\nseries: [${series}]\n${extra}grade: true\n${f}\n`;
const svg = (page: Page) => page.locator('[data-grafico] svg[data-view]');

type Pt = number[];
/** Área de desenho, vista e trechos da linha (cada M começa um trecho) da série i. */
const curve = (page: Page, i = 0) => page.evaluate((i) => {
  const el = document.querySelector('[data-grafico] svg[data-view]')!;
  const [left, top, w, h] = JSON.parse(el.getAttribute('data-frame')!) as number[];
  const view = JSON.parse(el.getAttribute('data-view')!) as { x: number[]; y: number[] };
  const d = el.querySelector(`[data-series="${i}"] path`)?.getAttribute('d') ?? '';
  const runs = d.split('M').filter(Boolean).map((r) => r.split('L').map((p) => p.trim().split(' ').map(Number)));
  return { left, top, w, h, view, runs };
}, i);
const segDist = ([ax, ay]: Pt, [bx, by]: Pt, x: number, y: number) => {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + t * dx - x, ay + t * dy - y);
};
const nearest = (runs: Pt[][], x: number, y: number) => Math.min(...runs.flatMap((r) => r.slice(1).map((b, k) => segDist(r[k], b, x, y))));

test('[06-37] @ numa área vazia cria o gráfico com o campo em edição; digitar F(x) desenha a curva', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/novo.prsf`, folha(DEF_F));
  await dev(page).open(`${DOCS}/novo.prsf`);
  await page.getByLabel('Folha').click({ position: { x: 300, y: 200 } });
  await page.keyboard.press('@');
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Expressão do gráfico');
  await page.keyboard.type('F(x)');
  await expect.poll(() => dev(page).text()).toContain('series: ["F(x)"]');
  expect(await dev(page).text()).toMatch(/```grafico \{#grafico-1 x=\d+ y=\d+ largura=320 altura=240\}\ntipo: 2d\n/);
  await expect(page.locator('[data-grafico] [data-series="0"] path')).toHaveAttribute('d', /^M.+L/);
  await page.keyboard.type(';sin(x');
  await expect.poll(() => dev(page).text()).toContain('series: ["F(x)", "sin(x)"]'); // vários itens com ";": várias curvas
  await expect(page.locator('[data-grafico] [data-series="1"] path')).toHaveAttribute('d', /^M.+L/);
});

test('[06-38] vista 0 a 3 × 0 a 3: passa por (0; 1) e (2; 2) com erro menor que 1 px e sai pelo topo perto de x = 2,14', async ({ page }) => {
  await start(page);
  await dev(page).open(REF);
  await expect.poll(async () => (await curve(page)).runs.length).toBeGreaterThan(0);
  const c = await curve(page);
  expect(c.view).toEqual({ x: [0, 3], y: [0, 3] });
  const X = (x: number) => c.left + (x / 3) * c.w, Y = (y: number) => c.top + c.h - (y / 3) * c.h;
  expect(nearest(c.runs, X(0), Y(1))).toBeLessThan(1);
  expect(nearest(c.runs, X(2), Y(2))).toBeLessThan(1);
  const pts = c.runs.flat();
  const k = pts.findIndex((p, i) => i > 0 && pts[i - 1][1] >= c.top && p[1] < c.top);
  const [a, b] = [pts[k - 1], pts[k]];
  const xTop = a[0] + ((c.top - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
  expect(Math.abs(xTop - X(2 + Math.log(2) / 5))).toBeLessThan(1); // F(x) = 3 em x = 2 + ln 2 / 5 ≈ 2,1386
  await expect.poll(() => resultTexts(page)).toEqual(['2,2']);
});

test('[06-39] 1/(x − 1) não liga os lados da assíntota', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/assintota.prsf`, folha(graph('"1/(x - 1)"', 'x: {min: 0, max: 3}\ny: {min: -10, max: 10}\n')));
  await dev(page).open(`${DOCS}/assintota.prsf`);
  await expect.poll(async () => (await curve(page)).runs.length).toBeGreaterThan(1);
  const c = await curve(page);
  const pole = c.left + c.w / 3;
  for (const r of c.runs) expect(r.every((p) => p[0] < pole) || r.every((p) => p[0] > pole)).toBe(true);
});

test('[06-40] redefinir F(x) acima atualiza a curva e a integral em até 150 ms', async ({ page }) => {
  await start(page);
  await dev(page).open(REF);
  await expect.poll(() => resultTexts(page)).toEqual(['2,2']);
  const before = (await curve(page)).runs;
  await focusField(page, page.locator('[data-region="F"] math-field'));
  await page.keyboard.press('Control+a');
  await armTimer(page, ['4']); // ∫₀² 2x dx = 4
  await page.keyboard.type('F(x):2*x', { delay: 30 });
  await expect.poll(() => resultTexts(page)).toEqual(['4']);
  const ms = (await page.evaluate(() => { const t = (window as unknown as { __t: { key: number; done: number } }).__t; return t.done - t.key; }));
  console.log(`06-40: curva e integral novas ${ms.toFixed(0)} ms depois da última tecla`);
  expect(ms).toBeLessThanOrEqual(150);
  const c = await curve(page);
  expect(c.runs).not.toEqual(before);
  expect(nearest(c.runs, c.left + c.w / 3, c.top + c.h - (2 / 3) * c.h)).toBeLessThan(1); // F(1) = 2
});

test('[06-41] vista ajustada é salva e reaberta igual; duplo clique volta à automática', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/vista.prsf`, folha(DEF_F + '\n' + graph('"F(x)"')));
  await dev(page).open(`${DOCS}/vista.prsf`);
  const box = (await svg(page).boundingBox())!;
  await svg(page).click({ position: { x: 150, y: 100 } }); // seleciona: a roda faz zoom
  await page.mouse.move(box.x + 150, box.y + 100);
  await page.mouse.wheel(0, -100);
  await expect.poll(() => dev(page).text()).toMatch(/x: \{min: [-\d.]+, max: [-\d.]+\}\ny: \{min: /);
  await expect.poll(async () => JSON.parse((await svg(page).getAttribute('data-view'))!).x[0]).not.toBe(-5);
  await page.waitForTimeout(400); // o cálculo com a vista gravada volta
  const saved = await svg(page).getAttribute('data-view');
  await dev(page).write(`${DOCS}/vista2.prsf`, await dev(page).text());
  await dev(page).open(`${DOCS}/vista2.prsf`);
  await expect(svg(page)).toHaveAttribute('data-view', saved!);
  await svg(page).dblclick({ position: { x: 150, y: 100 } });
  await expect.poll(() => dev(page).text()).not.toContain('min:');
  await expect.poll(async () => JSON.parse((await svg(page).getAttribute('data-view'))!).x).toEqual([-5, 5]);
});

test('[06-42] duas variáveis livres mostram o erro de 5.4', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/duas.prsf`, folha(graph('"x + t"')));
  await dev(page).open(`${DOCS}/duas.prsf`);
  await expect(page.locator('[data-grafico]')).toContainText('O gráfico 2D precisa de uma única variável livre (encontradas: x, t)');
});

test('[BUG-027] a legenda mostra as séries em notação matemática, sem _ nem sqrt crus', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/legenda.prsf`, folha(`${f}calc {#a x=40 y=40}\nv_a := 2\n${f}\n\n` + graph('"v_a*sin(x)", "sqrt(2)*x"', 'legenda: true\n')));
  await dev(page).open(`${DOCS}/legenda.prsf`);
  const items = page.locator('[data-grafico] [class*="legendItem"]');
  await expect(items).toHaveCount(2);
  await expect(items.first().locator('.ML__base, .ML__mathit, .ML__cmr').first()).toBeAttached(); // markup do MathLive
  for (const t of await items.allTextContents()) expect(t).not.toMatch(/[_^]|sqrt/);
});

test('[06-29] selecionar o gráfico mostra e ativa Ferramentas de gráfico; desselecionar volta à guia anterior', async ({ page }) => {
  await start(page);
  await dev(page).open(REF);
  const ctx = page.getByRole('tab', { name: 'Ferramentas de gráfico' });
  await page.getByRole('tab', { name: 'Exibir' }).click();
  await expect(ctx).toHaveCount(0);
  await svg(page).click({ position: { x: 150, y: 100 } });
  await expect(ctx).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Grade' }).click();
  await expect.poll(() => dev(page).text()).toContain('grade: false');
  await page.getByLabel('Folha').click({ position: { x: 700, y: 600 } });
  await expect(ctx).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Exibir' })).toHaveAttribute('aria-selected', 'true');
});

test('caderno: o gráfico 2D aparece na página branca e Gráfico (Células) cria um vazio em edição', async ({ page }) => {
  await start(page);
  const head = '---\ntipo: caderno\ntitulo: G\nbibliotecas: []\nunidades: SI\nversao_formato: 1\n---\n\n';
  await dev(page).write(`${DOCS}/g.prsm`, `${head}${f}calc {#c}\nF(x) := 2*x\n${f}\n\n${graph('"F(x)"')}`);
  await dev(page).open(`${DOCS}/g.prsm`);
  await expect(page.locator('article [data-grafico] [data-series="0"] path')).toHaveAttribute('d', /^M.+L/);
  await page.locator('article [data-grafico] svg[data-view]').click({ position: { x: 150, y: 100 } });
  await page.getByRole('tablist', { name: 'Guias da faixa de opções' }).getByRole('tab', { name: 'Início' }).click();
  await page.getByRole('button', { name: 'Gráfico' }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Expressão do gráfico');
  expect(await dev(page).text()).toMatch(/```grafico \{#grafico-1\}\ntipo: 2d\nseries: \[\]\ngrade: true\n```/);
});
