import { useState } from 'react';
import { Badge, PanelHeader, PropGrid, Row, Tag } from '../../components/ui';
import { CELLS } from '../../mock';
import { useApp } from '../../store/app';
import s from '../editors.module.css';

// Fase 0: página estática do protótipo. Fase 2 troca por blocos reais do .caderno.md.
export function Caderno() {
  const [cell, setCell] = useState('f1');
  const open = useApp((x) => x.open);
  const cur = CELLS.find((c) => c.id === cell) ?? CELLS[2];
  const sel = (id: string) => (cell === id ? s.selectedBlock : undefined);

  return (
    <>
      <aside className={s.left}>
        <PanelHeader title="Estrutura do caderno" />
        <div className={s.list}>
          {CELLS.map((c) => (
            <Row key={c.id} active={c.id === cell} onClick={() => setCell(c.id)}>
              <Tag tone={c.id === cell ? 'selected' : undefined}>{c.tag}</Tag>{c.label}
            </Row>
          ))}
        </div>
        <PanelHeader title="Bibliotecas em uso" />
        <div className={s.list}>
          <Row>Elétrica <span className={s.muted}>v1.4</span></Row>
          <Row>Nativas <span className={s.muted}>v2.0</span></Row>
        </div>
      </aside>

      <main className={s.center}>
        <div className={s.workspace}>
          <article className={s.page}>
            <h1 className={sel('h1')}>Queda de tensão nos cabos CC</h1>
            <p className={sel('t1')}>Verificação da queda entre as strings e o inversor. Critério do projeto: abaixo de 1 % para não perder geração no trecho CC.</p>
            <div className={[s.fnBlock, sel('f1')].join(' ')}>
              <span className={s.fnLabel}>FUNÇÃO · ELÉTRICA</span>
              <div className={`m ${s.fnMath}`}>
                <span className="v">ΔV</span>(<span className="v">L</span>, <span className="v">I</span>, <span className="v">S</span>)
                <span style={{ margin: '0 12px' }}>≔</span>
                <span className="fr"><span>2 · <span className="v">ρ</span> · <span className="v">L</span> · <span className="v">I</span></span><span><span className="v">S</span></span></span>
              </div>
            </div>
            <p className={sel('t2')}>O fator 2 é ida e volta (positivo e negativo). <span className="m v">ρ</span> é a resistividade do cobre a 20 °C.</p>
            <div className={[s.calcBlock, sel('c1'), sel('v1')].join(' ')}>
              <div className={`m ${s.calcInputs}`}>
                <span><span className="v">L</span> ≔ 25 m</span><span><span className="v">I</span> ≔ 12 A</span>
                <span><span className="v">S</span> ≔ 6 mm²</span><span><span className="v">V</span><sub>mp</sub> ≔ 400 V</span>
              </div>
              <div className={`m ${s.calcResults}`}>
                <span><span className="v">ΔV</span>(<span className="v">L</span>, <span className="v">I</span>, <span className="v">S</span>) = <b>1,79 V</b></span>
                <span><span className="fr"><span><span className="v">ΔV</span></span><span><span className="v">V</span><sub>mp</sub></span></span> = <b>0,45 %</b></span>
                <Badge kind="ok">APROVADO · limite 1 %</Badge>
              </div>
            </div>
            <p className={sel('t3')}>Com 6 mm² sobra margem. O teste com 4 mm² na string mais longa está na folha{' '}
              <a href="#string-3" onClick={(e) => { e.preventDefault(); open('string3'); }}>String 3</a>.</p>
          </article>
        </div>
      </main>

      <aside className={s.right}>
        <PanelHeader title="Propriedades" aside={cur.tag} />
        <PropGrid rows={cur.props} />
      </aside>
    </>
  );
}
