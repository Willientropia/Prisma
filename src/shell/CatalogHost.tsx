// Catálogo de funções (Ctrl+E) e de unidades (Ctrl+W), ADENDO 06, 4.9. Saiu do Shell.tsx (300 linhas).
import { useEffect, useState } from 'react';
import { useWorkspace } from '../store/workspace';
import { Catalog } from '../components/Catalog';
import { FUNCTION_CATEGORIES, UNIT_CATEGORIES, libItem, nativeItems, takeCatalogTarget, type CatalogItem } from './catalogo';
import { unitItems } from '../math/assistente';
import { MathMarkup } from '../math/MathField';
import { insertInFocused } from '../math/insert';
import { allFunctions } from '../commands/library';
import { texOf } from './Shell';

const recentCatalog: string[] = []; // "Recentes" do catálogo, na sessão

/** Catálogo de funções (Ctrl+E) e de unidades (Ctrl+W), ADENDO 06, 4.9. A escolha vai para o campo que estava em edição, ou para a cruz da folha. */
export function CatalogHost() {
  const kind = useWorkspace((x) => x.catalog);
  const set = useWorkspace((x) => x.set);
  const [libs, setLibs] = useState<CatalogItem[]>([]);
  useEffect(() => {
    if (kind === 'funcoes') void allFunctions().then((fs) => setLibs(fs.map((f) => libItem(f, (n) => texOf(n), texOf(f.sig)))));
  }, [kind]);
  if (!kind) return null;
  const units = (): CatalogItem[] => unitItems().map((u) => ({ name: u.name, sig: `${u.name}  ${u.title?.replace(/ \(.*$/, '') ?? ''}`, cat: u.title?.match(/\((.*)\)$/)?.[1] ?? '', desc: u.title ?? '', latex: u.insert, formula: u.detail ?? u.nameLatex }));
  const items = kind === 'funcoes' ? [...nativeItems(), ...libs] : units();
  const categories = kind === 'funcoes' ? [...FUNCTION_CATEGORIES, ...new Set(libs.map((l) => l.cat))] : UNIT_CATEGORIES;
  const close = () => { takeCatalogTarget(); set({ catalog: null }); };
  const pick = (it: CatalogItem) => {
    const { field: mf, region, line } = takeCatalogTarget();
    set({ catalog: null });
    const key = it.cat + it.name;
    recentCatalog.splice(0, recentCatalog.length, key, ...recentCatalog.filter((k) => k !== key).slice(0, 19));
    setTimeout(() => { // depois de o diálogo fechar: antes, o fechamento devolveria o foco ao body
      if (mf?.isConnected) { mf.focus(); if (insertInFocused(it.latex)) return; }
      window.dispatchEvent(new CustomEvent('prisma:inserir', { detail: region ? { latex: it.latex, region, line } : it.latex })); // folha: reabre a linha ou cria na cruz
    }, 0);
  };
  return <Catalog title={kind === 'funcoes' ? 'Catálogo de funções' : 'Catálogo de unidades'} categories={categories} items={items} recent={recentCatalog}
    math={(latex) => <MathMarkup latex={latex} theme="dark" />} onPick={pick} onClose={close} />;
}
