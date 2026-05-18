const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const seedProducts = require('./utils/seedProducts');
const { initializeScheduler } = require('./utils/scheduler');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express app
const server = http.createServer(app);

async function startServer() {
  await connectDB();
  // await seedProducts(); // Disabled: Auto-seed products on server start
  
  // Initialize scheduled jobs
  initializeScheduler();

  // Initialize Socket.io
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
