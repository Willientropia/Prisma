// Gráfico da folha (bloco grafico) com uPlot. Cores lidas dos tokens (canvas não aceita var()).
import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { PlotResult } from '../../engine/evaluate';
import { fmtNum } from '../../engine/format';
import { prettyUnit } from '../../engine/format';
import s from '../editors.module.css';

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function Plot({ data, width, height }: { data?: PlotResult; width: number; height: number }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !host.current || data.xs.length === 0) return;
    const fmt = (v: number) => fmtNum(v);
    const axis = { stroke: token('--text-muted'), grid: { stroke: token('--border'), width: 1 }, ticks: { stroke: token('--border'), width: 1 }, font: '10px Inter' };
    const series: uPlot.Series[] = [
      {},
      { label: data.titulo, stroke: token('--plot-line'), width: 2, points: { show: true, size: 6, fill: token('--plot-line') } },
    ];
    const cols: (number | null)[][] = [data.xs, data.ys];
    if (data.limite) {
      series.push({ label: data.limite.rotulo, stroke: token('--limit-line'), width: 1.2, dash: [5, 4], points: { show: false } });
      cols.push(data.xs.map(() => data.limite!.valor));
    }
    const plot = new uPlot({
      width, height: height - 34,
      legend: { show: false },
      cursor: { show: false },
      scales: { x: { time: false } },
      axes: [
        { ...axis, splits: () => data.xs, values: (_u, vals) => vals.map((v, i) => (i === vals.length - 1 && data.xUnit ? `${fmt(v)} ${prettyUnit(data.xUnit)}` : fmt(v))) },
        { ...axis, size: 40, values: (_u, vals) => vals.map(fmt) },
      ],
      series,
    }, cols as uPlot.AlignedData, host.current);
    return () => plot.destroy();
  }, [data, width, height]);

  return (
    <figure className={s.plot} style={{ width }} aria-label={data ? `${data.titulo}: ${data.xs.map((x, i) => `${fmtNum(x)}: ${data.ys[i] === null ? 'erro' : fmtNum(data.ys[i]!)}`).join('; ')}` : 'Gráfico'}>
      <figcaption>{data?.titulo ?? 'Gráfico'}{data?.limite && <span className={s.limitLabel}>{data.limite.rotulo}</span>}</figcaption>
      {data?.error && <div className={s.plotError}>{data.error}</div>}
      <div ref={host} />
    </figure>
  );
}
