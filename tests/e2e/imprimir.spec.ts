// Imprimir (SPEC 7.4, Ctrl+P): só o papel; expressão longa diminui até caber na largura da folha, e a tela volta depois.
import { expect, test } from './fixtures';
import { DOCS, dev, start } from './helpers';

const f = '```';
const head = '---\ntipo: caderno\ntitulo: Longa\nbibliotecas: []\nunidades: SI\nversao_formato: 1\n---\n\n';
const longa = 'g(t, λ) := sqrt(2)*sin(2*π*t + λ - 1) - sqrt(2)*sin(λ - 1)*exp(-2*π*t/10) + sqrt(2)*sin(2*π*t + λ - 1) - sqrt(2)*sin(λ - 1)*exp(-2*π*t/10)';

test('Ctrl+P imprime só o papel do caderno, com a expressão longa inteira na largura da folha', async ({ page }) => {
  await start(page);
  await dev(page).write(`${DOCS}/imprimir.prsm`, `${head}${f}calc {#c}\na := 1\n${f}\n\n${f}funcao {#g nome=g}\n${longa}\n${f}\n`);
  await dev(page).open(`${DOCS}/imprimir.prsm`);
  await expect(page.locator('article math-field')).toHaveCount(2);
  await page.evaluate(() => {
    const w = window as unknown as { __print: unknown; print: () => void };
    w.print = () => {
      const g = [...document.querySelectorAll('article math-field')][1] as HTMLElement;
      const content = g.shadowRoot!.querySelector('.ML__content')!;
      w.__print = { printing: document.documentElement.classList.contains('printing'), page: document.querySelector('article')!.getBoundingClientRect().width, need: content.scrollWidth, room: g.clientWidth };
    };
  });
  await page.keyboard.press('Control+p');
  type Seen = { printing: boolean; page: number; need: number; room: number };
  const seen = () => page.evaluate(() => (window as unknown as { __print?: Seen }).__print);
  await expect.poll(seen).toBeTruthy();
  const p = (await seen())!;
  expect(p.printing).toBe(true);
  expect(p.page).toBe(718); // A4 menos 10 mm de cada lado
  expect(p.need).toBeLessThanOrEqual(p.room + 1); // inteira, sem rolar
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('printing'))).toBe(false);
  expect(await page.evaluate(() => ([...document.querySelectorAll('article math-field')][1] as HTMLElement).style.fontSize)).toBe('');
});
