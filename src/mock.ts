// Dados de exemplo da fase 0 (vêm do protótipo). Somem quando o cofre real chegar (fase 1).
import type { DocType } from './constants';

export type DocRef = { id: string; name: string; type: DocType; folder: string; when: string };

export const DOCS: DocRef[] = [
  { id: 'cabos', name: 'cabos-cc.caderno.md', type: 'caderno', folder: 'Sol Tech / Boa Vista', when: 'hoje, 11:40' },
  { id: 'string3', name: 'string-3.folha.md', type: 'folha', folder: 'Sol Tech / Boa Vista', when: 'hoje, 11:12' },
  { id: 'memorial', name: 'memorial.tex', type: 'tex', folder: 'Sol Tech / Boa Vista', when: 'ontem, 18:05' },
  { id: 'eletrica', name: 'eletrica.lib.md', type: 'lib', folder: 'Bibliotecas', when: '04/11/2026' },
];

/** Recentes: [nome, id do documento que abre, tipo, pasta, quando]. */
export const RECENT: DocRef[] = [
  ...DOCS,
  { id: 'cabos', name: 'geracao-mensal.caderno.md', type: 'caderno', folder: 'Sol Tech / Boa Vista', when: '02/11/2026' },
  { id: 'memorial', name: 'relatorio-lab-3.tex', type: 'tex', folder: 'PUC / Controle', when: '28/10/2026' },
];

export const MODELS: { name: string; kind: string; color: string; opens: string }[] = [
  { name: 'Memorial de cálculo FV', kind: 'Documento LaTeX · ABNT', color: 'var(--type-folha)', opens: 'memorial' },
  { name: 'Memorial p/ concessionária', kind: 'Documento LaTeX', color: 'var(--type-caderno)', opens: 'memorial' },
  { name: 'Laudo técnico', kind: 'Documento LaTeX', color: 'var(--type-tex)', opens: 'memorial' },
  { name: 'Relatório IEEE', kind: 'Documento LaTeX · 1 coluna', color: 'var(--type-lib)', opens: 'memorial' },
  { name: 'Dimensionamento FV', kind: 'Caderno', color: 'var(--type-caderno)', opens: 'cabos' },
  { name: 'Verificação rápida', kind: 'Folha livre', color: 'var(--type-folha)', opens: 'string3' },
];

export const CELLS: { id: string; tag: string; label: string; props: [string, string][] }[] = [
  { id: 'h1', tag: 'TIT', label: 'Queda de tensão nos cabos CC', props: [['Tipo', 'Título'], ['Nível', '1']] },
  { id: 't1', tag: 'TXT', label: 'Critério de projeto', props: [['Tipo', 'Texto'], ['Palavras', '24'], ['Exibir no documento', 'Sim']] },
  { id: 'f1', tag: 'FUN', label: 'ΔV(L, I, S)', props: [['Tipo', 'Função'], ['Nome', 'ΔV'], ['Biblioteca', 'Elétrica'], ['Saída', 'V'], ['Usada em', '6 arquivos'], ['Exibir no documento', 'Sim']] },
  { id: 't2', tag: 'TXT', label: 'Justificativa do fator 2', props: [['Tipo', 'Texto'], ['Ligada a', 'ΔV(L, I, S)']] },
  { id: 'c1', tag: 'CAL', label: 'Cálculo do trecho', props: [['Tipo', 'Cálculo'], ['Variáveis', '4'], ['Resultados', '2'], ['Tempo', '0,8 ms']] },
  { id: 'v1', tag: 'VER', label: 'ΔV/Vmp abaixo de 1 %', props: [['Tipo', 'Verificação'], ['Condição', 'ΔV/Vmp < 1 %'], ['Estado', 'Aprovado']] },
  { id: 't3', tag: 'TXT', label: 'Conclusão', props: [['Tipo', 'Texto'], ['Links', 'String 3']] },
];

export type LibFn = { id: string; sig: string; formula: string; params: string; ret: string; note: string; src: string; uses: string; test: string; res: string };

export const FNS: LibFn[] = [
  { id: 'dv', sig: 'ΔV(L, I, S)', formula: 'ΔV = 2 · ρ · L · I / S', params: 'L: comprimento do trecho [m]\nI: corrente [A]\nS: seção do condutor [mm²]', ret: 'V', note: 'Circuito CC de ida e volta, como o trecho string até o inversor. Para cabo exposto ao sol, trocar ρ por ρ_T(T).', src: 'Lei de Ohm', uses: '6 arquivos', test: 'ΔV(25 m, 12 A, 6 mm²)', res: '1,79 V' },
  { id: 'dv3', sig: 'ΔV₃φ(I, L, r, x, φ)', formula: 'ΔV = √3 · I · L · (r · cos φ + x · sen φ)', params: 'I: corrente [A]\nL: comprimento [km]\nr, x: [Ω/km]\nφ: ângulo do fator de potência', ret: 'V', note: 'Saída CA trifásica do inversor até o quadro. A parcela reativa pesa em cabos longos ou de seção grande.', src: 'NBR 5410', uses: '3 arquivos', test: 'ΔV₃φ(40 A, 0,05 km, …)', res: '4,1 V' },
  { id: 'pct', sig: 'ΔV_pct(ΔV, V)', formula: 'ΔV % = 100 · ΔV / V', params: 'ΔV: queda [V]\nV: tensão de referência [V]', ret: '%', note: 'Converte a queda absoluta para comparar com o limite do projeto.', src: 'Definição', uses: '9 arquivos', test: 'ΔV_pct(1,79 V, 400 V)', res: '0,45 %' },
  { id: 'rho', sig: 'ρ_T(T)', formula: 'ρ_T = ρ₂₀ · [1 + α · (T − 20 °C)]', params: 'T: temperatura do condutor [°C]', ret: 'Ω·mm²/m', note: 'Cabos no telhado chegam a 70–90 °C; a 70 °C a resistência sobe cerca de 20 %.', src: 'α = 0,00393 /°C (cobre)', uses: '4 arquivos', test: 'ρ_T(70 °C)', res: '0,0214' },
];

export const VARS: [string, string, string][] = [['L', '32', 'm'], ['I', '11,5', 'A'], ['V_mp', '400', 'V'], ['S', '4', 'mm²'], ['ΔV', '3,29', 'V']];

export const FORMATS: [string, string, string][] = [
  ['pdf', 'PDF', 'Documento final para enviar ou imprimir.'],
  ['tex', 'LaTeX (.tex)', 'Fonte e figuras, para editar em outro editor.'],
  ['docx', 'Word (.docx)', 'Para quem exige arquivo do Word.'],
  ['md', 'Markdown (.md)', 'Notas e documentação em texto.'],
  ['html', 'HTML', 'Página com os cálculos navegáveis.'],
  ['nat', 'Nativo (.caderno.md)', 'Texto puro, legível por você e por IA.'],
  ['sm', 'SMath Studio (.sm)', 'Parcial: cálculos e unidades.'],
  ['ipynb', 'Jupyter (.ipynb)', 'Cálculos convertidos em células Python.'],
  ['csv', 'CSV', 'Somente variáveis e resultados.'],
];

export const STATUS: Record<DocType | 'home', string> = {
  home: 'Pronto',
  caderno: 'Pronto · 7 células · 2 resultados · 1 verificação aprovada',
  folha: 'Pronto · 6 regiões · recalculado em 1,2 ms',
  tex: 'Pronto · última compilação há 3 min',
  lib: 'Pronto · 4 funções · testes aprovados',
};
