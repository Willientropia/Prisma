# Versões do Prisma

Cada versão tem uma tag `vX.Y.Z` no git com esta mesma descrição.

## Em andamento

- **F-LAYOUT 1 a 3:**
  - BUG-022: arrastar várias regiões até a borda para o grupo inteiro, e elas não se empilham mais.
  - Enter com a cruz na folha desce uma linha da grade.
  - Alinhar as regiões selecionadas, pelo menu do botão direito ou pelo atalho:
    - na vertical (mesmo x), com Ctrl+Shift+←;
    - na horizontal (mesmo topo), com Ctrl+Shift+↑.

  Os textos dos menus e os atalhos foram escolhidos aqui, porque o ADENDO 06 não os define. O botão no ribbon fica para o A6-5.

- **Protocolo enxuto (12/11):** uma pasta só, testes ligados à mudança durante o trabalho, `verify:full` e `revisor` por versão. O pre-commit roda só tipos e testes de unidade (sem `robustez.test.ts`, que abre processos com prazo e fica no `verify`), e o `check-matriz` vira aviso.
- **A6-TECLADO2:** `V.o^2` é V_o ao quadrado e `f.a(x)` é a função f_a: `^` e `(` saem do índice (achado 7 do Fable). Operador e Espaço só saem do índice se o cursor está mesmo nele: `x/a.b`, apagar o `b` e digitar `+c` dá x/(a + c), não x/a + c (achado 9). O achado 8 não se reproduz: dentro da unidade do apóstrofo a lista só tem unidades, e as 70 têm a forma interna. Não testado à parte: `state.struct` velho com `)`.
- **A6-ESCALA:** `‰` e `ppm` valem em expressão, iguais ao `%`: `5‰ = ?` dá 0,005, `3 ppm = ?` dá 3·10⁻⁶, `x := 2‰` grava `2 ‰`. **BUG-021 (achado 12, como o SMath, decisão do usuário):** matriz em `%`, `‰` ou `ppm` converte elemento a elemento (`DIi_h = ? %` dá [100; 80; …], igual ao SMath no `Prova_de_Qualidade_2.sm`); complexo sem parte imaginária vira número; com parte imaginária dá "Não é possível converter número complexo em %".

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
