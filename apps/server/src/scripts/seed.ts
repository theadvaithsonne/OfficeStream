/**
 * Development seed script.
 * Creates a default admin user and an "OfficeStream HQ" office if they don't exist.
 *
 * Usage: npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { User } from '../models/User';
import { Office } from '../models/Office';

const SEED_EMAIL = 'admin@officestream.com';
const SEED_PASSWORD = 'admin123';
const SEED_NAME = 'Admin';
const SEED_OFFICE_NAME = 'OfficeStream HQ';

async function getUri(): Promise<string> {
  // If a running embedded MongoDB URI was saved, use it
  const uriFile = path.join(__dirname, '../../.data/mongodb-uri');
  if (fs.existsSync(uriFile)) {
    return fs.readFileSync(uriFile, 'utf-8').trim();
  }
  // Fall back to .env MONGODB_URI
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI and no running embedded MongoDB found');
  return uri;
}

async function seed(): Promise<void> {
  const uri = await getUri();
  await mongoose.connect(uri);
  console.log('[seed] Connected to MongoDB');

  // Upsert admin user
  let admin = await User.findOne({ email: SEED_EMAIL });

  if (admin) {
    console.log('[seed] Admin user already exists — skipping user creation');
  } else {
    admin = await User.create({
      name: SEED_NAME,
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      role: 'owner',
      status: 'offline',
    });
    console.log(`[seed] Created admin user: ${SEED_EMAIL}`);
  }

  // Upsert default office
  let office = await Office.findOne({ slug: 'officestream-hq' });

  if (office) {
    console.log('[seed] Default office already exists — skipping office creation');
  } else {
    office = await Office.create({
      name: SEED_OFFICE_NAME,
      slug: 'officestream-hq',
      ownerId: admin._id,
      members: [admin._id],
      maxRoomParticipants: 100,
    });
    console.log(`[seed] Created office: ${SEED_OFFICE_NAME}`);
  }

  // Link admin to office if not already linked
  if (!admin.officeId || admin.officeId.toString() !== office._id.toString()) {
    await User.findByIdAndUpdate(admin._id, {
      officeId: office._id,
      role: 'owner',
    });
    console.log('[seed] Linked admin to office');
  }

  console.log('\n✓ Seed complete');
  console.log(`  Email:    ${SEED_EMAIL}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
  console.log(`  Office:   ${SEED_OFFICE_NAME}\n`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
