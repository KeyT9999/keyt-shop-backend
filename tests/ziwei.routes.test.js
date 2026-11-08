const request = require('supertest');
const app = require('../src/app');

describe('Ziwei AI & Records API (/api/ziwei)', () => {
  const originalEnableFlag = process.env.ENABLE_ZIWEI_API;

  afterEach(() => {
    process.env.ENABLE_ZIWEI_API = originalEnableFlag;
  });

  test('returns 503 when ENABLE_ZIWEI_API kill-switch is false', async () => {
    process.env.ENABLE_ZIWEI_API = 'false';

    const res = await request(app)
      .post('/api/ziwei/interpret')
      .send({ chartSummary: 'Thông tin lá số mẫu' });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  test('validates required chartSummary in POST /api/ziwei/interpret', async () => {
    const res = await request(app).post('/api/ziwei/interpret').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('validates required chartASummary and chartBSummary in POST /api/ziwei/heming', async () => {
    const res = await request(app)
      .post('/api/ziwei/heming')
      .send({ chartASummary: 'Chỉ có lá số A' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('requires authentication for GET /api/ziwei/records', async () => {
    const res = await request(app).get('/api/ziwei/records');

    expect(res.status).toBe(401);
  });
});

