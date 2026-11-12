// F-INST: guarda a saída e o relatório do Playwright quando ele falha, e avisa quando falta disco
// (a falha do hook de push da v0.2.0 se perdeu na rodada seguinte; o disco estava com 239 MB livres).
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIN_FREE = 5 * 1024 ** 3;

/** Copia a saída, o playwright.json e a pasta de resultados para <out>/falhas/<data-hora>/. Devolve a pasta. */
export function saveFailure(out: string, text: string, date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
  const dir = join(out, 'falhas', stamp);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'saida.txt'), text);
  for (const f of ['playwright.json', 'playwright']) if (existsSync(join(out, f))) cpSync(join(out, f), join(dir, f), { recursive: true });
  return dir;
}

/** Aviso em pt-BR quando há menos de 5 GB livres; null quando há espaço. */
export function diskWarning(freeBytes: number): string | null {
  if (freeBytes >= MIN_FREE) return null;
  const gb = (freeBytes / 1024 ** 3).toFixed(1).replace('.', ',');
  return `AVISO: só ${gb} GB livres no disco (menos de 5 GB). Disco cheio derruba testes de desempenho e a compilação do app.`;
}
