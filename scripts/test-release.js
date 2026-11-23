import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingPath = path.join(projectRoot, '.release', 'staging');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} finalizó con código ${code}.`)));
  });
}

async function main() {
  try {
    await access(path.join(stagingPath, 'package.json'), constants.R_OK);
  } catch {
    throw new Error('No existe un entorno de liberación válido. Ejecuta npm run release:prepare primero.');
  }

  console.log(`Ejecutando pruebas de liberación desde ${stagingPath}.`);
  await run(npmCommand, ['run', 'test:ci'], { cwd: stagingPath });
  console.log('Pruebas de liberación y cobertura completadas correctamente.');
}

main().catch((error) => {
  console.error(`Error en las pruebas de liberación: ${error.message}`);
  process.exitCode = 1;
});
