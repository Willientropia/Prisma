// Operações de texto sobre os blocos da folha: posição na linha de abertura e copiar, recortar e colar regiões
// (F14, docs/FOLHA-CHECKLIST.md C1 a C3). O que vai para a área de transferência são os blocos como estão no
// arquivo, então colar numa folha, em outra folha aberta ou num editor de texto dá o mesmo texto.
import { lines, normalizeForSave, parse, type BlockSegment } from '../../format/doc';

/** Troca (ou acrescenta) x= e y= na linha de abertura do bloco. */
export function withPos(fenceLine: string, x: number, y: number): string {
  const nl = /\r?\n$/.exec(fenceLine)?.[0] ?? '';
  const head = fenceLine.slice(0, fenceLine.length - nl.length);
  const m = /\{([^}]*)\}/.exec(head);
  if (!m) return `${head} {x=${x} y=${y}}${nl}`;
  let inner = m[1];
  inner = /\bx=\S+/.test(inner) ? inner.replace(/\bx=\S+/, `x=${x}`) : `${inner} x=${x}`;
  inner = /\by=\S+/.test(inner) ? inner.replace(/\by=\S+/, `y=${y}`) : `${inner} y=${y}`;
  return head.replace(m[0], `{${inner.trim()}}`) + nl;
}

/** Linhas de área (E6) não são regiões: copiar e colar levam só as regiões. */
const NOT_REGION = new Set(['area', 'fim-area']);
const coord = (b: BlockSegment, k: 'x' | 'y') => Number(b.attrs[k] ?? 0) || 0;
const ending = (raw: string) => raw.replace(/\n*$/, '\n');

/** Texto copiado: os blocos na ordem dada, separados por uma linha em branco. */
export function clipText(raws: string[]): string {
  return raws.map(ending).join('\n');
}

/** Regiões contidas num texto colado; vazio quando o texto não tem nenhum bloco de região. */
export function clipBlocks(text: string): BlockSegment[] {
  return parse(normalizeForSave(text)).segments.filter((s): s is BlockSegment => s.kind === 'block' && !NOT_REGION.has(s.type));
}

/** Primeiro `<prefixo>-N` livre, contando a partir de 1, como as regiões novas da folha. */
function freeId(prefix: string, taken: Set<string>): string {
  let n = 1;
  while (taken.has(`${prefix}-${n}`)) n++;
  return `${prefix}-${n}`;
}

/**
 * Blocos prontos para acrescentar ao arquivo: cada um com id novo (nenhum repete `used` nem outro colado) e o
 * grupo deslocado para o seu canto superior esquerdo ficar em `at`, mantendo as distâncias entre as regiões.
 * Os outros atributos (moldura, desativado, casas, descrição, tamanho) e o corpo ficam como estavam.
 */
export function placeBlocks(bs: BlockSegment[], used: Set<string>, at: { x: number; y: number }): { text: string; ids: string[] } {
  const x0 = Math.min(...bs.map((b) => coord(b, 'x')));
  const y0 = Math.min(...bs.map((b) => coord(b, 'y')));
  const taken = new Set(used);
  const ids: string[] = [];
  const out = bs.map((b) => {
    const [first, ...rest] = lines(b.raw);
    // recortar e colar mantém o id (outro documento pode citá-lo); copiar e colar ganha um novo
    const id = b.id && !taken.has(b.id) ? b.id : freeId(b.id?.replace(/-\d+$/, '') || b.type || 'calc', taken);
    taken.add(id);
    ids.push(id);
    let head = withPos(first, at.x + coord(b, 'x') - x0, at.y + coord(b, 'y') - y0);
    head = b.id ? head.replace(/(\{[^}]*?)#[^\s}]+/, `$1#${id}`) : head.replace('{', `{#${id} `);
    return ending([head, ...rest].join(''));
  });
  return { text: out.join('\n'), ids };
}
