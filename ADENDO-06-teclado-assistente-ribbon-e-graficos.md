# ADENDO 06: teclado do SMath, assistente dinâmico, ribbon matemático, integral e gráfico

Este adendo **substitui** os rascunhos anteriores "ADENDO-06-ribbon-matematico" e "ADENDO-07-integral-e-grafico-de-funcao". Se algum deles já estiver no repositório, apague e use só este.

Ele também **prevalece** sobre o ADENDO 02 (tabela B4 de teclas) e o ADENDO 05 (E2) em tudo que conflitar. O objetivo é que quem usa SMath digite no Prisma **exatamente** como digita no SMath.

Fontes usadas:
- Lista oficial de atalhos: https://docs.smath.com/keyboard-shortcuts/
- Assistente dinâmico: https://docs.smath.com/dynamic-assistance/
- Fórum oficial do SMath, tópicos sobre o assistente e o Tab
- Capturas de tela enviadas pelo usuário

Referência visual: `referencia-ribbon-matematica.dc.html`.

---

## Parte 1. Estrutura de uma região de cálculo (corrige bugs atuais)

### 1.1 Bugs relatados

1. **"=" duplicado.** O usuário digita `2+2=`, apaga o `2+2` e digita `s=`. Fica `s≔ = 1,00 s`: sobra o `=` da avaliação antiga, e o `s` vira a unidade "segundo".
2. **Resultado com zeros sobrando.** `s_batata ≔ 2·7` e `s_batata =` mostra **14,00**, quando o SMath mostra **14**.

### 1.2 Regra: a região tem uma estrutura, não um texto

Toda região de cálculo é **exatamente um** destes tipos:

| Tipo | Forma | Exemplo |
|---|---|---|
| Definição | nome ≔ expressão | x ≔ 2 |
| Definição com resultado | nome ≔ expressão = resultado ▫ | Z₀ ≔ √(L/C) = 387,3 |
| Avaliação | expressão = resultado ▫ | s = 20 |
| Expressão solta | expressão | 2·x (sem resultado, como no SMath) |

(▫ é o marcador de conversão.)

Regras:

1. **Nunca existe mais de um `=` de avaliação** por região. Digitar `=` numa região que já é avaliação não cria outro `=` (é ignorado).
2. **Toda edição reclassifica a região do zero**, olhando a árvore inteira e não só a tecla digitada. Se o lado esquerdo de uma avaliação ficar vazio, a região volta a ser vazia e o `=` some junto. Se, depois disso, o usuário digita `s=` e `s` não está definido, a região vira **definição** (`s ≔ □`), sem nenhum resto da avaliação anterior.
3. **O lado esquerdo de ≔ é sempre um nome**, nunca unidade. Um `s` antes de ≔ é variável, mesmo que exista a unidade "s".
4. **Resultado obsoleto some na hora.** Enquanto a expressão está incompleta (tem □ vazio), não aparece resultado nenhum. Quando fica completa, recalcula (150 ms, ADENDO 02).
5. **Definição com lado direito vazio** mostra só `nome ≔ □`, sem resultado.

Testes desta parte (somar a `tests/golden/teclado.yaml`):

| ID | Sequência | Esperado |
|---|---|---|
| 06-01 | `2+2=`, Backspace até apagar o `2+2`, `s=` | `s ≔ □`, sem `= 1 s` e sem segundo `=` |
| 06-02 | `2+2=` e mais um `=` | continua `2 + 2 = 4`, sem segundo `=` |
| 06-03 | `s=`, com a unidade s existindo e a variável s não | `s ≔ □`, s em itálico (variável) |
| 06-04 | `x:2`, depois `x=`, apagar tudo | região vazia, sem nenhum resto |

### 1.3 Formato padrão do resultado (igual ao SMath)

O padrão dos arquivos **novos** passa a ser o padrão do SMath:

```yaml
exibicao:
  casas: 4
  modo: decimais
  zeros_a_direita: false
  limite_exponencial: 5
```

- 2·7 = **14**; 1/3 = **0,3333**; 3,2936 V = **3,2936 V**.
- Isso muda valores que hoje aparecem em testes e imagens aprovadas (exemplos: 1,79 V continua 1,79 V; 3,29 V vira 3,2936 V; 0,82 % vira 0,8234 %). **Antes de atualizar qualquer teste ou imagem aprovada, mostre a lista de valores que mudam e espere a autorização do usuário** (ADENDO 03, C7.3).
- Os critérios dos selos APROVADO/ATENÇÃO/REPROVADO **não mudam**, porque usam o valor exato e não o exibido.

---

## Parte 2. Teclado do SMath

### 2.1 Tabela completa (oficial do SMath, adaptada ao pt-BR)

| Tecla | Efeito | Observação |
|---|---|---|
| `"` | Cria região de texto | numa área vazia |
| `'` | Abre marcador de **unidade** (oval) e o assistente só com unidades | |
| `\` | Raiz quadrada | |
| `Ctrl+\` | Raiz n-ésima | |
| `[` depois de um nome | Índice de elemento: v[2] | `;` adiciona o segundo índice: M[2; 3] |
| `[` em lugar vazio | Bloco de linhas (line), para programação | |
| `.` depois de letra | Índice de nome (subscrito): S.trafo | também `,` e `_` (ADENDO 05) |
| `^` | Potência | |
| `!` | Fatorial | |
| `%` | Unidade porcento | Verificado no SMath pt-BR: `2,6%` vira 2,6 % (o SMath desenha 2,6·%; no Prisma, sem o ponto, como as outras unidades). O ± fica só no ribbon |
| `&` | E lógico (∧) | |
| `\|` | OU lógico (∨) | |
| `~` | NÃO lógico (¬) | |
| `@` | Gráfico 2D (Parte 5) | numa área vazia |
| `:` | Definição ≔ | |
| `=` | Igual inteligente (ADENDO 05, E2.1) | |
| `Ctrl+=` | Igual lógico (=) | |
| `Ctrl+3` | ≠ | |
| `Ctrl+9` | ≤ | |
| `Ctrl+0` | ≥ | |
| `Ctrl+1` | Transposta | |
| `Ctrl+8` | Produto vetorial × | |
| `Ctrl+.` | Cálculo simbólico (→) | ver 2.4 |
| `Ctrl+G` | Converte a letra anterior em grega | |
| `Ctrl+M` | Matriz (diálogo de linhas e colunas) | |
| `Ctrl+E` | Catálogo de funções | |
| `Ctrl+W` | Catálogo de unidades | |
| `Ctrl+Shift+P` | π | |
| `Ctrl+Shift+Z` | ∞ | |
| `Ctrl+Space` | Abre o assistente; se já aberto, aceita o item | |
| `Tab` | Aceita o item do assistente; sem assistente, vai para a **próxima região** | |
| `Shift+Tab` | Região anterior | |
| `Enter` | **Sai da região** (não aceita item do assistente) | |
| `Ctrl+Enter` / `Shift+Enter` | Aceitam o item do assistente; em região de texto, quebram linha | |
| `Espaço` | **Amplia a seleção de edição** para a expressão que contém o cursor (2.3) | |
| `Ctrl+A` | Seleciona o conteúdo do elemento atual; de novo, a região inteira | |
| `Home` / `End` | Início / fim da fórmula | |
| `F8` | Renomeia, na fórmula, todas as ocorrências do nome sob o cursor | |
| `F9` | Recalcula o documento inteiro | |
| `Ctrl+Z` / `Ctrl+Y` | Desfazer / refazer | |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Negrito / itálico / sublinhado (só em texto) | |

O que o ADENDO 02 já tinha e continua valendo **além** desta tabela: `/` (fração puxando o operando), `(` com fechamento automático, `<=` `>=` `!=` digitados por extenso, `\rho` + espaço, `;` como separador de argumentos, `,` decimal depois de dígito.

### 2.2 Funções digitadas pelo nome viram estrutura visual

Como no SMath, digitar o nome de certas funções seguido de `(` cria a estrutura visual correspondente, com quadradinhos de posição:

| Digitado | Vira |
|---|---|
| `sqrt(` | √□ |
| `nthroot(` | ⁿ√□ |
| `abs(` | \|□\| |
| `int(` | ∫ de □ a □ de □ d□ |
| `diff(` | d/d□ □ |
| `sum(` | Σ com índice, início e fim |
| `product(` | Π com índice, início e fim |
| `det(` | \|□\| de matriz |
| `transpose(` | □ᵀ |
| `range(` | □..□ |
| `if(` | bloco condicional |
| `for(` | bloco de laço |
| `while(` | bloco de laço com condição |

Navegação entre os quadradinhos: **setas** ou clique. O `Tab` não serve para isso, porque no SMath ele aceita o item do assistente ou muda de região. Isso corrige o que estava escrito no rascunho do ADENDO 07.

### 2.3 Espaço amplia a seleção (comportamento central do SMath)

- O cursor de edição tem duas marcas, ⌊ e ⌋, que mostram **qual parte da expressão** vai receber o próximo operador.
- Cada `Espaço` amplia essa parte para a expressão que contém a atual: `x` → `x²` → `a + x²` → a expressão toda.
- O próximo operador digitado se aplica à parte selecionada. Exemplo: `a+b`, `Espaço`, `/2` gera (a + b)/2, com a + b inteiro no numerador.
- Visual: as marcas ⌊ e ⌋ em `--accent-light`, 2 px, envolvendo a parte selecionada, e a parte com fundo `--region-selected-bg`.

### 2.4 Cálculo simbólico mínimo (`Ctrl+.`)

O CAS completo continua fora do escopo (Fase 8). Mas o `Ctrl+.` funciona desde já com o que o math.js faz (`simplify`, `derivative`, `rationalize`): mostra `expressão → resultado simbólico`. Se o math.js não conseguir, aparece "Cálculo simbólico não disponível para esta expressão" na barra de status.

### 2.5 Comportamentos conferidos no SMath do usuário (SMath Solver, 08/11/2026)

Testados numa folha nova, digitando tecla por tecla:

| Sequência | Resultado no SMath | Regra no Prisma |
|---|---|---|
| `s=10*x` (x não existe), `x=2`, `s=` | s ≔ 10·x, x ≔ 2, **s = 20** | ADENDO 05, E3.3 confirmado |
| `k:5`, `t:10*k`, `k:7`, `t=` | **t = 50** | ADENDO 05, E3.2 confirmado: a definição guarda o valor do momento |
| `x=` com x já definido | x = 2 ▫ aparece na hora, e **o cursor continua no fim do lado esquerdo** | ver abaixo |
| depois disso, digitar `3` | o 3 entra no **nome**: vira x3 (indefinido, em vermelho) | ver abaixo |
| `x=` e depois `→` | o cursor vai para o marcador de conversão ▫ | ver abaixo |
| `x=` e depois `Tab` | sai da região | tabela 2.1 |
| `a+b`, `Espaço`, `/2` | (a + b)/2 | 2.3 confirmado |
| `c+d/2` (sem Espaço) | c + d/2 | 2.3 confirmado |
| `y:2,6%` | y ≔ 2,6·% (unidade porcento) | tabela 2.1 |
| `p\|q` | p ∨ q | tabela 2.1 |
| `s` com o assistente | lista com s, S, sb, sec…, detalhe "Segundo (Tempo)" e "Pressione TAB para inserir" | Parte 3 |
| `x` com o assistente | lista com xy2pol (função) antes das unidades yd, yr; detalhe com a assinatura `xy2pol("1:argumento"; "2:argumento")` e a descrição | Parte 3 |

**Correção do ADENDO 05 (E2.1 e teste E8-08):** depois de um `=` de avaliação, o cursor **não** vai para o marcador de conversão. Ele fica no fim da expressão da esquerda, e o resultado aparece na hora. Para converter, o usuário aperta `→` (ou clica no marcador). O teste E8-08 passa a ser: "`x=` com x definido mostra x = 2 na hora; digitar `5` em seguida edita o nome (x5); `→` leva ao marcador".

---

## Parte 3. Assistente dinâmico (autocompletar)

### 3.1 Quando aparece

- Ao digitar a **primeira letra** de um nome numa posição onde cabe um nome (lado esquerdo, operando, argumento).
- Ao digitar `'`: aparece só com **unidades**.
- Com `Ctrl+Space` em qualquer posição de nome.
- Fecha com `Esc`, quando nenhum item combina com o que foi digitado, ou quando o usuário digita um operador.
- Pode ser desligado em **Exibir → Assistente dinâmico** (ligado por padrão, salvo na configuração).

### 3.2 O que lista

| Categoria | Ícone (SVG de traço, 14 px) | Exemplos |
|---|---|---|
| Variável do usuário (definida antes deste ponto) | `x` itálico dentro de um quadrado, `--accent-light` | s_batata, L, V_mp |
| Função do usuário | `f` itálico dentro de um quadrado, `--accent-light` | f, Zt_1 |
| Função de biblioteca | ícone `lib` em `--type-lib` | ΔV, E_mês |
| Função nativa | `f` reto dentro de um quadrado, `--text-2` | sin, sqrt, abs |
| Unidade | ícone `ruler` em `--math-unit` | s, sec, m, mm, F, farad |
| Constante | ícone `sigma` em `--text-2` | π, e, ∞ |

### 3.3 Ordem e filtro

1. Primeiro, os itens cujo nome **começa** com o que foi digitado, com maiúsculas e minúsculas diferenciadas (`s` antes de `S`). Depois, os que começam sem diferenciar. Por último, os que **contêm** o texto.
2. Dentro de cada grupo: definições do usuário → bibliotecas → funções nativas → unidades → constantes, e depois ordem alfabética.
3. Nunca listar uma variável que só é definida **depois** do ponto atual da folha.

### 3.4 Aparência

- A lista abre colada embaixo do cursor, com 220 px de largura e no máximo 8 itens visíveis (com rolagem). Cada item tem 24 px de altura: ícone, nome no estilo matemático da categoria (variável em itálico, unidade reta em `--math-unit`) e, à direita, a categoria em Inter 11 px `--text-muted`.
- Item selecionado: fundo `--selection`.
- Ao lado da lista, um **painel de detalhe** com 260 px de largura:
  - linha 1: nome e categoria. Ex.: "s · Segundo (Tempo)".
  - linha 2: para variável, o **valor atual** (`s_batata = 14`); para função do usuário, a **definição** renderizada (`f(x) ≔ x + 2`); para função de biblioteca, a assinatura e a primeira frase do "Por que e quando usar"; para unidade, nome e grandeza.
  - última linha: "Tab para inserir", em Inter 11 px `--text-muted`.
- Fundo `--bg-raised`, borda `--border-strong`, sombra de menu.

### 3.5 Aceitar

- `Tab`, `Ctrl+Enter`, `Shift+Enter`, `Ctrl+Space` (com a lista aberta) ou duplo clique.
- **`Enter` não aceita**, porque ele sai da região (como no SMath).
- Setas ↑ e ↓ navegam na lista. O primeiro item já vem selecionado.
- Aceitar um item:
  - variável: troca o texto digitado pelo nome completo;
  - função: insere `nome(□; □)` com o cursor no primeiro argumento;
  - unidade: insere como unidade (reta, azul).
- **Se o usuário não aceitar** e continuar digitando um operador, o texto fica como foi digitado e é classificado pelas regras do ADENDO 02 (nome definido vence unidade).

### 3.6 Testes

| ID | Cenário | Esperado |
|---|---|---|
| 06-10 | Folha vazia, digitar `s` | Lista com s (unidade segundo) e S (unidade siemens), detalhe "s · Segundo (Tempo)", "Tab para inserir" |
| 06-11 | Com `f(x) ≔ x+2` acima, digitar `f` | Primeiro item é a função f do usuário; detalhe mostra f(x) ≔ x + 2 |
| 06-12 | Com `s_batata ≔ 2·7` acima, digitar `s` | s_batata aparece antes das unidades, com valor 14 no detalhe |
| 06-13 | `'` + `mm` + `Tab` | Insere a unidade mm |
| 06-14 | Digitar `s`, lista aberta, `Enter` | Sai da região sem aceitar; s classificado pelas regras |
| 06-15 | Variável definida mais abaixo na folha | Não aparece na lista |
| 06-16 | Exibir → desligar assistente | Lista não aparece; `Ctrl+Space` ainda abre manualmente |

---

## Parte 4. Ribbon matemático

O conteúdo das paletas laterais do SMath vira guias do ribbon, no estilo Autodesk. O que segue respeita o ADENDO 04 (ribbon com 124 px, abaixo das abas).

### 4.1 Guias por tipo de documento

- **Caderno e Folha livre:** Início · Matemática · Matrizes · Lógica e programação · Símbolos · Inserir · Exibir · Saída.
- **Documento LaTeX:** as de sempre.
- **Biblioteca:** as de sempre + Símbolos.

### 4.2 Matemática

| Grupo | Tipo | Botões (atalho) |
|---|---|---|
| Definir e avaliar | grandes | Definir ≔ (`:`), Avaliar = (`=`) |
| Estruturas | pequenos, 3 linhas | Fração (`/`), Potência (`^`), Índice (`.`), Raiz (`\`), Raiz n-ésima (`Ctrl+\`), Módulo (`abs(`), Parênteses (`(`), Fatorial (`!`), Mais ou menos (sem atalho) |
| Constantes | grade 2 × 2 | π (`Ctrl+Shift+P`), ∞ (`Ctrl+Shift+Z`), **i**, **e** |
| Funções | texto, 4 colunas | sin, cos, tan, cot, ln, log, exp, sign, arg, re, im, conj |
| Catálogo | grande | Todas as funções (`Ctrl+E`) |
| Cálculo | grandes | Somatório (`sum(`), Produtório (`product(`), Derivada (`diff(`), Integral (`int(`) |
| Condições | pequenos | Por partes, a < x < b, a ≤ x ≤ b |

### 4.3 Matrizes

| Grupo | Tipo | Botões |
|---|---|---|
| Inserir | grandes | Matriz (`Ctrl+M`), Vetor |
| Elementos | pequenos | Elemento (`[`), Intervalo (`range(`), Intervalo com passo |
| Operações | pequenos | Transposta (`Ctrl+1`), Inversa (`^-1`), Determinante (`det(`), Menor, Cofator, Produto vetorial (`Ctrl+8`) |
| Funções de matriz | texto | rows, cols, length, stack, augment, row, col, sum, max, min, sort, fft |

### 4.4 Lógica e programação

| Grupo | Tipo | Botões |
|---|---|---|
| Comparação | grade 4 × 2 | = lógico (`Ctrl+=`), ≠ (`Ctrl+3`), <, >, ≤ (`Ctrl+9`), ≥ (`Ctrl+0`), ≈, ≉ |
| Lógica | grade 2 × 2 | ∧ (`&`), ∨ (`\|`), ¬ (`~`), ⊕ (`xor(`) |
| Programação | grandes | if, for, while, try, Bloco (`[`) |
| Controle | pequenos | continue, break |

### 4.5 Símbolos

Gregas minúsculas (grade 12 × 2), gregas maiúsculas (grade 12 × 2) e Outros (∂ ∇ ° ′ ″ ℏ ∅ ∈ ∠ ‰). A dica de cada letra grega mostra a letra latina + `Ctrl+G`.

### 4.6 Guia contextual "Ferramentas de gráfico"

- Aparece só com um gráfico selecionado, no fim da fileira, com fundo `--tex-inserted-bg` e texto `--tex-inserted-text`. Fica ativa ao selecionar o gráfico e some ao desselecionar, voltando à guia anterior.
- Grupos: **Navegar** (Girar, Mover, Zoom, Restaurar), **Exibição** (Pontos, Linhas, Grade, Legenda), **Eixos** (Limites e rótulos).
- O mesmo mecanismo fica pronto para "Ferramentas de matriz" e "Ferramentas de tabela" no futuro.

### 4.7 Tipos de botão

| Tipo | Medidas | Uso |
|---|---|---|
| Grande | 54 × 66 px, ícone ou símbolo de 26 px em cima, rótulo Inter 11 px embaixo | ações principais |
| Pequeno | 22 px de altura, ícone ou símbolo de 16 px + rótulo; 3 linhas por coluna | estruturas, operações |
| Grade | 26 × 26 px, só o símbolo em STIX Two Text 17 px | constantes, comparação, gregas |
| Texto | 22 px de altura, nome em STIX Two Text 15 px (funções) ou JetBrains Mono 12/600 (palavras de programação) | funções e palavras-chave |

- Hover: fundo `--hover-strong`, borda 1 px `--border-strong`.
- Ícones de estrutura com **quadradinhos de posição** em `--accent-light` a 55 % e o traço em `--text-2`. Os caminhos estão no objeto `I` da referência e devem ir para `ICONS` com os mesmos nomes.
- **Exceção à regra de "nenhum caractere como ícone"** (acrescentar ao SPEC 4.5): botões que inserem um símbolo ou função matemática mostram o próprio símbolo ou nome em STIX Two Text. Não vale para nenhum outro botão.

### 4.8 Comportamento dos botões

1. **Onde inserem:**
   - Com expressão em edição: no cursor. Com seleção (2.3), a estrutura envolve a seleção.
   - Folha sem edição: cria região no cursor em cruz.
   - Caderno sem edição: nova linha de cálculo no bloco selecionado, ou um bloco `calc` novo depois da célula selecionada.
   - Sem lugar possível: botões desabilitados (40 %), com a dica "Clique numa região de cálculo".
2. Depois do clique, o foco volta à expressão, no **primeiro quadradinho vazio**.
3. **Dica** depois de 400 ms parado em cima: nome em Inter 12/600 + atalho em JetBrains Mono `--accent-light` à direita, e uma frase do que faz (textos na referência). Fundo `--bg-raised`, borda `--border-strong`, largura máxima 280 px.
4. **Key tips:** apertar e soltar `Alt` mostra letras sobre as guias (`M` Matemática, `X` Matrizes, `L` Lógica e programação, `S` Símbolos...) e depois sobre os botões. `Esc` volta.
5. **Janela estreita:** grupos se recolhem da direita para a esquerda, cada um num botão com menu. A altura não muda.
6. Cada tipo de documento **lembra a última guia** usada.
7. **Nenhum atalho repetido** no mesmo contexto. Um teste lê o registro de comandos e falha se houver repetição. Atalhos de contextos diferentes (gráfico selecionado e fórmula em edição) podem coincidir.

### 4.9 Catálogo de funções (`Ctrl+E`) e de unidades (`Ctrl+W`)

Diálogo de 720 × 480 px:

- à esquerda, as categorias (Todas, Recentes, Matemáticas, Trigonométricas, Complexos, Matrizes e vetores, Programação, Texto, e uma por biblioteca carregada; para unidades, por grandeza: Comprimento, Tempo, Tensão...);
- no centro, a lista com busca;
- à direita, a assinatura, a fórmula renderizada e a descrição.

Enter ou duplo clique insere.

---

## Parte 5. Integral numérica e gráfico de função (caso de referência)

### 5.1 O caso

O usuário mostrou no SMath:

```
F(x) ≔ |1 + e^(5·(x − 2))|
∫₀² F(x) dx = 2,2
[gráfico 2D: x de 0 a 3, y de 0 a 3, grade tracejada, curva F(x); abaixo do gráfico, a expressão plotada: F(x)]
```

Valores conferidos fora do app:

| Grandeza | Exato | Exibido (padrão 1.3) |
|---|---|---|
| ∫₀² F(x) dx = 2 + (1 − e⁻¹⁰)/5 | 2,199 990 920 014 | **2,2** |
| F(0) | 1,000 045 4 | 1 |
| F(1) | 1,006 737 9 | 1,0067 |
| F(2) | 2 | 2 |
| F(2,2) | 3,718 281 8 | 3,7183 |

### 5.2 Digitação

| Sequência | Na tela | No arquivo |
|---|---|---|
| `F(x)=abs(1+e^5*(x-2)` + `→` `→` | F(x) ≔ \|1 + **e**^5·(x − 2)\| | `F(x) := abs(1 + e^(5*(x - 2)))` |
| `int(`, preencher os quadradinhos com setas (limite inferior `0`, superior `2`, integrando `F(x)`, variável `x`), `=` | ∫₀² F(x) dx = 2,2 | `integral(F(x), x, 0, 2) = ?` |

- **e** (Euler) e **i** (imaginária) em negrito reto.
- Tudo depois de `^` fica no expoente até sair com `→` ou ampliar com `Espaço`.

### 5.3 Integral e derivada (motor)

- Integral: Gauss-Kronrod adaptativo (G7-K15), tolerância relativa 1·10⁻¹⁰, no máximo 2 000 subdivisões.
- Limites infinitos: troca de variável para um intervalo finito.
- Unidades: unidade do integrando × unidade da variável (∫₀^(2 s) 3 m/s dt = 6 m).
- Integrando complexo: parte real e imaginária separadamente.
- Sem convergência: mostra o valor e o aviso "A integral pode não ter convergido (estimativa de erro: …)" em `--warn-text`.
- Derivada (`diff(`): numérica, por diferenças centrais com extrapolação de Richardson.

### 5.4 Gráfico 2D de função

**Criar:** `@` numa área vazia ou Inserir → Gráfico 2D. Cria uma região de 320 × 240 px com um **campo de expressão embaixo**, já em edição. O que se digita ali é plotado.

**O que pode ser plotado:**

| No campo | Resultado |
|---|---|
| Expressão com uma variável livre | Curva; a variável livre é o eixo horizontal, com qualquer nome |
| Vários itens com `;` | Várias curvas |
| Matriz n × 2 | Pontos (x, y) ligados |
| Vetor de matrizes n × 2 (`sys`) | Uma série por matriz |

Com mais de uma variável livre, mostrar o erro "O gráfico 2D precisa de uma única variável livre (encontradas: x, t)".

**Amostragem:** 400 pontos mais refinamento adaptativo (até 4 000). Valor infinito ou indefinido quebra a linha (não liga os dois lados de uma assíntota). Reamostrar a cada zoom ou movimento.

**Aparência:**

| Elemento | Folha (escuro) | Caderno (branco) |
|---|---|---|
| Fundo | `--bg-panel` | #ffffff |
| Borda | 1 px `--border` | 1 px `--paper-border` |
| Grade | tracejada (4 2), `--border` | tracejada, #d5d9df |
| Números dos eixos | Inter 11 px `--text-muted`, vírgula decimal | Inter 11 px `--paper-text-2` |
| Rótulos | Inter 12 px `--text-2`; padrão: nome da variável livre e "y" | igual, `--paper-text` |
| Séries, em ordem | #a78bfa, #8fb4ff, #7fd6a4, #f3cf7a, #f19a9a | #6d28d9, #1d4ed8, #0f766e, #b45309, #9b1c1c |
| Linha | 1,8 px | 1,8 px |

Marcas dos eixos em números redondos (1, 2, 5 × 10ⁿ).

**Interação:**
- Roda: zoom no ponteiro (`Shift` só x, `Ctrl` só y).
- Arrastar com Mover ou com o botão do meio: desloca a vista.
- Duplo clique: vista automática (x de −5 a 5 se não houver informação; y ajustado à curva com 5 % de folga).
- Arrastar a borda: redimensiona.
- A vista ajustada é salva no arquivo.

**No arquivo:**

````
```grafico {#g1 x=40 y=180 largura=320 altura=240}
tipo: 2d
series: ["F(x)"]
x: {min: 0, max: 3, rotulo: x}
y: {min: 0, max: 3, rotulo: y}
grade: true
```
````

O formato antigo da `string-3` (com `var`, `valores` e `limite`) continua aceito como "gráfico por valores".

---

## Parte 6. Critérios de aceite

Além dos testes 06-01 a 06-04 (Parte 1) e 06-10 a 06-16 (Parte 3):

| ID | Critério |
|---|---|
| 06-20 | Todos os atalhos da tabela 2.1 funcionam (um caso de teste por linha em `teclado.yaml`) |
| 06-21 | `a+b`, `Espaço`, `/2` gera (a + b)/2 com a + b inteiro no numerador |
| 06-22 | Digitar `sqrt(`, `abs(`, `int(`, `sum(` cria as estruturas visuais de 2.2 |
| 06-23 | `2,6%` vira 2,6 % com a unidade porcento |
| 06-45 | Todas as linhas da tabela 2.5 se comportam no Prisma como no SMath (com a correção do E8-08) |
| 06-24 | `Ctrl+.` em `diff(x^2;x)` mostra → 2·x |
| 06-25 | Caderno e folha mostram as 8 guias na ordem de 4.1; ribbon com 124 px e nenhum título de grupo cortado |
| 06-26 | Com uma região em edição, clicar Fração com `a+b` selecionado gera a fração com a + b no numerador e o cursor no denominador |
| 06-27 | Folha sem edição: clicar π cria região no cursor em cruz |
| 06-28 | A dica de Fração mostra "Fração", "/" e a frase de descrição |
| 06-29 | Selecionar um gráfico mostra e ativa "Ferramentas de gráfico"; desselecionar volta à guia anterior |
| 06-30 | `Alt`, `M` abre a guia Matemática |
| 06-31 | Janela com 1024 px: grupos recolhidos e todos os botões acessíveis |
| 06-32 | Nenhum atalho duplicado no mesmo contexto |
| 06-33 | `Ctrl+E`, buscar "queda", Enter: insere ΔV(□; □; □) |
| 06-34 | Caso 5.1: as sequências de 5.2 produzem a tela e o arquivo indicados |
| 06-35 | ∫₀² F(x) dx = 2,2 no padrão e 2,19999092 com `casas=8`; F(0), F(1), F(2), F(2,2) batem com a tabela de 5.1 |
| 06-36 | ∫₀^∞ e^(−x) dx = 1 e ∫₀^(2 s) 3 m/s dt = 6 m |
| 06-37 | `@` cria o gráfico com o campo em edição; digitar `F(x)` desenha a curva |
| 06-38 | Vista 0 a 3 × 0 a 3: a curva passa por (0; 1) e (2; 2) com erro menor que 1 px e sai pelo topo perto de x = 2,14 |
| 06-39 | `1/(x-1)` não liga os lados da assíntota |
| 06-40 | Redefinir F(x) acima atualiza a curva e a integral em até 150 ms |
| 06-41 | Vista ajustada é salva e reaberta igual; duplo clique volta à automática |
| 06-42 | Duas variáveis livres mostram o erro de 5.4 |
| 06-43 | Testes visuais: as 4 guias novas, a contextual, o assistente aberto (06-10 e 06-11) e o caso 5.1 na folha e no caderno, com imagens aprovadas pelo usuário |
| 06-44 | Fixture `tests/fixtures/referencia-integral-grafico.prsf` com o caso 5.1, incluída no teste de ida e volta |

## Ordem sugerida

1. Parte 1 (estrutura da região e formato padrão). Mostrar ao usuário a lista de valores que mudam antes de atualizar testes.
2. Parte 2 (teclado) e Parte 3 (assistente).
3. Parte 4 (ribbon).
4. Parte 5 (integral e gráfico).

`npm run verify` ao fim de cada parte e `npm run verify:full` no fim do adendo.
