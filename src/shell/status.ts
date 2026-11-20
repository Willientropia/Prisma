// Texto da barra de status depois do cálculo (fase 2; referencia-design.dc.html).

/** "1 resultado", "2 resultados", "0 resultados" (BUG-038: era sempre plural). */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function statusSummary(s: { evals: number; checks: number; passed: number; errors: number }): string {
  return [
    `Pronto · ${count(s.evals, 'resultado', 'resultados')}`,
    // todas aprovadas: como no protótipo ("1 verificação aprovada"); com alguma reprovada, o "de Y" avisa (decisão do usuário, 20/11)
    s.checks && (s.passed === s.checks ? count(s.checks, 'verificação aprovada', 'verificações aprovadas') : `${s.passed} de ${s.checks} verificações aprovadas`),
    s.errors && count(s.errors, 'erro', 'erros'),
  ].filter(Boolean).join(' · ');
}
