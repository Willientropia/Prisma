// Roda evaluate() numa linha de comando: lê {lines, symbolic} do stdin e escreve as linhas do bloco em JSON.
// Existe para o teste dar prazo próprio a uma entrada que pode travar (o processo é morto pelo teste).
import { evaluate } from '../../src/engine/evaluate';

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', () => {
  const { lines, symbolic } = JSON.parse(data) as { lines: string[]; symbolic: boolean };
  const t0 = performance.now();
  const out = evaluate({ libs: [], symbolic, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
  process.stdout.write(JSON.stringify({ ms: performance.now() - t0, out }));
});
