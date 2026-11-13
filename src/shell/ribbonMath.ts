// Guias matemáticas do ribbon (ADENDO 06, Parte 4; referencia-ribbon-matematica.dc.html). Textos das dicas da referência.
import type { StructIcon } from '../components/Icon';

/** big: 54 x 66; small: 22 px, 3 por coluna; grid: 26 x 26 só símbolo; text: nome da função (4.7). */
export type MathKind = 'big' | 'small' | 'grid' | 'text';
export type MathButton = {
  label: string;
  key: string; // atalho ou o que se digita; '' = sem atalho
  desc: string;
  sym?: string; // símbolo ou nome mostrado (STIX Two Text)
  icon?: StructIcon; // ícone de estrutura com quadradinhos
  latex?: string; // o que insere no campo (#0: seleção ou quadradinho; #@: termo à esquerda); ausente = desabilitado
};
export type MathGroup = { title: string; kind: MathKind; cols?: number; buttons: MathButton[] };

const B = (label: string, key: string, desc: string, look: string | { icon: StructIcon }, latex?: string): MathButton =>
  ({ label, key, desc, ...(typeof look === 'string' ? { sym: look } : look), latex });
const sy = (sym: string, label: string, key: string, latex: string) => B(label, key, `Insere ${sym} no cursor.`, sym, latex);
const fn = (name: string, desc: string) => B(`${name}( )`, '', desc, name, `\\operatorname{${name}}(#0)`);

const MATEMATICA: MathGroup[] = [
  { title: 'Definir e avaliar', kind: 'big', buttons: [
    B('Definir', ':', 'Cria uma definição. O = também define quando o nome à esquerda ainda não existe.', '≔', '\\coloneq '),
    B('Avaliar', '=', 'Mostra o resultado. Depois do resultado, o marcador aceita uma unidade ou escala para converter.', '=', '='),
  ] },
  { title: 'Estruturas', kind: 'small', buttons: [
    B('Fração', '/', 'Cria uma fração com o termo à esquerda no numerador.', { icon: 'frac' }, '\\frac{#@}{#?}'),
    B('Potência', '^', 'Abre o expoente.', { icon: 'pow' }, '#@^{#?}'),
    B('Índice', '. ou ,', 'Índice de nome (subscrito literal), como em S.trafo.', { icon: 'sub' }, '#@_{#?}'),
    B('Raiz', '\\', 'Raiz quadrada.', { icon: 'sqrt' }, '\\sqrt{#0}'),
    B('Raiz n-ésima', 'Ctrl+\\', 'Raiz de qualquer índice.', { icon: 'nroot' }, '\\sqrt[#?]{#0}'),
    B('Módulo', 'abs(', 'Valor absoluto ou módulo de complexo. Digitar abs( também cria as barras.', { icon: 'abs' }, '\\left\\lvert #0\\right\\rvert'),
    B('Parênteses', '(', 'Envolve a seleção em parênteses.', { icon: 'paren' }, '\\left(#0\\right)'),
    B('Fatorial', '!', 'n!', 'n!'), // o formato ainda não lê "!" (pendente)
    B('Mais ou menos', '', 'Operador ±. A tecla % insere a unidade porcento, como no SMath.', '±'), // o formato ainda não lê "±" (pendente)
  ] },
  { title: 'Constantes', kind: 'grid', cols: 2, buttons: [
    sy('π', 'Pi', 'Ctrl+Shift+P', '\\pi '), sy('∞', 'Infinito', 'Ctrl+Shift+Z', '\\infty '),
    sy('𝐢', 'Unidade imaginária', 'i', '\\class{imag}{\\mathbf{i}}'), sy('e', 'Número de Euler', 'e', '\\class{imag}{\\mathbf{e}}'),
  ] },
  { title: 'Funções', kind: 'text', cols: 4, buttons: [
    fn('sin', 'Seno'), fn('cos', 'Cosseno'), fn('tan', 'Tangente'), fn('cot', 'Cotangente'), fn('ln', 'Logaritmo natural'),
    fn('log', 'Logaritmo na base 10, ou na base dada como 2º argumento'), fn('exp', 'Exponencial'), fn('sign', 'Sinal'),
    fn('arg', 'Argumento de complexo, em radianos (converta para deg no marcador)'), fn('re', 'Parte real'), fn('im', 'Parte imaginária'), fn('conj', 'Conjugado'),
  ] },
  { title: 'Catálogo', kind: 'big', buttons: [B('Todas as funções', 'Ctrl+E', 'Abre o catálogo com todas as funções nativas e das bibliotecas, com busca e descrição.', { icon: 'fx' })] }, // A6-7
  { title: 'Cálculo', kind: 'big', buttons: [
    B('Somatório', 'sum(', 'Somatório com índice, início e fim.', 'Σ', '\\sum_{#0=#?}^{#?}#?'),
    B('Produtório', 'product(', 'Produtório com índice, início e fim.', 'Π', '\\operatorname{product}(#0;\\,#?;\\,#?;\\,#?)'),
    B('Derivada', 'diff(', 'Derivada em relação a uma variável.', 'd⁄dx', '\\operatorname{diff}(#0;\\,#?)'),
    B('Integral', 'int(', 'Integral definida.', '∫', '\\int_{#0}^{#?}#?\\mathrm{d}#?'),
  ] },
  { title: 'Condições', kind: 'small', buttons: [ // o formato ainda não lê casos nem intervalos (pendente)
    B('Por partes', '', 'Função definida por casos.', { icon: 'cases' }),
    B('a < x < b', '', 'Intervalo aberto.', '<'),
    B('a ≤ x ≤ b', '', 'Intervalo fechado.', '≤'),
  ] },
];

/** Guias com conteúdo matemático; Matrizes, Lógica e programação e Símbolos chegam no A6-6. */
export const MATH_RIBBON: Record<string, MathGroup[]> = { matematica: MATEMATICA, matrizes: [], logica: [], simbolos: [] };
