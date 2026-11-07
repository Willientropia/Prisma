export const APP_NAME = 'Prisma';
export const APP_ID = 'prisma';
export const APP_YEAR = 2026;

export type DocType = 'caderno' | 'folha' | 'tex' | 'lib';

export const TYPE_INFO: Record<DocType, { tag: string; label: string; color: string }> = {
  caderno: { tag: 'CAD', label: 'Caderno', color: 'var(--type-caderno)' },
  folha: { tag: 'FOL', label: 'Folha livre', color: 'var(--type-folha)' },
  tex: { tag: 'TEX', label: 'Documento LaTeX', color: 'var(--type-tex)' },
  lib: { tag: 'LIB', label: 'Biblioteca', color: 'var(--type-lib)' },
};
