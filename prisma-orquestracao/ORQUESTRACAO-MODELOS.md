# Orquestração de modelos — Prisma

Objetivo: resolver a AUDITORIA-FABLE e os documentos seguintes com qualidade,
gastando o mínimo do limite semanal.

## 1. Por que o Fable gastou 25% da semana

Não foi só o preço do modelo. Foi o **formato da tarefa**:

- auditoria aberta ("ache tudo") → ele leu o repositório inteiro, o corpus de
  713 linhas e rodou experimentos;
- tudo numa sessão só → cada nova mensagem reenviava o histórico acumulado;
- CLAUDE.md grande + 7 documentos longos carregados de uma vez.

O custo de uma sessão cresce com **modelo × contexto acumulado × número de
turnos**. Dá para cortar os três.

## 2. Papel de cada modelo

| Modelo     | Usa para                                                                 | Nunca usa para                          |
|------------|--------------------------------------------------------------------------|-----------------------------------------|
| **Fable**  | Revisão curta de um diff já pronto; caçar falha num arquivo específico; 2–3 vezes no projeto inteiro | Implementar; auditoria aberta; ler o repo todo |
| **Opus**   | Planejar um lote; bugs de causa raiz ambígua (semântica do SMath, parser); revisar diffs críticos | Tarefas mecânicas                        |
| **Sonnet** | **Cavalo de batalha.** Implementar cada ticket, escrever testes, refatorar | Decidir semântica nova sozinho          |
| **Haiku**  | Rodar `npm run verify` e resumir falhas; buscar onde algo está; formatar, renomear, docs simples | Mudar lógica do motor ou do parser      |

Regra prática: **~80% do trabalho em Sonnet, ~15% Opus, ~5% Haiku em
subagentes, Fable só em pontos de controle.**

## 3. Respostas diretas às suas perguntas

**Crio uma nova conversa com outro modelo?** Sim. Uma sessão por ticket,
já aberta no modelo certo:

```bash
claude --model sonnet      # implementar
claude --model opus        # planejar / bug difícil
```

Entre tickets, use `/clear` (ou feche e abra). Não arraste uma sessão por
vários tickets.

**Evite `/model` no meio de uma sessão longa.** Ao trocar, o histórico
inteiro é relido pelo novo modelo sem aproveitar o cache — sai mais caro do
que abrir uma sessão nova com um resumo curto.

**Dá pra trocar automaticamente?** Sim, de dois jeitos:

1. **`opusplan`** — `claude --model opusplan`: no modo plano (Shift+Tab) usa
   Opus para pensar; ao sair do plano, executa em Sonnet. Ótimo para tickets
   médios (B4, B10, M4).
2. **Subagentes com modelo fixo** — os arquivos em `.claude/agents/` deste
   pacote já trazem `model:` no cabeçalho. A sessão principal (Sonnet) delega
   "rode os testes" ao `testador` (Haiku) e "revise o diff" ao `revisor`
   (Opus) sem você trocar nada. A saída longa dos testes fica no contexto do
   subagente, não no seu.

   Atenção: se a variável `CLAUDE_CODE_SUBAGENT_MODEL` estiver definida, ela
   passa por cima do `model:` dos arquivos. Deixe-a vazia.

**O Fable fica só de verificação curta?** Sim. Ele entra em 3 pontos de
controle (seção 6), sempre com o prompt limitado da seção 7: lê só o diff e
os arquivos citados, no máximo X arquivos, responde em lista curta.

## 4. Como manter o contexto pequeno (vale para todos os modelos)

- **`docs/TICKETS.md` no repositório** (arquivo deste pacote). Cada sessão
  lê só o ticket dela, não a auditoria inteira.
- **CLAUDE.md enxuto**: deixe nele só regras permanentes (fluxo, proibições,
  comandos). A lista de documentos vira "leia o documento indicado no
  ticket". Documentos longos não devem ser lidos inteiros: o ticket aponta a
  seção.
- **Prompt com escopo**: diga os arquivos. "Corrija B1 em
  `src/format/mathlinear.ts`" custa uma fração de "corrija o B1".
- **Testes via subagente**: `npm run verify:full` despeja centenas de linhas;
  o `testador` devolve só as falhas.
- **Commit ao fim de cada ticket** → a próxima sessão começa do zero, sem
  precisar do histórico.
- `/compact` só se um ticket realmente crescer; preferível é ticket menor.

## 5. Rotina de cada ticket (Sonnet)

1. `claude --model sonnet` na pasta do repo.
2. Cole o prompt do ticket (seção 7, modelo A).
3. Ele implementa, escreve o teste de regressão, chama o `testador`.
4. Para tickets marcados **[R]** em TICKETS.md, ele chama o `revisor` (Opus)
   sobre o diff antes do commit.
5. Commit local. Você confere e decide o push.
6. `/clear` → próximo ticket.

Tickets marcados **Opus** seguem igual, abrindo com `--model opusplan`.

## 6. Pontos de controle do Fable (só 3)

| Quando                                  | O que ele faz                                                   |
|-----------------------------------------|-----------------------------------------------------------------|
| Fim do Lote A (B1–B4)                   | Revisa só o diff do lote no parser e no editor e tenta quebrar com entradas novas |
| Fim da MANUTENCAO-02                    | Ataque dirigido: robustez do teclado e do worker (só `MathField.tsx`, `mathlinear.ts`, worker) |
| Antes de fechar o ADENDO-06             | Revisão final do diff dos atalhos e do assistente               |

Fora disso, a revisão é do `revisor` (Opus).

## 7. Prompts prontos

### A — ticket (Sonnet ou opusplan)

```
Ticket T0X de docs/TICKETS.md. Leia só esse ticket e os arquivos que ele cita.
Siga o CLAUDE.md. Escreva primeiro o teste de regressão que falha, depois corrija
a causa raiz. Não altere testes existentes nem arquivos .sm do usuário.
Ao terminar, use o subagente testador. Se o ticket tiver [R], use o revisor no diff.
Commit local com a mensagem "T0X: <resumo>". Não faça push.
```

### B — Fable, verificação curta

```
Verificação curta, orçamento limitado.
Escopo: `git diff <commit-inicial>..HEAD` e apenas os arquivos tocados por esse diff.
Não leia outros arquivos, não rode a suíte inteira, não refatore nada.
Tarefa: procure regressões e entradas que ainda travam ou corrompem
(teclado, parser, worker). Rode no máximo 10 experimentos com `npx tsx`.
Responda em até 15 itens: arquivo:linha, entrada que quebra, gravidade.
Não implemente correções.
```

Os achados viram tickets novos para Sonnet.

### C — Opus planejando um lote

```
Planeje o Lote X de docs/TICKETS.md. Leia só os tickets do lote e os arquivos citados.
Entregue: ordem, arquivos afetados, riscos, testes de regressão de cada ticket.
Não implemente. Atualize docs/TICKETS.md com o plano.
```

## 8. Decisões que são suas (antes do Lote C)

- **B8 — nomes reservados**: `E`, `tau`, `phi`, `re`, `version`… viram
  variáveis livres do usuário (como no SMath) ou ficam reservados com aviso?
- **B9 — unidades**: no motor da folha, unidade só com apóstrofo (`10*'L`),
  como no SMath, para `L` e `b` voltarem a ser variáveis?

Responda essas duas em uma linha cada e o ticket T16 sai.

## 9. Estimativa

Com essa divisão, o Fable entra em 3 verificações curtas (cada uma deve
custar uma fração da auditoria que ele fez, porque lê só o diff), e o grosso
roda em Sonnet. Acompanhe pelo indicador de uso depois do Lote A e ajuste:
se um ticket Sonnet travar duas vezes, suba só aquele para Opus.

## Fontes

- Subagentes e campo `model`: https://code.claude.com/docs/en/sub-agents
- Configuração de modelo, `/model`, `opusplan`: https://code.claude.com/docs/en/model-config
