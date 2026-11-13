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
  cmd?: string; // em vez de inserir, roda um comando (catálogo, 4.9)
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
  { title: 'Catálogo', kind: 'big', buttons: [{ ...B('Todas as funções', 'Ctrl+E', 'Abre o catálogo com todas as funções nativas e das bibliotecas, com busca e descrição.', { icon: 'fx' }), cmd: 'catalogo.funcoes' }] },
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

// 4.3 a 4.5 (A6-6). Sem latex = o formato ainda não lê (fica desabilitado, "Ainda não disponível").
const MATRIZES: MathGroup[] = [
  { title: 'Inserir', kind: 'big', buttons: [
    B('Matriz', 'Ctrl+M', 'Insere uma matriz 2 × 2.', { icon: 'matrix' }, '\\begin{bmatrix}#0&#?\\\\#?&#?\\end{bmatrix}'), // o diálogo de linhas e colunas fica pendente
    B('Vetor', '', 'Vetor coluna.', { icon: 'vector' }, '\\begin{bmatrix}#0\\\\#?\\\\#?\\end{bmatrix}'),
  ] },
  { title: 'Elementos', kind: 'small', buttons: [
    B('Elemento', '[', 'Índice de elemento: v[2], M[2;3]. Índices começam em 1.', { icon: 'elem' }, '#@_{\\lbrack #?\\rbrack}'),
    B('Intervalo', 'range(', 'range: 1..n.', '‥', '\\operatorname{range}(#0;\\,#?)'),
    B('Intervalo com passo', '', 'range com início, fim e passo.', '⋯', '\\operatorname{range}(#0;\\,#?;\\,#?)'),
  ] },
  { title: 'Operações', kind: 'small', buttons: [
    B('Transposta', 'Ctrl+1', 'Aᵀ', 'ᵀ', '#@^{T}'),
    B('Inversa', '^-1', 'A⁻¹', '⁻¹', '#@^{-1}'),
    B('Determinante', 'det(', '|A|', '‖', '\\operatorname{det}(#0)'),
    B('Menor', '', 'M com índices i, j.', 'M'),
    B('Cofator', '', 'A com índices i, j.', 'A'),
    B('Produto vetorial', 'cross(', 'a × b', '×', '\\operatorname{cross}(#0;\\,#?)'),
  ] },
  { title: 'Funções de matriz', kind: 'text', cols: 4, buttons: [
    fn('rows', 'Número de linhas'), fn('cols', 'Número de colunas'), fn('length', 'Número de elementos'), fn('stack', 'Empilha matrizes'),
    fn('augment', 'Junta matrizes lado a lado'), fn('row', 'Extrai uma linha'), fn('col', 'Extrai uma coluna'), fn('sum', 'Soma dos elementos'),
    fn('max', 'Maior elemento'), fn('min', 'Menor elemento'), fn('sort', 'Ordena'), fn('fft', 'Transformada rápida de Fourier'),
  ] },
];

const LOGICA: MathGroup[] = [
  { title: 'Comparação', kind: 'grid', cols: 4, buttons: [
    sy('=', 'Igual lógico', 'Ctrl+=', '='), sy('≠', 'Diferente', 'Ctrl+3', '\\ne '), sy('<', 'Menor', '<', '<'), sy('>', 'Maior', '>', '>'),
    sy('≤', 'Menor ou igual', 'Ctrl+9', '\\le '), sy('≥', 'Maior ou igual', 'Ctrl+0', '\\ge '),
    B('Aproximadamente igual', '', 'Insere ≈ no cursor.', '≈'), B('Não aproximadamente igual', '', 'Insere ≉ no cursor.', '≉'),
  ] },
  { title: 'Lógica', kind: 'grid', cols: 2, buttons: [
    B('E', '&', 'Insere ∧ no cursor.', '∧'), sy('∨', 'OU', '|', '\\lor '),
    B('NÃO', '~', 'Insere ¬ no cursor.', '¬'), sy('⊕', 'OU exclusivo', 'xor(', '\\operatorname{xor}(#0;\\,#?)'),
  ] },
  { title: 'Programação', kind: 'big', buttons: [
    B('if', '', 'Condição com ramo senão.', 'if', '\\operatorname{if}(#0;\\,#?;\\,#?)'),
    B('for', '', 'Laço com contador e intervalo.', 'for', '\\operatorname{for}(#0;\\,#?;\\,#?)'),
    B('while', '', 'Laço com condição.', 'while', '\\operatorname{while}(#0;\\,#?)'),
    B('try', '', 'Tenta e captura erro.', 'try'),
    B('Bloco', '[', 'Bloco de várias linhas (line do SMath).', { icon: 'prog' }),
  ] },
  { title: 'Controle', kind: 'small', buttons: [B('continue', '', 'Pula para a próxima volta do laço.', ''), B('break', '', 'Sai do laço.', '')] }, // sem símbolo: seta como ícone é proibida (V-02)
];

const LOWER = 'α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω'.split(' ');
const UPPER = 'Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω'.split(' ');
const LATIN = 'a b g d e z h q i k l m n x o p r s t u f c y w'.split(' ');
const OUTROS: [string, string?][] = [['∂'], ['∇'], ['°', '\\degree '], ['′'], ['″'], ['ℏ', 'ℏ'], ['∅'], ['∈'], ['∠'], ['‰', '‰']];
const SIMBOLOS: MathGroup[] = [
  { title: 'Gregas minúsculas', kind: 'grid', cols: 12, buttons: LOWER.map((c, k) => sy(c, `Letra grega ${c}`, `${LATIN[k]}, Ctrl+G`, c)) },
  { title: 'Gregas maiúsculas', kind: 'grid', cols: 12, buttons: UPPER.map((c, k) => sy(c, `Letra grega ${c}`, `${LATIN[k].toUpperCase()}, Ctrl+G`, c)) },
  { title: 'Outros', kind: 'grid', cols: 5, buttons: OUTROS.map(([c, latex]) => (latex ? sy(c, `Símbolo ${c}`, '', latex) : B(`Símbolo ${c}`, '', `Insere ${c} no cursor.`, c))) },
];

export const MATH_RIBBON: Record<string, MathGroup[]> = { matematica: MATEMATICA, matrizes: MATRIZES, logica: LOGICA, simbolos: SIMBOLOS };
