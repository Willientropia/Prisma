// Contas do desenho do gráfico 2D (ADENDO 06, 5.4): marcas dos eixos, pixel e caminho da linha.
import type { View } from '../../format/grafico';

/** Marcas em números redondos (1, 2 ou 5 × 10ⁿ), no máximo `count` na faixa. */
export function niceTicks(lo: number, hi: number, count: number): { step: number; ticks: number[] } {
  const raw = (hi - lo) / Math.max(1, count);
  if (!(raw > 0) || !Number.isFinite(raw)) return { step: 1, ticks: [] };
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw * (1 - 1e-9))!;
  const ticks: number[] = [];
  // guarda de progresso: com lo/step perto de 2^53, k++ não muda k e o laço não acabaria (zoom extremo)
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + step * 1e-9 && ticks.length < 2 * count + 2; k++) ticks.push(Number((k * step).toPrecision(12)) || 0);
  return { step, ticks };
}

export type Frame = { left: number; top: number; w: number; h: number; view: View };
export const px = (f: Frame, x: number) => f.left + ((x - f.view.x[0]) / (f.view.x[1] - f.view.x[0])) * f.w;
export const py = (f: Frame, y: number) => f.top + f.h - ((y - f.view.y[0]) / (f.view.y[1] - f.view.y[0])) * f.h;
/** Do pixel para o valor (para o zoom no ponteiro). */
export const unpx = (f: Frame, X: number, Y: number) => ({
  x: f.view.x[0] + ((X - f.left) / f.w) * (f.view.x[1] - f.view.x[0]),
  y: f.view.y[0] + ((f.top + f.h - Y) / f.h) * (f.view.y[1] - f.view.y[0]),
});

const LIM = 1e5; // pixel muito fora da área: o recorte esconde, e o SVG não recebe números enormes
const clamp = (v: number) => Math.max(-LIM, Math.min(LIM, v));
/** Caminho SVG: y null levanta a caneta (assíntota, fora do domínio). */
export function pathOf(f: Frame, xs: number[], ys: (number | null)[]): string {
  let d = '', down = false;
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y === null) { down = false; continue; }
    d += `${down ? 'L' : 'M'}${clamp(px(f, xs[i])).toFixed(2)} ${clamp(py(f, y)).toFixed(2)}`;
    down = true;
  }
  return d;
}

/** Zoom em torno de (cx, cy): fator > 1 afasta. */
export function zoomView(v: View, cx: number, cy: number, fx: number, fy: number): View {
  const axis = (a: [number, number], c: number, k: number): [number, number] => {
    const b: [number, number] = [c + (a[0] - c) * k, c + (a[1] - c) * k];
    return b[1] - b[0] < MIN_SPAN * Math.max(1, Math.abs(b[0]), Math.abs(b[1])) ? a : b; // mais perto que isso a precisão do número acaba
  };
  return { x: axis(v.x, cx, fx), y: axis(v.y, cy, fy) };
}
const MIN_SPAN = 1e-9;

const SUP: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** "3e6" do formato numérico vira 3·10⁶ no eixo. */
export const tickText = (t: string) => t.replace(/e\+?(-?\d+)$/, (_, n: string) => `·10${[...n].map((c) => SUP[c]).join('')}`);
