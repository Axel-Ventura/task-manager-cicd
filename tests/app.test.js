import request from 'supertest';
import app from '../src/app.js';

describe('Información general y errores de solicitud', () => {
  test('GET / responde con 200 e información de la API', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { name: 'Task Manager API' } });
  });

  test('una ruta inexistente responde con 404', async () => {
    const response = await request(app).get('/ruta-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: { message: 'Ruta no encontrada: GET /ruta-inexistente.' } });
  });

  test('un cuerpo JSON malformado responde con 400', async () => {
    const response = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: { message: 'El cuerpo de la solicitud contiene JSON inválido.' } });
  });
});
