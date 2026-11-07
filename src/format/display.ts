// Formatação para a tela (o arquivo guarda ponto decimal e unidades em ASCII).
export const basename = (p: string) => p.slice(p.lastIndexOf('/') + 1);
export const dirname = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
export const vaultName = (root: string) => root.split(/[\\/]/).filter(Boolean).pop() ?? root;

export const fmtNumber = (v: string, sep = ',') => v.replace('.', sep);
export const fmtUnit = (u: string) => u.replace(/\^2\b/g, '²').replace(/\^3\b/g, '³').replace(/\*/g, '·');

/** "hoje, 11:40", "ontem, 18:05" ou "04/11/2026". */
export function fmtWhen(ms: number | null, now = new Date()): string {
  if (!ms) return '';
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `hoje, ${hm}`;
  if (diff === 1) return `ontem, ${hm}`;
  return d.toLocaleDateString('pt-BR');
}
