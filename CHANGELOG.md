# Versões do Prisma

Cada versão tem uma tag `vX.Y.Z` no git com esta mesma descrição.

## Em andamento

- **F07** Definição circular em função (B11): `f(x) := f(x) + 1`, ou `g` que chama `h` que chama `g`, agora para em 100 chamadas aninhadas da mesma função com "Definição circular: f depende de si mesmo", em vez de estourar a pilha ("níveis demais"). O caso das variáveis (`x := x + 1`) já estava resolvido desde o A6-ROBUSTEZ-03. Pendente para quando houver `if` no motor: medir a pilha do worker antes de subir o limite.

- **F08** Função do usuário enxerga definição em aberto (B10, ADENDO 05 E3.4): `s := 10*x`, `x := 2`, `f(a) := a + s`, `f(1) = ?` dá 21. Antes dava "Variável não definida: s". Os nomes do corpo são resolvidos na hora da chamada, com os valores daquele ponto. O nome em aberto entra no corpo antes dos parâmetros: `s := 10*x`, `f(x) := x + s`, `f(1) =` dá 11, como no SMath (conferido pelo usuário, 16/11).

## v0.7.0 — 2026-11-16

Página escura do caderno e F06 (docs/TICKETS-FOLHA.md). verify:full aprovado: 758 testes, nenhuma falha.

- **F06** Laços e prazo no motor (B7 e B18 da auditoria):
  - `range` com mais de 1 000 000 de elementos, ou infinito (`range(1, 1/0)`), dá erro na hora em vez de derrubar o cálculo por memória.
  - `for` respeita o prazo da linha a cada volta.
  - Prazo estourado nas bibliotecas, antes da primeira linha, agora aparece como mensagem.
  - Uma avaliação interrompida por outra não apaga mais o indicador "calculando" da nova.
  - A integral já tinha limite de subdivisões e prazo.
  - O F2-11 passou a usar `sum(1:1000000)`, no teto do `range` (troca autorizada pelo usuário).

- **Página escura do caderno** (pedido do usuário, 15/11): Exibir → Página escura deixa a página do caderno com as cores da folha livre, para ler melhor. Fica gravada no `config.yaml`. Imprimir e PDF continuam brancos. O teste F0-01 passou a esperar o botão.

## v0.6.0 — 2026-11-15

Janela mais limpa, desfazer do documento, moldura em lote e F05 (docs/TICKETS-FOLHA.md). verify:full aprovado: 750 testes, nenhuma falha.

- **Janela** (pedido do usuário, 14/11)
  - Barras de rolagem finas, no tom da interface, sem o trilho branco nem setas.
  - Painéis laterais com largura arrastável (duplo clique volta ao padrão) e Exibir → Painéis: mostrar e esconder painel esquerdo, direito e linha de comando, Recolher faixa (`Ctrl+F1`) e Modo foco (`Ctrl+Shift+F`). Tudo gravado no `config.yaml`.
  - Os testes F0-01 a F0-04 passaram a esperar o grupo Painéis na guia Exibir (aceite do usuário para esta etapa).
- **F05** Linhas do SMath que só apareciam como "Não foi possível ler esta linha" agora abrem na tela e voltam iguais ao arquivo: `for(i, range(1, 8), v[i] := ...)` (54 linhas do corpus; o `i` do laço não vira unidade imaginária) e nomes com `%` como `Z%_modulo` (20 linhas). Pendente: o `#` solto do SMath (1 linha) e 5 linhas com parênteses ou índice composto que voltam diferentes (`Zpu_A1(...)`, `a1 := (0.0236*e^(...))`, caminho com `\` entre aspas).
- **Revisão da versão** O desfazer continua depois de Salvar como e de renomear, e não traz de volta o texto de antes de recarregar um arquivo mudado fora do Prisma. Edição que não muda nada não vira passo. Zoom ainda não gravado não passa por cima de um Ctrl+Z. Erro ao gravar os painéis aparece na barra de status, e as gravações seguidas não se atropelam. Duplo clique numa guia com a faixa recolhida abre e deixa aberta. A atribuição dentro de argumento vale só no corpo do `for`.
- **Moldura em lote** (pedido do usuário, 14/11): Início → Organizar → Moldura, ou o menu de contexto numa região selecionada, põe moldura em todas as selecionadas; se todas já têm, tira de todas. Um Ctrl+Z desfaz o lote. O teste F0-02 passou a esperar o botão.
- **Desfazer do documento** (pedido do usuário, 14/11): `Ctrl+Z` e `Ctrl+Y` fora de um campo desfazem e refazem zoom e vista do gráfico, regiões movidas e linhas digitadas, na ordem. Dentro de um campo, continua o desfazer do campo.
- **Correções achadas na verificação do envio**
  - BUG-030: dois cliques seguidos em Moldura (a menos de 30 ms) viravam um passo só no desfazer. Agora uma ação é o que acontece num mesmo evento, sem prazo de tempo.
  - BUG-031: linha longa demais (soma de milhares de termos) às vezes abria em vez de aparecer como "Não foi possível ler esta linha", conforme a pilha do navegador aguentava. Agora há limite explícito de profundidade (uns 600 termos numa soma).

## v0.5.0 — 2026-11-14

Gráfico 2D, impressão do caderno e correções da tela (ADENDO 06, docs/TICKETS-FOLHA.md). verify:full aprovado: 725 testes, nenhuma falha.

- **A6-9** Gráfico 2D de função (ADENDO 06, 5.4 e 4.6), na folha e no caderno.
  - Criar: `@` numa área vazia da folha, Inserir → Gráfico 2D ou Início → Gráfico (no caderno). O gráfico nasce com 320 × 240 px e o campo de expressão embaixo já em edição.
  - O campo aceita expressão de uma variável livre, com qualquer nome. Vários itens separados por `;` viram várias curvas. Também aceita matriz n × 2 e vetor de matrizes. Com duas variáveis livres, aparece o erro do ADENDO.
  - Amostragem: 400 pontos, com refinamento até 4 000 e prazo de 60 ms. Assíntota e ponto fora do domínio quebram a linha.
  - Vista: com o gráfico selecionado, a roda faz zoom no ponteiro (`Shift` só x, `Ctrl` só y; sem seleção, ela rola a página); Mover ou o botão do meio deslocam; duplo clique volta à vista automática. A vista ajustada vai para o arquivo.
  - Arrastar a borda redimensiona. Legenda, nome da variável no eixo e erro aparecem em notação matemática.
  - Guia contextual "Ferramentas de gráfico": Mover, Zoom, Restaurar, Pontos, Linhas, Grade, Legenda e Limites e rótulos.
  - O formato antigo, com `var` e `valores`, continua desenhado como antes.
- **Imprimir** (`Ctrl+P`, Saída → Imprimir) funciona no caderno: sai só o papel, em A4, e no diálogo do sistema "Salvar como PDF" gera o arquivo. Expressão mais larga que a folha diminui até caber (piso de 8 px), sem barra de rolagem no papel.
- **Correções da tela**
  - BUG-024: `π` digitado como símbolo não aparece mais sublinhado como não definido.
  - BUG-025: expressão longa no caderno fica na largura do bloco e rola por dentro, seguindo o cursor.
  - BUG-026: em `diff(f(t), t, t0)`, o `t` não aparece mais como não definido.
  - BUG-027: a legenda do gráfico mostra as séries em notação matemática.
  - BUG-028: `sin(g(t))` e `diff(i_cc(t, 0), t, 1)` aparecem com todos os parênteses no campo.
  - BUG-029: botão do ribbon clicado enquanto a região nova monta entra depois das teclas já digitadas (o 06-26 falhava 3 em 8; já acontecia na v0.4.0).
- **Revisão da versão** As marcas dos eixos não travam a tela com zoom extremo. A roda do caderno só dá zoom no gráfico selecionado. Tela e motor reconhecem o gráfico pela mesma regra. A rolagem lateral do touchpad não dá zoom. O teste F0-02 passou a esperar "Gráfico 2D" no grupo Conteúdo da folha (ADENDO 06, 5.4; autorizado pelo usuário).
- **Testes** Os testes de navegador e o servidor dos testes carregam a cobertura e as fontes do MathLive mesmo com `node_modules` em atalho (worktree).

Pendente:
- **Gráfico:** Girar desabilitado (é do 3D); Mover e Zoom sem estado pressionado; "Limites e rótulos" pergunta um eixo por vez, em texto, e o passo não se edita; valor com unidade desenhado no SI, sem unidade no eixo; o gráfico usa todas as definições da folha, inclusive as de baixo; gráfico importado do SMath ainda não é desenhado.
- **Expressão longa:** quebrar a linha nos operadores, que o MathLive não faz.
- **Imprimir:** a folha avisa "Imprimir: ainda não disponível nesta versão". O diálogo Exportar (Fase 6) continua sem exportar.
- **Não testado no app instalado:** se o WebView2 dispara o fim da impressão; se não disparar, a tela volta ao normal em até 2 minutos.

## v0.4.0 — 2026-11-13

Ribbon matemático, catálogos e layout da folha (ADENDO 06, docs/TICKETS-FOLHA.md). verify:full aprovado: 699 testes, nenhuma falha.

- **A6-5** O caderno e a folha têm 8 guias: Início, Matemática, Matrizes, Lógica e programação, Símbolos, Inserir, Exibir e Saída.
  - A guia Matemática segue a referência, com botões grandes, pequenos, em grade e de texto.
  - Os botões inserem no cursor (com seleção, envolvem a seleção) ou criam a região no cursor em cruz da folha.
  - A dica aparece depois de 400 ms, com o atalho.
  - Em janela estreita, os grupos se recolhem em botões com menu.
  - Apertar e soltar `Alt` mostra as letras das guias.
  - Cada tipo de documento lembra a última guia.
- **A6-6** Guias Matrizes, Lógica e programação e Símbolos (letras gregas). `Ctrl+M` insere uma matriz 2 × 2, e `Ctrl+1`, a transposta.
- **A6-7** Catálogo de funções (`Ctrl+E`) e de unidades (`Ctrl+W` com expressão em edição), com categorias, busca e detalhe. Enter insere com quadradinhos, como `ΔV(□; □; □)`.
- **F-LAYOUT**
  - Arrastar várias regiões até a borda para o grupo inteiro, sem empilhar (BUG-022).
  - Enter com a cruz desce uma linha.
  - Alinhar regiões selecionadas, com `Ctrl+Shift+←` e `Ctrl+Shift+↑` ou pelo menu.
  - O `.sm` importado grava `pagina.escala: 0.55` e desenha do tamanho do SMath (no `08do10`, as sobreposições caem de 34 para 13).
- **A6-ESCALA** `‰` e `ppm` valem em expressão, como o `%`. Matriz em `%`, `‰` ou `ppm` converte elemento a elemento, como no SMath; complexo com parte imaginária dá erro em português (BUG-021).
- **A6-TECLADO2** `V.o^2` é V_o ao quadrado e `f.a(x)` é a função f_a. Depois de apagar o índice, `+` não sai mais da fração.
- **Correções** Uma tecla apertada enquanto a região nova monta não dispara mais atalho global (antes, `Ctrl+W` fechava o documento; BUG-023). A revisão da versão corrigiu o destino do catálogo, o `Alt` por engano e a última guia ao fechar um documento.
- **Protocolo de desenvolvimento** Uma pasta só, testes ligados à mudança durante o trabalho, e `verify:full` e revisor por versão. O pre-commit roda tipos e testes de unidade.

Pendente:
- **Itens que o formato ainda não lê:**
  - Matemática: Fatorial, ±, Por partes e intervalos.
  - Matrizes: Menor e Cofator.
  - Lógica e programação: ≈, ≉, ∧, ¬, try, Bloco, continue e break.
  - Símbolos: ∂, ∇, ′, ″, ∅, ∈ e ∠.
- **Ribbon:** o diálogo de linhas e colunas da Matriz, as letras do `Alt` sobre os botões e os botões no caderno sem edição.
- **Catálogo e inserção pelo ribbon:**
  - Na folha, o catálogo insere no fim da linha, e não no cursor.
  - Depois de Potência ou Índice pelo ribbon, o Espaço não sai do expoente.
- **Desenho de `1/3 ppm`:** aparece como 1/(3 ppm), mas o motor calcula (1/3)·ppm.
- **Layout:** "Separar regiões" (F-LAYOUT 4b).
- **Fora deste lote:** A6-9 (gráfico 2D) e o Lote F2.
- **Aprovação dos textos de interface novos:** "Ainda não disponível", "Nada encontrado", os rótulos de alinhar e as descrições das funções nativas.

## v0.3.0 — 2026-11-12

Lote F-A6 da folha livre (ADENDO 06, docs/TICKETS-FOLHA.md). verify:full aprovado: 669 testes, nenhuma falha.

- **A6-1** A região é reclassificada a cada edição (esvaziar o campo apaga o resultado na hora). Formato padrão do SMath: 4 casas decimais, sem zeros à direita, expoente a partir de 10⁵ (3,29 V passa a 3,2936 V).
- **A6-2** Atalhos da tabela 2.1 (`[` para índice de elemento, Ctrl+`=`, Ctrl+3/9/0 para ≠ ≤ ≥, Ctrl+`\` para raiz n-ésima). `sqrt(`, `nthroot(`, `abs(`, `int(` e `sum(` viram a estrutura visual com quadradinhos. `.` e `,` depois de qualquer nome abrem o índice (BUG-015).
- **A6-3** O Espaço amplia a seleção (`a+b`, Espaço, `/2` dá (a + b)/2). Espaço numa região com um só nome vira texto. Ctrl+`.` faz cálculo simbólico mínimo. `|` é o ou. Dentro do índice a vírgula é texto (`batata,alo,oi`). `a<=b` vira a ≤ b (BUG-016).
- **A6-4** Assistente dinâmico: ao digitar um nome, `'` ou Ctrl+Espaço abre a lista de variáveis, funções e unidades com o detalhe ao lado; Tab aceita. O campo de unidade abre a lista na hora. Exibir → Assistente dinâmico liga e desliga.
- **A6-8** Integral (Gauss-Kronrod, com limites infinitos) e derivada (Ridders) no motor.
- **F-CONFIG** Notação científica e de engenharia. Menus de formato do app, do documento e do resultado. O padrão do app é gravado no documento novo. Arquivos antigos abrem com os mesmos bytes.
- **F-INST** O `verify` guarda a falha do Playwright em `test-results/falhas/` e avisa quando há menos de 5 GB livres.
- **A6-FIX** (teste manual do lote) BUG-018: `/` depois de nome com índice monta a fração na hora, também digitando rápido. BUG-019: `%`, `‰` e `ppm` no campo de unidade do resultado convertem e gravam `= ? ‰` e `= ? ppm`. BUG-020: `5A` no arquivo lê como 5·A; linha que não dá para ler aparece marcada como erro, nunca com o texto cru.
- **A6-FIX2** (achados do Fable nº 1) A tela segue o motor: `a/2x` é a/(2x). `2e3` e `5%` sobrevivem à edição. `3(x)`, `2 sin(x)`, `2(a+b)` e `(a+b)(c+d)` abrem e calculam como produto. A linha ilegível só muda com confirmação.
- **A6-ROBUSTEZ** (achados do Fable nº 1) Prazo de 1,5 s por linha no motor, com mensagem em português. Definição circular tem mensagem em português. Linha com milhares de termos não derruba a tela. O `simplify` só roda em expressão de até 70 caracteres.
- **Corridas de digitação** Tab logo depois do `%` não aceita mais o item errado da lista, e a ampliação do Espaço não se perde quando a tecla anterior chega atrasada.

Pendente: A6-TECLADO2 (achados 7, 8 e 9 do Fable), A6-ESCALA (`‰` e `ppm` dentro de expressão; matriz e complexo em `%` dão "NaN %"), F-LAYOUT (alinhar regiões, separar regiões sobrepostas na importação do `.sm`), A6-5 (guias do ribbon), A6-6, A6-7 e A6-9 (gráfico 2D). `simplify` em worker separado com prazo. `a b` (nome, espaço, nome) como produto. `mathlinear.ts` e `evaluate.ts` passam de 300 linhas (MANUTENCAO-01).

## v0.2.0 — 2026-11-11

Lote F1 da folha livre (docs/TICKETS-FOLHA.md). verify:full aprovado: 385 testes, nenhuma falha.

- **F01** Arrastar uma região para a esquerda ou para cima funciona. A posição final nunca passa da borda.
- **F02** Arrastar várias regiões selecionadas move todas juntas sem corromper o arquivo.
- **F03** O teclado não fica mais preso na folha quando o campo novo não monta. Há prazo de 2 s para criar a região e de 1 s para segurar teclas.
- **F04** Dentro da expressão, nome é sempre variável: `9j` é 9·j, e `L` ou `x` indefinidos dão "ainda não foi definido" em vez de virar unidade. Unidade só entra explícita: número espaço unidade (`5 m`), apóstrofo (`x*'m`), `= ? unidade` ou `to`/`in`. Arquivos antigos abrem igual. Unidade solta importada do SMath ganha o apóstrofo.

Pendente: unidade definida pelo usuário (F-U1) e assistente de unidades (A6-4).

## v0.1.0

Estado anterior ao versionamento (até o commit dc8a33c).
