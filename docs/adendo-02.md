# ADENDO 02: edição matemática 100 % visual

Especificação: [`ADENDO-02-edicao-matematica-visual.md`](../ADENDO-02-edicao-matematica-visual.md). Substitui a edição em texto da fase 2 (seção 3.4 e "Edição" de 7.1 e 7.2).

## Plano

- `src/format/mathlinear.ts`: conversor simétrico entre a sintaxe linear do arquivo e o LaTeX do MathLive.
- `src/math/MathField.tsx`: campo MathLive configurado como o SMath (teclas da B4, cores da B3).
- `src/math/MathLine.tsx`: uma linha de cálculo com resultado à direita, marcador de unidade e selo.
- Caderno e folha passam a usar MathLive em toda expressão e TipTap no texto.
- Folha: cursor em cruz, região criada ao digitar, arrastar com encaixe, seleção por retângulo, Delete, gráfico (uPlot), recálculo sem clique.
- Exibir > Código-fonte (CodeMirror lado a lado).
- Testes B10 com Playwright, teclado real no Edge do Windows.

## Feito

### Conversor (`src/format/mathlinear.ts`)

- Árvore própria (número, nome, quantidade com unidade, operação, parênteses, chamada, matriz) com leitura e escrita nos dois sentidos.
- Forma canônica da linear: espaços em volta de `:=`, `=`, `+`, `-`, relações; `*`, `/`, `^` colados; argumentos com `, `; número e unidade com espaço (`4 mm^2`).
- LaTeX da tela:
  - ≔ (`\coloneq`) com espaço dos dois lados;
  - `·` na multiplicação;
  - divisão sempre como fração, inclusive em unidades;
  - índice reto (`V_{\mathrm{mp}}`);
  - unidade em azul (`\class{u}{\mathrm{...}}`);
  - vírgula decimal;
  - `;` entre argumentos;
  - raiz, módulo e matriz.
- Lê o que o MathLive produz ao digitar: `4mm^2` sem classificação, `11,5`, `\degree C`, `\%`, `\left(...\right)`, `f\left(x;y\right)`, `\operatorname{sin}`, `\class{undef}{...}`.
- Classificação de identificadores (B4):
  1. o que já foi definido é variável;
  2. senão, se é unidade conhecida pelo math.js, é unidade;
  3. senão, é variável não definida, com sublinhado ondulado vermelho.
- Testes (`mathlinear.test.ts`):
  - `toLinear(toLatex(x)) === x` para as 13 linhas da tabela B9, para todas as linhas de cálculo dos exemplos e para outros casos;
  - o LaTeX que o MathLive gera ao digitar;
  - expressão incompleta é recusada, para não ir para o arquivo.

### Campo (`src/math/MathField.tsx`)

- **Configuração:** MathLive sem teclado virtual, sem menu, sem atalhos automáticos, exceto `<=`, `>=` e `!=`.
- **Visual:**
  - as fontes e o CSS vêm de `mathlive/static.css`, empacotados localmente;
  - estilo injetado no shadow DOM: STIX Two Text, unidades em `--math-unit`, variável não definida com sublinhado.
- **Teclas da B4 que o MathLive não faz sozinho:**

  | Tecla | O que faz |
  |---|---|
  | `:` | ≔ |
  | `=` | pede o resultado e sai do campo |
  | `*` | · |
  | `\` | raiz |
  | `'` | força unidade |
  | `\|` | módulo |
  | `,` | vírgula decimal depois de dígito; senão separa argumentos |
  | `;` | separa argumentos |
  | `.` | decimal depois de dígito; índice depois de letra |
  | espaço | sai do índice ou do expoente |
  | Ctrl+G | troca a letra latina pela grega |
  | `/` depois de `(…)` | fração sem os parênteses |
  | Enter / Shift+Enter / Esc | confirma, cria linha ou região nova, ou sai |
  | Backspace em linha vazia | apaga a linha |

- **Ao sair de um identificador** (espaço ou operador), a expressão é reclassificada, com o cursor no fim.
- **Teclas digitadas antes do foco** (região nova, linha nova depois de Enter): o MathLive leva alguns quadros para aceitar o foco. As teclas ficam guardadas e são aplicadas no campo novo, pelo mesmo tratamento das teclas reais.
- **Sair sem editar não grava nada** e não muda nenhum pixel (B10.11).

### Linha (`src/math/MathLine.tsx`)

- O campo mostra só a expressão. O resultado vem à direita (`= 3,29 V`), renderizado com `convertLatexToMarkup`.
- **Recálculo ao digitar:** a linha é gravada 100 ms depois da última tecla, e o cálculo roda logo em seguida (medido: ~97 ms entre a última tecla e o resultado novo, B10.7).
- **Marcador de unidade** (quadradinho de 6 px, aparece com o mouse em cima): abre um campo com a unidade selecionada. Enter converte e grava `= ? mV`. Unidade incompatível deixa a borda vermelha e a barra de status mostra `Não é possível converter V em m`.
- **Durante o cálculo:** se passar de 300 ms, o resultado anterior fica apagado. Nunca aparece `?`.
- **Erro:** a linha fica sublinhada em vermelho; a mensagem aparece ao passar o mouse e na barra de status.

### Caderno e folha

- **Caderno:**
  - cada linha dos blocos `calc`, `funcao` e `verificar` é um campo. Enter cria a próxima linha (`calc`); Backspace numa linha vazia apaga e volta;
  - texto entre blocos editado no TipTap e gravado como Markdown, com `[[links]]` preservados (Ctrl+clique abre);
  - grupo **Texto** no ribbon: Negrito, Itálico, Título, Lista e Link.
- **Folha:**
  - clicar na área vazia põe o cursor em cruz no ponto da grade; digitar cria a região ali; `"` cria região de texto;
  - arrastar pela moldura move com encaixe de 20 px; arrastar na área vazia seleciona várias; Delete apaga as selecionadas; Shift+Enter cria uma região logo abaixo;
  - gráfico com uPlot, linha de limite e rótulo;
  - variáveis no painel em matemática renderizada.
- **Exibir > Código-fonte:** o arquivo em CodeMirror, lado a lado, editável nos dois sentidos.
- **Biblioteca:** a fórmula e os testes também aparecem como matemática.

### Motor

- Resultado traz número e unidade separados (`numText`, `unitRaw`) para a tela montar o LaTeX.
- Gráfico (`grafico`) avaliado no fim, com todas as definições da folha.
- Nomes das bibliotecas (ρ_cu, ΔV) entram em `defined`, então não ficam marcados como "não definida".
- Formatação: **casas fixas** (2,20 V; 712,80 kWh). Antes cortava zeros à direita; a B10.7 pede 2,20 V.

### Tokens

`--math-var`, `--math-op`, `--math-unit`, `--math-unit-paper`, `--math-result`, `--math-error`, `--math-focus-frame` (B3).

## Testes

- `npm test` (Vitest): 77 testes, sendo 38 do conversor.
- `npm run e2e` (Playwright, Edge do Windows, sem baixar navegador): os 10 critérios da B10 (B10.10 está no Vitest), mais 2 testes do caderno (B7). 12 passando, estáveis em execuções repetidas.

## Decisões e desvios

| Tema | O que foi feito | Por quê |
|---|---|---|
| `a*b/c` digitado | O MathLive cria a·(b/c); ao confirmar, a tela mostra a fração do produto inteiro (a·b)/c | Mesmo valor. Na linear não dá para distinguir `a*b/c` de `a*(b/c)` sem parênteses, e o arquivo (B9) usa `2*ρ_cu*L*I/S` |
| `\rho` + espaço (B4) | Não suportado no campo | `\` é raiz (SMath, também na B4). Grego vem do Ctrl+G |
| Cor dos operadores (`--math-op`) | Não aplicada | O MathLive não marca operadores com classe própria; o token é quase igual ao das variáveis |
| Unidade forçada com `'` | Aparece como unidade na tela | A linear não tem como marcar "isto é unidade" quando existe variável com o mesmo nome; o math.js resolve pela variável |
| Gráfico | Avaliado com todas as definições da folha, não só as acima dele | No `string-3` o gráfico (y=70) fica acima de L, I, V_mp (y=80); pela ordem estrita daria "variável não definida" e o B10.6 pede o gráfico |
| Texto livre do usuário | O B10.9 não verifica o texto livre | É o que o usuário escreveu (ex.: "ρ_cu é a resistividade"); o teste cobre expressões, resultados e painéis |
| Backspace depois de estrutura | Comportamento padrão do MathLive | A B4 pede "primeiro seleciona, depois apaga"; não implementado |
| "Parte com problema sublinhada" (B5) | A linha inteira fica sublinhada | O motor não diz qual pedaço da expressão causou o erro |
| Pacote principal | 2,7 MB | MathLive, math.js, TipTap e CodeMirror. Aceitável num app desktop carregado do disco |
