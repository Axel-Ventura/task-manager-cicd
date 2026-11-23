# Task Manager API

API REST para la gestión de tareas. Es un proyecto académico orientado a demostrar progresivamente un pipeline de integración, liberación y despliegue continuo (CI/CD).

## Requisitos

- Node.js 22 o superior
- npm

## Ejecución

```powershell
npm install
npm start
```

La API escucha en `http://localhost:3000` de forma predeterminada. Para cambiar el puerto, define `PORT` antes de iniciar el servidor:

```powershell
$env:PORT=3001
npm start
```

Para desarrollo con reinicio automático nativo de Node.js:

```powershell
npm run dev
```

## Pruebas automatizadas

Las pruebas usan Jest, Supertest e importan la aplicación directamente, por lo que no inician un servidor ni requieren un puerto fijo.

```powershell
npm test
```

Ejecuta todas las pruebas una vez.

```powershell
npm run test:watch
```

Ejecuta las pruebas en modo observación.

```powershell
npm run test:coverage
```

Ejecuta las pruebas y muestra la cobertura. Los mínimos globales son 80% para statements, functions y lines; 70% para branches.

```powershell
npm run test:ci
```

Ejecuta las pruebas y la cobertura en modo CI; finaliza con un código distinto de cero si existe un fallo o no se alcanzan los umbrales.

## Proceso de liberación

El entorno de liberación es una copia limpia y aislada en `.release/staging/`. Se crea a partir de `src/`, `tests/`, `package.json`, `package-lock.json` y `jest.config.js`; en él se instalan las dependencias bloqueadas mediante `npm ci`. Esto permite comprobar que la aplicación no depende de archivos ni de dependencias del entorno de desarrollo.

```powershell
npm run release:prepare
```

Prepara staging y elimina solo resultados de liberaciones anteriores dentro de `.release/`.

```powershell
npm run release:test
```

Ejecuta `npm run test:ci` dentro de staging y genera el reporte de cobertura allí.

```powershell
npm run release:build
```

Genera `.release/artifact/` usando staging. El artefacto solo incluye `src/`, `package.json`, `package-lock.json` y `release-info.json`; no contiene pruebas, cobertura, `node_modules`, archivos `.env` ni secretos. En un entorno de producción se puede ejecutar `npm ci --omit=dev` y después `npm start`.

```powershell
npm run release
```

Ejecuta secuencialmente preparación, pruebas y construcción, y se detiene ante el primer error.

El entorno de desarrollo contiene código fuente, pruebas y dependencias de desarrollo. El entorno de liberación reproduce esas dependencias desde el archivo de bloqueo para validarlas de forma aislada. El artefacto de producción conserva solo lo necesario para ejecutar la API con dependencias de producción.

## Pipeline CI/CD

El workflow [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) se llama **Task Manager CI/CD**. Se activa ante pushes a `main`, pull requests dirigidos a `main` y ejecuciones manuales con `workflow_dispatch`.

El job `release` se ejecuta en Ubuntu con Node.js `22.22.0`. Prepara el entorno aislado, ejecuta las pruebas con cobertura y construye el artefacto mediante los scripts de liberación. Publica por siete días el reporte de cobertura y el artefacto como evidencia de la liberación.

El job `deploy` depende de que `release` termine correctamente. Solo se ejecuta sobre `main`, nunca en pull requests, y solo cuando la variable del repositorio `DEPLOY_ENABLED` es exactamente `true`. Utiliza el environment `production` y concurrencia para impedir despliegues simultáneos.

### Variables y secretos del pipeline

Configura los siguientes valores en GitHub antes de habilitar producción:

| Tipo | Nombre | Uso |
| --- | --- | --- |
| Secreto | `RENDER_API_KEY` | Token de Render con permisos para desplegar el servicio. |
| Variable | `RENDER_SERVICE_ID` | Identificador del servicio de Render. |
| Variable | `APP_URL` | URL pública del servicio, por ejemplo `https://task-manager-api.onrender.com`. |
| Variable | `DEPLOY_ENABLED` | Déjalo distinto de `true` al principio; usa `true` para habilitar el job `deploy`. |

`GITHUB_SHA` lo proporciona GitHub Actions al script de despliegue para solicitar exactamente el commit ya validado. El primer push ejecuta el job `release` sin desplegar mientras `DEPLOY_ENABLED` no sea `true`. Tras configurar los valores anteriores, se puede ejecutar el workflow manualmente desde la pestaña **Actions** sobre `main`.

Los artefactos se consultan en la ejecución del workflow, en la sección **Artifacts**. Son evidencia de la liberación y una versión distribuible, pero no se transfieren directamente a Render: Render obtiene el mismo commit validado por GitHub Actions e instala sus propias dependencias.

### Configuración prevista de Render

Al crear el servicio web de Render, conecta el repositorio y configura:

| Ajuste | Valor |
| --- | --- |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy | Desactivado |

La aplicación escucha en `0.0.0.0` y respeta `PORT`, por lo que Render puede asignar el puerto de ejecución. `npm run deploy` llama la API de Render con el SHA validado y espera explícitamente a que el estado sea `live`; `npm run deploy:verify` consulta `/health` y valida la respuesta JSON. Los valores de ejemplo se encuentran en `.env.example`; nunca incluyas secretos reales en ese archivo.

## Endpoints

Todas las respuestas, excepto `204 No Content`, usan `{ "success": true, "data": ... }` o `{ "success": false, "error": { "message": "..." } }`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/` | Información de la API. |
| `GET` | `/health` | Estado del servicio, uptime y marcas de tiempo. |
| `GET` | `/tasks` | Lista todas las tareas. |
| `GET` | `/tasks/:id` | Obtiene una tarea por identificador. |
| `POST` | `/tasks` | Crea una tarea. |
| `PUT` | `/tasks/:id` | Actualiza una o más propiedades de una tarea. |
| `DELETE` | `/tasks/:id` | Elimina una tarea. |

### Ejemplo: crear una tarea

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/tasks -ContentType 'application/json' -Body '{"title":"Preparar pruebas","description":"Validar endpoints"}'
```

Cada tarea incluye `id`, `title`, `description` (opcional), `completed` (por defecto `false`) y `createdAt`. Los datos se conservan únicamente en memoria y se pierden al reiniciar el servidor.

Los errores de validación, recursos inexistentes y rutas inexistentes se devuelven en JSON. La consola registra cada solicitud con método, ruta, código HTTP y duración en milisegundos.
