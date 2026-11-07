// Descoberta de arquivos para os testes guiados por dados (ADENDO 03, C3): arquivo novo entra sozinho.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

export const ROOT = join(import.meta.dirname, '../..');

export function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
}

/** Arquivos do usuário (.prsm, .prsf, .prsl, .prst, .prsp) nas pastas dadas. */
export function findUserFiles(dirs: string[]): string[] {
  return dirs.flatMap(walk).filter((f) => /\.prs[mflpt]$/i.test(f)).sort();
}

/** Pastas com arquivos de exemplo: fixtures de teste e recursos de fábrica. */
export const USER_FILE_DIRS = [join(ROOT, 'tests/fixtures'), join(ROOT, 'resources/bibliotecas'), join(ROOT, 'resources/modelos')];

export const rel = (f: string) => relative(ROOT, f).replace(/\\/g, '/');

/** Casos de um YAML de tests/golden (lista no topo). */
export function loadGolden<T>(file: string): T[] {
  const data = parseYaml(readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${file}: o topo do YAML precisa ser uma lista`);
  return data as T[];
}
