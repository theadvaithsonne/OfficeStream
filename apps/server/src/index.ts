import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDB } from './lib/db';
import { initSocket } from './socket';

const PORT = process.env.PORT ?? 5000;

/** Bootstraps the server: connects to MongoDB, attaches Socket.IO, starts listening. */
async function start(): Promise<void> {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
