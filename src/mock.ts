// Dados que ainda não vêm do cofre: modelos de fábrica (fase 7) e formatos de exportação (fase 6).

export const MODELS: { name: string; kind: string; color: string }[] = [
  { name: 'Memorial de cálculo FV', kind: 'Documento LaTeX · ABNT', color: 'var(--type-folha)' },
  { name: 'Memorial p/ concessionária', kind: 'Documento LaTeX', color: 'var(--type-caderno)' },
  { name: 'Laudo técnico', kind: 'Documento LaTeX', color: 'var(--type-tex)' },
  { name: 'Relatório IEEE', kind: 'Documento LaTeX · 1 coluna', color: 'var(--type-lib)' },
  { name: 'Dimensionamento FV', kind: 'Caderno', color: 'var(--type-caderno)' },
  { name: 'Verificação rápida', kind: 'Folha livre', color: 'var(--type-folha)' },
];

export const FORMATS: [string, string, string][] = [
  ['pdf', 'PDF', 'Documento final para enviar ou imprimir.'],
  ['tex', 'LaTeX (.tex)', 'Fonte e figuras, para editar em outro editor.'],
  ['docx', 'Word (.docx)', 'Para quem exige arquivo do Word.'],
  ['md', 'Markdown (.md)', 'Notas e documentação em texto.'],
  ['html', 'HTML', 'Página com os cálculos navegáveis.'],
  ['nat', 'Nativo', 'Texto puro, legível por você e por IA.'],
  ['sm', 'SMath Studio (.sm)', 'Parcial: cálculos e unidades.'],
  ['ipynb', 'Jupyter (.ipynb)', 'Cálculos convertidos em células Python.'],
  ['csv', 'CSV', 'Somente variáveis e resultados.'],
];
