// Casos de tests/golden/calculos.yaml (ADENDO 03, C3): cada item do YAML vira um teste com o ID no nome.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluate, type BlockInput } from './evaluate';
import { unitFromMathjs } from '../format/mathlinear';
import { loadGolden, ROOT } from '../../tests/helpers/files';

export type CalcCase = {
  id: string;
  descricao?: string;
  definicoes?: string[];
  expr?: string;
  unidade?: string;
  sem_unidade?: boolean;
  verificar?: string;
  linha?: number;
  esperado?: { valor?: number; unidade?: string; tolerancia?: number | string; texto?: string; estado?: 'ok' | 'warn' | 'fail' };
  erro?: string;
};

const tol = (t: number | string | undefined) => (t === undefined ? 0.005 : typeof t === 'number' ? t : Number(String(t).replace('%', '')) / 100);

/** Roda um caso e devolve o resultado da linha em teste. */
export function runCase(c: CalcCase) {
  const lines = [...(c.definicoes ?? [])];
  const target = c.sem_unidade ? '' : (c.unidade ?? c.esperado?.unidade ?? '');
  if (c.expr) lines.push(`${c.expr} = ?${target ? ` ${target}` : ''}`);
  const blocks: BlockInput[] = [{ key: 'calc', type: 'calc', lines }];
  if (c.verificar) blocks.push({ key: 'check', type: 'verificar', lines: [c.verificar] });
  const r = evaluate({ libs: [], blocks });
  if (c.verificar) return r.blocks.check[0];
  return r.blocks.calc[c.linha ?? lines.length - 1];
}

export function checkCase(c: CalcCase) {
  const r = runCase(c);
  if (c.erro) { expect(r.error).toContain(c.erro); return; }
  expect(r.error).toBeUndefined();
  const e = c.esperado ?? {};
  if (e.valor !== undefined) {
    const err = Math.abs((r.value ?? NaN) - e.valor) / Math.max(Math.abs(e.valor), 1e-12);
    expect(err, `valor ${r.value} vs ${e.valor}`).toBeLessThanOrEqual(tol(e.tolerancia));
  }
  if (e.unidade !== undefined) expect(r.unitRaw ? unitFromMathjs(r.unitRaw) : '').toBe(e.unidade);
  if (e.texto !== undefined) expect(r.text).toBe(e.texto);
  if (e.estado !== undefined) expect(r.status).toBe(e.estado);
}

// PRISMA_GOLDEN_DIR só existe para o teste C9-05 (caso novo no YAML vira teste sem mudar código)
export const GOLDEN_CALC = join(process.env.PRISMA_GOLDEN_DIR ?? join(ROOT, 'tests/golden'), 'calculos.yaml');

describe('tests/golden/calculos.yaml', () => {
  for (const c of loadGolden<CalcCase>(GOLDEN_CALC)) {
    it(`[${c.id}] ${c.descricao ?? c.expr ?? c.verificar}`, () => checkCase(c));
  }
});
