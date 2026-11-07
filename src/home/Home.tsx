import { useEffect } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { Row, Tag, Wordmark } from '../components/ui';
import { APP_NAME, TIPO_INFO, TYPE_INFO, type DocType } from '../constants';
import { MODELS } from '../mock';
import { OPEN_FILTERS, useWorkspace } from '../store/workspace';
import { platform } from '../platform';
import { run } from '../commands/registry';
import { basename, dirname, displayPath, fmtWhen, shortenPath } from '../format/display';
import { ProjectTree } from '../shell/ProjectPanel';
import type { RecentItem } from '../platform';
import s from './home.module.css';

const NEW: { type: DocType; name: string; desc: string; icon: IconName }[] = [
  { type: 'caderno', name: 'Caderno', desc: 'Texto, funções e cálculos com a justificativa de cada passo.', icon: 'file' },
  { type: 'folha', name: 'Folha livre', desc: 'Regiões soltas na página, usando as funções salvas.', icon: 'grid' },
  { type: 'tex', name: 'Documento LaTeX', desc: 'Editor e compilador, com resultados inseridos manualmente.', icon: 'code' },
  { type: 'lib', name: 'Biblioteca', desc: 'Conjunto de funções documentadas e testadas.', icon: 'lib' },
];

export function Home() {
  const ws = useWorkspace();
  const { recents, recovered, project, paths } = ws;
  // relê os recentes ao mostrar a tela inicial: arquivo apagado fora do app aparece como "não encontrado"
  useEffect(() => { void platform.recent().then((r) => useWorkspace.setState({ recents: r })).catch(() => {}); }, []);

  const openRecent = async (r: RecentItem) => {
    if (r.modified !== null) return void ws.openPaths([r.path]);
    const a = await ws.ask({
      title: APP_NAME, message: `${basename(r.path)} não foi encontrado em ${displayPath(dirname(r.path))}.`,
      buttons: [{ id: 'remove', label: 'Remover da lista', primary: true }, { id: 'cancel', label: 'Cancelar' }],
    });
    if (a.id === 'remove') await ws.removeRecent(r.path);
  };

  return (
    <div className={s.home}>
      <nav aria-label="Início" className={s.nav}>
        <div className={s.brand}><Wordmark size={28} fontSize={18} /></div>
        <Row height={34} active>Início</Row>
        <Row height={34} onClick={() => run('app.abrir')}>Abrir</Row>
        <Row height={34} onClick={() => run('home.modelos')}>Modelos</Row>
        <Row height={34} onClick={() => void platform.openDialog(OPEN_FILTERS.filter((f) => f.extensions[0] === 'prsl'), true, paths?.libraries).then(ws.openPaths)}>Bibliotecas</Row>
        <Row height={34} onClick={() => run('app.gerarSkill')}>Formato e skills</Row>
        <div className={s.grow} />
        <Row height={34} onClick={() => run('app.configuracoes')}>Configurações</Row>
      </nav>
      <main className={s.main}>
        <section aria-label="Novo" className={s.section}>
          <h2 className={s.h2}>Novo</h2>
          <div className={s.cards}>
            {NEW.map((n) => (
              <button key={n.type} type="button" className={s.card} onClick={() => ws.newDoc(n.type)}>
                <span className={s.cardIcon} style={{ background: TYPE_INFO[n.type].color }}><Icon name={n.icon} size={22} stroke={1.7} /></span>
                <span className={s.cardName}>{n.name}</span>
                <span className={s.cardDesc}>{n.desc}</span>
              </button>
            ))}
            <button type="button" className={s.card} onClick={() => void ws.newProject()}>
              <span className={s.cardIcon} style={{ background: 'var(--type-inicio)' }}><Icon name="tree" size={22} stroke={1.7} /></span>
              <span className={s.cardName}>Projeto</span>
              <span className={s.cardDesc}>Agrupa arquivos que se referenciam, como um memorial e seus cálculos.</span>
            </button>
          </div>
          <div className={s.actions}>
            <button type="button" className={s.secondary} onClick={() => run('app.abrir')}><Icon name="open" size={16} stroke={1.7} />Abrir...<span className={s.key}>Ctrl+O</span></button>
            <button type="button" className={s.secondary} onClick={() => run('app.abrirProjeto')}><Icon name="tree" size={16} stroke={1.7} />Abrir projeto...</button>
          </div>
        </section>

        {recovered.length > 0 && (
          <section aria-label="Arquivos recuperados" className={s.section}>
            <h2 className={s.h2}>Arquivos recuperados</h2>
            <div className={s.table}>
              {recovered.map((r) => (
                <div key={r.name} className={s.recRow}>
                  <span className={s.tname}>{r.name.replace(/^\d+-/, '')}</span>
                  <span className={s.dim}>{fmtWhen(r.modified)}</span>
                  <button type="button" className={s.secondary} onClick={() => void ws.openRecovered(r.name)}>Abrir</button>
                  <button type="button" className={s.secondary} onClick={() => void ws.discardRecovered(r.name)}>Descartar</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {project && (
          <section aria-label="Projeto" className={s.section}>
            <div className={s.sectionHead}>
              <h2 className={s.h2}>Projeto: {project.nome}</h2>
              <button type="button" className={s.linkBtn} onClick={ws.closeProject}>Fechar projeto</button>
            </div>
            <div className={s.projectBox} title={displayPath(project.path)}><ProjectTree /></div>
          </section>
        )}

        <section aria-label="Recentes" className={s.section}>
          <div className={s.sectionHead}><h2 className={s.h2}>Recentes</h2>{recents.length > 0 && <span className={s.hint}>Clique para abrir</span>}</div>
          {recents.length === 0 ? <div className={s.empty}>Nenhum arquivo aberto ainda.</div> : (
            <div className={s.table}>
              <div className={s.thead}><span>Nome</span><span>Tipo</span><span>Pasta</span><span>Modificado</span></div>
              {recents.map((r) => {
                const info = TIPO_INFO[r.tipo];
                const missing = r.modified === null;
                return (
                  <button key={r.path} type="button" className={missing ? `${s.trow} ${s.missing}` : s.trow} onClick={() => void openRecent(r)}>
                    <span className={s.tname}>{info && <Tag color={missing ? undefined : info.color}>{info.tag}</Tag>}{basename(r.path)}</span>
                    <span>{info?.label ?? r.tipo}</span>
                    <span title={displayPath(dirname(r.path))}>{shortenPath(dirname(r.path))}</span>
                    <span>{missing ? 'não encontrado' : fmtWhen(r.modified)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Modelos" className={s.section}>
          <h2 className={s.h2}>Modelos</h2>
          <div className={s.models}>
            {MODELS.map((m) => (
              <button key={m.name} type="button" className={s.model} onClick={() => run('home.modelos')}>
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
