// A6-3 (ADENDO 06, 2.4): cálculo simbólico mínimo do Ctrl+. (derivada e simplificação do math.js).
import { describe, expect, it } from 'vitest';
import { symbolic } from './symbolic';

describe('A6-3: symbolic', () => {
  it('[A6-3-30] diff(x^2, x) -> 2*x (06-24)', () => expect(symbolic('diff(x^2, x)')).toBe('2 * x'));
  it('[A6-3-31] diff com função composta: diff(sin(x)*x, x)', () => expect(symbolic('diff(sin(x)*x, x)')).toBe('cos(x) * x + sin(x)'));
  it('[A6-3-32] simplifica: x + x -> 2*x; (a+b)-b -> a', () => {
    expect(symbolic('x + x')).toBe('2 * x');
    expect(symbolic('(a + b) - b')).toBe('a');
  });
  it('[A6-3-33] sem solução simbólica devolve null: integral, vazio, texto sem sentido', () => {
    expect(symbolic('integral(sin(x), x, 0, 1)')).toBeNull();
    expect(symbolic('')).toBeNull();
    expect(symbolic('((')).toBeNull();
  });
  it('[A6-3-34] diff pede variável: diff(x^2) sem variável não tem resultado simbólico', () => expect(symbolic('diff(x^2)')).toBeNull());
  it('[A6-3-35] expressão enorme não vai ao simplify (sem prazo): devolve null na hora', () => {
    const t0 = performance.now();
    expect(symbolic(Array.from({ length: 400 }, (_, i) => `x${i}`).join(' + '))).toBeNull();
    expect(performance.now() - t0).toBeLessThan(100);
  });
});
