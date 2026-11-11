# ADENDO 05: folha livre com o comportamento do SMath Studio

## O que foi feito

### Item 1: digitação e avaliação (E2, E3)
- `=` inteligente: nome ainda não definido (ou `f(a;b)`) vira ≔; nome já definido ou expressão vira avaliação; definição completa + `=` acrescenta o resultado (`Z_0 := sqrt(L/C) = ?`). `:` continua redefinindo sempre.
- `,` e `.` depois de letra abrem o índice do nome (`s,tensao` → s_tensao); no arquivo, sempre `_`.
- Depois do `=`, o que se digita vai para o marcador de conversão.
- Folha avaliada na ordem de leitura (y; mesma linha se a diferença for menor que 4 px, então x). Definição guarda o valor naquele ponto; nome indefinido não é erro: a expressão fica em aberto e é resolvida na avaliação (math.js `resolve` + `simplify`), com o nome que falta sublinhado.
- **Só na folha.** O caderno continua com erro para variável indefinida (SPEC 8.2), porque o adendo fala em "modelo de avaliação da folha livre".
- Enter numa região leva a cruz para baixo (a próxima digitação cria a região seguinte), como no SMath. Shift+Enter continua como no ADENDO 02.

### Item 2: números e exibição (E4)
- Complexos (`i` em negrito reto), inclusive com unidade; ângulo sem dimensão, como no SMath (rad = 1, deg = π/180); `rpm`; `π`.
- Formato do resultado como no SMath: `exibicao:` no cabeçalho e `casas=`, `modo=`, `zeros_a_direita=` na região. Arquivo novo continua com o formato de sempre.
- Notação científica na tela 1,475·10⁻³ (o motor guarda "1,475e-3"; a tela nunca mostra "e").
- O marcador de conversão aceita expressão (`= ? 10^-6`), além de unidade e `%`.

### Item 3: aparência (E3.6, E5, E6)
- Menu de contexto da região: Desativar/Ativar avaliação (45 % de opacidade e traço à esquerda; não define nada), Moldura, Descrição.
- Áreas `area`/`fim-area`: título, botão de recolher (as de baixo sobem; as de dentro continuam valendo), travar e renomear; botão **Área** em Inserir > Organizar.

### Item 4: importação do SMath (E7)
- **Abrir…** aceita `*.sm`: converte para `<nome>.prsf` na mesma pasta, pergunta antes de sobrescrever, extrai imagens para `<nome>_arquivos/`. O `.sm` só é lido (o Rust recusa gravar `.sm`).
- `src/format/smath.ts`: XML mínimo, notação polonesa reversa → sintaxe linear, `ppi`, áreas, texto, desativado, moldura, `casas`, descrição, conversão (`contract`), imagens, tabela e gráfico (sem dados ainda), e regiões sem equivalente (plugins `excel_*`, Writer) desativadas com o aviso e o XML original num bloco `smath-original`.
- Nomes com ponto no índice (`Relação_invest.Lucro`) e `%` no nome (`Z%_modulo`) funcionam.

### Item 5: vetores, matrizes e programação (E4.1)
- `v[i]`, `M[i, j]` (contando de 1; atribuição cria o vetor), `mat`, `sys`, `range`, `stack`, `augment`, `length`, `row`, `xy2pol`, `sys2mat`, `vectorize`, `for`, `fft`, `invert`. Matriz aparece como matriz na tela.
- Depois de `for(i; range(1;8); ...)`, `i` continua definido com o último valor (8), como no SMath (E8-28). A variável do laço e o vetor de destino contam como definidos para a tela e para o `=` inteligente (antes, o motor já guardava `i = 8`, mas a tela ainda mostrava `i` como unidade imaginária).

### Colisão de i e e (E8-29)
- `𝐢` (unidade imaginária) e `𝐞` (constante de Euler) são símbolos próprios na sintaxe linear: no motor viram `ⅈ` e `ℯ`, que nenhuma variável do usuário esconde. Na tela, negrito reto (`class{imag}{mathbf{i}}`).
- `i` e `e` sem definição continuam valendo como antes (arquivos antigos e importados do SMath não mudam).
- Quando o usuário define `i` ou `e` (inclusive como variável de laço), a barra de status avisa uma vez por documento: "i agora é uma variável (vale 8). A unidade imaginária continua disponível como 𝐢 no ribbon Matemática." (para `e`: "…A constante de Euler continua disponível como 𝐞…").
- Resultado complexo é valor, não texto: nunca é reavaliado com as variáveis do usuário.

## Corpus (E8.2)

`src/format/smath.test.ts` importa os 17 arquivos, calcula no Prisma e compara cada resultado guardado pelo SMath, no número exibido (mesmas casas, modo e conversão). Gera `test-results/smath-corpus.md`.

- Os 17 importam sem perder região (1 002 regiões).
- Os 8 nativos batem 100 %.
- Nos com plugin, tudo que não depende de plugin bate.
- **`fft` do `Teste_Pot_ncia_Com_Harm_nica.sm`:** o SMath guardou [8; 11; −6; −5]. O plugin devolveu [8; 3+i; −6; 3−i], mas o SMath trocou o `i` imaginário pela variável `i = 8` dos dois `for i = 1..8` anteriores (3+8 = 11, 3−8 = −5). As 3 regiões (fft, xy2pol e graus) ficam como não comparáveis, com esse motivo, e são comparadas com o esperado corrigido: batem. O Prisma está certo.
- Não comparáveis, com o motivo no relatório: regiões de plugin, `random`, nomes que não estão no arquivo (funções do plugin Custom Functions) e tudo que depende deles. Regiões desativadas no próprio SMath também ficam de fora (o SMath não as recalcula).

## Decisões

- Modo simbólico só na folha (o caderno segue a SPEC 8.2).
- IDs que o adendo não tinha: E8-18 (formato), E8-19 (conversão por expressão), E8-30 (moldura e descrição), E8-31 (vetores, matrizes e programação). Os dois últimos eram E8-28 e E8-29 e foram renumerados, porque o usuário reservou E8-28 (variável do laço) e E8-29 (colisão de i e e).
- Tabela e gráfico importados: guardam entradas, eixos e rótulos; os dados ainda não são desenhados.
- Testes antigos ajustados pelo adendo: F0-02 (grupo Organizar: Área).
- BUG-007: o `mathbf{i}` da tela voltava para o arquivo como `mathbf*i`; corrigido no leitor de LaTeX.

## Pendente

- **Ribbon Matemática (ADENDO 06):** ainda não existe. O aviso já cita o ribbon; por enquanto `𝐢` e `𝐞` funcionam no arquivo e na tela, mas não há botão para inseri-los.
- Exportar para `.sm` (E7.2): fica para depois, como o adendo pede.

## T01 (AUDITORIA, lote A)

- **Ponto solto:** `2.`, `x.`, `.`, `Relação.` e `batata.` travavam o conversor de LaTeX. O átomo numérico aceitava `.` sem dígito, não consumia nada e o `mul()` repetia para sempre. Agora o átomo recusa e o `mul()` tem guarda de progresso. Teste: T01-01 e BUG-008.
- **Pendente:** o `case '.'` do `MathField.tsx` não abre índice depois de letra acentuada ou grega, ao contrário do `case ','` (fica para T02/T04). Um `\` no fim da entrada gera TypeError em `llex` (T08).

## T02 (AUDITORIA, lote A)

- **Nome com dígito:** `R1`, `I1`, `xy2pol`, `sys2mat`, `log10` voltavam do campo como `R*1` etc. O `name()` só aceitava letras. Agora aceita dígitos depois da primeira letra, e o campo não trata esses dígitos como decimal nem como unidade depois de número (`nameDigit` olha o átomo antes dos dígitos, não o texto). Testes: T02-01 e BUG-009 em `tests/golden/conversao.yaml`.
- **Corpus:** das 713 linhas de cálculo importadas, as que não fazem ida e volta caem de 153 para 91 (62 corrigidas). As 91 restantes são `for`, `%`, texto entre aspas e `#` (T03 e T04).
- **Pendente, fora do T02:** a ida e volta remove parênteses que mudam o sentido, como em `e^(80.5 deg*i)`, que volta `e^80.5 deg*i` (linhas `a1` e `a6` do corpus). Não está na auditoria.
- **Pendências achadas na revisão do T02, já existentes antes dele:** `3\sin x1` vira `3*sin(1)` (o `x` some); `\log10(x)` vira `log(0*(x))`, mas o MathLive grava `log10(x)` sem `\log` ao digitar, então o usuário não cai nele; o `case '.'` do `MathField.tsx` não tem a guarda `!state.script` do `case ','`; `GREEK_CMD` do campo repete a lista de gregas de `mathlinear.ts` e deveria sair de lá.
