// A6-4: o que a folha dá ao assistente: definições antes da linha (com valor ou definição) e funções de biblioteca.
import { fnItem, varItem, type AssistItem } from '../../math/assistente';
import { resultLatex } from '../../math/resultado';
import { idLatex, lineToLatex, parseLinear } from '../../format/mathlinear';
import type { LineResult } from '../../engine/evaluate';

export type SheetDef = { name: string; raw: string; key: string; line: number };
export type LibFn = { sig: string; lib: string; why: string };

const FN_DEF = /^\s*[^\s(:=#[]+\s*\(([^)]*)\)\s*:=/;
const arity = (params: string) => (params.trim() ? params.split(/[,;]/).length : 0);
const firstSentence = (s: string) => /^.*?[.!?](?=\s|$)/.exec(s.trim())?.[0] ?? s.trim();

export function sheetItems(defs: SheetDef[], results: Record<string, LineResult[]> | undefined, libs: LibFn[]): AssistItem[] {
  const own = defs.map((d): AssistItem => {
    const fn = FN_DEF.exec(d.raw);
    if (fn) {
      let detail: string | undefined;
      try { detail = lineToLatex(parseLinear(d.raw)); } catch { detail = undefined; }
      return fnItem(d.name, 'userfn', arity(fn[1]), { detail });
    }
    const r = results?.[d.key]?.[d.line];
    const v = r?.assigned ?? (r?.numText !== undefined && !r.matrix ? r : undefined); // com "= ?" o valor já é o resultado da linha
    return varItem(d.name, v ? `${idLatex(d.name)} = ${resultLatex({ kind: 'eval', text: v.text, numText: v.numText, unit: v.unit, unitRaw: v.unitRaw })}` : undefined);
  });
  const seen = new Set(defs.map((d) => d.name));
  const lib = libs.flatMap((f) => {
    const m = /^\s*([^\s(]+)\s*\(([^)]*)\)/.exec(f.sig);
    if (!m || seen.has(m[1])) return [];
    seen.add(m[1]);
    return [fnItem(m[1], 'lib', arity(m[2]), { title: `Função de biblioteca (${f.lib})`, detail: `\\text{${f.sig.replace(/[\\{}]/g, '')}}`, note: f.why ? firstSentence(f.why) : undefined })];
  });
  return [...own, ...lib];
}
