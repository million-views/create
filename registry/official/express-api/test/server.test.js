import { test, describe } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server.js';

describe('Express API Server', () => {
  test('GET /health returns healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    assert.equal(response.body.status, 'healthy');
    assert.ok(response.body.timestamp);
    assert.ok(response.body.uptime);
  });

  test('GET /api/v1 returns API information', async () => {
    const response = await request(app)
      .get('/api/v1')
      .expect(200);

    assert.ok(response.body.message);
    assert.equal(response.body.version, '1.0.0');
    assert.ok(response.body.endpoints);
  });

  test('GET /unknown returns 404', async () => {
    const response = await request(app)
      .get('/unknown')
      .expect(404);

    assert.equal(response.body.error, 'Not Found');
    assert.ok(response.body.timestamp);
  });
});