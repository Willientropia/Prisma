// A6-8 (ADENDO 06, 5.3): integral Gauss-Kronrod G7-K15 e derivada de Ridders no motor.
// Os testes comparam números com tolerância explícita, nunca o texto formatado (o formato padrão muda no A6-1).
import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { math } from './math';

const run = (lines: string[], symbolic = true) => evaluate({ libs: [], symbolic, blocks: [{ key: 'b', type: 'calc', lines }] }).blocks.b;
const last = (lines: string[], symbolic = true) => run(lines, symbolic).at(-1)!;
const ev = (s: string) => math.evaluate(s) as never as { re: number; im: number } & number;
const F = 'F(x) := abs(1 + e^(5*(x - 2)))';

describe('A6-8: integral', () => {
  it('[A6-8-01] caso 5.1: ∫₀² F(x) dx = 2 + (1 − e⁻¹⁰)/5, F(0), F(1), F(2), F(2,2) (06-35)', () => {
    const exact = 2 + (1 - Math.exp(-10)) / 5;
    for (const symbolic of [true, false]) {
      const r = last([F, 'integral(F(x), x, 0, 2) = ?'], symbolic);
      expect(r.error).toBeUndefined();
      expect(Math.abs(r.value! - exact)).toBeLessThan(1e-9);
    }
    const f = (x: number) => last([F, `F(${x}) = ?`]).value!;
    expect(Math.abs(f(0) - 1.0000454)).toBeLessThan(1e-6);
    expect(Math.abs(f(1) - 1.0067379)).toBeLessThan(1e-6);
    expect(f(2)).toBe(2);
    expect(Math.abs(f(2.2) - 3.7182818)).toBeLessThan(1e-6);
  });

  it('[A6-8-02] G7-K15 integra polinômio de grau 14 sem erro e respeita limites invertidos', () => {
    expect(Math.abs(ev('integral(x^14, x, -1, 1)') - 2 / 15)).toBeLessThan(1e-14);
    expect(Math.abs(ev('integral(x^2, x, 3, 0)') + 9)).toBeLessThan(1e-12);
    expect(ev('integral(x, x, 2, 2)')).toBe(0);
  });

  it('[A6-8-03] limites infinitos: ∫₀^∞ e^(−x) dx = 1, ∫₋∞^∞ e^(−x²) dx = √π (06-36)', () => {
    expect(Math.abs(ev('integral(exp(-x), x, 0, Infinity)') - 1)).toBeLessThan(1e-9);
    expect(Math.abs(ev('integral(exp(x), x, -Infinity, 0)') - 1)).toBeLessThan(1e-9);
    expect(Math.abs(ev('integral(exp(-x^2), x, -Infinity, Infinity)') - Math.sqrt(Math.PI))).toBeLessThan(1e-9);
    const r = last(['integral(e^(-x), x, 0, ∞) = ?']);
    expect(Math.abs(r.value! - 1)).toBeLessThan(1e-9);
  });

  it('[A6-8-04] unidade do resultado = unidade do integrando × unidade da variável: ∫₀^(2 s) 3 m/s dt = 6 m (06-36)', () => {
    const r = last(['integral(3 m/s, t, 0, 2 s) = ?']);
    expect(r.error).toBeUndefined();
    expect(r.unitRaw).toBe('m');
    expect(Math.abs(r.value! - 6)).toBeLessThan(1e-9);
    const p = last(['integral(2 W, t, 0, 3 h) = ?']); // unidades de base diferentes: W·h
    expect(p.error).toBeUndefined();
    expect(Math.abs(math.unit(p.value!, p.unitRaw!).toNumber('Wh') - 6)).toBeLessThan(1e-9);
  });

  it('[A6-8-05] integrando complexo: parte real e imaginária separadas', () => {
    const z = ev('integral(exp(ⅈ*x), x, 0, pi)');
    expect(Math.abs(z.re)).toBeLessThan(1e-10);
    expect(Math.abs(z.im - 2)).toBeLessThan(1e-10);
    const w = ev('integral(x + 2*ⅈ*x, x, 0, 1)');
    expect(Math.abs(w.re - 0.5)).toBeLessThan(1e-12);
    expect(Math.abs(w.im - 1)).toBeLessThan(1e-12);
  });

  it('[A6-8-06] sem convergência: devolve o valor e o aviso com a estimativa de erro; termina rápido', () => {
    const t0 = performance.now();
    const r = last(['integral(1/x, x, 0, 1) = ?']);
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(r.error).toBeUndefined();
    expect(r.warning).toMatch(/^A integral pode não ter convergido \(estimativa de erro: .+\)$/);
    expect(last(['integral(x^2, x, 0, 1) = ?']).warning).toBeUndefined();
  });

  it('[A6-8-07] forma antiga integral(f, a, b) com função continua valendo', () => {
    expect(Math.abs(last(['f(x) := x^2 - 2', 'integral(f, 0, 3) = ?']).value! - 3)).toBeLessThan(1e-12);
  });
});

describe('A6-8: derivada numérica', () => {
  it('[A6-8-08] diff(expr, x, ponto) por diferenças centrais com Richardson', () => {
    expect(Math.abs(ev('diff(x^2, x, 3)') - 6)).toBeLessThan(1e-8);
    expect(Math.abs(ev('diff(sin(x), x, 0)') - 1)).toBeLessThan(1e-9);
    expect(Math.abs(ev('diff(exp(x), x, 1)') - Math.E)).toBeLessThan(1e-8);
    expect(Math.abs(ev('diff(sqrt(x), x, 0.01)') - 5)).toBeLessThan(1e-6); // perto do limite do domínio
  });

  it('[A6-8-09] diff(expr, x) usa o valor atual de x e não o altera; unidade = f / x', () => {
    const r = run(['x := 3', 'diff(x^2, x) = ?', 'x = ?']);
    expect(Math.abs(r[1].value! - 6)).toBeLessThan(1e-8);
    expect(r[2].value).toBe(3);
    const v = last(['diff(5 m*(t/(1 s))^2, t, 3 s) = ?']);
    expect(v.error).toBeUndefined();
    expect(Math.abs(math.unit(v.value!, v.unitRaw!).toNumber('m/s') - 30)).toBeLessThan(1e-6);
  });

  it('[A6-8-10] diff com x indefinido dá erro de variável não definida', () => {
    expect(last(['diff(y^2, y) = ?'], false).error).toMatch(/não definida: y/);
  });
});

describe('A6-8: variável de integração na folha (modo simbólico)', () => {
  it('[A6-8-13] x definido não é trocado dentro de integral(…, x, …): só y falta; x aberto é sombreado pela variável da integral', () => {
    const r = last(['x := 3', 'integral(x*y, x, 0, 1) = ?']);
    expect(r.missing).toEqual(['y']);
    expect(r.symbolic).toBe('integral(x*y, x, 0, 1)');
    const r2 = last(['x := y + 1', 'integral(x^2, x, 0, 1) = ?']);
    expect(r2.missing).toBeUndefined(); // dentro da integral x é a variável dela, não o x := y + 1
    expect(Math.abs(r2.value! - 1 / 3)).toBeLessThan(1e-12);
  });

  it('[A6-8-14] definição em aberto com integral é reavaliada quando o nome que falta aparece', () => {
    const r = run(['x := 3', 'g := integral(x*y, x, 0, 1)', 'y := 2', 'g = ?']).at(-1)!;
    expect(r.error).toBeUndefined();
    expect(Math.abs(r.value! - 1)).toBeLessThan(1e-12);
  });

  it('[A6-8-15] forma antiga integral(f, a, b) com limite indefinido fica em aberto; ∞ volta como ∞', () => {
    const r = last(['f(x) := x^2', 'integral(f, a, 1) = ?']);
    expect(r.missing).toEqual(['a']);
    expect(last(['integral(e^(-x), x, 0, ∞)*y = ?']).symbolic).toContain('∞');
  });

  it('[A6-8-16] diff de vetor do math.js continua valendo', () => {
    expect(String(math.evaluate('diff([1, 2, 4])'))).toBe('[1, 2]');
  });

  it('[A6-8-17] limite com unidade e o outro número puro diferente de zero é erro; 0 vale; °C é recusado', () => {
    expect(last(['integral(1 m, t, 2 s, 3) = ?'], false).error).toMatch(/Unidades incompatíveis/);
    expect(last(['integral(1 m, t, 0, 3 s) = ?'], false).error).toBeUndefined();
    expect(last(['integral(1, t, 0, 3 degC) = ?'], false).error).toMatch(/deslocamento/);
  });
});

describe('A6-2: sum com índice e nthroot', () => {
  it('[A6-2-30] sum(expr, i, a, b) soma com i de a a b; o i do laço não vaza para a folha', () => {
    expect(last(['sum(i^2, i, 1, 10) = ?']).value).toBe(385);
    expect(last(['i := 7', 'sum(i, i, 1, 4) = ?', 'i = ?']).value).toBe(7);
  });
  it('[A6-2-30] sum(vetor) e sum(a, b, c) do math.js continuam valendo; soma sem termos dá 0', () => {
    expect(last(['sum([1, 2, 3]) = ?']).value).toBe(6);
    expect(last(['sum(1, 2, 3) = ?']).value).toBe(6);
    expect(last(['sum(i, i, 5, 1) = ?']).value).toBe(0);
  });
  it('[A6-2-30] início ou fim não inteiro e soma gigante dão erro, sem travar', () => {
    expect(last(['sum(i, i, 1, 2.5) = ?']).error).toMatch(/inteiros/);
    expect(last(['sum(i, i, 1, 1e12) = ?']).error).toMatch(/termos demais/);
  });
  it('[A6-2-30] i do corpo é da soma: não falta definir', () => {
    const r = last(['sum(i*k, i, 1, 3) = ?']);
    expect(r.error ?? '').not.toMatch(/\bi\b/);
  });
  it('[A6-2-31] nthroot(x, n): raiz n-ésima', () => {
    expect(last(['nthroot(27, 3) = ?']).value).toBeCloseTo(3, 12);
  });
});
