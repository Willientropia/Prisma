import type { IconName } from '../components/Icon';
import type { DocType } from '../constants';
import { register } from '../commands/registry';

// Ribbon como dados (SPEC seção 6). Cada botão é um comando registrado.
export type RibbonTab = 'inicio' | 'inserir' | 'exibir' | 'saida';
export type RibbonButton = { cmd: string; label: string; icon: IconName };
export type RibbonGroup = { title: string; buttons: RibbonButton[] };

export const RIBBON_TABS: [RibbonTab, string][] = [['inicio', 'Início'], ['inserir', 'Inserir'], ['exibir', 'Exibir'], ['saida', 'Saída']];

type Spec = [string, [string, string, IconName][]][];
const g = (spec: Spec): RibbonGroup[] =>
  spec.map(([title, btns]) => ({ title, buttons: btns.map(([cmd, label, icon]) => ({ cmd, label, icon })) }));

export const RIBBONS: Record<DocType, Record<RibbonTab, RibbonGroup[]>> = {
  caderno: {
    inicio: g([
      ['Células', [['caderno.texto', 'Texto', 'text'], ['caderno.calculo', 'Cálculo', 'calc'], ['caderno.funcao', 'Função', 'fn'], ['caderno.grafico', 'Gráfico', 'plot'], ['caderno.verificacao', 'Verificação', 'check']]],
      ['Biblioteca', [['funcao.inserir', 'Inserir função', 'lib'], ['caderno.salvarNaBiblioteca', 'Salvar na biblioteca', 'import']]],
      ['Cálculo', [['calc.tudo', 'Calcular tudo', 'run'], ['calc.interromper', 'Interromper', 'stop']]],
      ['Unidades', [['unidades.sistema', 'Sistema', 'ruler'], ['unidades.converter', 'Converter', 'calc']]],
    ]),
    inserir: g([
      ['Conteúdo', [['inserir.tabela', 'Tabela', 'table'], ['inserir.imagem', 'Imagem', 'image'], ['inserir.linkNota', 'Link para nota', 'link']]],
      ['Matemática', [['inserir.matriz', 'Matriz', 'grid'], ['inserir.somatorio', 'Somatório', 'sigma']]],
    ]),
    exibir: g([
      ['Exibição', [['exibir.justificativas', 'Justificativas', 'eye'], ['exibir.soResultados', 'Só resultados', 'check']]],
      ['Navegação', [['exibir.estrutura', 'Estrutura', 'section'], ['exibir.dependencias', 'Dependências', 'tree'], ['exibir.zoom', 'Zoom', 'zoom']]],
    ]),
    saida: g([
      ['Saída', [['app.exportar', 'Exportar', 'export'], ['app.imprimir', 'Imprimir', 'print'], ['caderno.enviarLatex', 'Enviar ao LaTeX', 'insert']]],
      ['Integração', [['app.gerarSkill', 'Gerar SKILL.md', 'code']]],
    ]),
  },
  folha: {
    inicio: g([
      ['Regiões', [['folha.calculo', 'Cálculo', 'calc'], ['folha.texto', 'Texto', 'text'], ['folha.grafico', 'Gráfico', 'plot'], ['inserir.matriz', 'Matriz', 'grid'], ['inserir.imagem', 'Imagem', 'image']]],
      ['Funções', [['funcao.inserir', 'Inserir função', 'lib'], ['folha.definirFuncao', 'Definir função', 'fn']]],
      ['Organizar', [['folha.alinhar', 'Alinhar', 'align'], ['folha.grade', 'Grade', 'grid']]],
      ['Cálculo', [['calc.tudo', 'Calcular', 'run'], ['calc.interromper', 'Interromper', 'stop']]],
    ]),
    inserir: g([['Conteúdo', [['inserir.tabela', 'Tabela', 'table'], ['inserir.imagem', 'Imagem', 'image'], ['inserir.link', 'Link', 'link']]]]),
    exibir: g([['Exibição', [['folha.grade', 'Grade', 'grid'], ['exibir.dependencias', 'Dependências', 'tree'], ['exibir.zoom', 'Zoom', 'zoom']]]]),
    saida: g([['Saída', [['app.exportar', 'Exportar', 'export'], ['app.imprimir', 'Imprimir', 'print'], ['folha.promover', 'Promover a caderno', 'file']]]]),
  },
  tex: {
    inicio: g([
      ['Estrutura', [['tex.secao', 'Seção', 'section'], ['tex.equacao', 'Equação', 'sigma'], ['inserir.tabela', 'Tabela', 'table'], ['tex.figura', 'Figura', 'image'], ['tex.referencia', 'Referência', 'link']]],
      ['Resultados', [['tex.inserirResultado', 'Inserir resultado', 'insert'], ['tex.atualizarResultados', 'Atualizar resultados', 'run']]],
      ['Compilar', [['tex.compilar', 'Compilar', 'run'], ['tex.limpar', 'Limpar auxiliares', 'clean']]],
      ['Modelo', [['tex.trocarModelo', 'Trocar modelo', 'file'], ['tex.bibliografia', 'Bibliografia', 'book']]],
    ]),
    inserir: g([['Pacotes', [['tex.pacotes', 'Pacotes', 'lib'], ['tex.comandos', 'Comandos', 'code']]]]),
    exibir: g([['Exibição', [['tex.verCodigo', 'Código', 'code'], ['tex.verPdf', 'PDF', 'eye'], ['exibir.zoom', 'Zoom', 'zoom']]]]),
    saida: g([['Saída', [['tex.exportarPdf', 'Exportar PDF', 'export'], ['tex.exportarTex', 'Exportar .tex', 'export'], ['app.imprimir', 'Imprimir', 'print']]]]),
  },
  lib: {
    inicio: g([
      ['Funções', [['lib.novaFuncao', 'Nova função', 'fn'], ['lib.importar', 'Importar', 'import'], ['app.exportar', 'Exportar', 'export']]],
      ['Testes', [['lib.testar', 'Testar', 'test'], ['lib.verificarUnidades', 'Verificar unidades', 'ruler']]],
      ['Documentar', [['lib.gerarReferencia', 'Gerar referência', 'book'], ['app.gerarSkill', 'Gerar SKILL.md', 'code']]],
    ]),
    inserir: g([['Conteúdo', [['lib.tabelaNorma', 'Tabela de norma', 'table'], ['lib.constante', 'Constante', 'sigma']]]]),
    exibir: g([['Exibição', [['lib.arvore', 'Árvore', 'tree'], ['lib.codigo', 'Código', 'code']]]]),
    saida: g([['Saída', [['lib.publicar', 'Publicar versão', 'export'], ['lib.exportarPacote', 'Exportar pacote', 'export']]]]),
  },
};

// Registra o rótulo de cada botão (o primeiro rótulo visto vence; handlers vêm depois).
const seen = new Set<string>();
for (const tabs of Object.values(RIBBONS))
  for (const groups of Object.values(tabs))
    for (const { buttons } of groups)
      for (const b of buttons) if (!seen.has(b.cmd)) { seen.add(b.cmd); register(b.cmd, { label: b.label }); }
