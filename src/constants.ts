export const APP_NAME = 'Prisma';
export const APP_ID = 'prisma';
export const APP_YEAR = 2026;

/** Editores (abas). Modelo abre no editor do tipo-base; projeto não é aba. */
export type DocType = 'caderno' | 'folha' | 'tex' | 'lib';

export const TYPE_INFO: Record<DocType, { tag: string; label: string; color: string }> = {
  caderno: { tag: 'CAD', label: 'Caderno', color: 'var(--type-caderno)' },
  folha: { tag: 'FOL', label: 'Folha livre', color: 'var(--type-folha)' },
  tex: { tag: 'TEX', label: 'Documento LaTeX', color: 'var(--type-tex)' },
  lib: { tag: 'LIB', label: 'Biblioteca', color: 'var(--type-lib)' },
};

/** Selo por tipo de arquivo (recentes, árvore do projeto), incluindo projeto e modelo. */
export const TIPO_INFO: Record<string, { tag: string; label: string; color: string }> = {
  caderno: TYPE_INFO.caderno,
  folha: TYPE_INFO.folha,
  tex: TYPE_INFO.tex,
  biblioteca: TYPE_INFO.lib,
  projeto: { tag: 'PRJ', label: 'Projeto', color: 'var(--type-inicio)' },
  modelo: { tag: 'MOD', label: 'Modelo', color: 'var(--type-inicio)' },
};
