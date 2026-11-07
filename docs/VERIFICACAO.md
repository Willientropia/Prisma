# Prisma: relatório para verificação (fases 0 a 2 + ADENDO 01)

Este documento é para um revisor (pessoa ou agente) conferir o que foi feito **antes da fase 3**. Ele diz o que existe, onde está, como rodar, o que foi verificado e como, e o que ficou de fora de propósito. Desconfie do que está escrito aqui: o objetivo é que você confira no código e rodando.

- **Especificação:** [`SPEC.md`](../SPEC.md) (fonte da verdade) e [`ADENDO-01-formatos-e-arquivos.md`](../ADENDO-01-formatos-e-arquivos.md) (substitui a seção 3.1 do SPEC, as extensões e os critérios da fase 1).
- **Referência visual:** [`referencia-design.dc.html`](../referencia-design.dc.html) (protótipo aprovado; não roda sozinho, vale o markup e os estilos).
- **Notas por fase:** [`fase-0.md`](fase-0.md), [`fase-1.md`](fase-1.md), [`fase-2.md`](fase-2.md).
- **Repositório:** https://github.com/Willientropia/Prisma (branch `main`).

---

## 1. Como rodar

Requisitos: Node 22, Rust 1.90+ (testado com 1.99), Windows 11 (WebView2).

```bash
npm install
npm test                      # Vitest: parser, motor, conformidade visual
cd src-tauri && cargo test    # Rust: arquivos, projeto, recentes
npm run dev                   # interface no navegador, porta 1420, com disco em memória
npm run tauri dev             # app desktop
npm run tauri build           # instalador NSIS em src-tauri/target/release/bundle/nsis/
```

**Rede:** na máquina onde foi feito, um firewall FortiGate intercepta `registry.npmjs.org` com certificado próprio. As instalações usaram `--registry=https://registry.yarnpkg.com` (espelho oficial). O `package-lock.json` aponta para `registry.npmjs.org`.

**Modo navegador (`npm run dev`):** sem Tauri, `src/platform.ts` usa um disco em memória com os arquivos de `resources/`. Os diálogos de abrir e salvar viram `window.prompt` (digite o caminho). No console:
- `prismaDev.disk` lista os arquivos;
- `prismaDev.read(caminho)` lê;
- `prismaDev.write(caminho, texto)` grava e simula uma edição feita fora do app;
- `prismaDev.remove(caminho)` apaga.

Caminhos dos exemplos nesse modo:
- projeto: `C:/Users/voce/Documents/Usina Boa Vista/usina-boa-vista.prsp`;
- bibliotecas de fábrica: `C:/Program Files/Prisma/bibliotecas/`.

---

## 2. Mapa do código

| Caminho | O que faz |
|---|---|
| `src/styles/tokens.css` | Única fonte de cores (SPEC 4.1 + extras do protótipo, marcados) |
| `src/styles/fonts.css`, `resources/fonts/` | Inter, JetBrains Mono, STIX Two Text locais (OFL) |
| `src/components/Icon.tsx`, `ui.tsx` | Ícones da SPEC 4.4; Logo, Tag (selo), PanelHeader, PropGrid, Row, Badge |
| `src/shell/` | Barra de título, ribbon (`ribbons.ts` como dados), abas, barra de status, menu do app, diálogos, painel Projeto |
| `src/commands/` | Registro único de comandos (ribbon, menu, atalhos, busca) e handlers |
| `src/home/Home.tsx` | Tela inicial |
| `src/editors/{caderno,folha,latex,biblioteca}/` | Editores |
| `src/format/doc.ts` | Parse/serialize simétrico dos arquivos Prisma (segmentos com o texto original) |
| `src/format/views.ts` | Leituras derivadas: estrutura, variáveis, ordem da folha, funções da biblioteca, seções do `.tex`, tipo do arquivo |
| `src/format/display.ts` | Caminhos (relativo/absoluto/encurtado) e formatação |
| `src/engine/` | Motor: `syntax.ts` (sintaxe linear para math.js), `math.ts` (unidades e nativas), `evaluate.ts` (avaliação pura), `worker.ts` + `client.ts` (Web Worker, 2 s por linha), `run.ts` (bibliotecas e store), `render.tsx` (desenho das fórmulas), `format.ts` (números e unidades) |
| `src/store/workspace.ts` | Zustand: abas, documento ativo, projeto ativo, ciclo de vida CAD, recuperação |
| `src/platform.ts` | Ponte com o Rust (ou disco em memória no navegador) |
| `src-tauri/src/files.rs` | Ler, gravar (atômico), stat, listar, renomear, observar |
| `src-tauri/src/project.rs` | Criar projeto |
| `src-tauri/src/appdata.rs` | Pastas do sistema, config, recuperação, argumentos de linha de comando |
| `src-tauri/src/recent.rs` | Recentes |
| `resources/exemplos/Usina Boa Vista/` | Projeto de exemplo (SPEC 3.5, 3.6 e um `.tex`) |
| `resources/bibliotecas/eletrica.prsl`, `resources/modelos/dimensionamento-fv.prst` | Biblioteca e modelo de fábrica |

---

## 3. Situação por fase

### Fase 0: shell estático

**Aceite (SPEC 12):** com os quatro tipos, cada um mostra o ribbon e os painéis certos; a janela fica igual ao protótipo.

| Item | Situação | Como foi verificado |
|---|---|---|
| Ribbon por tipo (SPEC 6), todas as guias | Feito | Script no navegador comparou os grupos e botões de cada guia com a tabela da seção 6 |
| Medidas (SPEC 4.3) | Feito | Medidas no navegador: título 38, guias 32, corpo do ribbon 92, abas 32, linhas 28, status 26 px |
| Cores só em `tokens.css`; nenhum emoji ou símbolo como ícone | Feito | Teste automático `src/conformance.test.ts` |
| Fontes locais | Feito | `document.fonts` mostra as fontes carregadas de `resources/fonts` |
| **Igual ao protótipo lado a lado** | **Não verificado** | As capturas de tela falharam (painel do navegador oculto). Precisa de olho humano |

### Fase 1 (refeita pelo ADENDO 01)

Critérios A9 com a situação: ver a tabela em [`fase-1.md`](fase-1.md#critérios-a9). Resumo:
- **Verificados no navegador:** 4, 5, 6, 8 e 9.
- **Cobertos por teste automático:** 5, 6 e 7 (só a criação).
- **Só dá para testar com o app instalado:** 1, 2, 3, 7 (mover a pasta) e 10.

### Fase 2: motor e caderno

**Aceite:** todos os testes da SPEC 8 passam; `cabos-cc` mostra 1,79 V, 0,45 % e APROVADO.

| Item | Situação | Como foi verificado |
|---|---|---|
| 6 testes da SPEC 8 | Passam | `src/engine/engine.test.ts`, bloco "SPEC seção 8" |
| `cabos-cc`: 1,79 V, 0,45 %, APROVADO | Feito | Teste automático e no navegador, com a biblioteca de fábrica |
| `string-3`: 3,29 V, 0,82 % (ATENÇÃO é da fase 3) | Feito no motor | Teste automático |
| Limite de 2 s por linha | Feito | No navegador: `sum(1:30000000)` interrompido em 2,3 s, sem travar a interface |
| Edição de linha, texto, inserção pelo ribbon, autossalvar | Feito | Scripts no navegador; as edições trocam só o trecho delas no arquivo |
| MathLive | **Não feito (decisão)** | Ver seção 5 |

**Números atuais:** 37 testes no Vitest e 5 testes Rust. `npm run tauri build` gera `Prisma_0.1.0_x64-setup.exe` (3 MB) sem erros; o instalador não foi executado.

---

## 4. O que conferir (roteiro sugerido)

### Automático

1. `npm test` passa (37 testes). `npx tsc` sem erros. `cd src-tauri && cargo test` passa (5 testes) e `cargo build` sem avisos.
2. Rode os comandos de grep do checklist 4.7 da SPEC (cores fora de `tokens.css` e símbolos como ícone). O teste de conformidade cobre isso, mas vale rodar à mão.
3. **Formatação dos números.** `src/engine/format.ts` arredonda no decimal (2,685 vira 2,69). Abaixo de 0,1 usa 3 algarismos (0,0214). Confira se essa regra atende a SPEC 8.5 ("2 casas significativas"). O texto da SPEC é ambíguo; ver seção 5.

### Pontos de risco no código (vale ler com atenção)

1. **`src/format/doc.ts` (parse/serialize).** A garantia "abrir e salvar sem mudar bytes" depende de cada segmento guardar o texto original. Confira:
   - cercas de 4 crases contendo cercas de 3;
   - cerca sem fechamento;
   - BOM;
   - CRLF;
   - arquivo sem quebra de linha final.
2. **`src/store/workspace.ts`:**
   - `save` e `saveAs`: normalização só para `.prs*`; o `.tex` é gravado como está.
   - `close` e `closeAll`: o diálogo de 3 botões.
   - `externalChange`: o eco das próprias gravações é ignorado comparando o texto.
   - Autossalvar só para arquivo com caminho; recuperação a cada 30 s só para documento novo.
3. **`src/editors/caderno/Caderno.tsx`:** edição por intervalo `[start, end)` do texto. Confira se inserir e apagar linhas não corrompe blocos vizinhos (`lineSpan`, `commitLine`, `insertAfter`).
4. **`src/engine/syntax.ts`:** tradução para math.js.
   - `Ω` vira `ohm`, porque o math.js só aceita nomes de unidade em ASCII.
   - `0.00393 1/°C`.
   - `L` e `S` também são unidades no math.js (litro e siemens). Funcionam como variáveis porque o escopo tem prioridade. O desenho das fórmulas (`render.tsx`) trata os parâmetros de função como variáveis.
5. **`src-tauri/src/files.rs`:**
   - Comandos aceitam caminho absoluto com uma lista de extensões permitidas. Avalie se é restritivo o bastante.
   - A observação vigia a pasta de cada arquivo aberto, sem recursão, e filtra pelos caminhos abertos.
6. **`src-tauri/src/lib.rs`:**
   - `tauri-plugin-single-instance` precisa ser o primeiro plugin.
   - Confira se `open-files` chega quando o app já está aberto.

### Com o app (precisa de Windows)

1. `npm run tauri build`, instalar o `.exe` de `src-tauri/target/release/bundle/nsis/` e conferir os critérios A9 de 1 a 3 e o 10:
   - instalação em Program Files e no menu Iniciar;
   - associações dos 5 tipos e duplo clique;
   - segundo duplo clique abrindo aba na mesma janela;
   - criação de `Documentos\Prisma\{Bibliotecas,Modelos,Skills}`.
2. **Mudança externa.** Abrir `cabos-cc.prsm` e editar no Bloco de Notas: sem edição pendente, recarrega sozinho; com edição pendente, pergunta.
3. **Projeto portátil.** Criar um projeto, mover a pasta para outro lugar e abrir o `.prsp` (A9.7).
4. **Fechar com alterações.** Fechar a janela com documentos alterados deve perguntar Salvar / Não salvar / Cancelar para cada um.
5. **Recuperação.** Matar o processo com um `Caderno1` alterado há mais de 30 s. Ao reabrir, o bloco "Arquivos recuperados" deve aparecer.
6. **Comparação visual.** Cada tipo de documento lado a lado com `referencia-design.dc.html`.

---

## 5. Decisões e desvios (para o revisor julgar)

| Tema | O que foi feito | Por quê |
|---|---|---|
| **MathLive (SPEC 7.1)** | Não usado. A linha é editada em texto (sintaxe do arquivo) e exibida como matemática desenhada | Converter LaTeX de volta para a sintaxe linear (`ρ_cu`, `:=`, `= ? V`) exige conversor próprio e pode alterar o que o usuário escreveu |
| Recálculo incremental (SPEC 8.3, `evaluateFrom`) | Reavalia o documento inteiro a cada mudança | Exemplo leva ~25 ms. Fazer quando ficar lento |
| Cache `.prisma-cache/` | Não é gravado | Quem lê é a fase 5 (LaTeX) |
| `%APPDATA%\Prisma` | `config_dir()/"Prisma"` em vez de `appConfigDir()` | `appConfigDir()` usaria o identificador (`app.prisma`) como nome da pasta, e o adendo pede `Prisma` |
| Criar projeto | "Salvar como" escolhe pasta e nome; o app cria `<pasta>/<Nome>/<nome-slug>.prsp` | É a estrutura sugerida no A2, sem precisar de um diálogo próprio |
| Novo arquivo no projeto | Cria `Caderno1` e abre "Salvar como" na subpasta sugerida (`calculos/`, `memorial/`, `bibliotecas/`); entra no `.prsp` ao salvar | O `.prsp` só guarda arquivos que existem em disco |
| Um projeto por vez | `project` único na store | O adendo fala em "projeto ativo opcional" |
| Projeto aberto sem documento | Aparece na tela inicial (árvore + Fechar projeto) | O A6 só define o painel quando há documento do projeto aberto; sem isso não daria para ver o projeto recém-aberto |
| `.prst` (modelo) | Abre no editor do tipo-base (`modelo_de`), editável | O adendo não diz como editar modelo |
| Link quebrado | Sublinhado em `--paper-error` | `--error-text` (pedido no A6) é claro demais sobre a página branca (contraste ~2:1) |
| Recente não encontrado | Texto em `--text-dim`, como pede o A6 | Atenção: `--text-dim` sobre o fundo tem contraste ~3,3:1, abaixo dos 4,5:1 da SPEC 4.5. Conflito entre adendo e SPEC |
| Tokens novos | `--fail-badge-*`, `--paper-error`, `--paper-hover` e extras do protótipo, todos marcados em `tokens.css` | A SPEC manda criar o token antes de usar a cor |
| ATENÇÃO na verificação | Passou, mas o lado esquerdo está a 80 % ou mais do limite | A fase 3 exige ATENÇÃO para 0,82 % com limite de 1 %; a SPEC não define a regra |
| Formatação | 2 casas sem zeros à direita a partir de 0,1; 3 algarismos abaixo de 0,1 | "2 casas significativas" (SPEC 8.5) não bate com os valores esperados (0,0214; 712,8). Escolhi a regra que reproduz todos |
| `log` | Base 10; `ln` é natural | Convenção de engenharia; a SPEC lista os dois sem dizer |
| Barra de título | A barra nativa do Windows continua acima da barra do app | Tirar a nativa exige botões próprios de minimizar, maximizar e fechar |
| Ctrl+N | Vai para a tela inicial (seção Novo) | O usuário escolhe o tipo; o adendo não diz qual criar |
| Segurança dos comandos Rust | Caminho absoluto, só extensões conhecidas | Sem cofre não há pasta-raiz para restringir |

---

## 6. Não feito ainda (por fase da SPEC)

- **Fase 0:** tela de abertura (splash), janela "Sobre", avatar configurável (fixo "PW").
- **Fase 2:** MathLive; desfazer/refazer fora dos campos de texto; Exibir > Justificativas e Só resultados; Unidades > Sistema e Converter; "Inserir função" e "Salvar na biblioteca" (são da fase 4).
- **ADENDO 01:**
  - SKILL.md em `Documentos\Prisma\Skills` (A7, fase 6);
  - ícones diferentes por tipo de arquivo (o A5 deixa para depois);
  - "Localizar..." e "Renomear" só foram exercitados na interface do navegador.
- **Fase 3 em diante:** folha com cálculo, arrastar e uPlot; bibliotecas com testes; LaTeX com CodeMirror, Tectonic e pdf.js; exportação; modelos.
