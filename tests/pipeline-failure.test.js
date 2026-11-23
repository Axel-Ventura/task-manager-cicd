import { test, expect } from '@jest/globals';

test('falla intencionalmente para validar la protección del pipeline', () => {
  expect('pipeline de validación').toBe('despliegue permitido');
});
