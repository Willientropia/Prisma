// Ajudantes dos testes de interface: o app roda com o Tauri simulado (src/dev/tauri-mock.ts).
import { expect, type Locator, type Page } from '@playwright/test';

export const DOCS = 'C:/Users/voce/Documents';
export const PROJ = `${DOCS}/Usina Boa Vista`;
export const CALC = `${PROJ}/calculos`;
export const CLOCK = new Date('2026-11-07T14:06:00-03:00');

type Dev = {
  open(p: string): Promise<void>;
  newDoc(t: string): string;
  text(): string | undefined;
  read(p: string): string | undefined;
  write(p: string, t: string): void;
  remove(p: string): void;
  moveDir(a: string, b: string): void;
  dialogAnswers: (string | string[] | null)[];
  dialogLog: { kind: string; options: { defaultPath?: string; filters?: { extensions: string[] }[] } }[];
  disk: Map<string, unknown>;
};
export const dev = (page: Page) => ({
  open: (p: string) => page.evaluate((p) => (window as unknown as { prismaDev: Dev }).prismaDev.open(p), p),
  newDoc: (t: string) => page.evaluate((t) => (window as unknown as { prismaDev: Dev }).prismaDev.newDoc(t), t),
  text: () => page.evaluate(() => (window as unknown as { prismaDev: Dev }).prismaDev.text() ?? ''),
  read: (p: string) => page.evaluate((p) => (window as unknown as { prismaDev: Dev }).prismaDev.read(p) ?? null, p),
  write: (p: string, t: string) => page.evaluate(([p, t]) => (window as unknown as { prismaDev: Dev }).prismaDev.write(p, t), [p, t] as const),
  remove: (p: string) => page.evaluate((p) => (window as unknown as { prismaDev: Dev }).prismaDev.remove(p), p),
  moveDir: (a: string, b: string) => page.evaluate(([a, b]) => (window as unknown as { prismaDev: Dev }).prismaDev.moveDir(a, b), [a, b] as const),
  dialogs: () => page.evaluate(() => (window as unknown as { prismaDev: Dev }).prismaDev.dialogLog),
  diskSize: () => page.evaluate(() => (window as unknown as { prismaDev: Dev }).prismaDev.disk.size),
  /** Próximas respostas dos diálogos de abrir/salvar. */
  answer: (...ans: (string | string[] | null)[]) => page.evaluate((ans) => { (window as unknown as { prismaDev: Dev }).prismaDev.dialogAnswers.push(...ans); }, ans),
});
/** Abre o app com relógio fixo (datas determinísticas) e espera o Tauri simulado. */
export async function start(page: Page) {
  await page.clock.setFixedTime(CLOCK);
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { prismaDev?: { open?: unknown } }).prismaDev?.open);
}

/** Clica no campo e espera o foco chegar (o MathLive leva alguns quadros), como uma pessoa faria. */
export async function focusField(page: Page, field: Locator) {
  await field.click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('MATH-FIELD');
}

export const resultTexts = (page: Page) => page.locator('.mresult-value').allTextContents().then((a) => a.map((t) => t.replace(/\s/g, '')));
export const fieldValues = (page: Page) => page.evaluate(() => [...document.querySelectorAll('math-field')].map((m) => (m as unknown as { value: string }).value));
export const tabs = (page: Page) => page.locator('[aria-label="Documentos abertos"] [role="tab"]');
export const status = (page: Page) => page.locator('footer span').first();

/**
 * Cronômetro dentro da página: mede da última tecla até os resultados ficarem iguais a `expected`.
 * Medir no próprio navegador tira o atraso do Playwright da conta (orçamento de 150 ms, C7.7).
 */
export const armTimer = (page: Page, expected: string[]) => page.evaluate((exp) => {
  const w = window as unknown as { __t: { key: number; done: number } };
  w.__t = { key: 0, done: 0 };
  addEventListener('keydown', () => { w.__t.key = performance.now(); w.__t.done = 0; }, true);
  const check = () => {
    const got = [...document.querySelectorAll('.mresult-value')].map((e) => (e.textContent ?? '').replace(/\s/g, ''));
    if (!w.__t.done && w.__t.key && JSON.stringify(got) === JSON.stringify(exp)) w.__t.done = performance.now();
  };
  new MutationObserver(check).observe(document.body, { subtree: true, childList: true, characterData: true });
}, expected);
export const timerMs = (page: Page) => page.evaluate(() => { const t = (window as unknown as { __t: { key: number; done: number } }).__t; return t.done ? t.done - t.key : null; });
