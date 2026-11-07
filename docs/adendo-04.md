# ADENDO 04: posição fixa das abas de documento

## O que foi feito

- **Ordem vertical (D2):** barra de título → abas de documento → ribbon (só com documento) → conteúdo → barra de status (`src/App.tsx`). As abas ficam sempre em `top = 38 px`.
- **Estilo das abas (D2):** aba ativa com borda **inferior** de 2 px `--accent-light`; fundo `--bg-ribbon` num documento e `--bg-app` na tela inicial. A fileira usa `--bg-tabsbar` e linha inferior de 1 px `--border` (sombra interna, para a aba ativa cobrir a linha e parecer ligada ao ribbon). A fileira de guias do ribbon passou para `--bg-ribbon`.
- **Aba Início (D3):** só o ícone `home` de 16 px, 40 px de largura, `aria-label="Início"`, sem fechar.
- **Ribbon (D4):** altura fixa de 124 px (guias 32 + corpo 92, `overflow: hidden`); o título de grupo cabe dentro dos 92 px.
- **Regra D5** acrescentada à SPEC 4.5.
- **Tamanho estável da aba:** a aba ativa usa peso 500 e ficava cerca de 1 px mais larga, empurrando as abas à direita. O teste D6-02 pegou isso; o nome da aba agora reserva a largura do texto em peso 500 (`TabName` em `Shell.tsx`).

## Testes

| ID | Teste |
|---|---|
| D6-01 | `tests/e2e/abas.spec.ts`: fileira de abas em top 38, altura 32, na tela inicial e nos 4 tipos |
| D6-02 | `tests/e2e/abas.spec.ts`: clica Início e o documento duas vezes, no mesmo ponto; a caixa das abas não muda |
| D6-03, D6-04 | `tests/e2e/abas.spec.ts`: 124 px e nenhum título de grupo cortado, nas 4 guias dos 4 tipos; e as telas aprovadas |
| D6-05 | `tests/e2e/abas.spec.ts`: ícone de casa, 40 px, sem texto e sem fechar |
| D6-06 | `tests/MANUAL.md`: commit das imagens cita este adendo |

Testes antigos ajustados por causa do adendo (o documento de número maior vence):
- F0-07/V-05 (`shell.spec.ts`): a aba ativa agora é conferida pela borda **inferior**.
- F0-01 a F0-04 (`shell.spec.ts`): o clique nas guias do ribbon passou a procurar dentro da fileira de guias, porque a aba de documento também se chama "Início" (`aria-label` pedido no D3).

## Pendente

- Imagens aprovadas: regeneradas com o layout novo, esperando a autorização do usuário para o commit (D6-06).
