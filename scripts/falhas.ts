// F-INST: guarda a saída e o relatório do Playwright quando ele falha, e avisa quando falta disco
// (a falha do hook de push da v0.2.0 se perdeu na rodada seguinte; o disco estava com 239 MB livres).
// Limite do projeto (CLAUDE.md, "Disco"): a pasta inteira nunca passa de 60 GB; o verify e o test:app param em 55 GB.
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIN_FREE = 5 * 1024 ** 3;
const KEEP_FAILURES = 5;
export const QUOTA = 60e9; // 60 GB decimais: abaixo de 60 GiB, vale qualquer que seja a conta do disco
export const STOP_AT = 55e9; // folga para uma compilação do Rust ou rodada do Playwright, que crescem GB de uma vez

/** Copia a saída, o playwright.json e a pasta de resultados para <out>/falhas/<data-hora>/. Devolve a pasta. Guarda só as 5 mais recentes. */
export function saveFailure(out: string, text: string, date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
  const dir = join(out, 'falhas', stamp);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'saida.txt'), text);
  for (const f of ['playwright.json', 'playwright']) if (existsSync(join(out, f))) cpSync(join(out, f), join(dir, f), { recursive: true });
  for (const old of readdirSync(join(out, 'falhas')).sort().slice(0, -KEEP_FAILURES)) rmSync(join(out, 'falhas', old), { recursive: true, force: true });
  return dir;
}

/** Bytes de uma pasta, sem seguir links (node_modules/.bin). Laço com pilha, sem recursão. */
export function folderBytes(root: string): number {
  let total = 0;
  const stack = [root];
  while (stack.length) {
    const d = stack.pop()!;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (!e.isSymbolicLink()) total += lstatSync(p).size;
    }
  }
  return total;
}

/** Erro em pt-BR quando o projeto chegou ao ponto de parada (55 GB); null quando cabe. */
export function quotaProblem(bytes: number): string | null {
  if (bytes < STOP_AT) return null;
  const gb = (bytes / 1e9).toFixed(1).replace('.', ',');
  return `PARADO: o projeto ocupa ${gb} GB, e o limite é 60 GB (parada em 55 GB). Libere espaço antes de compilar ou testar: ` +
    '`cargo clean --manifest-path src-tauri/Cargo.toml` (a maior pasta), apague test-results/ e playwright-report/ e veja CLAUDE.md, seção "Disco".';
}

/** Aviso em pt-BR quando há menos de 5 GB livres; null quando há espaço. */
export function diskWarning(freeBytes: number): string | null {
  if (freeBytes >= MIN_FREE) return null;
  const gb = (freeBytes / 1024 ** 3).toFixed(1).replace('.', ',');
  return `AVISO: só ${gb} GB livres no disco (menos de 5 GB). Disco cheio derruba testes de desempenho e a compilação do app.`;
}
