const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';
process.env.RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || 'test-recaptcha-secret';

const mockVerifyIdToken = jest.fn();
const mockVerifyRecaptchaToken = jest.fn();

jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }))
  };
});

jest.mock('../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmailVerificationEmail: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../src/services/recaptcha.service', () => ({
  verifyRecaptchaToken: (...args) => mockVerifyRecaptchaToken(...args)
}));

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
  process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-secret';
  process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'localhost,127.0.0.1,taphoakeyt.com';
  process.env.RECAPTCHA_MIN_SCORE = '0.5';
  mockVerifyRecaptchaToken.mockImplementation(async (token) => {
    const actionByToken = {
      'register-token': 'register',
      'google-token': 'google_login',
      'login-token': 'login',
      'forgot-token': 'forgot_password',
      'resend-token': 'resend_verification'
    };

    return {
      success: true,
      action: actionByToken[token] || 'login',
      score: 0.9,
      hostname: 'localhost'
    };
  });
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
      password: '123456',
      recaptchaToken: 'register-token'
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toMatch(/JWT_SECRET/i);
    expect(await User.countDocuments()).toBe(0);
  });

  it('registers a new user and returns a token', async () => {
    const payload = {
      username: 'testuser',
      email: 'test@example.com',
      password: '123456',
      recaptchaToken: 'register-token'
    };
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.statusCode).toBe(201);
    expect(response.body.user).toMatchObject({ username: 'testuser', email: 'test@example.com' });
    expect(response.body.token).toBeTruthy();
    const user = await User.findOne({ email: payload.email });
    expect(user).not.toBeNull();
  });

  it('rejects invalid Google tokens', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const response = await request(app).post('/api/auth/google').send({
      credential: 'bad-token',
      recaptchaToken: 'google-token'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/không hợp lệ/i);
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects Google login when GOOGLE_CLIENT_ID is missing', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const response = await request(app).post('/api/auth/google').send({
      credential: 'valid-token',
      recaptchaToken: 'google-token'
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toMatch(/GOOGLE_CLIENT_ID/i);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('creates a user and logs in with Google when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({ email: 'google@example.com' })
    });

    const response = await request(app).post('/api/auth/google').send({
      credential: 'valid-token',
      recaptchaToken: 'google-token'
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.email).toBe('google@example.com');
    expect(response.body.token).toBeTruthy();
    const userCount = await User.countDocuments();
    expect(userCount).toBe(1);
  });

  it('returns 400 when registration payload is invalid', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'abc',
      email: 'invalid-email',
      recaptchaToken: 'register-token'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects protected auth requests without recaptcha token', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: '123456'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/recaptcha/i);
  });

  it('rejects login when recaptcha action does not match route intent', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: '123456',
      recaptchaToken: 'register-token'
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/reCAPTCHA/i);
  });

  it('logs in with Zalo and returns internal JWT', async () => {
    const zaloUserId = 'zalo_user_123456';
    const response = await request(app).post('/api/auth/zalo').send({
      accessToken: 'zalo-access-token',
      userId: zaloUserId
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.username).toMatch(/^zalo_/);

    const user = await User.findById(response.body.user.id);
    expect(user).not.toBeNull();
    expect(user.loginType).toBe('login-zalo');
    expect(user.username).toContain(zaloUserId.slice(0, 4));
  });

  it('accepts legacy access_token payload for Zalo login', async () => {
    const zaloUserId = 'legacy_zalo_654321';
    const response = await request(app).post('/api/auth/zalo').send({
      access_token: 'legacy-zalo-token',
      userId: zaloUserId
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.username).toMatch(/^zalo_/);
  });

  it('logs in with Zalo when simulator only provides userId', async () => {
    const zaloUserId = 'simulator_only_123456';
    const response = await request(app).post('/api/auth/zalo').send({
      userId: zaloUserId
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.username).toMatch(/^zalo_/);

    const user = await User.findById(response.body.user.id);
    expect(user).not.toBeNull();
    expect(user.loginType).toBe('login-zalo');
  });
});

