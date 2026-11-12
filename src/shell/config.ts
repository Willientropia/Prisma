// Gravação do config.yaml (F-CONFIG, A6-4): troca só as chaves pedidas e mantém o resto do arquivo (comentários incluídos).
import { parseDocument } from 'yaml';
import { platform } from '../platform';
import { useWorkspace } from '../store/workspace';

export async function saveConfig(patch: Record<string, unknown>): Promise<void> {
  const y = parseDocument(await platform.config());
  if (y.errors.length) throw new Error('config.yaml com erro de sintaxe: nada foi gravado');
  for (const [k, v] of Object.entries(patch)) y.set(k, v);
  await platform.writeConfig(String(y));
  useWorkspace.getState().set({ config: (y.toJS() ?? {}) as Record<string, unknown> });
}
