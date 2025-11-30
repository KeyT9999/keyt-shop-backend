const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }))
  };
});

const app = require('../src/app');
const User = require('../src/models/user.model');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: 'jest-tests'
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.GOOGLE_CLIENT_ID = 'test-google-client';
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

describe('Auth routes', () => {
  it('rejects registration when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    const response = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: '123456'
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toMatch(/JWT_SECRET/i);
    expect(await User.countDocuments()).toBe(0);
  });

  it('registers a new user and returns a token', async () => {
    const payload = { username: 'testuser', email: 'test@example.com', password: '123456' };
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toMatchObject({ username: 'testuser', email: 'test@example.com' });
    expect(response.body.token).toBeTruthy();
    const user = await User.findOne({ email: payload.email });
    expect(user).not.toBeNull();
  });

  it('rejects invalid Google tokens', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const response = await request(app).post('/api/auth/google').send({ credential: 'bad-token' });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/không hợp lệ/i);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects Google login when GOOGLE_CLIENT_ID is missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const response = await request(app).post('/api/auth/google').send({ credential: 'valid-token' });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toMatch(/GOOGLE_CLIENT_ID/i);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('creates a user and logs in with Google when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: 'google@example.com' })
    });

    const response = await request(app).post('/api/auth/google').send({ credential: 'valid-token' });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.email).toBe('google@example.com');
    expect(response.body.token).toBeTruthy();
    const userCount = await User.countDocuments();
    expect(userCount).toBe(1);
  });

  it('returns 400 when registration payload is invalid', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'abc',
      email: 'invalid-email'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});

