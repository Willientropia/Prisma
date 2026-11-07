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
  it('[V-01] nenhuma cor fora de tokens.css', () => {
    const bad = files(ROOT)
      .filter((f) => !f.endsWith('tokens.css') && !f.endsWith('conformance.test.ts'))
      .flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l] as const))
      .filter(([, , l]) => /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(l.replace(/href="#[^"]*"/g, '')))
      .map(([f, n, l]) => `${relative(ROOT, f)}:${n}: ${l.trim()}`);
    expect(bad).toEqual([]);
  });

  it('[V-02] nenhum emoji nem símbolo usado como ícone', () => {
    const re = /[←-⇿☀-➿\u{1F300}-\u{1FAFF}]/u;
    const bad = files(ROOT)
      .filter((f) => !f.endsWith('conformance.test.ts'))
      .filter((f) => re.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(bad).toEqual([]);
  });
});

describe('registro de comandos', () => {
  it('[F0-13] mescla registros, roda handler e acha por atalho', () => {
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

describe('fontes e contraste', () => {
  it('[V-03] fontes só de resources/fonts, nada da internet', () => {
    const fonts = readFileSync(join(ROOT, 'styles/fonts.css'), 'utf8');
    const urls = [...fonts.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u).toMatch(/^\.\.\/\.\.\/resources\/fonts\/[\w-]+\.woff2$/);
    const html = readFileSync(join(ROOT, '../index.html'), 'utf8');
    expect(html).not.toMatch(/fonts\.googleapis|https?:\/\//);
  });

  // Pares de texto sobre fundo usados na interface (protótipo e adendos)
  const PAIRS: [string, string][] = [
    ['text-strong', 'bg-ribbon'], ['text-strong', 'selection'], ['text', 'bg-raised'], ['text', 'bg-ribbon'], ['text-2', 'bg-panel'], ['text-2', 'bg-ribbon'],
    ['text-3', 'bg-tabsbar'], ['text-3', 'bg-titlebar'], ['text-muted', 'bg-panel'], ['text-muted', 'bg-ribbon'], ['text-muted', 'bg-raised'], ['text-muted', 'bg-tabsbar'],
    ['text-muted', 'bg-titlebar'], ['text-muted', 'bg-input'], ['text-group', 'bg-ribbon'], ['text-shortcut', 'bg-raised'], ['text-btn', 'hover-btn'], ['accent-light', 'bg-panel'],
    ['limit-label', 'bg-panel'], ['ok-text', 'bg-panel'], ['warn-text', 'bg-panel'], ['error-text', 'bg-panel'], ['paper-text', 'paper'], ['paper-prose', 'paper'],
    ['paper-text-2', 'paper'], ['paper-accent', 'paper'], ['paper-error', 'paper'], ['ok-badge-text', 'ok-badge-bg'], ['warn-badge-text', 'warn-badge-bg'], ['fail-badge-text', 'fail-badge-bg'],
    ['math-var', 'bg-grid'], ['math-unit', 'bg-grid'], ['math-result', 'bg-grid'], ['math-unit-paper', 'paper'], ['math-error', 'bg-grid'], ['tex-text', 'bg-code'], ['tex-keyword', 'bg-code'],
    ['text-strong', 'accent'], ['text-strong', 'type-folha'], ['text-strong', 'type-tex'], ['text-strong', 'type-lib'], ['text-strong', 'type-inicio'], ['text-strong', 'type-caderno'],
  ];
  /**
   * Pares definidos pelos próprios documentos que ficam abaixo de 4,5:1. A SPEC 4.5 proíbe mudar token
   * por conta própria; a decisão foi pedida ao usuário. Este teste garante que a lista não cresce.
   */
  const KNOWN_LOW: [string, string, number][] = [
    ['tex-comment', 'bg-code', 4.34], // SPEC 4.1: comentário do editor LaTeX
    ['text-linenum', 'bg-code', 2.74], // SPEC 4.1: números de linha do editor
    ['text-dim', 'bg-tabsbar', 3.33], // ADENDO 01 A6: recente "não encontrado"
  ];

  const tokens = () => Object.fromEntries([...readFileSync(join(ROOT, 'styles/tokens.css'), 'utf8').matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2]]));
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  it('[V-09] contraste de pelo menos 4,5:1 nos pares de texto (fora as exceções dos documentos)', () => {
    const t = tokens();
    const low = PAIRS.filter(([a, b]) => ratio(t[a], t[b]) < 4.5).map(([a, b]) => `${a} em ${b}: ${ratio(t[a], t[b]).toFixed(2)}`);
    expect(low).toEqual([]);
    for (const [a, b, r] of KNOWN_LOW) expect(Number(ratio(t[a], t[b]).toFixed(2)), `${a} em ${b}`).toBe(r);
  });
});
