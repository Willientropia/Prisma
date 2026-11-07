// Caminhos e formatação para a tela. Internamente todo caminho usa "/" (o Windows aceita);
// na tela, caminho com letra de unidade aparece com "\".

export const normPath = (p: string) => p.replace(/\\/g, '/');
export const basename = (p: string) => normPath(p).replace(/\/+$/, '').split('/').pop() ?? p;
export const dirname = (p: string) => { const n = normPath(p); const i = n.lastIndexOf('/'); return i < 0 ? '' : i === 0 ? '/' : n.slice(0, i); };
/** Nome sem extensão: "cabos-cc.prsm" -> "cabos-cc". */
export const stem = (p: string) => basename(p).replace(/\.[^.]+$/, '');

/** Junta pasta + caminho relativo, resolvendo "." e "..". */
export function joinPath(dir: string, rel: string): string {
  const r = normPath(rel);
  if (/^([A-Za-z]:)?\//.test(r)) return r; // já é absoluto
  const out = normPath(dir).split('/');
  for (const part of r.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') { if (out.length > 1) out.pop(); } else out.push(part);
  }
  return out.join('/');
}

/** Caminho de `to` relativo à pasta `fromDir`, com "/" (o que vai no .prsp). Outra unidade: devolve absoluto. */
export function relativePath(fromDir: string, to: string): string {
  const a = normPath(fromDir).split('/').filter(Boolean);
  const b = normPath(to).split('/').filter(Boolean);
  if (a[0]?.toLowerCase() !== b[0]?.toLowerCase()) return normPath(to);
  let i = 0;
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

export const samePath = (a: string, b: string) => normPath(a).toLowerCase() === normPath(b).toLowerCase();

export const displayPath = (p: string) => (/^[A-Za-z]:\//.test(normPath(p)) ? normPath(p).replace(/\//g, '\\') : normPath(p));

/** "...\Sol Tech\Boa Vista\calculos": as últimas pastas, com o caminho completo no title. */
export function shortenPath(p: string, keep = 3): string {
  const d = displayPath(p);
  const sep = d.includes('\\') ? '\\' : '/';
  const parts = d.split(sep).filter(Boolean);
  return parts.length <= keep ? d : `...${sep}${parts.slice(-keep).join(sep)}`;
}

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
