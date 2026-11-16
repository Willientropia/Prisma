// [F06] B18 da AUDITORIA-FABLE: prazo antes da primeira linha e avaliação interrompida por outra.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Outcome } from './client';

const calls: ((o: Outcome) => void)[] = [];
vi.mock('./client', () => ({
  LINE_LIMIT_MS: 2000,
  stop: () => {},
  evaluateAsync: () => new Promise<Outcome>((resolve) => calls.push(resolve)),
}));

const { recalc } = await import('./run');
const { useWorkspace } = await import('../store/workspace');

const ID = 'C:/x.prsm';
const flush = () => new Promise((r) => setTimeout(r));

beforeEach(() => {
  calls.length = 0;
  useWorkspace.setState({ openDocs: [{ id: ID, path: ID, type: 'caderno', text: '---\ntipo: caderno\n---\n\n```calc\na := 1\n```\n' } as never], results: {}, calculating: false });
});

describe('[F06] prazo e interrupção do cálculo (B18)', () => {
  it('prazo estourado antes da primeira linha (constantes de biblioteca) aparece como mensagem', async () => {
    const r = recalc(ID);
    await flush();
    calls[0]({ kind: 'timeout', key: '', line: 0 });
    await r;
    expect(useWorkspace.getState().results[ID]?.libErrors).toContain('Tempo esgotado: as bibliotecas passaram de 2 s antes da primeira linha');
  });

  it('a avaliação interrompida por outra não apaga o "calculando" da nova', async () => {
    const first = recalc(ID);
    await flush();
    const second = recalc(ID);
    await flush();
    calls[0]({ kind: 'stopped' });
    await first;
    expect(useWorkspace.getState().calculating).toBe(true);
    calls[1]({ kind: 'done', result: { blocks: {}, libErrors: [], defined: [], ms: 1, libs: [] } as never });
    await second;
    expect(useWorkspace.getState().calculating).toBe(false);
  });
});
