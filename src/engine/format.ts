// Exibição de números e unidades (config.yaml: casas decimais e separador; padrão 2 e vírgula).
/**
 * mode ausente: o formato de sempre do Prisma (arquivo novo). Com mode, o do SMath (ADENDO 05, E4.2):
 * decimals = casas (decimais) ou algarismos (significativos); trailingZeros; expThreshold = notação
 * científica a partir de 10^n e abaixo de 10^-n. A notação científica sai como "1,475e-3"; a tela
 * desenha 1,475·10⁻³ (nunca "e-3" na tela).
 */
export type FormatOpts = { decimals: number; sep: string; mode?: 'decimais' | 'significativos'; trailingZeros?: boolean; expThreshold?: number };
export const DEFAULT_FORMAT: FormatOpts = { decimals: 2, sep: ',' };

/** |x| >= 0,1: casas fixas (1,79; 2,20; 712,80). Menor: 3 algarismos (0,0214). Extremos: notação científica. */
export function fmtNum(x: number, opts: FormatOpts = DEFAULT_FORMAT): string {
  const { decimals, sep } = opts;
  if (!Number.isFinite(x)) return String(x);
  if (opts.mode) return fmtSmath(x, opts);
  const a = Math.abs(x);
  let s: string;
  if (a !== 0 && (a >= 1e9 || a < 1e-4)) s = x.toExponential(2);
  else if (a >= 0.1 || a === 0) {
    // arredonda no decimal (2,685 vira 2,69), não no binário (onde 2,685 é 2,68499...)
    const r = Math.sign(x) * Number(`${Math.round(Number(`${Number(a.toPrecision(12))}e${decimals}`))}e-${decimals}`);
    s = r.toFixed(decimals); // casas fixas: 2,20 V (ADENDO 02, B10.7)
  }
  else s = String(Number(x.toPrecision(3)));
  return s.replace('.', sep);
}

/** "(ohm mm^2) / m" -> "Ω·mm²/m". */
export function prettyUnit(u: string): string {
  return u
    .replace(/[()]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, '·')
    .replace(/ohm/g, 'Ω')
    .replace(/degC/g, '°C')
    .replace(/degF/g, '°F')
    .replace(/\bdeg\b/g, '°')
    .replace(/\^-1\b/g, '⁻¹')
    .replace(/\^2\b/g, '²')
    .replace(/\^3\b/g, '³');
}

// Margem de ATENÇÃO das verificações (config.yaml: verificacao.margem_atencao; bloco: atencao=10%).
export const DEFAULT_MARGIN = 0.2;

/** "20 %", "20%", "12,5 %" ou 20 (sempre em por cento) para fração; fora de 0 a 100 % não vale. */
export function parseMargin(v: unknown): number | undefined {
  const m = typeof v === 'number' ? v : typeof v === 'string' ? /^\s*(\d+(?:[.,]\d+)?)\s*%?\s*$/.exec(v)?.[1]?.replace(',', '.') : undefined;
  const n = Number(m) / 100;
  return m !== undefined && Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
}

/** Formato do SMath (E4.2): casas decimais ou algarismos significativos, zeros à direita opcionais. */
function fmtSmath(x: number, o: FormatOpts): string {
  const a = Math.abs(x);
  const th = o.expThreshold ?? 5;
  const digits = Math.max(0, Math.round(o.decimals));
  const plain = (v: number): string => {
    const av = Math.abs(v);
    let s: string;
    if (o.mode === 'significativos') {
      const p = Math.max(1, digits);
      const r = av === 0 ? 0 : Number(v.toPrecision(p));
      const dec = r === 0 ? 0 : Math.max(0, p - 1 - Math.floor(Math.log10(Math.abs(r))));
      s = r.toFixed(dec);
    } else s = (Math.sign(v) * Number(`${Math.round(Number(`${Number(av.toPrecision(12))}e${digits}`))}e-${digits}`)).toFixed(digits);
    if (!o.trailingZeros && s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('.', o.sep);
  };
  const exp10 = a === 0 ? 0 : Math.floor(Math.log10(a));
  if (a !== 0 && (exp10 >= th || exp10 <= -th)) { // pelo expoente, como o SMath: limite 3 -> 1,475·10⁻³ e 1·10³
    let e = Math.floor(Math.log10(a));
    let m = x / 10 ** e;
    if (Math.abs(Number(plain(m).replace(o.sep, '.'))) >= 10) { e++; m = x / 10 ** e; } // 9,9996 arredonda para 10
    return `${plain(m)}e${e}`;
  }
  return plain(x);
}

/** Complexo na tela (E4.2): "0,11 + 0,5655·i"; parte imaginária negativa com "−". */
export function fmtComplex(re: number, im: number, o: FormatOpts = DEFAULT_FORMAT): string {
  const scale = Math.max(Math.abs(re), Math.abs(im), 1e-300);
  const zero = (n: number) => Math.abs(n) <= 1e-12 * scale;
  if (zero(im)) return fmtNum(re, o);
  const ims = `${fmtNum(Math.abs(im), o)}·i`;
  if (zero(re)) return im < 0 ? `−${ims}` : ims;
  return `${fmtNum(re, o)} ${im < 0 ? '−' : '+'} ${ims}`;
}
