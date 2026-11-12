// Nomes das unidades em pt-BR para o assistente (ADENDO 06, Parte 3; tabela própria aprovada pelo usuário no A6-4).
// Uma linha por unidade que o motor aceita: [símbolo como aparece no Prisma, nome, grandeza, fator escrito à mão].
// Os símbolos seguem a lista de unidades do SMath, só os que o math.js conhece; o fator vem do math.js (só % é escrito).
import { math } from './math';
import { toMath } from './syntax';

export const UNIDADES: [string, string, string, string?][] = [
  ['%', 'Porcentagem', 'Adimensional', '0,01'],
  ['rad', 'Radiano', 'Ângulo'],
  ['°', 'Grau', 'Ângulo'],
  ['arcmin', 'Minuto de arco', 'Ângulo'],
  ['arcsec', 'Segundo de arco', 'Ângulo'],
  ['grad', 'Grado', 'Ângulo'],
  ['rpm', 'Rotação por minuto', 'Velocidade angular'],
  ['m', 'Metro', 'Comprimento'],
  ['mi', 'Milha', 'Comprimento'],
  ['in', 'Polegada', 'Comprimento'],
  ['ft', 'Pé', 'Comprimento'],
  ['yd', 'Jarda', 'Comprimento'],
  ['acre', 'Acre', 'Área'],
  ['L', 'Litro', 'Volume'],
  ['l', 'Litro', 'Volume'],
  ['gal', 'Galão', 'Volume'],
  ['g', 'Grama', 'Massa'],
  ['kg', 'Quilograma', 'Massa'],
  ['t', 'Tonelada', 'Massa'],
  ['ton', 'Tonelada curta', 'Massa'],
  ['ct', 'Quilate', 'Massa'],
  ['oz', 'Onça', 'Massa'],
  ['lb', 'Libra', 'Massa'],
  ['s', 'Segundo', 'Tempo'],
  ['sec', 'Segundo', 'Tempo'],
  ['min', 'Minuto', 'Tempo'],
  ['h', 'Hora', 'Tempo'],
  ['hr', 'Hora', 'Tempo'],
  ['dia', 'Dia', 'Tempo'],
  ['day', 'Dia', 'Tempo'],
  ['week', 'Semana', 'Tempo'],
  ['month', 'Mês', 'Tempo'],
  ['Hz', 'Hertz', 'Frequência'],
  ['N', 'Newton', 'Força'],
  ['dyn', 'Dina', 'Força'],
  ['lbf', 'Libra-força', 'Força'],
  ['kgf', 'Quilograma-força', 'Força'],
  ['kip', 'Quilolibra-força', 'Força'],
  ['Pa', 'Pascal', 'Pressão'],
  ['atm', 'Atmosfera', 'Pressão'],
  ['bar', 'Bar', 'Pressão'],
  ['torr', 'Torr', 'Pressão'],
  ['mmHg', 'Milímetro de mercúrio', 'Pressão'],
  ['psi', 'Libra-força por polegada quadrada', 'Pressão'],
  ['J', 'Joule', 'Energia'],
  ['eV', 'Elétron-volt', 'Energia'],
  ['erg', 'Erg', 'Energia'],
  ['BTU', 'Unidade térmica britânica', 'Energia'],
  ['W', 'Watt', 'Potência'],
  ['Wp', 'Watt-pico', 'Potência'],
  ['hp', 'Horsepower', 'Potência'],
  ['A', 'Ampere', 'Corrente elétrica'],
  ['V', 'Volt', 'Potencial elétrico'],
  ['C', 'Coulomb', 'Carga elétrica'],
  ['Ω', 'Ohm', 'Resistência elétrica'],
  ['S', 'Siemens', 'Condutância elétrica'],
  ['F', 'Farad', 'Capacitância'],
  ['H', 'Henry', 'Indutância'],
  ['Wb', 'Weber', 'Fluxo magnético'],
  ['T', 'Tesla', 'Densidade de fluxo magnético'],
  ['K', 'Kelvin', 'Temperatura'],
  ['°C', 'Grau Celsius', 'Temperatura'],
  ['°F', 'Grau Fahrenheit', 'Temperatura'],
  ['mol', 'Mol', 'Quantidade de substância'],
  ['cd', 'Candela', 'Intensidade luminosa'],
  ['bit', 'Bit', 'Informação'],
  ['B', 'Byte', 'Informação'],
  ['byte', 'Byte', 'Informação'],
];

/** Prefixos do math.js em pt-BR. */
const PREFIXOS: Record<string, string> = {
  y: 'yocto', z: 'zepto', a: 'atto', f: 'femto', p: 'pico', n: 'nano', u: 'micro', m: 'mili', c: 'centi', d: 'deci',
  da: 'deca', h: 'hecto', k: 'quilo', M: 'mega', G: 'giga', T: 'tera', P: 'peta', E: 'exa', Z: 'zetta', Y: 'yotta',
};

/** Unidade conhecida pelo math.js (para classificar identificadores, B4). */
export function isKnownUnit(name: string): boolean {
  if (name === '%') return true;
  try { return math.Unit.isValuelessUnit(toMath(name)); } catch { return false; }
}

export type UnitInfo = { nome: string; grandeza: string; fator?: string };

const BY_SYMBOL = new Map(UNIDADES.map(([s, nome, grandeza, fator]) => [s, { nome, grandeza, fator }]));
let byMathName: Map<string, string> | null = null; // nome do math.js -> símbolo da tabela, montado na primeira consulta

/** Nome e grandeza; unidade com prefixo fora da tabela (mm, kN) sai como "Metro com prefixo mili". */
export function unitInfo(sym: string): UnitInfo | null {
  const own = BY_SYMBOL.get(sym);
  if (own) return own;
  if (!isKnownUnit(sym)) return null;
  try {
    const u = math.unit(toMath(sym)).units[0] as unknown as { unit: { name: string }; prefix: { name: string } };
    byMathName ??= new Map(UNIDADES.flatMap(([s]) => { try { return [[(math.unit(toMath(s)).units[0] as unknown as { unit: { name: string } }).unit.name, s]]; } catch { return []; } }));
    const base = byMathName.get(u.unit.name);
    const prefix = PREFIXOS[u.prefix.name];
    if (!base || !prefix) return null;
    const info = BY_SYMBOL.get(base)!;
    return { nome: `${info.nome} com prefixo ${prefix}`, grandeza: info.grandeza };
  } catch { return null; }
}

/** 1 unidade em unidades SI: { número, unidade do math.js }. Sem fator para unidade de base, com deslocamento (°C) ou inválida. */
export function unitFactor(sym: string): { value: number; unitRaw: string } | null {
  if (sym === '%') return { value: 0.01, unitRaw: '' };
  try {
    const one = math.unit(1, toMath(sym));
    if (one.units.some((x) => (x.unit as unknown as { offset: number }).offset)) return null;
    const si = one.toSI();
    const value = si.toNumber();
    const unitRaw = si.formatUnits();
    if (value === 1 && unitRaw === toMath(sym)) return null; // unidade de base: 1 s = 1 s não diz nada
    return { value, unitRaw };
  } catch { return null; }
}
