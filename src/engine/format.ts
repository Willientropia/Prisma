// Exibição de números e unidades (config.yaml: casas decimais e separador; padrão 2 e vírgula).
export type FormatOpts = { decimals: number; sep: string };
export const DEFAULT_FORMAT: FormatOpts = { decimals: 2, sep: ',' };

/** |x| >= 0,1: casas fixas (1,79; 2,20; 712,80). Menor: 3 algarismos (0,0214). Extremos: notação científica. */
export function fmtNum(x: number, { decimals, sep }: FormatOpts = DEFAULT_FORMAT): string {
  if (!Number.isFinite(x)) return String(x);
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
