const jwt = require('jsonwebtoken');
const { socketAuth } = require('../src/socket/auth');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const SESSION_ID = '123e4567-e89b-42d3-a456-426614174000';

function runSocketAuth(auth) {
  const socket = { handshake: { auth } };

  return new Promise((resolve) => {
    socketAuth(socket, (error) => resolve({ error, socket }));
  });
}

describe('socketAuth customer identity', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('attaches verified customer token data while preserving the chat session id', async () => {
    const token = jwt.sign(
      {
        id: 'user-123',
        username: 'customer',
        admin: false,
        role: 'user',
      },
      process.env.JWT_SECRET
    );

    const { error, socket } = await runSocketAuth({
      token,
      sessionId: SESSION_ID,
      role: 'customer',
    });

    expect(error).toBeUndefined();
    expect(socket.userRole).toBe('customer');
    expect(socket.sessionId).toBe(SESSION_ID);
    expect(socket.user).toMatchObject({
      id: 'user-123',
      username: 'customer',
      admin: false,
      role: 'user',
    });
  });
});
