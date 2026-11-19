// npm run espaco: mostra quanto a pasta do projeto ocupa e sai com erro a partir de 55 GB (limite de 60 GB, CLAUDE.md "Disco").
import { join } from 'node:path';
import { folderBytes, quotaProblem } from './falhas';

const bytes = folderBytes(join(import.meta.dirname, '..'));
const problem = quotaProblem(bytes);
console.log(`Projeto: ${(bytes / 1e9).toFixed(1).replace('.', ',')} GB de 60 GB.`);
if (problem) {
  console.error(problem);
  process.exit(1);
}
