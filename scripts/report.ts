// test-results/RELATORIO.md no formato do ADENDO 03, C6.

export type Step = { name: string; ok: boolean; ms: number; detail?: string };
export type Origin = { origem: string; criterios: number; automatizados: number; manuais: number; pendentes: number; falhando: number };
export type ReportData = {
  date: Date;
  ok: boolean;
  tests: { total: number; failed: number; skipped: number };
  origins: Origin[];
  coverage: { motor: number; formato: number; geral: number };
  minimums: { motor: number; formato: number; geral: number };
  perf: { recalc: number | null; open: number | null; app?: number | null };
  newTests: number;
  steps: Step[];
  problems: string[];
};

const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} %`;
const ms = (n: number | null | undefined) => (n == null ? 'não medido' : `${Math.round(n)} ms`);
const two = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;

export function renderReport(r: ReportData): string {
  const out = [
    `# Relatório de verificação, ${stamp(r.date)}`,
    '',
    `Resultado: ${r.ok ? 'APROVADO' : 'REPROVADO'} (${r.tests.total} testes, ${r.tests.failed} falhas, ${r.tests.skipped} pulados)`,
    '',
    '| Origem | Critérios | Automatizados | Manuais | Falhando |',
    '|---|---|---|---|---|',
    ...r.origins.map((o) => `| ${o.origem} | ${o.criterios}${o.pendentes ? ` (+${o.pendentes} pendente${o.pendentes > 1 ? 's' : ''})` : ''} | ${o.automatizados} | ${o.manuais} | ${o.falhando} |`),
    '',
    `Cobertura: motor ${pct(r.coverage.motor)} (mínimo ${r.minimums.motor}), formato ${pct(r.coverage.formato)} (mínimo ${r.minimums.formato}), geral ${pct(r.coverage.geral)} (mínimo ${r.minimums.geral})`,
    `Desempenho: recálculo string-3 ${ms(r.perf.recalc)} (limite 150), abertura de arquivo ${ms(r.perf.open)} (limite 500)${r.perf.app !== undefined ? `, abertura do app ${ms(r.perf.app)} (limite 3000)` : ''}`,
    `Novos testes nesta tarefa: ${r.newTests}`,
    '',
    '## Etapas',
    '',
    '| Etapa | Resultado | Tempo |',
    '|---|---|---|',
    ...r.steps.map((s) => `| ${s.name} | ${s.ok ? 'ok' : 'FALHOU'}${s.detail ? `: ${s.detail}` : ''} | ${(s.ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s |`),
  ];
  if (r.problems.length) out.push('', '## Problemas', '', ...r.problems.map((p) => `- ${p}`));
  return `${out.join('\n')}\n`;
}
