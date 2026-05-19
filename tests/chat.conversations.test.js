const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/app');
const Conversation = require('../src/models/Conversation');

let mongoServer;

function createAdminToken() {
  return jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toString(),
      username: 'adminuser',
      admin: true,
      role: 'admin',
    },
    process.env.JWT_SECRET
  );
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    dbName: 'jest-chat-tests',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  process.env.JWT_SECRET = 'test-secret';
  await Conversation.deleteMany({});
});

afterEach(async () => {
  await Conversation.deleteMany({});
});

describe('Chat conversation admin search', () => {
  it('filters conversations by customer name and email case-insensitively', async () => {
    await Conversation.create([
      {
        customerName: 'Nguyen Van A',
        customerEmail: 'alice@example.com',
        status: 'active',
        lastMessage: 'Can ho tro',
      },
      {
        customerName: 'Tran Thi B',
        customerEmail: 'support-target@example.com',
        status: 'active',
        lastMessage: 'Xin chao',
      },
      {
        customerName: 'Le Van C',
        customerEmail: 'c@example.com',
        status: 'resolved',
        lastMessage: 'Da xong',
      },
    ]);

    const byName = await request(app)
      .get('/api/chat/conversations')
      .query({ status: 'active', search: 'nguyen' })
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(byName.statusCode).toBe(200);
    expect(byName.body.conversations).toHaveLength(1);
    expect(byName.body.conversations[0].customerName).toBe('Nguyen Van A');

    const byEmail = await request(app)
      .get('/api/chat/conversations')
      .query({ status: 'active', search: 'SUPPORT' })
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(byEmail.statusCode).toBe(200);
    expect(byEmail.body.conversations).toHaveLength(1);
    expect(byEmail.body.conversations[0].customerEmail).toBe('support-target@example.com');
  });

  it('treats regex metacharacters as literal search text', async () => {
    await Conversation.create([
      {
        customerName: 'A.B Customer',
        sessionId: '123e4567-e89b-42d3-a456-426614174000',
        status: 'active',
        lastMessage: 'Literal dot',
      },
      {
        customerName: 'AXB Customer',
        sessionId: '123e4567-e89b-42d3-a456-426614174001',
        status: 'active',
        lastMessage: 'Should not match dot search',
      },
    ]);

    const response = await request(app)
      .get('/api/chat/conversations')
      .query({ search: 'A.B' })
      .set('Authorization', `Bearer ${createAdminToken()}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.conversations).toHaveLength(1);
    expect(response.body.conversations[0].customerName).toBe('A.B Customer');
  });
});
