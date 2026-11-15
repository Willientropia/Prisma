// Painéis da janela (pedido do usuário, 14/11): largura dos painéis laterais e o que fica escondido, gravados no config.yaml.
// A tela lê tudo de variáveis de CSS e atributos na raiz do documento, então os editores não precisam saber disso.
import { saveConfig } from './config';
import { useWorkspace } from '../store/workspace';
import { Splitter } from '../components/Splitter';

export type Painel = 'esquerdo' | 'direito' | 'comando' | 'faixa';
export type Paineis = { esquerdo: number; direito: number; ocultos: Painel[]; foco: boolean };
const DEFAULT = { esquerdo: 250, direito: 275 } as const;
const LIMITS = { min: 160, max: 560 };

export function paineisOf(config: Record<string, unknown>): Paineis {
  const p = (config.paineis ?? {}) as Partial<Record<keyof Paineis, unknown>>;
  const w = (v: unknown, d: number) => (typeof v === 'number' && v >= LIMITS.min && v <= LIMITS.max ? v : d);
  const ocultos = Array.isArray(p.ocultos) ? (p.ocultos.filter((x) => ['esquerdo', 'direito', 'comando', 'faixa'].includes(x as string)) as Painel[]) : [];
  return { esquerdo: w(p.esquerdo, DEFAULT.esquerdo), direito: w(p.direito, DEFAULT.direito), ocultos, foco: p.foco === true };
}

const setWidth = (side: 'esquerdo' | 'direito', w: number) => document.documentElement.style.setProperty(`--panel-${side === 'esquerdo' ? 'left' : 'right'}`, `${w}px`);

/** Aplica na raiz: larguras e data-sem-esquerdo, data-sem-direito, data-sem-comando, data-sem-faixa, data-foco. */
export function applyPaineis(p: Paineis): void {
  const root = document.documentElement;
  setWidth('esquerdo', p.esquerdo);
  setWidth('direito', p.direito);
  for (const k of ['esquerdo', 'direito', 'comando', 'faixa'] as const) root.toggleAttribute(`data-sem-${k}`, p.ocultos.includes(k));
  root.toggleAttribute('data-foco', p.foco);
}

// Gravações em fila: cada uma lê o config já gravado pela anterior (duas seguidas não perdem chave) e parte do último valor aplicado
let last: Paineis | null = null;
let queue: Promise<void> = Promise.resolve();
const save = (patch: Partial<Paineis>): Promise<void> => {
  const next = { ...(last ?? paineisOf(useWorkspace.getState().config)), ...patch };
  last = next;
  applyPaineis(next); // na hora, sem esperar o arquivo
  queue = queue.then(() => saveConfig({ paineis: next })).catch((e: unknown) => {
    last = null;
    useWorkspace.getState().set({ status: `Não foi possível salvar as configurações: ${e instanceof Error ? e.message : String(e)}` });
  });
  return queue;
};

/** Mostra ou esconde um painel; no modo foco, mostrar um painel sai do modo foco. */
export function togglePainel(k: Painel): Promise<void> {
  const cur = last ?? paineisOf(useWorkspace.getState().config);
  if (cur.foco) return save({ foco: false, ocultos: cur.ocultos.filter((x) => x !== k) });
  return save({ ocultos: cur.ocultos.includes(k) ? cur.ocultos.filter((x) => x !== k) : [...cur.ocultos, k] });
}
const now = () => last ?? paineisOf(useWorkspace.getState().config);
export const toggleFoco = () => save({ foco: !now().foco });
export const isFoco = () => now().foco;
export const isOculto = (k: Painel) => now().ocultos.includes(k);
/** A faixa recolhida volta ao clicar numa guia (como no Office). */
export const showFaixa = () => (isOculto('faixa') ? togglePainel('faixa') : undefined);

/** Divisória de um painel lateral, ligada ao config. */
export function PanelSplitter({ side }: { side: 'esquerdo' | 'direito' }) {
  const width = useWorkspace((x) => paineisOf(x.config)[side]);
  return (
    <Splitter side={side === 'esquerdo' ? 'left' : 'right'} width={width} min={LIMITS.min} max={LIMITS.max} label={`Largura do painel ${side}`}
      onMove={(w) => setWidth(side, w)} onCommit={(w) => void save({ [side]: w })} onReset={() => void save({ [side]: DEFAULT[side] })} />
  );
}
