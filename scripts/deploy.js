const API_BASE_URL = process.env.RENDER_API_BASE_URL || 'https://api.render.com/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = Number(process.env.DEPLOY_POLL_INTERVAL_MS || 15_000);
const MAX_WAIT_MS = 10 * 60_000;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name}.`);
  return value;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Render respondió HTTP ${response.status}: ${body?.message || 'sin detalle disponible'}.`);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`La solicitud a Render superó ${REQUEST_TIMEOUT_MS} ms.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function deploymentId(payload) {
  return payload?.id || payload?.deploy?.id;
}

function deploymentCommit(payload) {
  return payload?.commit?.id || payload?.commit?.sha || payload?.commitId;
}

function isFailedStatus(status) {
  return ['build_failed', 'update_failed', 'pre_deploy_failed', 'failed', 'canceled', 'cancelled', 'deactivated'].includes(status);
}

async function main() {
  const apiKey = required('RENDER_API_KEY');
  const serviceId = required('RENDER_SERVICE_ID');
  const commitId = required('GITHUB_SHA');
  const servicePath = `${API_BASE_URL.replace(/\/$/, '')}/services/${encodeURIComponent(serviceId)}/deploys`;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  console.log(`Solicitando despliegue del commit ${commitId} para el servicio configurado.`);
  const created = await request(servicePath, { method: 'POST', headers, body: JSON.stringify({ commitId }) });
  const id = deploymentId(created);
  if (!id) throw new Error('Render no devolvió un identificador de despliegue.');

  console.log(`Despliegue ${id} aceptado; esperando el estado live.`);
  const deadline = Date.now() + MAX_WAIT_MS;
  const deployPath = `${servicePath}/${encodeURIComponent(id)}`;

  while (Date.now() <= deadline) {
    const deployment = await request(deployPath, { headers });
    const status = String(deployment?.status || '').toLowerCase();
    console.log(`Estado del despliegue ${id}: ${status || 'desconocido'}.`);

    if (isFailedStatus(status)) throw new Error(`El despliegue ${id} terminó con estado ${status}.`);
    if (status === 'live') {
      const deployedCommit = deploymentCommit(deployment);
      if (!deployedCommit) throw new Error(`El despliegue ${id} está live, pero Render no devolvió su commit.`);
      if (deployedCommit !== commitId) throw new Error(`El despliegue ${id} corresponde a ${deployedCommit}, no al commit validado ${commitId}.`);
      console.log(`Despliegue ${id} confirmado como live para el commit ${commitId}.`);
      return;
    }

    if (Date.now() + POLL_INTERVAL_MS > deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`El despliegue no alcanzó el estado live en ${MAX_WAIT_MS / 60_000} minutos.`);
}

main().catch((error) => {
  console.error(`Error de despliegue: ${error.message}`);
  process.exitCode = 1;
});
