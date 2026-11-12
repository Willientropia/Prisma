// A6-4 (ADENDO 06, Parte 3): lógica do assistente dinâmico, sem tela.
import { describe, expect, it } from 'vitest';
import { math } from '../engine/math';
import { UNIDADES, isKnownUnit, unitInfo } from '../engine/unidades';
import { NATIVES, baseItems, filterItems, partialName, sortItems, unitItems, varItem, type AssistItem } from './assistente';

const names = (xs: AssistItem[]) => xs.map((x) => x.name);
const median = (f: () => void) => {
  const t: number[] = [];
  for (let i = 0; i < 20; i++) { const t0 = performance.now(); f(); t.push(performance.now() - t0); }
  return t.sort((a, b) => a - b)[10];
};

describe('A6-4: assistente dinâmico', () => {
  it('[A6-4-01] toda unidade da tabela é aceita pelo motor e nenhum símbolo se repete', () => {
    const syms = UNIDADES.map((u) => u[0]);
    expect(syms.filter((s) => !isKnownUnit(s))).toEqual([]);
    expect(new Set(syms).size).toBe(syms.length);
  });

  it('[A6-4-02] toda função nativa listada existe no motor', () => {
    expect(NATIVES.filter((n) => !(n in math))).toEqual([]);
  });

  it('[A6-4-03] nome em digitação antes do cursor', () => {
    expect(partialName('x')).toBe('x');
    expect(partialName('2\\cdot x')).toBe('x');
    expect(partialName('400V')).toBe('V');
    expect(partialName('R1a')).toBe('R1a');
    expect(partialName('a\\coloneq bat')).toBe('bat');
    expect(partialName('L\\coloneq25m')).toBe('m'); // o MathLive cola o número no comando
    expect(partialName('L\\coloneq25')).toBeNull();
    expect(partialName('\\rho')).toBeNull();
    expect(partialName('\\rho ')).toBeNull();
    expect(partialName('2')).toBeNull();
    expect(partialName('a+')).toBeNull();
    expect(partialName('')).toBeNull();
    expect(partialName('2\\,\\mathrm{mm')).toBe('mm'); // dentro da unidade do apóstrofo
    expect(partialName('\\%')).toBe('%'); // BUG-019: o % digitado é o nome parcial
    expect(partialName('0{,}2\\%')).toBe('%');
    expect(partialName('\\%a')).toBe('a');
    expect(partialName('0{,}2‰')).toBe('‰');
  });

  it('[A6-4-04] ordem: grupos do 3.3, e dentro deles usuário, biblioteca, nome igual ao digitado, nativas, unidades, constantes', () => {
    const base = baseItems();
    const s = filterItems(base, 's');
    expect(s[0]).toMatchObject({ name: 's', kind: 'unit' });
    expect(names(s)).toContain('S');
    const withVar = filterItems(sortItems([varItem('s_batata'), ...base]), 's');
    expect(names(withVar).slice(0, 2)).toEqual(['s_batata', 's']);
    const v = filterItems(sortItems([varItem('v'), ...base]), 'v');
    expect(v[0]).toMatchObject({ name: 'v', kind: 'var' });
    expect(names(v).indexOf('V')).toBeGreaterThan(0);
    expect(filterItems(base, 'x')[0]).toMatchObject({ name: 'xy2pol', kind: 'native' });
    // "começa com" (mesma caixa) antes de "começa com" sem caixa, e este antes de "contém"
    const m = names(filterItems(base, 'm'));
    expect(m.indexOf('m')).toBe(0);
    expect(m.indexOf('atm')).toBeGreaterThan(m.indexOf('mol')); // "contém" depois de "começa com"
    expect(m.indexOf('mat')).toBeLessThan(m.indexOf('mi')); // dentro do grupo: nativas antes de unidades
    const big = names(filterItems(sortItems([varItem('Sb'), ...base]), 's'));
    expect(big.indexOf('Sb')).toBeGreaterThan(big.indexOf('sec')); // "começa com" sem caixa depois do de mesma caixa
    expect(big.indexOf('Sb')).toBeLessThan(big.indexOf('cos')); // e antes de "contém"
  });

  it('[A6-4-05] unidade com prefixo entra como item montado, nos dois modos; "m" não lista mm', () => {
    expect(unitInfo('mm')).toEqual({ nome: 'Metro com prefixo mili', grandeza: 'Comprimento' });
    expect(unitInfo('kN')).toEqual({ nome: 'Newton com prefixo quilo', grandeza: 'Força' });
    const all = filterItems(baseItems(), 'mm');
    expect(all[0]).toMatchObject({ name: 'mm', kind: 'unit', title: 'Metro com prefixo mili (Comprimento)' });
    expect(filterItems(unitItems(), 'mm', { units: true })[0]).toMatchObject({ name: 'mm', kind: 'unit' });
    expect(names(filterItems(baseItems(), 'm'))).not.toContain('mm');
  });

  it('[A6-4-06] detalhe de unidade: nome, grandeza e fator para o SI', () => {
    const get = (n: string) => unitItems().find((x) => x.name === n)!;
    expect(get('%').title).toBe('Porcentagem (Adimensional)');
    expect(get('%').detail).toContain('0{,}01');
    expect(get('h').title).toBe('Hora (Tempo)');
    expect(get('h').detail).toContain('3600');
    expect(get('h').detail).toContain('\\mathrm{s}');
    expect(get('s').title).toBe('Segundo (Tempo)');
    expect(get('s').detail).toBeUndefined();
    expect(get('°C').detail).toBeUndefined();
    expect(get('S').title).toBe('Siemens (Condutância elétrica)');
  });

  it('[A6-4-07] modo unidades: só itens de unidade', () => {
    const xs = filterItems(baseItems(), 's', { units: true });
    expect(xs.length).toBeGreaterThan(0);
    expect(xs.every((x) => x.kind === 'unit')).toBe(true);
    expect(filterItems(baseItems(), '', { units: true }).every((x) => x.kind === 'unit')).toBe(true);
  });

  it('[A6-4-30] nome em digitação e filtro em poucos milissegundos para qualquer entrada', () => {
    const long = 'a'.repeat(10_000);
    const many = sortItems(Array.from({ length: 5000 }, (_, i) => varItem(`v${i}`)));
    expect(median(() => partialName(long)), 'partialName 10 000 letras').toBeLessThan(5);
    expect(median(() => partialName('2\\cdot '.repeat(1500))), 'partialName 10 000 caracteres').toBeLessThan(5);
    expect(median(() => filterItems(many, 'v')), 'filtro 5 000 itens').toBeLessThan(5);
    expect(median(() => filterItems(many, long)), 'filtro com consulta de 10 000 letras').toBeLessThan(5);
  });
});
