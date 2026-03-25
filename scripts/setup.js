/**
 * Post-install setup script.
 * - Copies .env.example → .env if .env doesn't exist (server)
 * - Creates .env.local for web if missing
 * - Ensures recordings directory exists
 * - Checks Docker availability
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'apps', 'server');
const WEB_DIR = path.join(ROOT, 'apps', 'web');
const RECORDINGS_DIR = path.join(SERVER_DIR, 'recordings');

// ── 1. Server .env ──────────────────────────────────────────────
const serverEnv = path.join(SERVER_DIR, '.env');
const serverEnvExample = path.join(SERVER_DIR, '.env.example');

if (!fs.existsSync(serverEnv) && fs.existsSync(serverEnvExample)) {
  fs.copyFileSync(serverEnvExample, serverEnv);
  console.log('[setup] Created apps/server/.env from .env.example');
} else if (fs.existsSync(serverEnv)) {
  console.log('[setup] apps/server/.env already exists — skipping');
}

// ── 2. Web .env.local ───────────────────────────────────────────
const webEnvLocal = path.join(WEB_DIR, '.env.local');

if (!fs.existsSync(webEnvLocal)) {
  const content = [
    'NEXT_PUBLIC_API_URL=http://localhost:5000',
    'NEXT_PUBLIC_NODE_ENV=development',
    '',
  ].join('\n');
  fs.writeFileSync(webEnvLocal, content);
  console.log('[setup] Created apps/web/.env.local with defaults');
} else {
  console.log('[setup] apps/web/.env.local already exists — skipping');
}

// ── 3. Recordings directory ─────────────────────────────────────
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
const gitkeep = path.join(RECORDINGS_DIR, '.gitkeep');
if (!fs.existsSync(gitkeep)) {
  fs.writeFileSync(gitkeep, '');
}
console.log('[setup] apps/server/recordings/ ready');

// ── 4. Check Docker ─────────────────────────────────────────────
try {
  execSync('docker --version', { stdio: 'pipe' });
  console.log('[setup] Docker found');

  try {
    execSync('docker compose version', { stdio: 'pipe' });
    console.log('[setup] Docker Compose found');
  } catch {
    console.warn('[setup] WARNING: docker compose not found. Install Docker Compose v2.');
  }
} catch {
  console.warn('');
  console.warn('╔══════════════════════════════════════════════════════════════╗');
  console.warn('║  WARNING: Docker is not installed!                          ║');
  console.warn('║                                                             ║');
  console.warn('║  OfficeStream needs Docker Desktop for:                     ║');
  console.warn('║    • LiveKit Server (video/audio routing)                   ║');
  console.warn('║    • LiveKit Egress (recording)                             ║');
  console.warn('║    • Redis (message bus)                                    ║');
  console.warn('║                                                             ║');
  console.warn('║  Install from: https://www.docker.com/products/docker-desktop║');
  console.warn('║  Then run: npm run dev                                      ║');
  console.warn('╚══════════════════════════════════════════════════════════════╝');
  console.warn('');
}

console.log('[setup] Done!');
