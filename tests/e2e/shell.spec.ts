// Fase 0 (shell) e checklist visual 4.7 da SPEC.
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { CALC, dev, start, tabs } from './helpers';

const FILES = {
  caderno: `${CALC}/cabos-cc.prsm`,
  folha: `${CALC}/string-3.prsf`,
  tex: 'C:/Users/voce/Documents/Usina Boa Vista/memorial/memorial.tex',
  lib: 'C:/Program Files/Prisma/bibliotecas/eletrica.prsl',
};

// SPEC 6 (copiado da tabela, não do código), mais o grupo Texto (ADENDO 02 B7) e Código-fonte (B1)
const RIBBON: Record<keyof typeof FILES, Record<string, string[]>> = {
  caderno: {
    Início: ['Células: Texto, Cálculo, Função, Gráfico, Verificação', 'Texto: Negrito, Itálico, Título, Lista, Link', 'Biblioteca: Inserir função, Salvar na biblioteca', 'Cálculo: Calcular tudo, Interromper', 'Unidades: Sistema, Converter'],
    Inserir: ['Conteúdo: Tabela, Imagem, Link para nota', 'Matemática: Matriz, Somatório'],
    Exibir: ['Exibição: Justificativas, Só resultados, Código-fonte', 'Navegação: Estrutura, Dependências, Zoom'],
    Saída: ['Saída: Exportar, Imprimir, Enviar ao LaTeX', 'Integração: Gerar SKILL.md'],
  },
  folha: {
    Início: ['Regiões: Cálculo, Texto, Gráfico, Matriz, Imagem', 'Funções: Inserir função, Definir função', 'Organizar: Alinhar, Grade', 'Cálculo: Calcular, Interromper'],
    Inserir: ['Conteúdo: Tabela, Imagem, Link', 'Organizar: Área'], // grupo Organizar: ADENDO 05, E6
    Exibir: ['Exibição: Grade, Dependências, Zoom, Código-fonte'],
    Saída: ['Saída: Exportar, Imprimir, Promover a caderno'],
  },
  tex: {
    Início: ['Estrutura: Seção, Equação, Tabela, Figura, Referência', 'Resultados: Inserir resultado, Atualizar resultados', 'Compilar: Compilar, Limpar auxiliares', 'Modelo: Trocar modelo, Bibliografia'],
    Inserir: ['Pacotes: Pacotes, Comandos'],
    Exibir: ['Exibição: Código, PDF, Zoom'],
    Saída: ['Saída: Exportar PDF, Exportar .tex, Imprimir'],
  },
  lib: {
    Início: ['Funções: Nova função, Importar, Exportar', 'Testes: Testar, Verificar unidades', 'Documentar: Gerar referência, Gerar SKILL.md'],
    Inserir: ['Conteúdo: Tabela de norma, Constante'],
    Exibir: ['Exibição: Árvore, Código'],
    Saída: ['Saída: Publicar versão, Exportar pacote'],
  },
};

async function ribbonGroups(page: Page) {
  return page.evaluate(() => {
    const body = document.querySelector('[aria-label="Guias da faixa de opções"]')!.nextElementSibling!;
    return [...body.children].map((g) => `${(g.lastElementChild as HTMLElement).innerText}: ${[...g.querySelectorAll('button')].map((b) => b.innerText.trim()).join(', ')}`);
  });
}

const ID: Record<keyof typeof FILES, string> = { caderno: '[F0-01]', folha: '[F0-02]', tex: '[F0-03]', lib: '[F0-04]' }; // literais: o check-matriz lê o código
for (const type of Object.keys(FILES) as (keyof typeof FILES)[]) {
  test(`${ID[type]} ribbon de ${type}: guias e grupos da SPEC 6`, async ({ page }) => {
    await start(page);
    await dev(page).open(FILES[type]);
    for (const [tab, groups] of Object.entries(RIBBON[type])) {
      await page.locator('[aria-label="Guias da faixa de opções"]').getByRole('tab', { name: tab, exact: true }).click();
      expect(await ribbonGroups(page), `${type} / ${tab}`).toEqual(groups);
    }
  });
}

test('[F0-05] cada tipo mostra os painéis esquerdo e direito da SPEC 7', async ({ page }) => {
  const want: Record<keyof typeof FILES, [string[], string[]]> = {
    caderno: [['ESTRUTURA DO CADERNO', 'BIBLIOTECAS EM USO'], ['PROPRIEDADES']],
    folha: [['VARIÁVEIS', 'FUNÇÕES NESTA FOLHA'], ['PROPRIEDADES DA REGIÃO']],
    tex: [['DOCUMENTO', 'ARQUIVOS DO PROJETO'], ['RESULTADOS DISPONÍVEIS', 'SAÍDA DA COMPILAÇÃO']],
    lib: [['FUNÇÕES', 'CONSTANTES'], ['METADADOS']],
  };
  await start(page);
  for (const type of Object.keys(FILES) as (keyof typeof FILES)[]) {
    await dev(page).open(FILES[type]);
    const heads = await page.evaluate(() => [...document.querySelectorAll('aside')].map((a) =>
      [...a.querySelectorAll('div')].filter((d) => getComputedStyle(d).textTransform === 'uppercase' && d.children.length && d.firstElementChild?.tagName === 'SPAN').map((d) => (d.firstElementChild as HTMLElement).innerText)));
    expect(heads, type).toEqual(want[type]);
  }
});

test('[F0-06] [V-04] [V-06] barra de título: 38 px, acesso rápido, título, busca, avatar e logo de 22 px', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  const bar = page.locator('header');
  expect((await bar.boundingBox())!.height).toBe(38);
  for (const name of ['Novo', 'Abrir', 'Salvar', 'Desfazer', 'Refazer']) await expect(bar.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(bar).toContainText('Prisma 2026 | cabos-cc.prsm');
  await expect(bar.getByPlaceholder('Buscar comando ou função')).toBeVisible();
  await expect(bar.getByLabel('Usuário')).toHaveText('PW');
  const logo = bar.getByRole('button', { name: 'Menu do Prisma' });
  await expect(logo).toHaveText('');
  const img = logo.locator('img');
  // o Vite embute o SVG pequeno como data URI; o logo principal tem a face clara em #a78bfa (o monocromático não)
  expect(await img.evaluate((i: HTMLImageElement) => [i.width, i.height, decodeURIComponent(i.src).toLowerCase().includes('a78bfa')])).toEqual([22, 22, true]);
});

test('[F0-07] [V-04] [V-05] abas e guias: 32 px, selo de tipo e borda inferior --accent-light de 2 px', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  const accent = await page.evaluate(() => { const s = document.createElement('i'); s.style.color = 'var(--accent-light)'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
  const tab = tabs(page).filter({ hasText: 'cabos-cc.prsm' });
  await expect(tab).toContainText('CAD');
  // ADENDO 04 (D2): a aba ativa passou da borda superior para a inferior
  const t = await tab.evaluate((e) => ({ h: e.getBoundingClientRect().height, c: getComputedStyle(e).borderBottomColor, w: getComputedStyle(e).borderBottomWidth }));
  expect(t).toEqual({ h: 32, c: accent, w: '2px' });
  const g = await page.locator('[aria-label="Guias da faixa de opções"] [aria-selected="true"]').evaluate((e) => ({ h: e.getBoundingClientRect().height, c: getComputedStyle(e).borderBottomColor, w: getComputedStyle(e).borderBottomWidth }));
  expect(g).toEqual({ h: 32, c: accent, w: '2px' });
  const body = await page.evaluate(() => document.querySelector('[aria-label="Guias da faixa de opções"]')!.nextElementSibling!.getBoundingClientRect().height);
  expect(body).toBeGreaterThanOrEqual(92);
  const row = await page.locator('aside button').first().evaluate((e) => e.getBoundingClientRect().height);
  expect(row).toBe(28);
});

test('[F0-08] [V-04] barra de status: 26 px, mensagem e "Unidades: SI", "Cálculo: automático", "Zoom 100 %"', async ({ page }) => {
  await start(page);
  const footer = page.locator('footer');
  expect((await footer.boundingBox())!.height).toBe(26);
  for (const t of ['Pronto', 'Unidades: SI', 'Cálculo: automático', 'Zoom 100 %']) await expect(footer).toContainText(t);
});

test('[F0-09] menu do app: itens e atalhos da SPEC 5.1; fecha com Esc', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Menu do Prisma' }).click();
  const items = await page.getByRole('menuitem').allInnerTexts();
  expect(items.map((t) => t.replace(/\s+/g, ' ').trim())).toEqual([
    'Novo Ctrl+N', 'Abrir Ctrl+O', 'Salvar Ctrl+S', 'Salvar como Ctrl+Shift+S', 'Exportar', 'Imprimir Ctrl+P', 'Gerar skill para IA', 'Fechar Ctrl+W',
  ]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem')).toHaveCount(0);
});

test('[F0-10] tela inicial: Novo, Recentes e Modelos', async ({ page }) => {
  await start(page);
  for (const s of ['Novo', 'Recentes', 'Modelos']) await expect(page.getByRole('heading', { name: s, exact: true })).toBeVisible();
  const cards = await page.locator('section[aria-label="Novo"] button').allInnerTexts();
  expect(cards.map((c) => c.split('\n')[0])).toEqual(['Caderno', 'Folha livre', 'Documento LaTeX', 'Biblioteca', 'Projeto', 'Abrir...', 'Abrir projeto...']);
});

test('[F0-13] [F6-03] a busca da barra de título executa o comando (Exportar abre o diálogo com formatos e opções)', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  const search = page.getByPlaceholder('Buscar comando ou função');
  await search.fill('Exportar');
  await search.press('Enter');
  const dlg = page.getByRole('dialog', { name: 'Exportar' });
  await expect(dlg).toBeVisible();
  for (const f of ['PDF', 'LaTeX (.tex)', 'Word (.docx)', 'Markdown (.md)', 'HTML', 'SMath Studio (.sm)', 'Jupyter (.ipynb)', 'CSV']) await expect(dlg).toContainText(f);
  for (const o of ['Incluir justificativas', 'Mostrar unidades', 'Só resultados finais', 'Incluir funções das bibliotecas']) await expect(dlg).toContainText(o);
});

test('[V-03] nenhuma requisição de fonte para a internet; fontes vêm de resources/fonts', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { if (!r.url().startsWith('http://localhost:1420') && !r.url().startsWith('data:')) external.push(r.url()); });
  await start(page);
  await dev(page).open(FILES.caderno);
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
  // a fonte só começa a carregar quando o primeiro texto com ela é desenhado: espera por condição
  const families = () => page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')); });
  for (const f of ['Inter', 'STIX Two Text']) await expect.poll(families).toContain(f);
  expect(external).toEqual([]);
});

test('[V-08] textos da interface em pt-BR como no protótipo', async ({ page }) => {
  await start(page);
  await dev(page).open(FILES.caderno);
  for (const t of ['Calcular tudo', 'Estrutura do caderno', 'Bibliotecas em uso', 'Propriedades']) await expect(page.locator('body')).toContainText(t, { ignoreCase: true });
  await dev(page).open(FILES.tex);
  for (const t of ['Inserir resultado', 'Resultados disponíveis', 'Escolha o que inserir no documento. Nada é sincronizado sem você pedir.']) await expect(page.locator('body')).toContainText(t, { ignoreCase: true });
});
