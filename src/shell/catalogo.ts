// Catálogo de funções e de unidades (ADENDO 06, 4.9). Funções nativas: categoria, parâmetros e descrição curta.
import { STRUCTURE } from '../math/assistente';
import { UNIDADES } from '../engine/unidades';
import { focusedField } from '../math/insert';
import { useWorkspace } from '../store/workspace';

export type CatalogItem = { name: string; sig: string; cat: string; desc: string; latex: string; formula: string };

type Native = [name: string, params: string, cat: string, desc: string];
const MAT = 'Matemáticas', TRIG = 'Trigonométricas', CPX = 'Complexos', MTZ = 'Matrizes e vetores', PROG = 'Programação';
const NATIVES: Native[] = [
  ['sqrt', 'x', MAT, 'Raiz quadrada.'], ['nthroot', 'x; n', MAT, 'Raiz de índice n.'], ['abs', 'x', MAT, 'Valor absoluto ou módulo de complexo.'],
  ['exp', 'x', MAT, 'Exponencial (e elevado a x).'], ['ln', 'x', MAT, 'Logaritmo natural.'], ['log', 'x; b', MAT, 'Logaritmo na base b (10 se omitida).'],
  ['round', 'x; n', MAT, 'Arredonda para n casas.'], ['ceil', 'x', MAT, 'Arredonda para cima.'], ['floor', 'x', MAT, 'Arredonda para baixo.'],
  ['sign', 'x', MAT, 'Sinal: -1, 0 ou 1.'], ['min', 'a; b', MAT, 'Menor valor.'], ['max', 'a; b', MAT, 'Maior valor.'], ['mean', 'v', MAT, 'Média dos elementos.'],
  ['sum', 'k', MAT, 'Somatório com índice, início e fim.'], ['product', 'expr; k; a; b', MAT, 'Produtório com índice, início e fim.'],
  ['int', 'a', MAT, 'Integral definida.'], ['diff', 'f; x', MAT, 'Derivada em relação a uma variável.'],
  ['solve', 'eq; x', MAT, 'Raiz de uma equação em x.'], ['root', 'f; x', MAT, 'Raiz de f(x) perto do valor atual de x.'],
  ['polyroots', 'v', MAT, 'Raízes do polinômio de coeficientes v.'], ['interp', 'x; y; t', MAT, 'Interpolação linear de y(x) em t.'],
  ['sin', 'x', TRIG, 'Seno.'], ['cos', 'x', TRIG, 'Cosseno.'], ['tan', 'x', TRIG, 'Tangente.'], ['cot', 'x', TRIG, 'Cotangente.'],
  ['asin', 'x', TRIG, 'Arco seno.'], ['acos', 'x', TRIG, 'Arco cosseno.'], ['atan', 'x', TRIG, 'Arco tangente.'],
  ['re', 'z', CPX, 'Parte real.'], ['im', 'z', CPX, 'Parte imaginária.'], ['arg', 'z', CPX, 'Argumento, em radianos.'], ['conj', 'z', CPX, 'Conjugado.'],
  ['det', 'M', MTZ, 'Determinante.'], ['transpose', 'M', MTZ, 'Transposta.'], ['invert', 'M', MTZ, 'Inversa.'],
  ['rows', 'M', MTZ, 'Número de linhas.'], ['cols', 'M', MTZ, 'Número de colunas.'], ['length', 'v', MTZ, 'Número de elementos.'],
  ['stack', 'A; B', MTZ, 'Empilha matrizes.'], ['augment', 'A; B', MTZ, 'Junta matrizes lado a lado.'], ['row', 'M; i', MTZ, 'Extrai a linha i.'],
  ['col', 'M; j', MTZ, 'Extrai a coluna j.'], ['sort', 'v', MTZ, 'Ordena.'], ['range', 'a; b', MTZ, 'Vetor de a até b.'],
  ['cross', 'a; b', MTZ, 'Produto vetorial.'], ['fft', 'v', MTZ, 'Transformada rápida de Fourier.'],
  ['if', 'cond; a; b', PROG, 'a se a condição vale, senão b.'], ['for', 'k; range; expr', PROG, 'Laço com contador e intervalo.'],
  ['while', 'cond; expr', PROG, 'Laço com condição.'], ['xor', 'a; b', PROG, 'OU exclusivo.'],
];

/** Chamada com um quadradinho por parâmetro; as funções com estrutura visual usam a estrutura (2.2). */
const call = (nameLatex: string, n: number) => `${nameLatex}(${Array.from({ length: Math.max(n, 1) }, (_, i) => (i ? '#?' : '#0')).join(';\\,')})`;

export const nativeItems = (): CatalogItem[] => NATIVES.map(([name, params, cat, desc]) => {
  const ps = params.split(';').map((x) => x.trim());
  const latex = STRUCTURE[name] ?? call(`\\operatorname{${name}}`, ps.length);
  return { name, sig: `${name}(${params})`, cat, desc, latex, formula: `\\operatorname{${name}}(${ps.join(';\\,')})` };
});

/** Função de biblioteca: assinatura "ΔV(I, L, S)" vira a chamada com quadradinhos. */
export function libItem(f: { sig: string; lib: string; description: string }, nameLatex: (name: string) => string, sigLatex: string): CatalogItem {
  const name = f.sig.replace(/\(.*$/, '').trim();
  const n = (/\((.*)\)/.exec(f.sig)?.[1] ?? '').split(/[;,]/).filter((x) => x.trim()).length;
  return { name, sig: f.sig, cat: f.lib, desc: f.description, latex: call(nameLatex(name), n), formula: sigLatex };
}

export const UNIT_CATEGORIES = [...new Set(UNIDADES.map(([, , g]) => g))];
export const FUNCTION_CATEGORIES = [MAT, TRIG, CPX, MTZ, PROG];

/** Campo em edição quando o catálogo abriu: o diálogo toma o foco, e a escolha volta para ele. */
// Na folha o campo sai de edição quando o diálogo abre; guarda também a região e a linha, para a folha reabrir e inserir.
type Target = { field: ReturnType<typeof focusedField>; region?: string; line?: number };
let catalogTarget: Target = { field: null };
export function openCatalog(kind: 'funcoes' | 'unidades') {
  if (useWorkspace.getState().catalog) return; // Ctrl+E dentro da busca não troca o destino guardado
  const field = focusedField();
  if (field?.closest('.unit-input')) return; // campo de unidade do resultado: o assistente já lista as unidades ali; reabrir a linha poria a unidade na expressão
  const region = field?.closest<HTMLElement>('[data-region]')?.dataset.region;
  const line = field?.closest<HTMLElement>('[data-line]')?.dataset.line; // a linha da região, não a ordem dos campos (o de unidade também é math-field)
  catalogTarget = { field, region, line: line === undefined ? undefined : Number(line) };
  useWorkspace.getState().set({ catalog: kind });
}
export const takeCatalogTarget = () => { const t = catalogTarget; catalogTarget = { field: null }; return t; };
