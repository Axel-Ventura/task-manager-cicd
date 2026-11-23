import { cp, mkdir, rm, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseRoot = path.join(projectRoot, '.release');
const stagingPath = path.join(releaseRoot, 'staging');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} finalizó con código ${code}.`)));
  });
}

async function ensureReadable(filePath, label) {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`No se encontró ${label}: ${filePath}`);
  }
}

async function main() {
  const majorVersion = Number(process.versions.node.split('.')[0]);
  if (majorVersion !== 22) throw new Error(`Se requiere Node.js 22; se detectó ${process.version}.`);

  const lockFile = path.join(projectRoot, 'package-lock.json');
  await ensureReadable(lockFile, 'package-lock.json');

  console.log(`Preparando entorno de liberación con Node.js ${process.version}.`);
  console.log(`Directorio de staging: ${stagingPath}`);
  await mkdir(releaseRoot, { recursive: true });
  await rm(stagingPath, { recursive: true, force: true });
  await rm(path.join(releaseRoot, 'artifact'), { recursive: true, force: true });
  await mkdir(stagingPath, { recursive: true });

  for (const entry of ['src', 'tests', 'package.json', 'package-lock.json', 'jest.config.js']) {
    await cp(path.join(projectRoot, entry), path.join(stagingPath, entry), { recursive: true, force: true });
  }

  console.log('Instalando dependencias reproducibles en staging con npm ci...');
  await run(npmCommand, ['ci'], { cwd: stagingPath });
  console.log('Entorno de liberación preparado correctamente.');
}

main().catch((error) => {
  console.error(`Error al preparar la liberación: ${error.message}`);
  process.exitCode = 1;
});
