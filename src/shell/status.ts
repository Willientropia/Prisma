// Texto da barra de status depois do cálculo (fase 2; referencia-design.dc.html).

/** "1 resultado", "2 resultados", "0 resultados" (BUG-038: era sempre plural). */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function statusSummary(s: { evals: number; checks: number; passed: number; errors: number }): string {
  return [
    `Pronto · ${count(s.evals, 'resultado', 'resultados')}`,
    s.checks && `${s.passed} de ${s.checks} verificações aprovadas`,
    s.errors && count(s.errors, 'erro', 'erros'),
  ].filter(Boolean).join(' · ');
}
