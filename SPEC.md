# SPEC: app de cálculo de engenharia (nome: Prisma)

Este documento é a fonte da verdade para construir o app. Leia inteiro antes de começar. Implemente por fases (seção 12), e em cada fase só avance quando os critérios de aceite passarem.

Este pacote contém:

```
SPEC.md                         este documento
referencia-design.dc.html       protótipo visual aprovado (tema grafite violeta)
brand/prisma-logo.svg           logo principal
brand/prisma-logo-mono-escuro.svg  logo para fundo claro
brand/prisma-app-icon.svg       ícone do aplicativo (1024)
brand/app-icon-1024.png         o mesmo ícone em PNG, para o `tauri icon`
brand/preview.png               prévia dos logos e do ícone
```

Copie a pasta `brand/` para `resources/brand/` no projeto.

O arquivo `referencia-design.dc.html` é o protótipo visual aprovado. Ele não roda sozinho (depende do runtime do canvas onde foi feito), mas o markup e os estilos inline são a referência exata de layout, cores, tamanhos e textos. Na dúvida entre este documento e o protótipo, siga o protótipo no visual e este documento no comportamento.

---

## 1. Visão geral

App desktop que roda 100 % local, sem conta e sem servidor. Junta quatro ferramentas num lugar só:

1. **Caderno**: texto, funções e cálculos em sequência, cada passo com a sua justificativa (estilo Colab).
2. **Folha livre**: regiões de cálculo soltas numa página com grade (estilo SMath Studio), usando as funções salvas.
3. **Documento LaTeX**: editor e compilador de LaTeX. Pode receber resultados de cadernos e folhas, **só quando o usuário insere manualmente**.
4. **Biblioteca**: conjunto de funções documentadas (fórmula, parâmetros, unidades, por que e quando usar, fonte, testes).

Todos os arquivos ficam numa pasta comum (o **cofre**, como no Obsidian), em **texto puro**, legíveis por humanos, por Git e por qualquer IA.

### Princípios

- **Local primeiro**: nada sai da máquina. Sem telemetria.
- **Texto puro**: todo arquivo do usuário abre num editor de texto e faz diff legível no Git.
- **Nada automático entre ferramentas**: o LaTeX só recebe o que o usuário insere; valores só atualizam quando ele clica em "Atualizar resultados".
- **Unidades obrigatórias**: toda grandeza física carrega unidade, e o motor recusa operações dimensionalmente inválidas.
- **Visual profissional**: interface no padrão de software de engenharia (faixa de opções, painéis, barra de status). Sem emoji, sem caracteres decorativos como ícones. Todo ícone é SVG de traço.

### Fora do escopo (v1)

- Contas, nuvem, colaboração em tempo real.
- Integração direta com IA dentro do app. A integração com IA é feita por **arquivos**: o app gera um `SKILL.md` que descreve o formato (seção 9).
- CAS simbólico completo (fica para a fase 8, opcional).

---

## 2. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Shell desktop | **Tauri 2** (Rust) | Binário leve, acesso a arquivos, roda sidecars (LaTeX, Pandoc) |
| Frontend | **React 18 + TypeScript + Vite** | |
| Estado | **Zustand** | Simples, sem boilerplate |
| Estilo | CSS Modules + variáveis CSS (tokens da seção 4) | Nada de Tailwind: os tokens precisam bater exatamente |
| Entrada de matemática | **MathLive** | Editor WYSIWYG de equações |
| Renderização de matemática estática | **KaTeX** | Rápido para documento inteiro |
| Motor numérico e unidades | **math.js**, rodando num **Web Worker** | Já tem unidades e parser |
| Editor de código (LaTeX e modo texto) | **CodeMirror 6** | |
| Gráficos | **uPlot** | Leve, rápido |
| Pré-visualização de PDF | **pdf.js** | |
| Compilação LaTeX | **Tectonic** como sidecar do Tauri; se o usuário tiver TeX Live/MiKTeX, permitir `latexmk` com LuaLaTeX nas configurações | Tectonic é autocontido e baixa pacotes sob demanda |
| Exportação .docx | **Pandoc** como sidecar (opcional; se ausente, desabilitar o formato com aviso) | |
| Parser de Markdown | **unified / remark** + **remark-frontmatter** + parser próprio dos blocos | |
| Observação de arquivos | crate `notify` no Rust | Recarregar quando o arquivo muda fora do app |
| Testes | **Vitest** (frontend e motor), `cargo test` (Rust) | |

Fontes empacotadas no app (não carregar da internet): **Inter** (400, 500, 600, 700), **JetBrains Mono** (400, 500), **STIX Two Text** (regular, italic, semibold). Todas têm licença OFL.

---

## 3. Formatos de arquivo

Regra geral: arquivos do usuário são **Markdown UTF-8 com frontmatter YAML** e uma **extensão dupla** que diz o tipo. Assim o sistema operacional e o app sabem o tipo, e qualquer editor (e qualquer IA) ainda enxerga Markdown.

| Tipo | Extensão | Conteúdo |
|---|---|---|
| Caderno | `.caderno.md` | Markdown + blocos de cálculo em sequência |
| Folha livre | `.folha.md` | Os mesmos blocos, cada um com posição `x`/`y` na página |
| Biblioteca | `.lib.md` | Funções documentadas, uma por seção |
| Documento LaTeX | `.tex` (+ `.bib`, `.cls`, `.sty`, figuras) | LaTeX normal, com o pacote `prisma.sty` |
| Modelo | pasta com `modelo.yaml` | Arquivos-base de qualquer tipo acima |
| Configuração do cofre | pasta `.prisma/` na raiz do cofre | `config.yaml`, `cache/`, `skills/` |

O cache em `.prisma/cache/` guarda resultados calculados (JSON) para abrir rápido e para o LaTeX. Ele é descartável e vai no `.gitignore` gerado pelo app.

### 3.1 Estrutura do cofre

```
MeuCofre/
├── .prisma/
│   ├── config.yaml          # unidades padrão, motor LaTeX, casas decimais, tema
│   ├── cache/               # resultados calculados (descartável)
│   └── skills/              # SKILL.md gerados (seção 9)
├── bibliotecas/
│   ├── eletrica.lib.md
│   └── fotovoltaica.lib.md
├── modelos/
│   └── memorial-fv-abnt/
│       ├── modelo.yaml
│       └── memorial.tex
├── Sol Tech/
│   └── Boa Vista/
│       ├── cabos-cc.caderno.md
│       ├── string-3.folha.md
│       └── memorial/
│           ├── memorial.tex
│           ├── referencias.bib
│           └── figuras/
└── .gitignore
```

### 3.2 Frontmatter (comum a caderno, folha e biblioteca)

```yaml
---
tipo: caderno            # caderno | folha | biblioteca
titulo: Queda de tensão nos cabos CC
bibliotecas: [eletrica]  # bibliotecas importadas (as nativas são sempre carregadas)
unidades: SI             # SI | personalizado (ver config)
criado: 2026-11-07
versao_formato: 1
---
```

### 3.3 Blocos

Tudo que não é bloco é **texto de justificativa** (Markdown normal: títulos, parágrafos, listas, tabelas, imagens, links). Os blocos são cercas de código com um tipo e atributos entre chaves:

| Bloco | Uso |
|---|---|
| ` ```funcao {#id nome=ΔV salvar=eletrica} ` | Define uma função. `salvar=` grava ou atualiza na biblioteca indicada |
| ` ```calc {#id} ` | Atribuições e avaliações, uma por linha |
| ` ```verificar {#id} ` | Condição que vira APROVADO / REPROVADO |
| ` ```grafico {#id} ` | Gráfico (YAML dentro do bloco) |
| ` ```tabela {#id} ` | Tabela calculada (YAML) |

Atributos: `#id` é obrigatório e é como o LaTeX e os links encontram o bloco (o app gera um id legível se o usuário não der). Na folha livre, todo bloco tem também `x=` e `y=` em px.

### 3.4 Sintaxe de cálculo (dentro de `funcao`, `calc` e `verificar`)

Linear, parecida com a digitação do SMath. O editor visual (MathLive) converte de e para esta forma:

| Escrita | Significado |
|---|---|
| `L := 25 m` | Define variável com unidade |
| `ΔV(L, I, S) := 2*ρ_cu*L*I/S` | Define função |
| `ΔV(L, I, S) = ?` | Pede o resultado (o app mostra o valor; o arquivo guarda só `?`) |
| `ΔV(L, I, S) = ? V` | Pede o resultado já convertido para V |
| `ΔV(L, I, S)/V_mp < 1 %` | Condição (só em `verificar`) |
| `V_mp` | Índice: `_` vira subscrito na renderização |
| `mm^2`, `kWh`, `°C`, `Ω` | Unidades |
| `# comentário` | Comentário de linha |

Letras gregas são digitadas direto (Δ, ρ, φ) ou como `\rho`, que o editor converte. Decimal no arquivo sempre com **ponto**; a exibição usa vírgula conforme `config.yaml`.

### 3.5 Exemplo completo: `cabos-cc.caderno.md`

````markdown
---
tipo: caderno
titulo: Queda de tensão nos cabos CC
bibliotecas: [eletrica]
unidades: SI
versao_formato: 1
---

# Queda de tensão nos cabos CC

Verificação da queda entre as strings e o inversor. Critério do projeto: abaixo de 1 % para não perder geração no trecho CC.

```funcao {#dv nome=ΔV salvar=eletrica}
ΔV(L, I, S) := 2*ρ_cu*L*I/S
```

O fator 2 é ida e volta (positivo e negativo). ρ_cu é a resistividade do cobre a 20 °C.

```calc {#trecho}
L := 25 m
I := 12 A
S := 6 mm^2
V_mp := 400 V
ΔV(L, I, S) = ? V
ΔV(L, I, S)/V_mp = ? %
```

```verificar {#criterio}
ΔV(L, I, S)/V_mp < 1 %
```

Com 6 mm² sobra margem. O teste com 4 mm² está em [[string-3]].
````

Links entre arquivos usam `[[nome-do-arquivo]]` ou `[[nome-do-arquivo#id]]` (estilo Obsidian).

### 3.6 Exemplo: `string-3.folha.md`

````markdown
---
tipo: folha
titulo: "String 3: teste de bitola"
bibliotecas: [eletrica]
pagina: {largura: 1200, altura: 1600, grade: 20}
versao_formato: 1
---

```texto {#t1 x=40 y=30}
**String 3: teste de bitola**
```

```calc {#entradas x=40 y=80}
L := 32 m
I := 11.5 A
V_mp := 400 V
```

```calc {#s x=230 y=76}
S := 4 mm^2
```

```calc {#resultado x=40 y=230}
ΔV(L, I, S) = ? V
ΔV(L, I, S)/V_mp = ? %
```

```grafico {#dv-por-secao x=420 y=70 largura=400 altura=200}
titulo: ΔV % × seção do cabo
x: {var: S, valores: [2.5, 4, 6, 10], unidade: mm^2}
y: {expr: "ΔV(L, I, S)/V_mp", unidade: "%"}
limite: {valor: 1, rotulo: "limite 1 %"}
```
````

A folha é avaliada de cima para baixo e da esquerda para a direita pela posição (`y`, depois `x`), como no SMath.

### 3.7 Exemplo: `eletrica.lib.md`

````markdown
---
tipo: biblioteca
nome: Elétrica
id: eletrica
versao: 1.4
constantes: {ρ_cu: 0.0179 Ω*mm^2/m, α_cu: 0.00393 1/°C}
versao_formato: 1
---

## ΔV(L, I, S)

Queda de tensão em circuito CC de dois condutores.

```funcao {#dv}
ΔV(L, I, S) := 2*ρ_cu*L*I/S
```

- **Parâmetros:** L comprimento do trecho [m]; I corrente [A]; S seção do condutor [mm²]
- **Retorna:** V
- **Por que e quando usar:** circuito CC de ida e volta, como o trecho string até o inversor. Para cabo exposto ao sol, trocar ρ_cu por ρ_T(T).
- **Fonte:** Lei de Ohm
- **Origem:** [[cabos-cc#dv]]

```teste
ΔV(25 m, 12 A, 6 mm^2) ≈ 1.79 V
```
````

Cada função é uma seção `##`. O bloco `teste` roda na guia Testes da biblioteca (tolerância padrão de 0,5 %).

### 3.8 LaTeX: pacote `prisma.sty`

Documentos LaTeX são `.tex` normais. O app fornece um pacote com dois comandos:

```latex
\usepackage{prisma}
\resultado{cabos-cc/trecho:2}   % valor da 2ª avaliação do bloco #trecho
\figura{string-3/dv-por-secao}  % gráfico exportado como PDF vetorial
```

Como funciona:

1. O usuário clica em **Inserir resultado** (faixa de opções ou painel direito) e escolhe um resultado. O app insere o comando no cursor, com o valor atual num comentário: `\resultado{cabos-cc/trecho:2} % 1,79 V`.
2. Na compilação, o app gera `.prisma/cache/tex/resultados.tex` com um **instantâneo** dos valores, e `prisma.sty` lê esse arquivo.
3. Os valores **não mudam sozinhos**. O instantâneo só é refeito quando o usuário clica em **Atualizar resultados**, e o app mostra antes a lista do que vai mudar (valor antigo e novo).
4. Referência quebrada (arquivo ou id apagado) aparece como `[??]` em vermelho no PDF e como aviso no painel de saída.

### 3.9 Modelos: `modelo.yaml`

```yaml
nome: Memorial de cálculo FV
tipo: tex                # caderno | folha | tex | biblioteca
descricao: Geração, strings, cabos e proteção, com equações numeradas. ABNT.
cor: "#0f766e"           # cor da miniatura na tela inicial
arquivos: [memorial.tex, memorial-soltech.cls, referencias.bib]
campos:                  # perguntados ao criar a partir do modelo
  - {id: cliente, rotulo: Cliente}
  - {id: potencia, rotulo: Potência instalada, unidade: kWp}
```

Em todos os arquivos do modelo, `{{cliente}}` é substituído na criação.

Modelos que vêm de fábrica (v1): Memorial de cálculo FV (ABNT), Memorial para concessionária, Laudo técnico, Relatório de laboratório IEEE (1 coluna), Artigo IEEE (2 colunas), TCC ABNT, Caderno de dimensionamento FV, Folha de verificação rápida.

---

## 4. Design: tokens

Use exatamente estes valores como variáveis CSS em `src/styles/tokens.css`. Tema escuro **grafite violeta** é o padrão e o único da v1. Nenhuma cor pode aparecer no código fora deste arquivo, exceto dentro dos SVGs do logo (seção 4.6). Se precisar de uma cor nova, crie um token aqui primeiro.

### 4.1 Cores

```css
:root {
  /* superfícies (grafite com leve tom violeta) */
  --bg-app: #15131c;          /* fundo geral e área da tela inicial */
  --bg-titlebar: #110f17;     /* barra de título e barra de status */
  --bg-tabsbar: #191620;      /* faixa das guias do ribbon e abas de documento */
  --bg-ribbon: #26222f;       /* corpo do ribbon, cabeçalho de painel */
  --bg-raised: #1f1b28;       /* cards, menus, diálogos, campo de busca */
  --bg-panel: #1c1924;        /* painéis laterais, aba de documento ativa */
  --bg-input: #221e2b;        /* cabeçalho de tabela dentro de painel */
  --bg-workspace: #2a2633;    /* fundo atrás das páginas brancas (caderno, PDF) */
  --bg-code: #131118;         /* editor LaTeX */
  --bg-grid: #16131d;         /* folha livre */
  --grid-line: #201c29;       /* linhas da grade, 20 px */

  /* bordas */
  --border-strong: #4a4359;   /* menus, diálogos, botões */
  --border: #363042;          /* divisórias principais */
  --border-soft: #322c3e;     /* cards, abas inativas */
  --border-faint: #2a2535;    /* linhas de grade de propriedades */
  --border-subtle: #27222f;   /* linhas de tabela, entre abas */

  /* texto */
  --text-strong: #ffffff;
  --text: #e2dfea;
  --text-2: #cbc6d6;          /* texto de painel, ícones */
  --text-3: #b6b0c3;          /* guias inativas, título central */
  --text-muted: #a29bb3;      /* rótulos, metadados */
  --text-dim: #6e6780;        /* separadores */
  --text-linenum: #5e5770;    /* números de linha do editor */

  /* interação */
  --hover: #27222f;           /* linha de lista */
  --hover-strong: #322c3e;    /* botão do ribbon */
  --hover-btn: #2a2535;       /* botão de acesso rápido, botão do app */
  --selection: #3b2a63;       /* linha selecionada, item de menu em hover */
  --focus-ring: #a78bfa;      /* contorno de foco, 2 px */

  /* destaque (vem do logo) */
  --accent: #6d28d9;          /* botão primário, borda de bloco de função */
  --accent-light: #a78bfa;    /* guia ativa, aba ativa, links, seleção na folha (mesma cor da face clara do logo) */
  --accent-lighter: #c4b5fd;  /* hover de link */
  --region-selected-bg: rgba(109, 40, 217, 0.22);

  /* tipos de arquivo (selo e cor de aba ativa) */
  --type-caderno: #6d28d9;
  --type-folha: #0f766e;
  --type-tex: #3b5bdb;
  --type-lib: #b45309;
  --type-inicio: #4b4458;

  /* estados */
  --ok-text: #7fd6a4;                         /* sobre fundo escuro */
  --ok-badge-bg: #e3f3ea; --ok-badge-text: #12603a;   /* sobre página branca */
  --warn-badge-bg: #4a3a14; --warn-badge-text: #f3cf7a;
  --warn-text: #f3cf7a;
  --error-text: #f19a9a;
  --limit-line: #e58a57;                      /* linha de limite em gráficos */
  --plot-line: #a78bfa;                       /* série de gráfico na folha escura */

  /* LaTeX */
  --tex-keyword: #c4b5fd;
  --tex-comment: #7d7690;
  --tex-text: #d6d2e0;
  --tex-inserted-bg: #2e2350; --tex-inserted-text: #ddd3ff;

  /* página branca (caderno e PDF): igual em qualquer tema */
  --paper: #ffffff;
  --paper-text: #1d2228;
  --paper-text-2: #3a414b;
  --paper-border: #d5d9df;
  --paper-accent: #6d28d9;    /* borda e rótulo do bloco de função na página */
}
```

### 4.2 Tipografia

| Uso | Fonte | Tamanho / peso |
|---|---|---|
| Base da interface | Inter | 12 px / 400 |
| Rótulo de botão do ribbon, título de grupo | Inter | 11 px / 400, linha 1.2 |
| Guia do ribbon | Inter | 12 px / 500 (ativa 600) |
| Cabeçalho de painel | Inter | 11 px / 600, MAIÚSCULAS, espaçamento 0.6 px |
| Selo de tipo (CAD, FOL, TEX, LIB) | JetBrains Mono | 9 px / 600, espaçamento 0.4 px |
| Título na tela inicial (seções) | Inter | 15 px / 600 |
| Título de caderno | Inter | 24 px / 700 |
| Texto de caderno | Inter | 14 px / 400, linha 1.65 |
| Código, variáveis, assinaturas de função | JetBrains Mono | 12 a 12.5 px, linha 1.75 no editor |
| Matemática | STIX Two Text | 19 a 24 px; variáveis em itálico, números e unidades retos |
| PDF de pré-visualização | STIX Two Text | 13.5 px, justificado |

Frações: numerador sobre denominador com traço de 1.3 a 1.5 px na cor do texto.

### 4.3 Medidas

| Elemento | Medida |
|---|---|
| Barra de título | 38 px de altura |
| Botão do app | 40 × 30 px, raio 4, fundo transparente (hover `--hover-btn`), contém o **logo principal** (seção 4.6) com 22 × 22 px centralizado. Sem letra, sem texto |
| Botões de acesso rápido | 30 × 30 px, ícone 16 px, traço 1.7 |
| Campo de busca | 230 × 28 px, raio 4 |
| Avatar | 26 px, círculo, iniciais 11/600 |
| Guias do ribbon | 32 px de altura, padding 0 14 px, guia ativa com borda inferior de 2 px `--accent-light` e fundo `--bg-ribbon` |
| Corpo do ribbon | mínimo 92 px |
| Botão grande do ribbon | mínimo 58 × 64 px, ícone 24 px traço 1.6, rótulo embaixo, raio 4, hover com fundo `--hover-strong` e borda `--border-strong` |
| Grupo do ribbon | divisória direita de 1 px `--border`, título centralizado embaixo |
| Abas de documento | 32 px; ativa com borda superior de 2 px `--accent-light` e fundo `--bg-panel`; selo de tipo 28 × 18 px |
| Painel esquerdo | 240 a 270 px |
| Painel direito | 260 a 290 px |
| Cabeçalho de painel | 30 px |
| Linha de lista em painel | 28 px (34 px na navegação da tela inicial, 40 px em listas de ação) |
| Grade de propriedades | 2 colunas iguais, célula com padding 6 × 10 px, divisórias `--border-faint` |
| Barra de status | 26 px, texto 11 px |
| Raios | 4 px (botões, diálogos), 6 px (cards), 3 px (selos), página branca sem raio |
| Sombra de página | `0 2px 10px rgba(0,0,0,0.4)` |
| Sombra de menu e diálogo | `0 10px 30px rgba(0,0,0,0.5)` |
| Overlay de diálogo | `rgba(8,9,12,0.55)` |

### 4.4 Ícones

SVG em `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-linecap="round"`, `stroke-linejoin="round"`. Traço 1.6 no ribbon, 1.7 nos botões pequenos, 2 em fechar e busca. Um componente `<Icon name="..." size={24} />` com estes caminhos:

```ts
export const ICONS = {
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  open: 'M3 7h6l2 2h10v10H3z',
  save: 'M5 3h12l2 2v16H5zM8 3v6h8V3M8 21v-7h8v7',
  undo: 'M9 7l-5 5 5 5M4 12h10a6 6 0 016 6',
  redo: 'M15 7l5 5-5 5M20 12H10a6 6 0 00-6 6',
  print: 'M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z',
  text: 'M5 5h14M12 5v14M9 19h6',
  calc: 'M4 8l6 8M10 8l-6 8M14 10h6M14 14h6',
  fn: 'M15 4c-3 0-4 2-4 5v11M7 10h8',
  plot: 'M4 4v16h16M7 15l4-5 3 3 5-6',
  check: 'M4 12l5 5L20 6',
  table: 'M3 5h18v14H3zM3 10h18M9 5v14',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6',
  ruler: 'M3 15L15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2',
  run: 'M7 5v14l11-7z',
  stop: 'M6 6h12v12H6z',
  lib: 'M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.5-1 2.5 15.5-3.5 1z',
  import: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  export: 'M12 15V3M7 8l5-5 5 5M4 21h16',
  section: 'M4 6h16M4 12h10M4 18h12',
  sigma: 'M18 4H6l6 8-6 8h12',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  insert: 'M4 4h10v10H4zM14 14l6 6M20 14v6h-6',
  book: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',
  zoom: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  align: 'M4 4v16M8 7h12M8 12h8M8 17h10',
  code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  tree: 'M6 3v18M6 8h8M6 16h8M14 5h6v6h-6zM14 13h6v6h-6z',
  clean: 'M4 20h16M7 16l9-9 3 3-9 9H7z',
  test: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  close: 'M6 6l12 12M18 6L6 18',
};
```

### 4.5 Regras visuais (não negociáveis)

- **Nenhum emoji** e nenhum caractere usado como ícone (▶, ✓, ✕, ▸, ✦ etc.). Estados são texto: `APROVADO`, `REPROVADO`, `ATENÇÃO`.
- Selos de estado: Inter 11/600, MAIÚSCULAS, espaçamento 0.3 px, raio 3, padding 4 × 8.
- Sem gradientes, sem cards com borda colorida à esquerda, sem sombras além das listadas.
- Contraste mínimo de 4.5:1 para texto.
- Botões são `<button>` de verdade, com foco visível (contorno de 2 px `--focus-ring`, `outline-offset: 1px`).
- **Estabilidade do layout** (ADENDO 04): elementos de navegação (barra de título, abas de documento, barra de status) ocupam a mesma posição e o mesmo tamanho em todas as telas e estados. Uma interação nunca pode mover o elemento que o usuário acabou de usar. Painéis podem aparecer ou sumir, mas só abaixo ou ao lado do elemento clicado, nunca acima dele.

### 4.6 Marca e logo

O app se chama **Prisma**. O logo é um hexágono dividido em 6 triângulos a partir do centro, cada face com um tom. Existem **duas versões aprovadas, e só elas**. Não redesenhar, não arredondar, não aplicar gradiente, sombra ou contorno.

**Logo principal (grafite violeta)**: `resources/brand/prisma-logo.svg`. Usar sobre fundos escuros.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,50 50,8 86,29" fill="#a78bfa"></polygon><polygon points="50,50 86,29 86,71" fill="#4c1d95"></polygon><polygon points="50,50 86,71 50,92" fill="#2a2440"></polygon><polygon points="50,50 50,92 14,71" fill="#15121f"></polygon><polygon points="50,50 14,71 14,29" fill="#1f1b2e"></polygon><polygon points="50,50 14,29 50,8" fill="#3f2d6e"></polygon></svg>
```

**Logo monocromático escuro**: `resources/brand/prisma-logo-mono-escuro.svg`. Usar sobre fundos **claros** (página branca, PDF, impressão).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,50 50,8 86,29" fill="#3b3354"></polygon><polygon points="50,50 86,29 86,71" fill="#2b2540"></polygon><polygon points="50,50 86,71 50,92" fill="#1f1a30"></polygon><polygon points="50,50 50,92 14,71" fill="#0d0b14"></polygon><polygon points="50,50 14,71 14,29" fill="#16121f"></polygon><polygon points="50,50 14,29 50,8" fill="#2f2945"></polygon></svg>
```

Ordem das faces (igual nos dois): 1 topo-direita, 2 direita, 3 baixo-direita, 4 baixo-esquerda, 5 esquerda, 6 topo-esquerda. A luz vem de cima à direita.

**Onde cada um aparece:**

| Lugar | Versão | Tamanho |
|---|---|---|
| Botão do app (barra de título) | principal | 22 px |
| Navegação da tela inicial, acima de "Prisma" | principal + nome | 28 px, nome em Inter 18/700 |
| Tela de abertura (splash, até 1 s) | principal + nome, centralizados em `--bg-app` | 96 px, nome em Inter 32/700 |
| Janela "Sobre" | principal + nome + versão | 64 px |
| Ícone do aplicativo (sistema operacional) | ícone de app (abaixo) | gerado pelo `tauri icon` |
| Rodapé de PDF exportado (opcional, desligado por padrão) | monocromático escuro | 4 mm de altura |
| Fundo claro em geral | monocromático escuro | qualquer |

**Nome escrito (wordmark):** "Prisma", Inter 700, `letter-spacing: -0.02em`, sempre com P maiúsculo e o resto minúsculo. Ao lado do logo, o espaço entre logo e nome é 32 % da altura do logo, alinhados pelo centro vertical. Cor `--text-strong` em fundo escuro e `#1a1426` em fundo claro.

**Área de respiro:** 12 % da largura do logo em volta, sem nada encostando.

**Tamanho mínimo:** 16 px. Abaixo disso as faces escuras se perdem.

**Ícone do aplicativo:** `resources/brand/prisma-app-icon.svg` (fornecido). Quadrado 1024 × 1024 com fundo `#15121f`, cantos com raio de 21,7 % (222 px em 1024), e o logo principal com 88 % do lado, centralizado. Gerar os ícones do Tauri assim:

```bash
# a partir do PNG fornecido (resources/brand/app-icon-1024.png)
npm run tauri icon resources/brand/app-icon-1024.png
```

Isso cria `src-tauri/icons/` (.ico, .icns e PNGs). Não editar esses arquivos à mão.

**Favicon da janela e da barra de tarefas:** o mesmo ícone de app.

### 4.7 Checklist de conformidade visual

Antes de dar a Fase 0 como pronta, conferir lado a lado com `referencia-design.dc.html`:

1. Toda cor usada vem de `tokens.css`. Rodar `grep -rnE "#[0-9a-fA-F]{3,8}" src --include=*.tsx --include=*.ts --include=*.css | grep -v tokens.css` e o resultado deve vir vazio, exceto os SVGs do logo.
2. Nenhum emoji e nenhum caractere de símbolo como ícone. Rodar uma busca por `[\u2190-\u21FF\u2600-\u27BF\u{1F300}-\u{1FAFF}]` no `src/` deve voltar vazio (setas, ✓, ✕, ▶, ▸, emoji).
3. Fontes carregadas de `resources/fonts/`, nada de Google Fonts em tempo de execução.
4. Medidas da seção 4.3 conferidas com as ferramentas de desenvolvedor: barra de título 38 px, guias 32 px, corpo do ribbon com mínimo de 92 px, abas de documento 32 px, barra de status 26 px, linhas de painel 28 px.
5. Guia ativa do ribbon e aba ativa de documento usam `--accent-light` (#a78bfa) na borda de 2 px.
6. Botão do app mostra o logo principal em 22 px, sem letra.
7. Página branca do caderno e do PDF continua branca (`--paper`), com bloco de função usando `--paper-accent`.
8. Textos da interface em português do Brasil, exatamente como no protótipo (ex.: "Calcular tudo", "Inserir resultado", "Resultados disponíveis").
9. Contraste: todo texto contra o próprio fundo com pelo menos 4.5:1 (os tokens já atendem; não clarear nem escurecer por conta própria).

---

## 5. Layout da janela

De cima para baixo:

1. **Barra de título** (38 px): botão do app com o logo, acesso rápido (Novo, Abrir, Salvar, Desfazer, Refazer), título central `Prisma 2026 | nome-do-arquivo` (separador `|` em `--text-dim`), busca de comandos, avatar com iniciais.
2. **Ribbon** (só quando há documento aberto): guias Início, Inserir, Exibir, Saída. Os grupos dependem do tipo de arquivo (seção 6).
3. **Abas de documento**: aba fixa "Início" + uma aba por arquivo aberto, com selo de tipo colorido.
4. **Corpo**: tela inicial, ou painel esquerdo + área central + painel direito.
5. **Barra de status** (26 px): mensagem de estado à esquerda; à direita `Unidades: SI`, `Cálculo: automático`, `Zoom 100 %`.

### 5.1 Menu do aplicativo

Abre ao clicar no botão do app, ancorado embaixo dele (300 px de largura, fundo `--bg-raised`, borda `--border-strong`, sombra de menu). Item em hover: fundo `--selection`. Itens com ícone e atalho:

| Item | Atalho |
|---|---|
| Novo | Ctrl+N |
| Abrir | Ctrl+O |
| Salvar | Ctrl+S |
| Salvar como | Ctrl+Shift+S |
| Exportar | |
| Imprimir | Ctrl+P |
| Gerar skill para IA | |
| Fechar | Ctrl+W |

Fecha com Esc ou clique fora.

### 5.2 Tela inicial

Navegação à esquerda (210 a 230 px): logo principal de 28 px com "Prisma" ao lado (Inter 18/700), Início, Abrir, Modelos, Bibliotecas, Formato e skills, e Configurações no rodapé.

Área principal com três seções:

- **Novo**: 4 cards (Caderno, Folha livre, Documento LaTeX, Biblioteca), cada um com quadrado 40 px na cor do tipo e ícone branco, nome e descrição de uma linha.
- **Recentes**: tabela com colunas Nome (selo + nome), Tipo, Pasta, Modificado. Clicar abre o arquivo numa aba.
- **Modelos**: grade de miniaturas (página branca 72 × 96 px com faixa na cor do modelo), nome e tipo.

---

## 6. Ribbon por tipo de arquivo

| Tipo | Guia | Grupos e botões |
|---|---|---|
| Caderno | Início | **Células:** Texto, Cálculo, Função, Gráfico, Verificação · **Biblioteca:** Inserir função, Salvar na biblioteca · **Cálculo:** Calcular tudo, Interromper · **Unidades:** Sistema, Converter |
| | Inserir | **Conteúdo:** Tabela, Imagem, Link para nota · **Matemática:** Matriz, Somatório |
| | Exibir | **Exibição:** Justificativas, Só resultados · **Navegação:** Estrutura, Dependências, Zoom |
| | Saída | **Saída:** Exportar, Imprimir, Enviar ao LaTeX · **Integração:** Gerar SKILL.md |
| Folha livre | Início | **Regiões:** Cálculo, Texto, Gráfico, Matriz, Imagem · **Funções:** Inserir função, Definir função · **Organizar:** Alinhar, Grade · **Cálculo:** Calcular, Interromper |
| | Inserir | **Conteúdo:** Tabela, Imagem, Link |
| | Exibir | **Exibição:** Grade, Dependências, Zoom |
| | Saída | **Saída:** Exportar, Imprimir, Promover a caderno |
| LaTeX | Início | **Estrutura:** Seção, Equação, Tabela, Figura, Referência · **Resultados:** Inserir resultado, Atualizar resultados · **Compilar:** Compilar, Limpar auxiliares · **Modelo:** Trocar modelo, Bibliografia |
| | Inserir | **Pacotes:** Pacotes, Comandos |
| | Exibir | **Exibição:** Código, PDF, Zoom |
| | Saída | **Saída:** Exportar PDF, Exportar .tex, Imprimir |
| Biblioteca | Início | **Funções:** Nova função, Importar, Exportar · **Testes:** Testar, Verificar unidades · **Documentar:** Gerar referência, Gerar SKILL.md |
| | Inserir | **Conteúdo:** Tabela de norma, Constante |
| | Exibir | **Exibição:** Árvore, Código |
| | Saída | **Saída:** Publicar versão, Exportar pacote |

Ícones de cada botão: ver o protótipo (mesmos nomes da seção 4.4). Defina o ribbon como dados (`ribbons.ts`), não como JSX fixo, para que cada botão seja um comando registrado (seção 10).

---

## 7. Painéis e área central por tipo

### 7.1 Caderno

- **Esquerda:** "Estrutura do caderno" lista cada bloco com selo (TIT, TXT, FUN, CAL, VER, GRA, TAB) e rótulo; clicar seleciona e rola até o bloco. Embaixo, "Bibliotecas em uso" com versão.
- **Centro:** fundo `--bg-workspace`, página branca centralizada (máx. 760 px, padding 44 × 52). Bloco de função com borda de 1.5 px `--accent` e rótulo sobreposto na borda `FUNÇÃO · ELÉTRICA`. Bloco de cálculo com borda `--paper-border`: entradas em grade de 4 colunas, resultados embaixo depois de uma linha tracejada, com o selo de verificação ao lado.
- **Direita:** "Propriedades" do bloco selecionado em grade chave/valor (Tipo, Nome, Biblioteca, Saída, Usada em, Exibir no documento).
- **Edição:** clicar num texto edita em Markdown (ou num editor rico simples); clicar numa expressão abre o MathLive no lugar. Enter numa linha de cálculo cria a próxima linha; Ctrl+Enter recalcula.

### 7.2 Folha livre

- **Esquerda:** tabela "Variáveis" (Nome, Valor, Unid.) com todas as definições da folha, e "Funções nesta folha" com a biblioteca de origem; clicar abre a nota de origem.
- **Centro:** grade de 20 px (`--bg-grid` / `--grid-line`), regiões com posição absoluta, arrastáveis e com encaixe na grade. Região selecionada: borda de 1 px `--accent-light` e fundo `--region-selected-bg`. Clicar em área vazia e digitar cria uma região de cálculo ali.
- **Embaixo do centro:** linha de comando (fundo `--bg-titlebar`, JetBrains Mono 12): mostra a última mensagem e aceita comandos (`inserir ρ_T`, `calcular`, `ir string-3`).
- **Direita:** "Propriedades da região" (Região, Tipo, Posição X/Y, Unidade, Casas decimais, Dependentes).

### 7.3 Documento LaTeX

- **Esquerda:** "Documento" (estrutura de seções lida do `.tex`, clicar vai para a linha) e "Arquivos do projeto".
- **Centro:** divisão ajustável entre o editor CodeMirror (números de linha, cores da seção 4.1, linhas de `\resultado` e `\figura` destacadas com `--tex-inserted-bg`) e o PDF compilado (pdf.js sobre `--bg-workspace`). Clicar no PDF leva à linha correspondente (SyncTeX).
- **Direita:** "Resultados disponíveis" (texto fixo de aviso: *"Escolha o que inserir no documento. Nada é sincronizado sem você pedir."*, e a lista de resultados de todos os cadernos e folhas do cofre, com busca) e "Saída da compilação" (motor, páginas, erros em `--ok-text`, avisos em `--warn-text`, clique no erro vai para a linha).

### 7.4 Biblioteca

- **Esquerda:** árvore de funções agrupadas por seção, assinatura em JetBrains Mono.
- **Centro:** caminho (`ELÉTRICA · QUEDA DE TENSÃO`), assinatura em 24 px, fórmula renderizada sobre fundo branco, Parâmetros e "Por que e quando usar" em duas colunas, tabela "Testes da função" (expressão, resultado, aprovado).
- **Direita:** "Metadados" (Biblioteca, Versão, Retorna, Fonte, Uso).

### 7.5 Diálogo Exportar

640 px, cabeçalho de 36 px com botão fechar. Lista de formatos à esquerda; à direita, nome, descrição e opções (Incluir justificativas, Mostrar unidades, Só resultados finais, Incluir funções das bibliotecas). Rodapé com Cancelar e Exportar (primário).

---

## 8. Motor de cálculo

Roda num Web Worker (`src/engine/`), com API assíncrona:

```ts
interface Engine {
  load(doc: ParsedDoc, libs: Library[]): void;
  evaluate(): Promise<EvalResult>;   // por bloco e por linha: valor, unidade, erro, dependências
  evaluateFrom(blockId: string): Promise<EvalResult>; // recálculo incremental
}
```

1. **Parser** (`parser.ts`): sintaxe da seção 3.4 → AST próprio. Depois traduz para math.js: `:=` vira atribuição, `= ?` vira avaliação, `ρ_cu` vira um identificador válido.
2. **Ordem de avaliação:** caderno na ordem do arquivo; folha por (y, x). Usar uma variável antes de definir é erro, igual ao SMath.
3. **Grafo de dependências:** cada linha conhece as variáveis que lê e escreve. Ao editar, recalcula só o que depende dela.
4. **Unidades:** math.js com SI. Somar grandezas incompatíveis gera o erro `Unidades incompatíveis: m + A`. Unidades com offset (°C, °F) só valem em atribuições e conversões; em multiplicações, usar a diferença em K.
5. **Exibição:** casas decimais e separador decimal vêm do `config.yaml` (padrão: 2 casas significativas, vírgula); unidade do resultado simplificada (`Ω*mm^2/m*m*A/mm^2` vira `V`).
6. **Funções nativas (v1):** sqrt, exp, ln, log, sin/cos/tan (graus e rad), asin/acos/atan, abs, min, max, round, ceil, floor, sum, mean, root (Newton com chute inicial e bisseção com intervalo), solve para sistemas lineares, matrizes (det, inv, transposta, multiplicação), interpolação linear, integral numérica (Simpson adaptativo), derivada numérica, polyroots.
7. **Limite de tempo:** cada avaliação tem 2 s; passou disso, interrompe e mostra o erro na linha.

Testes obrigatórios (Vitest), entre outros:

| Expressão | Resultado esperado |
|---|---|
| `ΔV(25 m, 12 A, 6 mm^2)` com ρ_cu = 0.0179 Ω·mm²/m | 1,79 V (±0,5 %) |
| `ΔV(32 m, 11.5 A, 4 mm^2)` | 3,29 V |
| `3,29 V / 400 V` | 0,82 % |
| `E_mes(5.5 kWp, 5.4 h/dia, 0.8)` = P·HSP·PR·30 dia | 712,8 kWh |
| `ρ_T(70 °C)` = ρ_cu·(1 + 0,00393·50) | 0,0214 Ω·mm²/m |
| `1 m + 1 A` | erro de unidade |

---

## 9. Formato documentado e skills para IA

A integração com IA é **por arquivos**, não por API. O comando **Gerar skill para IA** (menu do app e guia Saída) cria em `.prisma/skills/prisma-arquivos/`:

- `SKILL.md`: frontmatter (`name`, `description`) + especificação resumida das seções 3.2 a 3.8 + regras + a lista de bibliotecas instaladas com as assinaturas das funções.
- `exemplos/`: um caderno, uma folha e uma biblioteca de exemplo.

O usuário pode compactar a pasta e subir como skill no Claude, ou apontar outra IA para ela. Conteúdo mínimo do `SKILL.md` gerado:

```markdown
---
name: prisma-arquivos
description: Cria, edita e resume arquivos do app Prisma (.caderno.md, .folha.md, .lib.md) e documentos LaTeX que usam o pacote prisma.
---

# Formato
(seções 3.2 a 3.8 resumidas)

# Regras
- Nunca apagar texto fora dos blocos: é a justificativa do usuário.
- Todo bloco precisa de #id único no arquivo.
- Unidades sempre explícitas.
- Decimal com ponto dentro dos blocos.
- Em resultados, escrever `= ?` e nunca um número calculado à mão.

# Para resumir um arquivo
1. Funções definidas e bibliotecas usadas.
2. Resultados finais com unidade (ler de .prisma/cache/ se existir).
3. Verificações e se passaram.

# Bibliotecas instaladas
(gerado: nome, versão, assinatura e descrição de cada função)
```

---

## 10. Arquitetura do código

```
prisma/
├── src-tauri/                 # Rust
│   ├── src/
│   │   ├── main.rs
│   │   ├── vault.rs           # abrir cofre, listar, ler/gravar, observar mudanças
│   │   ├── latex.rs           # chamar Tectonic/latexmk, devolver log e SyncTeX
│   │   ├── export.rs          # Pandoc e escrita de arquivos exportados
│   │   └── recent.rs          # lista de recentes (no diretório de dados do app)
│   └── binaries/              # sidecars: tectonic, pandoc (opcional)
├── src/
│   ├── styles/tokens.css      # seção 4
│   ├── components/            # Icon, Button, RibbonButton, Panel, PropGrid, Badge, Dialog, Menu
│   ├── shell/                 # TitleBar, Ribbon, DocTabs, StatusBar, AppMenu
│   ├── home/                  # tela inicial
│   ├── editors/
│   │   ├── caderno/
│   │   ├── folha/
│   │   ├── latex/
│   │   └── biblioteca/
│   ├── format/                # parse/serialize de .caderno.md, .folha.md, .lib.md
│   ├── engine/                # worker, parser, avaliador, nativas, testes
│   ├── commands/              # registro de comandos (ribbon, menu, atalhos, linha de comando)
│   ├── export/                # um módulo por formato
│   ├── skills/                # gerador de SKILL.md
│   └── store/                 # Zustand: cofre, abas, seleção, configurações
└── resources/
    ├── brand/                 # logos e ícone do app (seção 4.6)
    ├── fonts/
    ├── latex/prisma.sty
    ├── modelos/               # modelos de fábrica
    └── bibliotecas/           # nativas.lib.md, eletrica.lib.md, fotovoltaica.lib.md, controle.lib.md
```

- **Comandos:** todo botão do ribbon, item de menu, atalho e comando da linha de comando chama o mesmo registro (`commands.register('caderno.inserirCalculo', handler)`). A busca da barra de título pesquisa nesse registro.
- **Parse e serialize simétricos:** abrir e salvar um arquivo sem editar precisa devolver bytes idênticos. Testar isso com todos os exemplos.
- **Mudança externa:** se o arquivo mudar fora do app (Git, outra IA) e não houver edição pendente, recarregar sozinho; se houver, perguntar.
- **Autossalvar:** 2 s depois da última edição.

---

## 11. Exportação

| Formato | Caderno | Folha | LaTeX | Biblioteca | Como |
|---|---|---|---|---|---|
| PDF | sim | sim | sim | sim | Gera `.tex` a partir do modelo escolhido e compila; LaTeX compila direto |
| LaTeX (.tex) | sim | sim | sim | sim | Fonte + figuras em PDF vetorial |
| Word (.docx) | sim | sim | sim | sim | Pandoc a partir de Markdown intermediário |
| Markdown (.md) | sim | sim | não | sim | Valores calculados escritos no lugar de `= ?` |
| HTML | sim | sim | não | sim | Página única com KaTeX embutido |
| Nativo | sim | sim | n/a | sim | Cópia do arquivo |
| SMath (.sm) | parcial | parcial | não | não | XML do SMath; só cálculos, unidades e texto simples. Fase 7 |
| Jupyter (.ipynb) | sim | não | não | não | Texto vira célula Markdown; cálculo vira Python com `pint` |
| CSV | sim | sim | não | não | Variável, valor, unidade |

Opções do diálogo: incluir justificativas, mostrar unidades, só resultados finais, incluir as funções das bibliotecas usadas.

---

## 12. Fases e critérios de aceite

**Fase 0: Shell estático.** Tauri + React rodando, fontes locais, tokens, componente Icon, barra de título, ribbon a partir de dados, abas de documento, barra de status, menu do app, tela inicial com dados de exemplo.
*Aceite:* com os quatro tipos simulados, cada um mostra o ribbon e os painéis certos, e a janela fica igual ao protótipo lado a lado (cores e medidas da seção 4).

**Fase 1: Cofre e formato.** Abrir pasta, árvore de arquivos, recentes, parse/serialize dos três formatos `.md`, observação de arquivos, `.prisma/config.yaml`, `.gitignore`.
*Aceite:* os exemplos da seção 3 abrem e salvam sem alterar nenhum byte; editar o arquivo num editor externo atualiza o app.

**Fase 2: Motor e caderno.** Parser, worker, unidades, nativas, verificações, editor de caderno com MathLive, painel Estrutura e Propriedades.
*Aceite:* todos os testes da seção 8 passam; o caderno `cabos-cc` mostra 1,79 V, 0,45 % e APROVADO.

**Fase 3: Folha livre.** Regiões posicionadas, arrastar com encaixe, ordem por posição, tabela de variáveis, gráfico uPlot, linha de comando.
*Aceite:* `string-3` mostra 3,29 V, 0,82 % e ATENÇÃO, e o gráfico tem a linha de limite.

**Fase 4: Bibliotecas.** Carregar `.lib.md`, `salvar=` grava na biblioteca, tela de biblioteca, testes, busca de função (Ctrl+K e "Inserir função").
*Aceite:* salvar uma função no caderno faz ela aparecer na biblioteca e na folha; os testes de `eletrica.lib.md` passam.

**Fase 5: LaTeX.** CodeMirror, Tectonic, pdf.js, SyncTeX, `prisma.sty`, inserir resultado, instantâneo e "Atualizar resultados" com diferenças.
*Aceite:* o memorial de exemplo compila; mudar S no caderno **não** altera o PDF até clicar em Atualizar resultados.

**Fase 6: Exportação e skills.** Diálogo Exportar, PDF, .tex, .md, HTML, CSV, nativo, .docx (com Pandoc), gerador de `SKILL.md`.
*Aceite:* cada formato abre no programa de destino; o `SKILL.md` gerado lista as funções instaladas.

**Fase 7: Modelos e extras.** Modelos de fábrica com `{{campos}}`, criar a partir de modelo, exportação SMath parcial e Jupyter.

**Fase 8 (opcional): CAS.** Simplificação e derivada simbólica com Giac compilado para WebAssembly.

---

## 13. Convenções para o Claude Code

- TypeScript estrito; nada de `any` sem comentário explicando.
- Interface em português do Brasil; código e identificadores em inglês, exceto termos do domínio que aparecem no formato de arquivo (`caderno`, `folha`, `funcao`).
- O nome do app fica numa constante (`APP_NAME`, `APP_ID = 'prisma'`) usada em todos os lugares (`APP_NAME = 'Prisma'`). O logo é o hexágono facetado de 6 faces; os SVGs ficam em `resources/brand/`.
- Antes de cada fase, escrever o plano curto em `docs/fase-N.md`; ao terminar, atualizar com o que foi feito e o que ficou pendente.
- Testes junto da implementação, não depois.
