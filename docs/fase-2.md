# Fase 2: motor e caderno

## Plano

- Motor em `src/engine/` com math.js: tradução da sintaxe linear (seção 3.4), unidades SI, funções nativas da seção 8.6, verificações, mensagens em português.
- Avaliação pura e síncrona (`evaluate.ts`), testável sem navegador; um Web Worker em volta, com limite de 2 s por linha.
- Caderno: matemática renderizada como no protótipo, resultados, selos de verificação, edição de linhas e de texto, inserção de células pelo ribbon, autossalvar em 2 s.

## Aceite

Todos os testes da seção 8 passam; o caderno `cabos-cc` mostra 1,79 V, 0,45 % e APROVADO.

## Feito

- **Testes da seção 8** (`src/engine/engine.test.ts`): ΔV 1,79 V e 3,29 V; 3,29 V / 400 V = 0,82 %; E_mês = 712,8 kWh; ρ_T(70 °C) = 0,0214 Ω·mm²/m; `1 m + 1 A` dá "Unidades incompatíveis: m + A". Também: os exemplos `cabos-cc` (1,79 V, 0,45 %, APROVADO) e `string-3` (3,29 V, 0,82 %), usar antes de definir, nativas, formatação.
- **Tradução** (`syntax.ts`): `:=`, `= ?`, `= ? unidade`, `= ? %`, `#` comentário, `·`, `−`, `≤`, `°C`, `Ω` (vira `ohm`, porque o math.js só aceita nomes ASCII em unidade), `0.00393 1/°C`, `\rho` vira ρ.
- **Nativas** (`math.ts`): as do math.js (sqrt, exp, sin com graus, min, max, round, sum, mean, det, inv, transpose…) mais `ln`, `log` (base 10), `root` (Newton ou bisseção), `integral` (Simpson adaptativo), `deriv`, `interp`, `polyroots` (Durand-Kerner), `solve` (lusolve). `root`, `integral`, `deriv` e `interp` funcionam com unidades.
- **Unidades extras:** `Wp` (com prefixos, ex. kWp) e `dia`.
- **Exibição** (`format.ts`): 2 casas sem zeros à direita, arredondamento decimal (2,685 vira 2,69), 3 algarismos abaixo de 0,1 (0,0214), vírgula; `config.yaml` (`casas_decimais`, `separador_decimal`) muda isso.
- **Verificação:** APROVADO, REPROVADO, e ATENÇÃO quando passa mas está a 80 % ou mais do limite (é o que faz `string-3` mostrar ATENÇÃO com 0,82 % de 1 %).
- **Worker** (`worker.ts`, `client.ts`): avisa cada linha antes de avaliar; se uma linha passa de 2 s, encerra o worker e marca "Tempo esgotado" nela. Testado no navegador com `sum(1:30000000)`.
- **Caderno:**
  - Fórmulas desenhadas a partir da árvore do math.js (`render.tsx`): variáveis em itálico com índice, unidades retas, frações empilhadas, em STIX Two Text.
  - Clique numa linha abre a edição; Enter confirma e abre a próxima; Ctrl+Enter só confirma; Esc cancela; linha vazia é apagada.
  - Texto em Markdown (react-markdown + remark-gfm), `[[nota]]` abre o arquivo; clique edita o Markdown cru.
  - Ribbon, grupo Células: Texto, Cálculo, Função, Gráfico, Verificação inserem depois da célula selecionada, com id legível (`calc-1`) e já em edição.
  - Calcular tudo (Ctrl+Enter) e Interromper ligados.
  - Cada edição troca só o trecho dela no arquivo; o resto fica byte a byte igual.
  - Autossalvar 2 s depois da última edição; a pergunta de "mudou fora do app com edição pendente" passa a valer.
- Barra de status com resultados, verificações aprovadas e erros.

## Decisões e pendências

- **MathLive não entrou.** A SPEC pede MathLive para editar as expressões. Ele trabalha em LaTeX; voltar de LaTeX para a sintaxe linear do arquivo (`ρ_cu`, `:=`, `= ? V`) exige um conversor próprio e pode alterar o que o usuário escreveu. Nesta fase a edição é em texto (a mesma sintaxe do arquivo) e a exibição é matemática renderizada. Dá para pôr o MathLive depois, só como editor, se a conversão for testada com todos os exemplos.
- **Recálculo incremental** (`evaluateFrom`, grafo de dependências) não foi feito: reavalia o documento inteiro a cada mudança (o exemplo leva ~25 ms no navegador). Fazer quando um documento real ficar lento.
- **Cache em `.prisma/cache/`** não é gravado ainda; entra na fase 5, que é quem lê.
- Desfazer/refazer do app (fora dos campos de texto) não existe ainda.
- Exibir > Justificativas / Só resultados, Unidades > Sistema / Converter, Inserir função, Salvar na biblioteca: ainda sem ação.
- O pacote principal ficou com 1,1 MB porque o math.js também é usado para desenhar as fórmulas; o worker tem outra cópia (657 kB). Aceitável num app desktop carregado do disco.
