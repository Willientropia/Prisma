# Verificações manuais (ADENDO 03, C1)

O que não dá para automatizar com confiança. Cada item cita o ID da [matriz](MATRIZ.md) no título, e o `check-matriz` conta esses títulos como teste. Ao fechar uma fase ou adendo, quem verificar anota a data e o resultado na tabela do item.

## [A9-01] Instalador NSIS

1. `npm run tauri build`.
2. Rodar o instalador gerado em `src-tauri/target/release/bundle/nsis/`.
3. Conferir: o app fica em `C:\Program Files\Prisma`; aparece no menu Iniciar como "Prisma"; abre até a tela inicial.
4. Desinstalar pelo Painel de Controle e conferir que a pasta some e que `Documentos\Prisma` continua lá.

| Data | Quem | Resultado |
|---|---|---|
| | | |

## [A9-03] Tipos de arquivo no Explorador

Com o Prisma instalado, numa pasta com um arquivo de cada tipo (`tests/fixtures/usina-boa-vista/` e os de `resources/`):

1. Modo de exibição "Detalhes": a coluna Tipo mostra "Caderno Prisma", "Folha Prisma", "Biblioteca Prisma", "Modelo Prisma" e "Projeto Prisma".
2. Cada arquivo mostra o ícone do Prisma.
3. Duplo clique abre o arquivo numa aba; com o Prisma já aberto, o segundo duplo clique abre outra aba na mesma janela.

| Data | Quem | Resultado |
|---|---|---|
| | | |

## [C9-01] `npm run verify` inteiro

1. `npm run verify` numa cópia limpa do repositório (`git clone` + `npm ci`).
2. Conferir que termina com código 0 e gera `test-results/RELATORIO.md` com "Resultado: APROVADO".
3. Quebrar de propósito um valor em `tests/golden/calculos.yaml`, rodar de novo e conferir que termina com código diferente de 0 e "Resultado: REPROVADO". Desfazer a mudança.

| Data | Quem | Resultado |
|---|---|---|
| | | |

## [D6-06] Imagens aprovadas do ADENDO 04

As imagens de `tests/visual/__snapshots__/` só mudam com autorização do usuário. Conferir no histórico do Git que o commit que as atualizou cita o ADENDO 04 e o pedido do usuário.

| Data | Quem | Resultado |
|---|---|---|
| | | |
