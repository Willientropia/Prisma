// F-INST: o verify guarda a falha do Playwright e avisa quando falta disco
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diskWarning, saveFailure } from '../../scripts/falhas';

describe('F-INST', () => {
  it('[FINST-01] falha do Playwright fica em test-results/falhas/<data-hora>/ com a saída e o relatório', () => {
    const out = mkdtempSync(join(tmpdir(), 'falhas-'));
    try {
      mkdirSync(join(out, 'playwright', 'teste-x'), { recursive: true });
      writeFileSync(join(out, 'playwright', 'teste-x', 'error-context.md'), 'contexto');
      writeFileSync(join(out, 'playwright.json'), '{}');
      const dir = saveFailure(out, 'saída do playwright', new Date(2026, 10, 11, 17, 5, 9));
      expect(dir).toBe(join(out, 'falhas', '2026-11-11_17-05-09'));
      expect(readFileSync(join(dir, 'saida.txt'), 'utf8')).toBe('saída do playwright');
      expect(existsSync(join(dir, 'playwright.json'))).toBe(true);
      expect(readFileSync(join(dir, 'playwright', 'teste-x', 'error-context.md'), 'utf8')).toBe('contexto');
      // a rodada seguinte não apaga a anterior
      const next = saveFailure(out, 'outra', new Date(2026, 10, 11, 17, 6, 0));
      expect(existsSync(join(dir, 'saida.txt'))).toBe(true);
      expect(existsSync(join(next, 'saida.txt'))).toBe(true);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it('[FINST-02] aviso quando há menos de 5 GB livres no disco', () => {
    const GB = 1024 ** 3;
    expect(diskWarning(0.239 * GB)).toMatch(/0,2 GB livres/);
    expect(diskWarning(4.9 * GB)).toMatch(/menos de 5 GB/);
    expect(diskWarning(5 * GB)).toBeNull();
    expect(diskWarning(20 * GB)).toBeNull();
  });
});
