import request from 'supertest';
import { startApp } from './helpers/start-app';

jest.setTimeout(300_000);

describe('GET /health (e2e)', () => {
  const context = startApp();

  it('reports the service as healthy', async () => {
    const response = await request(context.app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.details.memory_heap.status).toBe('up');
  });
});
