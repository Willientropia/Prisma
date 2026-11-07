import { Icon, type IconName } from '../components/Icon';
import { Row, Tag, Wordmark } from '../components/ui';
import { TYPE_INFO, type DocType } from '../constants';
import { MODELS, RECENT } from '../mock';
import { useApp } from '../store/app';
import { run } from '../commands/registry';
import s from './home.module.css';

const NEW: { type: DocType; name: string; desc: string; icon: IconName; opens: string }[] = [
  { type: 'caderno', name: 'Caderno', desc: 'Texto, funções e cálculos com a justificativa de cada passo.', icon: 'file', opens: 'cabos' },
  { type: 'folha', name: 'Folha livre', desc: 'Regiões soltas na página, usando as funções salvas.', icon: 'grid', opens: 'string3' },
  { type: 'tex', name: 'Documento LaTeX', desc: 'Editor e compilador, com resultados inseridos manualmente.', icon: 'code', opens: 'memorial' },
  { type: 'lib', name: 'Biblioteca', desc: 'Conjunto de funções documentadas e testadas.', icon: 'lib', opens: 'eletrica' },
];

export function Home() {
  const open = useApp((x) => x.open);
  return (
    <div className={s.home}>
      <nav aria-label="Início" className={s.nav}>
        <div className={s.brand}><Wordmark size={28} fontSize={18} /></div>
        <Row height={34} active>Início</Row>
        <Row height={34} onClick={() => run('app.abrir')}>Abrir</Row>
        <Row height={34} onClick={() => run('home.modelos')}>Modelos</Row>
        <Row height={34} onClick={() => open('eletrica')}>Bibliotecas</Row>
        <Row height={34} onClick={() => run('app.gerarSkill')}>Formato e skills</Row>
        <div className={s.grow} />
        <Row height={34} onClick={() => run('app.configuracoes')}>Configurações</Row>
      </nav>
      <main className={s.main}>
        <section aria-label="Novo" className={s.section}>
          <h2 className={s.h2}>Novo</h2>
          <div className={s.cards}>
            {NEW.map((n) => (
              <button key={n.type} type="button" className={s.card} onClick={() => open(n.opens)}>
                <span className={s.cardIcon} style={{ background: TYPE_INFO[n.type].color }}><Icon name={n.icon} size={22} stroke={1.7} /></span>
                <span className={s.cardName}>{n.name}</span>
                <span className={s.cardDesc}>{n.desc}</span>
              </button>
            ))}
          </div>
        </section>
        <section aria-label="Recentes" className={s.section}>
          <div className={s.sectionHead}><h2 className={s.h2}>Recentes</h2><span className={s.hint}>Clique para abrir</span></div>
          <div className={s.table}>
            <div className={s.thead}><span>Nome</span><span>Tipo</span><span>Pasta</span><span>Modificado</span></div>
            {RECENT.map((r) => (
              <button key={r.name} type="button" className={s.trow} onClick={() => open(r.id)}>
                <span className={s.tname}><Tag color={TYPE_INFO[r.type].color}>{TYPE_INFO[r.type].tag}</Tag>{r.name}</span>
                <span>{TYPE_INFO[r.type].label}</span><span>{r.folder}</span><span>{r.when}</span>
              </button>
            ))}
          </div>
        </section>
        <section aria-label="Modelos" className={s.section}>
          <h2 className={s.h2}>Modelos</h2>
          <div className={s.models}>
            {MODELS.map((m) => (
              <button key={m.name} type="button" className={s.model} onClick={() => open(m.opens)}>
                <span className={s.thumbWrap}>
                  <span className={s.thumb}><span className={s.thumbBand} style={{ background: m.color }} /><span className={s.thumbTitle} /><span className={s.thumbLines} /></span>
                </span>
                <span className={s.modelText}><span className={s.modelName}>{m.name}</span><span className={s.modelKind}>{m.kind}</span></span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
