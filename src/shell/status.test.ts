// BUG-038: a barra de status concorda o número: "1 resultado", "1 erro"; plural para 0 e para mais de 1
// (referencia-design.dc.html: "Pronto · 7 células · 2 resultados · 1 verificação aprovada").
import { describe, expect, it } from 'vitest';
import { statusSummary } from './status';

describe('[BUG-038] resumo da barra de status', () => {
  it('[BUG-038] 1 resultado e 1 erro no singular', () => {
    expect(statusSummary({ evals: 1, checks: 0, passed: 0, errors: 1 })).toBe('Pronto · 1 resultado · 1 erro');
  });
  it('plural para 0 e para mais de 1', () => {
    expect(statusSummary({ evals: 0, checks: 0, passed: 0, errors: 0 })).toBe('Pronto · 0 resultados');
    expect(statusSummary({ evals: 2, checks: 0, passed: 0, errors: 3 })).toBe('Pronto · 2 resultados · 3 erros');
  });
  it('[BUG-038] verificações todas aprovadas, como no protótipo: "1 verificação aprovada", "3 verificações aprovadas"', () => {
    expect(statusSummary({ evals: 2, checks: 1, passed: 1, errors: 0 })).toBe('Pronto · 2 resultados · 1 verificação aprovada');
    expect(statusSummary({ evals: 2, checks: 3, passed: 3, errors: 0 })).toBe('Pronto · 2 resultados · 3 verificações aprovadas');
  });
  it('[BUG-038] com alguma reprovada fica "X de Y": o "de Y" é o que avisa a reprovação', () => {
    expect(statusSummary({ evals: 2, checks: 3, passed: 2, errors: 0 })).toBe('Pronto · 2 resultados · 2 de 3 verificações aprovadas');
    expect(statusSummary({ evals: 2, checks: 1, passed: 0, errors: 0 })).toBe('Pronto · 2 resultados · 0 de 1 verificações aprovadas');
  });
});
