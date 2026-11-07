// Cliente do worker: uma avaliação por vez, 2 s por linha (SPEC 8.7). Passou disso, encerra o worker e marca a linha.
import type { EvalInput, EvalResult } from './evaluate';

export const LINE_LIMIT_MS = 2000;

export type Outcome =
  | { kind: 'done'; result: EvalResult }
  | { kind: 'timeout'; key: string; line: number }
  | { kind: 'stopped' }
  | { kind: 'error'; message: string };

let worker: Worker | null = null;
let seq = 0;
let finish: ((o: Outcome) => void) | null = null;

const kill = () => { worker?.terminate(); worker = null; };

/** Interrompe a avaliação em curso (comando Interromper ou nova avaliação). */
export function stop(): void {
  if (!finish) return;
  kill();
  finish({ kind: 'stopped' });
}

export function evaluateAsync(input: EvalInput): Promise<Outcome> {
  stop();
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const w = worker;
  const id = ++seq;
  return new Promise((resolve) => {
    let where = { key: '', line: 0 };
    let timer = 0;
    const done = (o: Outcome) => { clearTimeout(timer); finish = null; w.onmessage = null; resolve(o); };
    const arm = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => { kill(); done({ kind: 'timeout', ...where }); }, LINE_LIMIT_MS);
    };
    finish = done;
    w.onmessage = (e) => {
      if (e.data.id !== id) return;
      if (e.data.progress) { where = e.data.progress; arm(); }
      else if (e.data.result) done({ kind: 'done', result: e.data.result });
      else done({ kind: 'error', message: e.data.fatal });
    };
    w.onerror = (e) => { kill(); done({ kind: 'error', message: e.message }); };
    arm();
    w.postMessage({ id, input });
  });
}
