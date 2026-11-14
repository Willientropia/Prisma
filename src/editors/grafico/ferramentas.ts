// Guia contextual "Ferramentas de gráfico" (ADENDO 06, 4.6): comandos do gráfico selecionado na folha ou no caderno.
import { useEffect, useRef, useState } from 'react';
import { parse as parseYaml } from 'yaml';
import { register } from '../../commands/registry';
import { useWorkspace } from '../../store/workspace';
import { setAxis, setFlag, setView, type AxisEdit } from '../../format/grafico';
import type { GraphTool } from './Grafico2D';

export type GraphTarget = { body: string; write: (body: string) => void } | null;
const FLAGS = { grade: true, pontos: false, linhas: true, legenda: false } as const;
const CMDS = ['grafico.mover', 'grafico.zoom', 'grafico.restaurar', 'grafico.eixos', ...Object.keys(FLAGS).map((k) => `grafico.${k}`)];
const yamlOf = (body: string): Record<string, unknown> => { try { return (parseYaml(body) ?? {}) as Record<string, unknown>; } catch { return {}; } };

/** Limites e rótulos: um pedido por eixo, "mínimo; máximo; rótulo" (vazio: automático). */
async function axes(body: string, write: (b: string) => void) {
  const st = useWorkspace.getState();
  const cur = yamlOf(body);
  let next = body;
  for (const k of ['x', 'y'] as const) {
    const a = (cur[k] ?? {}) as { min?: unknown; max?: unknown; rotulo?: unknown };
    const q = await st.ask({
      title: 'Limites e rótulos', message: `Eixo ${k}: mínimo; máximo; rótulo (mínimo e máximo vazios: vista automática)`,
      input: [a.min, a.max, a.rotulo].map((v) => (v == null ? '' : String(v).replace('.', ','))).join('; '),
      buttons: [{ id: 'ok', label: 'OK', primary: true }, { id: 'cancel', label: 'Cancelar' }],
    });
    if (q.id !== 'ok') return;
    const [mn = '', mx = '', rot = ''] = q.value.split(';').map((x) => x.trim());
    const n = (x: string) => (x === '' ? undefined : Number(x.replace(',', '.')));
    const e: AxisEdit = { min: n(mn), max: n(mx), rotulo: rot || undefined };
    const bad = (e.min === undefined) !== (e.max === undefined) || [e.min, e.max].some((v) => v !== undefined && !Number.isFinite(v)) || (e.min !== undefined && e.max! <= e.min);
    if (bad) { st.set({ status: `Limites do eixo ${k} inválidos: o máximo precisa ser maior que o mínimo` }); return; }
    next = setAxis(next, k, e);
  }
  write(next);
}

/** Liga a guia contextual enquanto há um gráfico selecionado; devolve a ferramenta da guia (Mover, Zoom). */
export function useGraphTools(target: GraphTarget): GraphTool {
  const [tool, setTool] = useState<GraphTool>(null);
  const t = useRef(target);
  t.current = target;
  const on = !!target;
  useEffect(() => {
    useWorkspace.getState().set({ graficoSel: on });
    if (!on) { setTool(null); return; }
    const body = () => t.current?.body ?? '';
    const write = (b: string) => t.current?.write(b);
    register('grafico.mover', { run: () => setTool((x) => (x === 'mover' ? null : 'mover')) });
    register('grafico.zoom', { run: () => setTool((x) => (x === 'zoom' ? null : 'zoom')) });
    register('grafico.restaurar', { run: () => write(setView(body(), null)) });
    register('grafico.eixos', { run: () => void axes(body(), write) });
    for (const [k, d] of Object.entries(FLAGS) as [keyof typeof FLAGS, boolean][]) {
      register(`grafico.${k}`, { run: () => { const v = yamlOf(body())[k]; write(setFlag(body(), k, !(typeof v === 'boolean' ? v : d))); } });
    }
    return () => { for (const c of CMDS) register(c, { run: undefined }); useWorkspace.getState().set({ graficoSel: false }); };
  }, [on]);
  return tool;
}
