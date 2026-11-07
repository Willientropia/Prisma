# ADENDO 04: posição fixa das abas de documento

Este adendo altera a seção 5 do SPEC (layout da janela) e acrescenta uma regra geral de design.

## D1. O problema

Hoje a ordem vertical é: barra de título → ribbon (só com documento aberto) → abas de documento. Na tela inicial não há ribbon, então as abas ficam logo abaixo da barra de título. Ao abrir um documento, o ribbon aparece **acima** delas e as abas descem cerca de 125 px.

Isso é ruim por três motivos:

1. **O alvo foge do mouse.** O usuário clica numa aba, e a fileira de abas inteira muda de lugar. O próximo clique na aba "Início" erra o alvo.
2. **A hierarquia fica invertida.** A aba escolhe *qual documento*; o ribbon mostra *as ferramentas daquele documento*. O seletor deve ficar acima do que ele controla, como nas abas de um navegador.
3. **A tela "pula"** a cada troca entre a tela inicial e um documento, o que passa sensação de instabilidade.

Além disso, nas capturas o título do grupo "Células" aparece cortado pela fileira de abas, o que mostra que a altura do ribbon não está reservada.

## D2. Nova ordem vertical (fixa em todas as telas)

```
┌──────────────────────────────────────────────┐
│ Barra de título                       38 px  │  sempre
├──────────────────────────────────────────────┤
│ Abas de documento                     32 px  │  sempre, mesma posição
├──────────────────────────────────────────────┤
│ Ribbon: guias 32 px + corpo 92 px    124 px  │  só com documento aberto
├──────────────────────────────────────────────┤
│ Conteúdo                                     │
├──────────────────────────────────────────────┤
│ Barra de status                       26 px  │  sempre
└──────────────────────────────────────────────┘
```

- As abas de documento ficam **sempre** em `top = 38 px`, em qualquer tela. Elas nunca mudam de lugar.
- O ribbon fica **abaixo** das abas. Na tela inicial ele não existe, e o conteúdo começa logo abaixo das abas. O que muda entre as telas é só a área abaixo das abas, que é justamente o conteúdo que o usuário pediu para trocar.
- Estilo da aba ativa ajustado à nova posição: em vez de borda superior de 2 px, a aba ativa usa **borda inferior** de 2 px `--accent-light` e fundo `--bg-ribbon` quando há ribbon (para parecer conectada às ferramentas abaixo dela) ou `--bg-app` na tela inicial. A fileira de abas tem borda inferior de 1 px `--border`.
- As guias do ribbon (Início, Inserir, Exibir, Saída) continuam com a borda inferior de 2 px na guia ativa. Para não confundir os dois níveis, a fileira de guias do ribbon fica com fundo `--bg-ribbon` e a fileira de abas de documento com fundo `--bg-tabsbar`.

## D3. Aba "Início"

- Fica sempre na primeira posição e não pode ser fechada.
- Troca o selo `INI` por um **ícone de casa** de 16 px (novo ícone abaixo), sem texto, com largura fixa de 40 px e `aria-label="Início"`. Os selos de tipo (CAD, FOL, TEX, LIB, PRJ) continuam nas abas de arquivo.

```ts
home: 'M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10',
```

## D4. Ribbon com altura reservada

- O ribbon tem altura **fixa** de 124 px (guias 32 + corpo 92). O corpo usa `box-sizing: border-box` e `overflow: hidden`, e o título do grupo fica dentro dos 92 px, nunca transbordando.
- Trocar entre guias do ribbon (Início, Inserir, Exibir, Saída) ou entre documentos de tipos diferentes **não muda a altura** do ribbon, mesmo que uma guia tenha menos botões.

## D5. Regra geral de design (acrescentar ao SPEC, seção 4.5)

> **Estabilidade do layout:** elementos de navegação (barra de título, abas de documento, barra de status) ocupam a mesma posição e o mesmo tamanho em todas as telas e estados. Uma interação nunca pode mover o elemento que o usuário acabou de usar. Painéis podem aparecer ou sumir, mas só abaixo ou ao lado do elemento clicado, nunca acima dele.

## D6. Critérios de aceite

| ID | Critério |
|---|---|
| D6-01 | A fileira de abas de documento tem `top = 38 px` e altura 32 px na tela inicial, num caderno, numa folha, num documento LaTeX e numa biblioteca (teste mede `getBoundingClientRect()` em cada tela) |
| D6-02 | Clicar em "Início" e depois na aba de um documento, sem mover o mouse, não exige reposicionar o ponteiro: a posição da aba clicada não muda entre os cliques |
| D6-03 | O ribbon tem 124 px de altura em todas as guias e em todos os tipos de documento |
| D6-04 | O título de grupo do ribbon ("Células", "Texto"...) aparece inteiro, sem corte (teste visual) |
| D6-05 | A aba Início mostra só o ícone de casa, com 40 px de largura, sem botão de fechar |
| D6-06 | Imagens aprovadas dos testes visuais atualizadas **com autorização do usuário**, citando este adendo no commit |
