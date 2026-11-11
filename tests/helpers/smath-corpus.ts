// Corpus SMath (ADENDO 05, E8.2): importa um .sm, calcula no motor do Prisma e compara cada resultado
// com o que o SMath guardou, no número exibido (mesmas casas, modo e conversão do arquivo).
import { evaluate, type LineResult } from '../../src/engine/evaluate';
import { fmtComplex, fmtNum, type FormatOpts } from '../../src/engine/format';
import { math } from '../../src/engine/math';
import { toMath, toMathVars } from '../../src/engine/syntax';
const isUnitName = (n: string) => { try { return math.Unit.isValuelessUnit(n); } catch { return false; } };
import { blockKey, prepare } from '../../src/engine/prepare';
import { importSm, type SmImport } from '../../src/format/smath';
import { byPosition } from '../../src/format/views';
import type { BlockSegment } from '../../src/format/doc';

/** plugin: não comparável (depende de plugin, de número aleatório ou de nome que não está no arquivo); why diz qual. */
export type Compared = { id: string; expr: string; smath: string; prisma: string; ok: boolean; plugin: boolean; why?: string; fixed?: boolean };

/**
 * Resultados que o SMath guardou errado, com o motivo e o esperado corrigido (fixed): ficam como não comparáveis
 * no relatório, mas são comparados com o esperado corrigido e precisam bater.
 */
const FFT_I = 'No SMath, o i da saída do fft foi trocado pela variável i = 8 do laço for (colisão de nomes do SMath). O Prisma mantém o i imaginário.';
const KNOWN: Record<string, Record<string, string>> = {
  'Teste_Pot_ncia_Com_Harm_nica.sm': {
    r72: 'mat(8, 3 + i, -6, 3 - i, 4, 1)',
    r73: 'mat(sys(8, 0, 2, 1), sys(3.1623, 0.3218, 2, 1), sys(6, 3.1416, 2, 1), sys(3.1623, -0.3218, 2, 1), 4, 1)',
    r74: 'mat(sys(458.3662, 0, 2, 1), sys(181.1852, 18.4349, 2, 1), sys(343.7747, 180, 2, 1), sys(181.1852, -18.4349, 2, 1), 4, 1)',
  },
};
export type CorpusFile = { file: string; imported: SmImport; compared: Compared[] };

type Cx = { re: number; im: number };
const isUnit = (v: unknown): v is InstanceType<typeof math.Unit> => math.isUnit(v);
const show = (v: unknown, fmt: FormatOpts): string => {
  // vetor e matriz: cada elemento com o formato do arquivo
  if (math.isMatrix(v) || Array.isArray(v)) return `[${((math.isMatrix(v) ? v.toArray() : v) as unknown[]).map((x) => show(x, fmt)).join("; ")}]`;
  if (math.isComplex(v)) return fmtComplex((v as Cx).re, (v as Cx).im, fmt);
  if (typeof v === 'number') return fmtNum(v, fmt);
  return String(v);
};

/** Valor do Prisma e do SMath na mesma escala: a conversão pedida, senão a unidade que o SMath mostrou. */
function align(ours: unknown, expected: unknown, conv: string | undefined): [unknown, unknown] {
  let o = ours, e = expected;
  if (conv === '%') return [isUnit(o) ? o.toNumber('') * 100 : math.multiply(o as number, 100), isUnit(e) ? e.toNumber('') * 100 : e];
  if (conv) {
    const c = math.evaluate(toMath(conv));
    if (isUnit(c) && (c as unknown as { value: unknown }).value === null) {
      const units = c.formatUnits();
      if (!isUnit(o) && c.equalBase(math.unit('rad'))) o = math.unit(o as number, 'rad');
      return [isUnit(o) ? o.toNumeric(units) : o, isUnit(e) ? e.toNumeric(units) : e];
    }
    return [math.divide(o as never, c as never), e]; // o SMath guarda o resultado já dividido pela conversão (10^-6)
  }
  if (isUnit(e)) {
    const units = e.formatUnits();
    return [isUnit(o) ? o.toNumeric(units) : o, e.toNumeric(units)];
  }
  if (isUnit(o) && o.dimensions.every((d) => d === 0)) o = o.toNumber('');
  return [o, e];
}

export function compareCorpus(file: string, xml: string): CorpusFile {
  const imported = importSm(xml, file.replace(/\.sm$/, ''));
  const { parsed, blocks, format } = prepare(imported.text, true);
  const out = evaluate({ libs: [], blocks, format, symbolic: true, keepRaw: true });
  // região -> chave do bloco e formato próprio
  const keyOf = new Map<string, string>();
  parsed.segments.forEach((s, i) => { if (s.kind === 'block' && s.id) keyOf.set(s.id, blockKey(i)); });
  const fmtOf = new Map(blocks.map((b) => [b.key, b.fmt ? { ...format, ...(b.fmt.decimals !== undefined && format.mode && !b.fmt.mode ? { mode: 'decimais' as const } : {}), ...b.fmt } : format]));
  // não comparável: região de plugin, número aleatório (random) ou nome que não está definido em lugar nenhum
  // do arquivo (veio de fora, como as funções do plugin Custom Functions); e tudo que depende disso
  // ordem de leitura de TODOS os blocos (os de plugin ficam desativados e fora da avaliação, mas definem nomes)
  const order = new Map(byPosition(parsed.segments.filter((s): s is BlockSegment => s.kind === 'block')).map((seg, i) => [blockKey(parsed.segments.indexOf(seg)), i]));
  const definedHere = new Set(imported.math.flatMap((m) => m.defines));
  const engine = (n: string) => { const t = toMath(n); return t in math || isUnitName(t) || n === 'π' || n === 'i' || n === 'e'; };
  const tainted = new Map<string, string>();
  const plugin = new Map<string, string>();
  for (const m of [...imported.math].sort((a, b) => (order.get(keyOf.get(a.id)!) ?? Infinity) - (order.get(keyOf.get(b.id)!) ?? Infinity))) {
    const outside = m.uses.find((u) => !definedHere.has(u) && !engine(u));
    const why = m.plugin ? 'plugin do SMath' : m.uses.includes('random') ? 'número aleatório' : outside ? `${outside} não está no arquivo` : m.uses.map((u) => tainted.get(u)).find(Boolean);
    if (why) { plugin.set(m.id, why); for (const d of m.defines) tainted.set(d, why); }
  }
  // região desativada no próprio SMath: o resultado guardado é antigo e não é recalculado; fica de fora
  const known = KNOWN[file] ?? {};
  for (const id of Object.keys(known)) plugin.set(id, FFT_I);
  const compared: Compared[] = imported.results.filter((r) => !r.disabled).map((r0) => known[r0.id] ? { ...r0, expected: known[r0.id] } : r0).map((r) => {
    const key = keyOf.get(r.id)!;
    const line: LineResult | undefined = out.blocks[key]?.[0];
    const fmt = fmtOf.get(key) ?? format;
    const expr = parsed.segments.find((s) => s.kind === 'block' && s.id === r.id)?.kind === 'block' ? (parsed.segments.find((s) => s.kind === 'block' && s.id === r.id) as { body: string }).body.trim() : '';
    let smath: string, prisma: string;
    try {
      // o próprio SMath deixou em aberto (nome sem valor): igual se o Prisma também deixa a mesma expressão em aberto
      let e: unknown;
      try { e = math.evaluate(toMathVars(r.expected)); } catch (err) {
        if (!/Undefined symbol/.test((err as Error).message)) throw err;
        const same = line?.symbolic !== undefined && line.symbolic.replace(/\s/g, '') === r.expected.replace(/\s/g, '');
        return { id: r.id, expr, smath: `em aberto: ${r.expected}`, prisma: line?.symbolic !== undefined ? `em aberto: ${line.symbolic}` : line?.error ?? 'com valor', ok: same, plugin: plugin.has(r.id), why: plugin.get(r.id) };
      }
      if (!line || line.error || line.symbolic !== undefined || line.raw === undefined) {
        const [, e2] = align(1, e, r.conv);
        return { id: r.id, expr, smath: show(e2, fmt), prisma: line?.error ? `erro: ${line.error}` : line?.symbolic !== undefined ? `em aberto: ${line.symbolic}` : 'sem resultado', ok: false, plugin: plugin.has(r.id), why: plugin.get(r.id) };
      }
      const [o, e2] = align(line.raw, e, r.conv);
      smath = show(e2, fmt);
      prisma = show(o, fmt);
    } catch (err) {
      return { id: r.id, expr, smath: r.expected, prisma: `erro na comparação: ${(err as Error).message}`, ok: false, plugin: plugin.has(r.id), why: plugin.get(r.id) };
    }
    return { id: r.id, expr, smath, prisma, ok: smath === prisma, plugin: plugin.has(r.id), why: plugin.get(r.id) };
  }).map((x) => (known[x.id] ? { ...x, fixed: true } : x));
  return { file, imported, compared };
}

/** test-results/smath-corpus.md (E8.2, item 3). */
export function corpusReport(files: CorpusFile[]): string {
  const rows = files.map((f) => {
    const own = f.compared.filter((c) => !c.plugin);
    const eq = own.filter((c) => c.ok).length;
    return `| ${f.file} | ${f.imported.regions} | ${own.length} | ${eq} | ${own.length - eq} | ${f.compared.length - own.length} | ${f.imported.unsupported.length} |`;
  });
  const diffs = files.flatMap((f) => f.compared.filter((c) => !c.ok && !c.plugin).map((c) => `| ${f.file} | ${c.id} | \`${c.expr.replace(/\|/g, '\\|')}\` | ${c.smath} | ${c.prisma.replace(/\|/g, '\\|')} |`));
  return [
    '# Corpus SMath: resultados do Prisma contra os do SMath', '',
    '| Arquivo | Regiões | Comparados | Iguais | Diferentes | Não comparáveis (plugin, aleatório, nome de fora) | Não suportadas |', '|---|---|---|---|---|---|---|', ...rows, '',
    '## Diferenças', '', diffs.length ? '| Arquivo | Região | Expressão | SMath | Prisma |\n|---|---|---|---|---|\n' + diffs.join('\n') : 'Nenhuma.', '',
    '## Não comparáveis', '', ...files.flatMap((f) => f.compared.filter((x) => x.plugin).map((x) => `- ${f.file} ${x.id} \`${x.expr.replace(/\|/g, '\\|')}\`: ${x.why}${x.fixed ? ` Com o esperado corrigido (${x.smath}): ${x.ok ? 'igual' : `DIFERENTE, Prisma ${x.prisma}`}.` : ''}`)), '',
  ].join('\n');
}
