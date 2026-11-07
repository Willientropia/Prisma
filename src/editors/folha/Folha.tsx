import { Badge, PanelHeader, PropGrid, Row } from '../../components/ui';
import { VARS } from '../../mock';
import { useApp } from '../../store/app';
import { run } from '../../commands/registry';
import s from '../editors.module.css';

// Fase 0: regiões fixas do protótipo. Fase 3 lê posições do .folha.md e usa uPlot.
export function Folha() {
  const open = useApp((x) => x.open);
  const set = useApp((x) => x.set);
  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Variáveis" aside={VARS.length} />
        <div className={s.varsHead}><span>Nome</span><span>Valor</span><span>Unid.</span></div>
        {VARS.map(([n, v, u]) => <div key={n} className={s.varsRow}><span>{n}</span><span>{v}</span><span>{u}</span></div>)}
        <div className={s.gap} />
        <PanelHeader title="Funções nesta folha" />
        <div className={s.list}>
          <Row onClick={() => open('cabos')}>ΔV(L, I, S) <span className={s.muted}>Elétrica</span></Row>
          <Row>ΔV_pct(ΔV, V) <span className={s.muted}>Nativas</span></Row>
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.sheet}>
          <div className={`${s.region} ${s.regionTitle}`} style={{ left: 40, top: 30 }}>String 3: teste de bitola</div>
          <div className={`m ${s.region} ${s.regionStack}`} style={{ left: 40, top: 80 }}>
            <span><span className="v">L</span> ≔ 32 m</span><span><span className="v">I</span> ≔ 11,5 A</span><span><span className="v">V</span><sub>mp</sub> ≔ 400 V</span>
          </div>
          <div className={`m ${s.region} ${s.regionSel}`} style={{ left: 230, top: 76 }}><span className="v">S</span> ≔ 4 mm²</div>
          <div className={`m ${s.region} ${s.regionStack}`} style={{ left: 40, top: 230, fontSize: 21, gap: 14 }}>
            <span><span className="v">ΔV</span>(<span className="v">L</span>, <span className="v">I</span>, <span className="v">S</span>) = 3,29 V</span>
            <span><span className="fr"><span><span className="v">ΔV</span></span><span><span className="v">V</span><sub>mp</sub></span></span> = <b>0,82 %</b>{' '}
              <Badge kind="warn">ATENÇÃO · perto do limite</Badge></span>
          </div>
          <figure className={`${s.region} ${s.plot}`} style={{ left: 420, top: 70 }}>
            <figcaption>ΔV % × seção do cabo</figcaption>
            <svg width="376" height="180" viewBox="0 0 376 180" role="img" aria-label="Queda percentual por seção: 2,5 mm² 1,32 %, 4 mm² 0,82 %, 6 mm² 0,55 %, 10 mm² 0,33 %; limite de 1 %">
              <line x1="36" y1="150" x2="370" y2="150" className={s.axis} /><line x1="36" y1="8" x2="36" y2="150" className={s.axis} />
              <line x1="36" y1="56" x2="370" y2="56" className={s.limit} />
              <text x="366" y="50" textAnchor="end" className={s.limitText}>limite 1 %</text>
              <polyline points="76,26 164,73 252,98 340,119" className={s.series} />
              <circle cx="76" cy="26" r="3.5" className={s.dot} /><circle cx="164" cy="73" r="5" className={s.dotSel} />
              <circle cx="252" cy="98" r="3.5" className={s.dot} /><circle cx="340" cy="119" r="3.5" className={s.dot} />
              {[[76, '2,5'], [164, '4'], [252, '6'], [340, '10 mm²']].map(([x, t]) => <text key={t} x={x} y="167" textAnchor="middle" className={s.tick}>{t}</text>)}
              <text x="30" y="154" textAnchor="end" className={s.tick}>0</text><text x="30" y="60" textAnchor="end" className={s.tick}>1</text>
            </svg>
          </figure>
        </div>
        <div className={s.cmdline}>
          <span>Região "S" atualizada. 2 resultados recalculados.</span>
          <label>Comando:
            <input type="text" placeholder="digite um comando, ex.: inserir ρ_T" aria-label="Comando"
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const v = e.currentTarget.value.trim();
                if (v === 'calcular') run('calc.tudo');
                else set({ status: `Comando "${v}": ainda não disponível nesta versão` });
                e.currentTarget.value = '';
              }} />
          </label>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades da região" />
        <PropGrid rows={[['Região', 'S'], ['Tipo', 'Atribuição'], ['Posição X', '230 px'], ['Posição Y', '76 px'], ['Unidade', 'mm²'], ['Casas decimais', '2'], ['Dependentes', '2 regiões']]} />
      </aside>
    </>
  );
}
