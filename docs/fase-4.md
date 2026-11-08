# Fase 4: bibliotecas

## O que foi feito

### Bibliotecas de fábrica: somente leitura
- O app nunca grava nos recursos do programa (`resourceDir()`): arquivo aberto de lá vem marcado como de fábrica (`OpenDoc.factory`), Ctrl+S e edição respondem "Arquivo de fábrica: somente leitura...". O Rust passou a informar a pasta (`app_paths.factory`).
- Tela da biblioteca e painel "Bibliotecas em uso": rótulo "fábrica · somente leitura" com o ícone `lock`.
- Nova função, Importar e Publicar versão ficam desabilitados na de fábrica, com a dica "Biblioteca de fábrica. Suas funções vão para a extensão em Documentos".
- Ctrl+S num arquivo de fábrica não grava: abre "Salvar como" em `Documentos/Prisma/Bibliotecas` (ou `/Modelos` para `.prst`) e a barra de status mostra "Arquivo de fábrica é somente leitura. Salve uma cópia.". Salvando, a aba passa a ser a cópia, editável.

### Extensão (`src/format/library.ts`)
- `Documentos\Prisma\Bibliotecas\<id>.usuario.prsl`, com `estende: <id>`, criada na primeira gravação.
- Mescla ao carregar: definições da base sem as substituídas + as da extensão, como uma biblioteca só. Na tela, a função da extensão que substitui uma de fábrica aparece com "substitui a de fábrica" e a de fábrica logo abaixo ("de fábrica, substituída").
- A mescla não gera o aviso de id repetido; dois arquivos independentes com o mesmo id continuam gerando.

### Salvar na biblioteca (`src/commands/library.ts`)
- Botão "Salvar na biblioteca" do caderno: cada bloco `funcao` com `salvar=<id>` vai para, nesta ordem: biblioteca do projeto aberto; `Documentos\Prisma\Bibliotecas`; extensão da de fábrica; senão o diálogo "A biblioteca <id> não existe. Criar em: [Projeto atual] [Documentos] [Cancelar]" (Projeto atual só com projeto aberto; a nova entra no `.prsp`).
- Definição idêntica à que está em vigor: nada muda. Diferente: diálogo com as duas lado a lado (como matemática, sem `:=`), [Substituir] [Manter a antiga] [Cancelar]. Substituir sobe a versão no último número e atualiza `Origem:`.
- A barra de status resume: "N nova(s), N substituída(s), N sem mudança".

### Testes da biblioteca (F4-04)
- A tabela "Testes da função" roda os blocos `teste` no worker, com as definições em vigor, tolerância de 0,5 %. Roda ao abrir e pelo botão Testar; a barra de status mostra "Testes: N de M aprovados".

### Busca de função (F4-06)
- Ctrl+K (também dentro do campo matemático) e "Inserir função" abrem a busca: nome, biblioteca e descrição, sem acento e sem maiúsculas. Enter insere a assinatura no último campo matemático usado.

### Outros
- `check-matriz` aceita IDs com letra no fim (F4-02a).
- Corrigida a regex quebrada que formatava o valor esperado dos testes na tela da biblioteca.

## Testes

| ID | Onde |
|---|---|
| F4-02, F4-02a, F4-02b, F4-02c, F4-02e, F4-02f, F4-03, F4-04, F4-06, F4-07, F4-08 | `tests/e2e/biblioteca.spec.ts` |
| F4-02, F4-02c, F4-02d, F4-02f, F4-09 | `src/format/library.test.ts` |

## Decisões

- `salvar=` indica o destino; a gravação é explícita (botão "Salvar na biblioteca" ou clique no rótulo), não a cada Ctrl+S do caderno. Aprovado pelo usuário, com aviso: quando a definição do caderno difere da biblioteca, o rótulo do bloco mostra `FUNÇÃO · <ID> · ALTERADA, NÃO SALVA NA BIBLIOTECA`; clicar nele salva; iguais, volta a `FUNÇÃO · <ID>`. Registrado na SPEC 3.3.
- O aviso usa a cor `--warn-text`, como pedido, sobre o fundo `--warn-badge-bg`: só o `--warn-text` sobre a página branca daria contraste de cerca de 1,4:1, abaixo do mínimo de 4,5:1 da SPEC 4.5.
- "Já existe no destino" compara com a definição em vigor: numa extensão, a de fábrica também conta. Assim, salvar uma função igual à de fábrica não cria extensão à toa.
- Funções novas não sobem a versão; só Substituir sobe (como pedido).

## Testes antigos ajustados (autorizados pelo usuário)

- **A9-05:** a ida e volta de `.prsl` e `.prst` roda sobre cópias numa pasta gravável; o original de fábrica é coberto pelo F4-07b (não grava, hash igual).
- O antigo F4-08 (cadeado) passou a F4-07a; o F4-08 é o aviso de função alterada.
- **Imagens aprovadas:** `biblioteca.png` atualizada com autorização. As do caderno só depois de o usuário ver o comparativo.

## Bugs achados nesta fase
- A tela da biblioteca rodava os testes sem parar quando o arquivo não estava numa pasta de bibliotecas (constantes recriadas a cada render).
- Testes interrompidos por outro cálculo escreviam "Testes: 0 de 1 aprovados" na barra de status de outra aba.
- Ambos são cobertos pelos testes A9-05 (cópia de `eletrica.prsl`) e F4-07c.
