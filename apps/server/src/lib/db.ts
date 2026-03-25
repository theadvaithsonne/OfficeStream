import mongoose from 'mongoose';
import path from 'path';

/** Connects to MongoDB.
 *  - In development (NODE_ENV !== 'production'), if no external MongoDB is reachable within 3 s
 *    it falls back to an embedded MongoMemoryServer that persists data in .data/mongodb.
 *  - In production, MONGODB_URI must be set.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!uri) throw new Error('MONGODB_URI is not set');
    await mongoose.connect(uri);
    console.log('[db] MongoDB connected');
    return;
  }

  // Development: try the configured URI first; fall back to embedded if unreachable
  if (uri && !uri.includes('localhost') && !uri.includes('127.0.0.1')) {
    await mongoose.connect(uri);
    console.log('[db] MongoDB connected (external)');
    return;
  }

  // Check if the local MongoDB is already running
  let localReachable = false;
  if (uri) {
    try {
      await Promise.race([
        mongoose.connect(uri),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
      ]);
      localReachable = true;
      console.log('[db] MongoDB connected (local)');
    } catch {
      // Local MongoDB not available — fall back to embedded
      await mongoose.disconnect().catch(() => {});
    }
  }

  if (!localReachable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const dbPath = path.join(__dirname, '../../.data/mongodb');
    const mongod = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger' },
    });
    const embeddedUri = mongod.getUri();
    // Persist URI so other processes (e.g. seed script) can connect without starting a second instance
    const fs = require('fs') as typeof import('fs');
    fs.writeFileSync(path.join(__dirname, '../../.data/mongodb-uri'), embeddedUri);
    await mongoose.connect(embeddedUri);
    console.log(`[db] Embedded MongoDB started — data at ${dbPath}`);
  }
}
