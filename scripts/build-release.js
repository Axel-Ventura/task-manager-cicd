import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingPath = path.join(projectRoot, '.release', 'staging');
const artifactPath = path.join(projectRoot, '.release', 'artifact');

async function main() {
  const packageFile = path.join(stagingPath, 'package.json');
  let packageData;
  try {
    packageData = JSON.parse(await readFile(packageFile, 'utf8'));
  } catch {
    throw new Error('No existe un entorno de liberación válido. Ejecuta npm run release:prepare primero.');
  }

  await rm(artifactPath, { recursive: true, force: true });
  await mkdir(artifactPath, { recursive: true });
  for (const entry of ['src', 'package.json', 'package-lock.json']) {
    await cp(path.join(stagingPath, entry), path.join(artifactPath, entry), { recursive: true, force: true });
  }

  const releaseInfo = {
    name: packageData.name,
    version: packageData.version,
    nodeVersion: process.version,
    generatedAt: new Date().toISOString(),
  };
  await writeFile(path.join(artifactPath, 'release-info.json'), `${JSON.stringify(releaseInfo, null, 2)}\n`);

  console.log(`Artefacto creado en ${artifactPath}:`);
  for (const entry of await readdir(artifactPath)) console.log(`- ${entry}`);
}

main().catch((error) => {
  console.error(`Error al generar el artefacto: ${error.message}`);
  process.exitCode = 1;
});
