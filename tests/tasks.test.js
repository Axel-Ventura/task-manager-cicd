import request from 'supertest';
import app from '../src/app.js';
import { clearTasks } from '../src/services/tasks.service.js';

const taskPath = '/tasks';

describe('Gestión de tareas', () => {
  beforeEach(() => clearTasks());
  afterAll(() => clearTasks());

  test('consulta una lista vacía de tareas', async () => {
    const response = await request(app).get(taskPath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [] });
  });

  test('crea tareas con identificadores únicos y valores predeterminados', async () => {
    const first = await request(app).post(taskPath).send({ title: 'Primera tarea' });
    const second = await request(app).post(taskPath).send({ title: 'Segunda tarea' });

    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ title: 'Primera tarea', completed: false });
    expect(first.body.data.id).toEqual(expect.any(String));
    expect(first.body.data.id).not.toBe(second.body.data.id);
    expect(Number.isNaN(Date.parse(first.body.data.createdAt))).toBe(false);
  });

  test('rechaza una tarea sin título', async () => {
    const response = await request(app).post(taskPath).send({ description: 'Sin título' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('El campo title es obligatorio.');
  });

  test('rechaza un título vacío', async () => {
    const response = await request(app).post(taskPath).send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('El campo title debe ser una cadena no vacía.');
  });

  test.each([
    [{ title: 10 }, 'El campo title debe ser una cadena no vacía.'],
    [{ title: 'Correcto', description: false }, 'El campo description debe ser una cadena.'],
    [{ title: 'Correcto', completed: 'false' }, 'El campo completed debe ser booleano.'],
    [{ title: 'Correcto', priority: 1 }, 'Campos no permitidos: priority.'],
  ])('rechaza tipos o campos inválidos: %j', async (body, message) => {
    const response = await request(app).post(taskPath).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(message);
  });

  test('consulta una tarea existente', async () => {
    const created = await request(app).post(taskPath).send({ title: 'Consultar', description: 'Descripción' });
    const response = await request(app).get(`${taskPath}/${created.body.data.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(created.body.data);
  });

  test('rechaza la consulta de una tarea inexistente', async () => {
    const response = await request(app).get(`${taskPath}/no-existe`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Tarea no encontrada.');
  });

  test('lista las tareas registradas', async () => {
    await request(app).post(taskPath).send({ title: 'Uno' });
    await request(app).post(taskPath).send({ title: 'Dos' });
    const response = await request(app).get(taskPath);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((task) => task.title)).toEqual(['Uno', 'Dos']);
  });

  test('actualiza una tarea correctamente', async () => {
    const created = await request(app).post(taskPath).send({ title: 'Pendiente' });
    const response = await request(app).put(`${taskPath}/${created.body.data.id}`).send({ title: 'Terminada', completed: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: created.body.data.id, title: 'Terminada', completed: true });
    expect(response.body.data.createdAt).toBe(created.body.data.createdAt);
  });

  test.each([
    [{}, 'Proporciona al menos un campo para actualizar.'],
    [{ completed: null }, 'El campo completed debe ser booleano.'],
  ])('rechaza una actualización inválida: %j', async (body, message) => {
    const created = await request(app).post(taskPath).send({ title: 'Pendiente' });
    const response = await request(app).put(`${taskPath}/${created.body.data.id}`).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(message);
  });

  test('rechaza actualizar una tarea inexistente', async () => {
    const response = await request(app).put(`${taskPath}/no-existe`).send({ completed: true });

    expect(response.status).toBe(404);
  });

  test('elimina una tarea correctamente y deja de estar disponible', async () => {
    const created = await request(app).post(taskPath).send({ title: 'Eliminar' });
    const deleted = await request(app).delete(`${taskPath}/${created.body.data.id}`);
    const queried = await request(app).get(`${taskPath}/${created.body.data.id}`);

    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe('');
    expect(queried.status).toBe(404);
  });

  test('rechaza eliminar una tarea inexistente', async () => {
    const response = await request(app).delete(`${taskPath}/no-existe`);

    expect(response.status).toBe(404);
  });
});
