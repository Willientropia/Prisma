// Checklist 4.7, itens 1 e 2, como teste: falha se alguém escapar dos tokens ou usar símbolo como ícone.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { all, byShortcut, register, run, shortcutOf } from './commands/registry';

const ROOT = import.meta.dirname;
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });

describe('conformidade visual', () => {
  it('nenhuma cor fora de tokens.css', () => {
    const bad = files(ROOT)
      .filter((f) => !f.endsWith('tokens.css') && !f.endsWith('conformance.test.ts'))
      .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l] as const))
      .filter(([, , l]) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l.replace(/href="#[^"]*"/g, '')))
      .map(([f, n, l]) => `${relative(ROOT, f)}:${n}: ${l.trim()}`);
    expect(bad).toEqual([]);
  });

  it('nenhum emoji nem símbolo usado como ícone', () => {
    const re = /[←-⇿☀-➿\u{1F300}-\u{1FAFF}]/u;
    const bad = files(ROOT)
      .filter((f) => !f.endsWith('conformance.test.ts'))
      .filter((f) => re.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(bad).toEqual([]);
  });
});

describe('registro de comandos', () => {
  it('mescla registros, roda handler e acha por atalho', () => {
    let ran = 0;
    register('teste.x', { label: 'Teste' });
    register('teste.x', { shortcut: 'Ctrl+Shift+K', run: () => ran++ });
    expect(all().find((c) => c.id === 'teste.x')?.label).toBe('Teste');
    expect(shortcutOf({ ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: 'k' })).toBe('Ctrl+Shift+K');
    byShortcut('Ctrl+Shift+K')?.run?.();
    run('teste.x');
    expect(ran).toBe(2);
    expect(() => run('nao.existe')).toThrow();
  });
});
