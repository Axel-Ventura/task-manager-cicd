const REQUEST_TIMEOUT_MS = 15_000;
const ATTEMPTS = 10;
const RETRY_INTERVAL_MS = Number(process.env.VERIFY_RETRY_INTERVAL_MS || 15_000);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function healthUrl(value) {
  if (!value) throw new Error('Falta la variable de entorno obligatoria APP_URL.');
  return new URL('/health', value).toString();
}

function validHealthPayload(payload) {
  return payload?.success === true
    && payload?.data?.status === 'ok'
    && Number.isFinite(payload?.data?.uptime)
    && payload.data.uptime >= 0
    && !Number.isNaN(Date.parse(payload?.data?.timestamp));
}

async function check(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => null);
    const duration = performance.now() - startedAt;
    if (response.status !== 200) throw new Error(`HTTP ${response.status} tras ${duration.toFixed(2)} ms.`);
    if (!validHealthPayload(payload)) throw new Error(`La respuesta de /health no tiene la estructura esperada tras ${duration.toFixed(2)} ms.`);
    console.log(`Health check exitoso: HTTP 200 en ${duration.toFixed(2)} ms.`);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`La solicitud de health superó ${REQUEST_TIMEOUT_MS} ms.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const url = healthUrl(process.env.APP_URL);
  let lastError;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    console.log(`Health check: intento ${attempt}/${ATTEMPTS}.`);
    try {
      await check(url);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Intento ${attempt} fallido: ${error.message}`);
      if (attempt < ATTEMPTS) await sleep(RETRY_INTERVAL_MS);
    }
  }

  throw new Error(`La aplicación no respondió correctamente después de ${ATTEMPTS} intentos: ${lastError.message}`);
}

main().catch((error) => {
  console.error(`Error al verificar el despliegue: ${error.message}`);
  process.exitCode = 1;
});
