// Motor fora da thread da interface. Avisa cada linha antes de avaliar, para o cliente saber onde travou.
import { evaluate, type EvalInput } from './evaluate';

const post = (m: unknown) => (self as unknown as { postMessage(m: unknown): void }).postMessage(m);

self.onmessage = (e: MessageEvent<{ id: number; input: EvalInput }>) => {
  const { id, input } = e.data;
  try {
    const result = evaluate(input, (key, line) => post({ id, progress: { key, line } }));
    post({ id, result });
  } catch (err) {
    post({ id, fatal: err instanceof Error ? err.message : String(err) });
  }
};
