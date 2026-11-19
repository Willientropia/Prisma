# Experimento no SMath: itens "conferir" do checklist da folha

Para o usuário fazer no SMath Studio de uma vez e anotar o resultado. Cada número abaixo é um item de
`docs/FOLHA-CHECKLIST.md`. Depois de anotar, devolva este arquivo: cada resposta vira um ticket F18+
(ou fica como está, se o Prisma já faz igual).

Como anotar: escreva logo abaixo de **Resultado:** o que aconteceu, em poucas palavras. Se o SMath não
tiver a função, escreva "não tem". Se houver atalho ou item de menu, anote o nome exato que aparece na tela.

## Preparo (uma vez, antes de começar)

Abra uma folha nova no SMath e crie estas regiões, uma embaixo da outra, com uns dois dedos de espaço entre elas:

- **A**: `x:2` (aparece x ≔ 2)
- **B**: `y:x+1` (aparece y ≔ x + 1)
- **C**: `y=` (aparece y = 3)
- **T**: uma região de texto com a frase "Texto de teste" (no SMath, comece com `"`)

Deixe também uma área (Inserir → Área) envolvendo B e C, com A acima dela e T abaixo dela.

Volte a este estado (Ctrl+Z, ou recrie) sempre que um item mexer nas regiões.

---

## Seleção

**1. S2: retângulo de seleção.** Com o mouse, arraste um retângulo numa parte vazia que encoste só na metade de baixo de A, sem cobrir A inteira. Solte.
A fica selecionada só de encostar, ou precisa estar inteira dentro do retângulo?

Resultado:

**2. S4: retângulo com Ctrl.** Clique em A para selecioná-la. Segure Ctrl e arraste um retângulo em volta de T.
Ficam A e T selecionadas, ou só T?

Resultado:

**3. S7: Shift+clique.** Clique em A. Segure Shift e clique em C.
O que acontece: soma C à seleção, seleciona tudo de A até C (inclusive B), ou outra coisa?

Resultado:

## Arrasto e posição

**4. A2: por onde se pega a região.** Clique em A para selecioná-la. Agora pressione o mouse no meio do texto de A (em cima do "x ≔ 2", não na borda) e arraste.
A região se move, ou o SMath entra na edição ou seleciona o texto dentro dela?

Resultado:

**5. A4: Ctrl+arrastar.** Selecione A. Segure Ctrl e arraste A para outro lugar. Solte.
Fica uma cópia de A no lugar novo e a original no lugar antigo, ou A só se move?

Resultado:

**6. A5: mover pelo teclado.** Selecione A (clique na borda, sem entrar na edição). Pressione as setas.
A região A se move, ou nada acontece? Se nada acontecer, tente Ctrl+setas e Shift+setas e anote.

Resultado:

**7. A6: inserir e remover linha.** Clique numa parte vazia entre A e a área (aparece a cruz vermelha). Procure no menu do botão direito e no menu Editar uma opção de inserir linha, ou de abrir ou remover espaço.
Existe? Qual o nome e o atalho? Use-a: tudo o que está abaixo da cruz desce? E a opção de remover sobe tudo de volta?

Resultado:

**8. A8: folha cresce sozinha.** Arraste T para bem abaixo do fim da primeira página (onde aparece a linha de quebra de página), ou crie uma região lá.
A folha ganha uma página nova sozinha? Existe algum limite de altura?

Resultado:

## Copiar e colar

**9. C5: colar texto de fora.** No Bloco de Notas, escreva `z:5`, selecione e copie (Ctrl+C). No SMath, clique numa parte vazia e cole (Ctrl+V).
Vira uma região de cálculo z ≔ 5, uma região de texto com "z:5", ou não cola nada?

Resultado:

**10. C7: copiar um resultado.** Clique no resultado de C (o "3" de y = 3) ou selecione a região C e copie (Ctrl+C). Cole no Bloco de Notas.
O que aparece no Bloco de Notas: "3", "y = 3", "y=", um XML do SMath, ou nada?

Resultado:

## Desfazer

**11. D4: Ctrl+Z dentro da região.** Clique dentro de B para editar e digite `+5` no fim (fica y ≔ x + 1 + 5). Sem sair da região, pressione Ctrl+Z uma vez.
Desfaz só o último caractere digitado (fica "+"), desfaz o "+5" inteiro, ou desfaz outra coisa da folha (por exemplo, uma região criada antes)?

Resultado:

## Áreas

**12. R4: altura da área.** Pressione o mouse na linha de baixo da área (a que fica abaixo de C) e arraste para baixo.
A linha de baixo se move sozinha (a área fica mais alta e as regiões de fora ficam no lugar), ou a área inteira se move?

Resultado:

**13. R6: apagar a área com o conteúdo.** Clique na linha de cima da área (o título) para selecioná-la e pressione Delete.
Somem a área e as regiões de dentro (B e C), ou só as linhas da área, ficando B e C no lugar?

Resultado:

## Teclado

**14. K5: setas saindo da região.** Clique dentro de A, no fim do texto. Pressione seta para a direita algumas vezes, até passar do fim.
O cursor sai de A? Vai para a região vizinha (qual?), vira a cruz vermelha ao lado, ou fica parado? Repita no começo de A com seta para a esquerda, e com seta para baixo.

Resultado:

**15. K6: Tab entre regiões.** Clique dentro de A. Pressione Tab algumas vezes, depois Shift+Tab.
Tab vai de uma região para a próxima (A → B → C → T)? Em que ordem? Ou Tab faz outra coisa dentro da região?

Resultado:

**16. K8: PageUp, PageDown, Ctrl+Home, Ctrl+End.** Com a cruz numa parte vazia (sem região em edição), pressione cada um.
O que cada um faz: rola a tela, move a cruz, vai para o começo ou fim da folha?

Resultado:

**17. K9: zoom.** Segure Ctrl e gire a roda do mouse sobre a folha.
Muda o zoom? Em quais passos (anote os valores que aparecem, por exemplo 100 %, 110 %)? Existe também um campo de zoom na barra de baixo ou no menu Exibir?

Resultado:

## Formatação

**18. F4: formatação de texto.** Selecione parte do texto de T. Veja o que o SMath oferece (barra de ferramentas e botão direito).
Liste o que existe: negrito, itálico, sublinhado, tamanho, fonte, cor do texto, cor de fundo, alinhamento, listas. Marque o que você usa de fato.

Resultado:

**19. F5: cor de região de cálculo.** Clique com o botão direito em A (região de cálculo).
Há opção de cor de fundo ou cor da fonte para a região inteira? Anote o nome do item. Você usa?

Resultado:

**20. F6: largura do texto.** Selecione T. Procure uma alça na borda direita para arrastar.
Dá para mudar a largura e o texto quebra em linhas? Ou o texto só cresce para a direita?

Resultado:
