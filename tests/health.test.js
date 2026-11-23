import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  test('responde con 200 y estado operativo', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  test('incluye uptime numérico y marcas de tiempo ISO válidas', async () => {
    const response = await request(app).get('/health');
    const { uptime, timestamp, startedAt } = response.body.data;

    expect(typeof uptime).toBe('number');
    expect(uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
    expect(Number.isNaN(Date.parse(startedAt))).toBe(false);
  });
});
