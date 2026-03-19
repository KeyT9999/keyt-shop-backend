process.env.RECAPTCHA_SITE_KEY = 'test-site-key';
process.env.RECAPTCHA_SECRET_KEY = 'test-recaptcha-secret-key';
process.env.RECAPTCHA_ALLOWED_HOSTNAMES = 'localhost,127.0.0.1,taphoakeyt.com';
process.env.RECAPTCHA_MIN_SCORE = '0.5';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
const request = require('supertest');

const mockVerifyRecaptchaToken = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('../src/services/email.service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  sendEmailVerificationEmail: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../src/models/user.model', () => ({
  findOne: (...args) => mockUserFindOne(...args),
  create: (...args) => mockUserCreate(...args)
}));

jest.mock('../src/services/recaptcha.service', () => ({
  verifyRecaptchaToken: (...args) => mockVerifyRecaptchaToken(...args),
}));

const app = require('../src/app');
describe('reCAPTCHA integration', () => {
  beforeEach(() => {
    mockVerifyRecaptchaToken.mockImplementation(async (token) => {
      const actionByToken = {
        'register-token': 'register'
      };

      return {
        success: true,
        action: actionByToken[token] || 'register',
        score: 0.9,
        hostname: 'localhost'
      };
    });
    mockUserFindOne.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      _id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      admin: false,
      emailVerified: false
    });
  });

  test('public config route returns site key', async () => {
    const response = await request(app).get('/api/public/config');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('recaptchaSiteKey');
    // The site key should match env variable
    expect(response.body.recaptchaSiteKey).toBe(process.env.RECAPTCHA_SITE_KEY);
  });

  test('registration requires valid recaptcha token', async () => {
    const payload = {
      username: 'testuser',
      email: 'test@example.com',
      password: '123456',
      recaptchaToken: 'register-token',
    };
    const response = await request(app).post('/api/auth/register').send(payload);
    expect(response.statusCode).toBe(201);
    expect(mockVerifyRecaptchaToken).toHaveBeenCalled();
  });
});
