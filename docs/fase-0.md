# Fase 0: shell estático

## Plano

- Vite + React 18 + TypeScript estrito; Tauri 2 em `src-tauri/`.
- `src/styles/tokens.css` com os tokens da seção 4 (únicas cores do código).
- Fontes locais em `resources/fonts/` (Inter, JetBrains Mono, STIX Two Text), carregadas por `src/styles/fonts.css`.
- `Icon` com os caminhos da seção 4.4; logo lido de `resources/brand/`.
- Registro de comandos (`src/commands/`): ribbon, menu, atalhos e busca da barra de título chamam o mesmo registro.
- Ribbon como dados (`src/shell/ribbons.ts`).
- Shell: barra de título, ribbon, abas de documento, barra de status, menu do app, diálogo Exportar (estático).
- Tela inicial e os quatro tipos simulados (caderno, folha, LaTeX, biblioteca) com os painéis da seção 7, dados de exemplo em `src/mock.ts`.
- Teste de conformidade (Vitest): nenhuma cor fora de `tokens.css`, nenhum emoji ou símbolo usado como ícone.

## Aceite

Com os quatro tipos simulados, cada um mostra o ribbon e os painéis certos, e a janela fica igual ao protótipo lado a lado.

## Feito

- Projeto Vite 8 + React 18 + TS + Zustand; Tauri 2 em `src-tauri/` (compila com `cargo build`), ícones gerados com `tauri icon`.
- `tokens.css` com os tokens da seção 4 e alguns extras tirados do protótipo (marcados no arquivo).
- 30 arquivos woff2 em `resources/fonts/` (latin, latin-ext, greek), com as licenças OFL.
- Registro de comandos em `src/commands/registry.ts`; os handlers da fase ficam em `src/commands/app.ts`. Botões sem ação mostram "ainda não disponível nesta versão" na barra de status.
- Shell completo (`src/shell/Shell.tsx`), tela inicial e os quatro editores simulados.
- Atalhos ligados: Ctrl+N, Ctrl+O, Ctrl+W, Esc. A busca da barra de título executa um comando pelo nome exato.
- `src/conformance.test.ts`: checklist 4.7, itens 1 e 2, mais o teste do registro de comandos.
- Medidas conferidas no navegador: barra de título 38, guias 32, corpo do ribbon 92, abas 32, linhas de painel 28, barra de status 26; bordas ativas em `--accent-light`.

## Pendente

- Conferência visual lado a lado com o protótipo (feita só por medidas e estrutura; o painel do navegador não gerou capturas).
- A janela usa a barra de título nativa do sistema por cima da nossa. Esconder a nativa (`decorations: false`) exige botões de minimizar, maximizar e fechar próprios: fica para quando o shell estiver estável.
- Tela de abertura (splash) e janela "Sobre" (seção 4.6).
- Avatar com iniciais fixas "PW" até haver configuração.
