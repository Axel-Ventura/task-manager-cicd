import express from 'express';
import tasksRouter from './routes/tasks.routes.js';

const app = express();
const startedAt = Date.now();

app.use((request, response, next) => {
  const start = performance.now();
  response.on('finish', () => console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${(performance.now() - start).toFixed(2)} ms`));
  next();
});
app.use(express.json());

app.get('/', (_request, response) => response.status(200).json({ success: true, data: { name: 'Task Manager API', version: '1.0.0', description: 'API REST para la gestión de tareas.' } }));
app.get('/health', (_request, response) => response.status(200).json({ success: true, data: { status: 'ok', uptime: Number(process.uptime().toFixed(3)), timestamp: new Date().toISOString(), startedAt: new Date(startedAt).toISOString() } }));
app.use('/tasks', tasksRouter);

app.use((request, _response, next) => {
  const error = new Error(`Ruta no encontrada: ${request.method} ${request.originalUrl}.`);
  error.statusCode = 404;
  next(error);
});
app.use((error, _request, response, _next) => {
  const invalidJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  response.status(invalidJson ? 400 : error.statusCode || 500).json({ success: false, error: { message: invalidJson ? 'El cuerpo de la solicitud contiene JSON inválido.' : error.message || 'Error interno del servidor.' } });
});

export default app;
