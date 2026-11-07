import { Icon, type IconName } from '../components/Icon';
import { Row, Tag, Wordmark } from '../components/ui';
import { TYPE_INFO, type DocType } from '../constants';
import { MODELS } from '../mock';
import { useApp } from '../store/app';
import { run } from '../commands/registry';
import { docType } from '../format/views';
import { basename, dirname, fmtWhen, vaultName } from '../format/display';
import type { Entry } from '../vault';
import s from './home.module.css';

const NEW: { type: DocType; name: string; desc: string; icon: IconName }[] = [
  { type: 'caderno', name: 'Caderno', desc: 'Texto, funções e cálculos com a justificativa de cada passo.', icon: 'file' },
  { type: 'folha', name: 'Folha livre', desc: 'Regiões soltas na página, usando as funções salvas.', icon: 'grid' },
  { type: 'tex', name: 'Documento LaTeX', desc: 'Editor e compilador, com resultados inseridos manualmente.', icon: 'code' },
  { type: 'lib', name: 'Biblioteca', desc: 'Conjunto de funções documentadas e testadas.', icon: 'lib' },
];

export function Home() {
  const { vaultRoot, files, recents, openVault, openFile, newDoc } = useApp();
  const firstLib = files.find((f) => docType(f.path) === 'lib');

  return (
    <div className={s.home}>
      <nav aria-label="Início" className={s.nav}>
        <div className={s.brand}><Wordmark size={28} fontSize={18} /></div>
        <Row height={34} active>Início</Row>
        <Row height={34} onClick={() => void openVault()}>Abrir</Row>
        <Row height={34} onClick={() => run('home.modelos')}>Modelos</Row>
        <Row height={34} onClick={() => (firstLib ? void openFile(firstLib.path) : run('lib.novaFuncao'))}>Bibliotecas</Row>
        <Row height={34} onClick={() => run('app.gerarSkill')}>Formato e skills</Row>
        <div className={s.grow} />
        <Row height={34} onClick={() => run('app.configuracoes')}>Configurações</Row>
      </nav>
      <main className={s.main}>
        <section aria-label="Novo" className={s.section}>
          <h2 className={s.h2}>Novo</h2>
          <div className={s.cards}>
            {NEW.map((n) => (
              <button key={n.type} type="button" className={s.card} onClick={() => void newDoc(n.type)}>
                <span className={s.cardIcon} style={{ background: TYPE_INFO[n.type].color }}><Icon name={n.icon} size={22} stroke={1.7} /></span>
                <span className={s.cardName}>{n.name}</span>
                <span className={s.cardDesc}>{n.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Recentes" className={s.section}>
          <div className={s.sectionHead}><h2 className={s.h2}>Recentes</h2>{recents.length > 0 && <span className={s.hint}>Clique para abrir</span>}</div>
          {recents.length === 0 ? <div className={s.empty}>Nenhum arquivo aberto ainda.</div> : (
            <div className={s.table}>
              <div className={s.thead}><span>Nome</span><span>Tipo</span><span>Pasta</span><span>Modificado</span></div>
              {recents.map((r) => {
                const t = docType(r.path);
                const folder = [vaultName(r.vault), ...dirname(r.path).split('/')].filter(Boolean).join(' / ');
                return (
                  <button key={r.vault + r.path} type="button" className={s.trow} title={`${r.vault} / ${r.path}`} onClick={() => void openFile(r.path, r.vault)}>
                    <span className={s.tname}>{t && <Tag color={TYPE_INFO[t].color}>{TYPE_INFO[t].tag}</Tag>}{basename(r.path)}</span>
                    <span>{t ? TYPE_INFO[t].label : ''}</span><span>{folder}</span><span>{r.modified === null ? 'não encontrado' : fmtWhen(r.modified)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section aria-label="Cofre" className={s.section}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>{vaultRoot ? `Cofre: ${vaultName(vaultRoot)}` : 'Cofre'}</h2>
            {vaultRoot && <button type="button" className={s.linkBtn} onClick={() => void openVault()}>Trocar cofre</button>}
          </div>
          {vaultRoot ? <Tree files={files} onOpen={(p) => void openFile(p)} /> : (
            <div className={s.empty}>
              Os arquivos ficam numa pasta comum, em texto puro.
              <button type="button" className={s.primary} onClick={() => void openVault()}><Icon name="open" size={16} stroke={1.7} />Abrir pasta como cofre</button>
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

/** Árvore do cofre: pastas como cabeçalhos recuados, arquivos do Prisma clicáveis. */
function Tree({ files, onOpen }: { files: Entry[]; onOpen: (path: string) => void }) {
  if (files.length === 0) return <div className={s.empty}>Pasta vazia. Crie um arquivo em Novo.</div>;
  const rows: JSX.Element[] = [];
  let prev: string[] = [];
  const key = (p: string) => `${dirname(p)}/\u0000${basename(p)}`.toLowerCase(); // arquivos antes das subpastas
  for (const f of [...files].sort((a, b) => (key(a.path) < key(b.path) ? -1 : 1))) {
    const parts = f.path.split('/');
    const dirs = parts.slice(0, -1);
    let same = 0;
    while (same < dirs.length && dirs[same] === prev[same]) same++;
    for (let d = same; d < dirs.length; d++)
      rows.push(<div key={dirs.slice(0, d + 1).join('/') + '/'} className={s.treeDir} style={{ paddingLeft: 14 + d * 18 }}><Icon name="open" size={14} stroke={1.7} />{dirs[d]}</div>);
    prev = dirs;
    const t = docType(f.path);
    const pad = { paddingLeft: 14 + dirs.length * 18 };
    rows.push(t ? (
      <button key={f.path} type="button" className={s.treeFile} style={pad} onClick={() => onOpen(f.path)}>
        <Tag color={TYPE_INFO[t].color}>{TYPE_INFO[t].tag}</Tag>{parts[parts.length - 1]}<span className={s.treeWhen}>{fmtWhen(f.modified)}</span>
      </button>
    ) : (
      <div key={f.path} className={s.treeOther} style={pad}>{parts[parts.length - 1]}</div>
    ));
  }
  return <div className={s.tree}>{rows}</div>;
}
