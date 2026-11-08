# Fase 3: folha livre

A maior parte da folha entrou com o ADENDO 02 (regiões posicionadas, edição no lugar, arrastar com encaixe, ordem por posição, tabela de variáveis, gráfico uPlot, linha de comando). Esta etapa fechou o último critério e a regra do selo.

## O que foi feito

- **F3-02, pedido do usuário:** o exemplo da SPEC 3.6 não tinha bloco de verificação, mas o aceite da fase pedia ATENÇÃO. A `string-3` (fixture e SPEC 3.6) ganhou:

  ```verificar {#criterio x=40 y=330}
  ΔV(L, I, S)/V_mp < 1 %
  ```

- **Regra do selo** (estava faltando na SPEC; vale para caderno e folha), em `src/engine/evaluate.ts`:
  - razão de uso: `<` e `<=` → r = valor/limite; `>` e `>=` → r = limite/valor;
  - condição falsa → REPROVADO; verdadeira e r ≥ 1 − m → ATENÇÃO; senão APROVADO;
  - m = 20 % por padrão; `config.yaml` → `verificacao.margem_atencao: 20 %` (já vem no config criado na primeira execução); atributo do bloco `atencao=10%` vence o padrão;
  - limite zero, negativo ou que depende de variáveis, e `==`/`≠`: nunca ATENÇÃO.
- **Texto do selo:** `<ESTADO> · limite <limite>` para os três estados (antes o ATENÇÃO dizia "perto do limite"). Sem limite (`==`, `≠`), só o estado.
- Imagem aprovada `folha.png` atualizada (a mudança visual foi pedida pelo usuário).

## Testes

| ID | Onde |
|---|---|
| F3-02, F3-12 | `tests/e2e/folha.spec.ts` |
| F3-08, F3-09, F3-10, F3-11 | `tests/golden/calculos.yaml` (17 casos novos) |
| F3-09 | `src/engine/engine.test.ts` (leitura de "20 %", "12,5%", 20 e valores inválidos) |
| F3-10, F3-12 | `tests/e2e/caderno.spec.ts` |

## Observações

- O teste visual da folha passou mesmo antes da imagem ser atualizada: a região nova muda menos de 1 % dos pixels (a tolerância do C4). A tolerância não foi mexida.
- Uma margem fora de 0 a 100 % no `config.yaml` ou no atributo é ignorada (vale o padrão), sem aviso na tela.
