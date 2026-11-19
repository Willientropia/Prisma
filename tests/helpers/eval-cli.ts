// Roda evaluate() numa linha de comando: lê {lines, symbolic} do stdin e escreve as linhas do bloco em JSON.
// Existe para o teste dar prazo próprio a uma entrada que pode travar (o processo é morto pelo teste).
// Avisa "pronto" no stderr logo antes de calcular, para o prazo não contar a partida do Node e do tsx (BUG-037).
import { evaluate } from '../../src/engine/evaluate';

let data = '';
process.stdin.on('data', (c) => (data += c));
process.stdin.on('end', async () => {
  const { lines, symbolic } = JSON.parse(data) as { lines: string[]; symbolic: boolean };
  // partida lenta de propósito (teste do BUG-037): simula a carga do Node e do tsx numa máquina ocupada
  const slow = Number(process.env.PRISMA_EVAL_PARTIDA_MS) || 0;
  if (slow) await new Promise((r) => setTimeout(r, slow));
  process.stderr.write('pronto\n'); // daqui em diante é só o cálculo: o prazo do teste começa aqui (BUG-037)
  const t0 = performance.now();
  const out = evaluate({ libs: [], symbolic, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
  process.stdout.write(JSON.stringify({ ms: performance.now() - t0, out }));
});
