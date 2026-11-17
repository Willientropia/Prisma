// Cliente do worker: o prazo de 2 s por linha não conta a carga do worker (BUG-032).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Msg = { data: Record<string, unknown> };
class FakeWorker {
  static last: FakeWorker;
  onmessage: ((e: Msg) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  sent: { id: number }[] = [];
  constructor() { FakeWorker.last = this; }
  postMessage(m: { id: number }) { this.sent.push(m); }
  terminate() { this.onmessage = null; }
  emit(data: Record<string, unknown>) { this.onmessage?.({ data }); }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('Worker', FakeWorker);
  vi.resetModules();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const input = { libs: [], blocks: [] };

describe('[BUG-032] prazo do worker', () => {
  it('worker que leva 3 s para carregar não dá Tempo esgotado: o prazo começa quando ele avisa que está pronto', async () => {
    const { evaluateAsync } = await import('./client');
    const out = evaluateAsync(input);
    const w = FakeWorker.last;
    vi.advanceTimersByTime(3000); // carregando o math.js
    w.emit({ ready: true });
    vi.advanceTimersByTime(500);
    w.emit({ id: w.sent[0].id, result: { blocks: {} } });
    expect((await out).kind).toBe('done');
  });
  it('depois de pronto, linha que passa de 2 s continua dando Tempo esgotado', async () => {
    const { evaluateAsync, LINE_LIMIT_MS } = await import('./client');
    const out = evaluateAsync(input);
    const w = FakeWorker.last;
    w.emit({ ready: true });
    w.emit({ id: w.sent[0].id, progress: { key: 'c', line: 3 } });
    vi.advanceTimersByTime(LINE_LIMIT_MS + 1);
    expect(await out).toEqual({ kind: 'timeout', key: 'c', line: 3 });
  });
  it('worker já carregado: a segunda avaliação tem prazo desde o início', async () => {
    const { evaluateAsync, LINE_LIMIT_MS } = await import('./client');
    const first = evaluateAsync(input);
    const w = FakeWorker.last;
    w.emit({ ready: true });
    w.emit({ id: w.sent[0].id, result: { blocks: {} } });
    await first;
    const second = evaluateAsync(input);
    expect(FakeWorker.last).toBe(w); // o mesmo worker, que não vai avisar de novo
    vi.advanceTimersByTime(LINE_LIMIT_MS + 1);
    expect((await second).kind).toBe('timeout');
  });
});
