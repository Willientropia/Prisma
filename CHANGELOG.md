# Versões do Prisma

Cada versão tem uma tag `vX.Y.Z` no git com esta mesma descrição.

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
