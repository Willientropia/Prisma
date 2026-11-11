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

## T03 (AUDITORIA, lote A)

- **Texto entre aspas:** `mat("3º Harmônica", ...)` voltava `"3ºHarmônica"`. O `llex` descartava todo espaço em branco, inclusive dentro de `\text{...}`. Agora o conteúdo de `\text{...}` é lido como texto, com espaços preservados (também repetidos). Testes: T03-01 e BUG-010.
- **Corpus:** as linhas que não fazem ida e volta caem de 91 para 84. As 84 restantes são `for`, `%` e `#` (T04), mais duas com caminho de arquivo.
- **Pendente, fora do T03:** texto com barra invertida ou chaves perde esses caracteres na tela (`"C:\Users\...\Book1.xlsx"` volta `"C:UsersYourUserDownloadsBook1.xlsx"`), porque `nodeLatex` remove `\`, `{` e `}` do texto. Linhas `EXCELpath` do corpus.
## F01 (TICKETS-FOLHA, lote F1)

- **Problema:** na folha livre a região só andava para a direita e para baixo; depois de movida não voltava. `snap()` fazia `Math.max(0, …)` e era usado no deslocamento do arrasto, então todo dx/dy negativo virava 0.
- **Correção (`src/editors/folha/Folha.tsx`):** `snap()` só arredonda para a grade de 20 px. O novo `pos()` (`Math.max(0, snap(v))`) limita só a posição final e é usado em `moveRegions`, na prévia do arrasto e na cruz de criação. Os demais usos de `snap()` ficam como estavam (valores já positivos).
- **Teste:** `BUG-011` em `tests/regressao/bugs.spec.ts` (e2e). Arrasta a região `s` de `string-3.prsf` para a esquerda e para cima (`x=180 y=40`) e depois além da borda (trava em `x=0 y=0`). Falhava antes da correção.
- **Verificação:** tipos, lint, Vitest, Rust, cobertura e `check-matriz` ok. No `npm run verify` rodado com três sessões em paralelo, o Playwright teve duas falhas só de tempo: C7-02 com 518 ms (limite 500) e B10-07 com 157 ms (limite 150). Rodados sozinhos, `edicao-visual`, `desempenho` e `bugs` passaram. A instabilidade é a do ticket F00; nenhum teste foi alterado.
- **Pendente:** nada do F01. O `verify` completo não foi repetido depois do ajuste final da matriz (só `check-matriz` e o `bugs.spec.ts`).
## F02 (TICKETS-FOLHA, lote F1): várias regiões selecionadas não arrastam juntas

- **Causa:** `moveRegions` (`src/editors/folha/Folha.tsx`) lê as posições de todas as regiões uma só vez e edita o texto região por região, de cima para baixo. A edição troca a linha de abertura (`x=60` vira `x=100`), que muda de tamanho; as posições das regiões seguintes ficam deslocadas e o arquivo corrompe (cercas coladas, `}` solto). Só aparece quando o número de dígitos de `x` ou `y` muda.
- **Correção:** as edições passam a ser aplicadas de trás para a frente, como em `removeRegions`. Uma linha.
- **Teste:** `BUG-012` em `tests/regressao/bugs.spec.ts`: seleciona 3 regiões por laço, arrasta pela moldura (+40 px em x, +20 em y, x de 2 para 3 dígitos) e confere o arquivo inteiro. Falhava antes da correção.
- **Pendente:** nada deste ticket. O Playwright reaproveita qualquer servidor aberto em `localhost:1420` (`reuseExistingServer`); com várias sessões em worktrees diferentes, os testes podem rodar contra o código de outra.
## F03 (AUDITORIA B5 e B6, lote F1)

- **Teclado preso:** na folha, `creating` só voltava a `false` no `onReady` do campo; se a região nova não montava (folha somente leitura, campo desmontado), toda tecla seguinte era engolida em `pendingKeys` para sempre. Agora `creating` tem prazo de 2 s (o `tryFocus` tenta por cerca de 2 s). `holdKeys` (caderno e marcador de unidade) ganhou prazo de 1 s: se nenhum campo assumir, o ouvinte global sai sozinho. Testes: BUG-013, F03-01 e F03-02 em `tests/regressao/bugs.spec.ts` (documento com `versao_formato` maior que o suportado, onde a edição é recusada).
- **Pendente:** teclas digitadas depois do prazo, enquanto o campo ainda monta, são descartadas (`holdKeys`) ou tratadas como nova região (folha). O terceiro caso do B5, `requestAnimationFrame` com a janela em segundo plano, também fica coberto pelo prazo, mas sem teste próprio.
- **Pendente (revisão):** em documento somente leitura a causa é a tentativa de editar: `Folha.onSheetKey` liga `creating` e `Caderno.newLineAfter`/`deleteEmpty`/`addLine` chamam `holdKeys()` antes de um `edit` que `workspace.ts` recusa em silêncio. O certo é não ligar nenhum dos dois quando `doc.readOnly`; os prazos ficam como rede de segurança. Também falta soltar `creating` quando o `tryFocus` desiste (`MathField.tsx`, dois `return`), em vez de esperar os 2 s, e `holdMore` perde o resto do lote se o prazo de 1 s já soltou o `holdKeys`.
## F04 (AUDITORIA B9, lote F1): nome é variável, unidade só explícita

- **Decisão do usuário (10/11 e 11/11):** dentro da expressão, nome é sempre variável, como no SMath. Formato aprovado: `número espaço unidade` continua unidade (`L := 25 m`, `= ? mV`); unidade sem número antes ganha apóstrofo (`x*'m`, `'A/100`); `9j` digitado grava `9*j`. Arquivos antigos abrem iguais (nenhuma linha dos golden, fixtures e bibliotecas muda). O ADENDO 06 3.5 ("nome definido vence unidade" ao não aceitar o assistente) fica superado: sem aceitar, é variável. Unidade definida pelo usuário: ticket F-U1, pendente de confirmação no SMath.
- **Causa:** o math.js resolve símbolo indefinido que seja nome de unidade como unidade (`SymbolNode`); `known()` aceitava `isUnitName`; e o conversor (`mathlinear.ts`) lia qualquer letra depois de número como unidade.
- **Correção:** `markVars` (`src/engine/syntax.ts`) marca com `ǃ` o nome em posição de variável que é unidade; `evaluate` a aplica depois de `classify` e `fromMath` a retira. Variável ou parâmetro já definido vence a unidade de mesmo nome (`h := 3`, `2 h` = 6), como antes. Nó `unit` no conversor, apóstrofo no lexer, `mulUnit`, importador do SMath grava unidade solta com `'`, e `MathField` fecha a unidade do apóstrofo ao digitar operador, `^` ou espaço. O alvo da conversão ignora `'`.
- **Testes:** `BUG-014`, `F04-01` a `F04-04`. Só a entrada dos testes digitados ganhou `'` (`teclado.yaml`, `conversao.yaml`, `edicao-visual`, `smath`, `desempenho`, `bugs.spec`, `teclado.browser`); F3-05 passou a esperar 2 resultados em aberto ("S ainda não foi definido", E3.3).
- **Pendente:** (1) `.prsf` convertido do SMath antes do F04 com unidade solta (ex.: `A/100`) mostra "não definida"; reconverter o `.sm`. (2) Um `2 x` legado com x variável, ao ser editado, é regravado como `2*x` (mesmo valor). (3) `2 m*L` com L definida: o motor lê L como variável, mas a tela desenha `m*L` inteiro como unidade (o formato linear não distingue). (4) Resultado em aberto perde o coeficiente 1 (`zz + 1 m` mostra `zz + m`, do `math.resolve`). (5) O assistente (A6-4) e o marcador ▫ (A6-1) continuam pendentes. (6) `LatexParser` sem limite de profundidade (já era assim; F12/B17). (7) `MathField`: se a unidade do apóstrofo for apagada pela metade (Backspace, clique), a próxima tecla de operador ainda pode sair da unidade; só se zera quando o campo perde o `ass{u}`. (8) Espaço depois de `/` em unidade escrita à mão (`2 m/ s`) não é lido como unidade.

## A6-1 (ADENDO 06, Parte 1, lote F-A6): estrutura da região e formato padrão

- **Feito:** (1) `MathLine` reclassifica a região a cada edição: ao esvaziar o campo, a avaliação antiga acaba (`cleared`) e o `= resultado` some na hora, também enquanto a expressão está incompleta (`pending`); se a pessoa sai com o que sobrou incompleto, a linha antiga é apagada em vez de voltar. Um `=` a mais numa avaliação continua não criando outro. (2) Formato padrão do SMath: `DEFAULT_FORMAT` = 4 casas, modo decimais, sem zeros à direita, expoente a partir de 10⁵; `run.ts` parte dele e a config só troca casas e separador (`casas_decimais` padrão 4). Valores esperados atualizados com autorização (3,29 V → 3,2936 V, 0,82 % → 0,8225/0,8234 %, 0,45 % → 0,4475 %, zeros à direita removidos). Testes `A6-01` a `A6-05` (os 06-01 a 06-04 do adendo mais o formato).
- **Pendente:** (1) config de usuário já gravada com `casas_decimais: 2` continua em 2 casas (sem zeros). (2) O texto escrito na tela vem do estado local do campo: se o `.prsf` for editado por fora com a avaliação já apagada, nada limpa. (3) Imagens aprovadas não foram regravadas: a diferença de texto ficou dentro da tolerância do teste visual (regravar se a referência visual exigir). (4) O marcador ▫ continua como estava. (5) Sair com `s ≔ □` depois de apagar a avaliação remove a linha (definição sem lado direito não é gravável, igual a uma região nova com `s:`); gravar `nome ≔ □` exigiria mudar o formato do arquivo. (6) `casas=` por região e `casas_decimais` da config agora também cortam zeros (2,20 → 2,2), e os rótulos do gráfico (`Plot.tsx`) seguem o padrão novo.
