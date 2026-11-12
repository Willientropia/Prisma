// Diálogo de formato do resultado (F-CONFIG): arredondamento, casas, zeros, notação e limite exponencial.
// Só props: quem decide onde o formato é gravado (config, cabeçalho ou região) é o container em src/shell.
import { useState } from 'react';
import type { FormatOpts } from '../engine/format';
import s from './FormatDialog.module.css';

type Props = {
  title: string;
  note: string;
  value: FormatOpts;
  /** Limite para trocar para exponencial: não se aplica a uma região. */
  showThreshold: boolean;
  extra?: { label: string; run: () => void };
  onSave: (v: FormatOpts) => void;
  onCancel: () => void;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export function FormatDialog({ title, note, value, showThreshold, extra, onSave, onCancel }: Props) {
  const [v, setV] = useState<FormatOpts>({ ...value, mode: value.mode ?? 'decimais', notation: value.notation ?? 'automatica', expThreshold: value.expThreshold ?? 5 });
  const sig = v.mode === 'significativos';
  const num = (n: string, lo: number, hi: number) => (n === '' ? lo : clamp(Number(n), lo, hi));
  const save = () => onSave({ ...v, decimals: clamp(v.decimals, sig ? 1 : 0, 15) });
  return (
    <div className={s.overlay} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel(); } }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={s.dialog}>
        <div className={s.head}><span>{title}</span></div>
        <div className={s.body}>
          <p>{note}</p>
          <label className={s.field}>Arredondamento
            <select className={s.control} aria-label="Arredondamento" autoFocus value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value as FormatOpts['mode'], decimals: clamp(v.decimals, e.target.value === 'significativos' ? 1 : 0, 15) })}>
              <option value="decimais">Casas decimais</option>
              <option value="significativos">Algarismos significativos</option>
            </select>
          </label>
          <label className={s.field}>{sig ? 'Algarismos' : 'Casas decimais'}
            <input className={s.control} type="number" min={sig ? 1 : 0} max={15} value={v.decimals} onChange={(e) => setV({ ...v, decimals: num(e.target.value, sig ? 1 : 0, 15) })}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
          </label>
          <label className={s.field}>Mostrar zeros à direita
            <input type="checkbox" checked={!!v.trailingZeros} onChange={(e) => setV({ ...v, trailingZeros: e.target.checked })} />
          </label>
          <label className={s.field}>Notação
            <select className={s.control} aria-label="Notação" value={v.notation} onChange={(e) => setV({ ...v, notation: e.target.value as FormatOpts['notation'] })}>
              <option value="automatica">Automática</option>
              <option value="cientifica">Científica</option>
              <option value="engenharia">Engenharia</option>
            </select>
          </label>
          {showThreshold && (
            <label className={s.field}>Limite para exponencial (expoente)
              <input className={s.control} type="number" min={1} max={15} value={v.expThreshold} disabled={v.notation !== 'automatica'}
                onChange={(e) => setV({ ...v, expThreshold: num(e.target.value, 1, 15) })} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
            </label>
          )}
        </div>
        <div className={s.foot}>
          {extra && <button type="button" className={`${s.btn} ${s.spacer}`} onClick={extra.run}>{extra.label}</button>}
          <button type="button" className={s.btn} onClick={onCancel}>Cancelar</button>
          <button type="button" className={s.btnPrimary} onClick={save}>OK</button>
        </div>
      </div>
    </div>
  );
}
