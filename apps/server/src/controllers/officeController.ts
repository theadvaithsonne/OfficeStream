import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { Types } from 'mongoose';
import { Office } from '../models/Office';
import { User } from '../models/User';
import { createNotification } from './notificationController';
import { INVITE_CODE_TTL_MS, INVITE_CODE_LENGTH, USER_ROLES } from '../lib/constants';

/** Converts a display name into a URL-safe slug (lowercase, hyphen-separated). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Finds a unique slug by appending an incrementing suffix when collisions occur. */
async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 1;
  while (await Office.findOne({ slug })) {
    slug = `${base}-${attempt++}`;
  }
  return slug;
}

/** POST /api/offices — creates a new office and assigns the caller as owner. */
export async function createOffice(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ message: 'Office name is required' });
    return;
  }

  const userId = req.user!.userId;
  const caller = await User.findById(userId);

  if (caller?.officeId) {
    res.status(400).json({ message: 'You already belong to an office' });
    return;
  }

  const slug = await uniqueSlug(slugify(name));

  const office = await Office.create({
    name: name.trim(),
    slug,
    ownerId: userId,
    members: [userId],
  });

  await User.findByIdAndUpdate(userId, { officeId: office._id, role: 'owner' });

  res.status(201).json({ office });
}

/** POST /api/offices/:id/invite — generates a time-limited invite code for the office. */
export async function generateInvite(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  const office = await Office.findById(id);
  if (!office) {
    res.status(404).json({ message: 'Office not found' });
    return;
  }

  const caller = await User.findById(userId);
  const isAdminOrOwner =
    office.ownerId.toString() === userId || caller?.role === 'admin';

  if (!isAdminOrOwner) {
    res.status(403).json({ message: 'Only admins can generate invite codes' });
    return;
  }

  const code = nanoid(INVITE_CODE_LENGTH);
  const expiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS);
  const { maxUses } = (req.body ?? {}) as { maxUses?: number };

  office.inviteCodes.push({ code, createdBy: office.ownerId, expiresAt, uses: 0, maxUses });
  await office.save();

  res.json({ code, expiresAt });
}

/** POST /api/offices/join — joins an office using a valid invite code. */
export async function joinOffice(req: Request, res: Response): Promise<void> {
  const { code } = req.body as { code?: string };
  if (!code) {
    res.status(400).json({ message: 'Invite code is required' });
    return;
  }

  const userId = req.user!.userId;
  const user = await User.findById(userId);

  if (user?.officeId) {
    res.status(400).json({ message: 'You already belong to an office' });
    return;
  }

  const office = await Office.findOne({ 'inviteCodes.code': code });
  if (!office) {
    res.status(404).json({ message: 'Invalid invite code' });
    return;
  }

  const invite = office.inviteCodes.find((c) => c.code === code);
  if (!invite) {
    res.status(404).json({ message: 'Invalid invite code' });
    return;
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    res.status(400).json({ message: 'Invite code has expired' });
    return;
  }
  if (invite.maxUses != null && invite.uses >= invite.maxUses) {
    res.status(400).json({ message: 'Invite code has reached its maximum uses' });
    return;
  }
  if (office.members.map((m) => m.toString()).includes(userId)) {
    res.status(400).json({ message: 'You are already a member of this office' });
    return;
  }

  invite.uses += 1;
  office.members.push(user!._id as Types.ObjectId);
  await office.save();

  await User.findByIdAndUpdate(userId, { officeId: office._id, role: 'member' });

  await createNotification({
    userId: office.ownerId.toString(),
    type: 'member_joined',
    title: 'New member joined',
    body: `${user!.name} joined your office`,
    meta: { newMemberId: userId },
  });

  const populated = await Office.findById(office._id).populate(
    'members',
    'name email avatar status role'
  );
  res.json({ office: populated });
}

/** GET /api/offices/me — returns the caller's office with fully populated members. */
export async function getMyOffice(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user?.officeId) {
    res.status(404).json({ message: 'You do not belong to any office' });
    return;
  }

  const office = await Office.findById(user.officeId).populate(
    'members',
    'name email avatar status role'
  );
  if (!office) {
    res.status(404).json({ message: 'Office not found' });
    return;
  }

  res.json({ office });
}

/** POST /api/offices/:id/add-member — adds a user to the office by email (admin/owner only). */
export async function addMemberByEmail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { email } = req.body as { email?: string };
  const callerId = req.user!.userId;

  if (!email?.trim()) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  const office = await Office.findById(id);
  if (!office) { res.status(404).json({ message: 'Office not found' }); return; }

  const caller = await User.findById(callerId);
  const isAdminOrOwner = office.ownerId.toString() === callerId || caller?.role === 'admin';
  if (!isAdminOrOwner) { res.status(403).json({ message: 'Only admins can add members' }); return; }

  const target = await User.findOne({ email: email.trim().toLowerCase() });
  if (!target) { res.status(404).json({ message: 'No user found with that email' }); return; }

  if (office.members.map((m) => m.toString()).includes(String(target._id))) {
    res.status(400).json({ message: 'User is already a member of this office' });
    return;
  }

  office.members.push(target._id as Types.ObjectId);
  await office.save();
  await User.findByIdAndUpdate(target._id, { officeId: office._id, role: 'member' });

  await createNotification({
    userId: String(target._id),
    type: 'invite_received',
    title: 'Added to office',
    body: `${caller!.name} added you to ${office.name}`,
    meta: { officeId: String(office._id) },
  });

  res.json({ message: `${target.name} added to ${office.name}` });
}

/** PATCH /api/offices/:id/members/:memberId/role — changes a member's role (owner only). */
export async function updateMemberRole(req: Request, res: Response): Promise<void> {
  const { id, memberId } = req.params;
  const { role } = req.body as { role: string };
  const userId = req.user!.userId;

  const office = await Office.findById(id);
  if (!office) {
    res.status(404).json({ message: 'Office not found' });
    return;
  }
  if (office.ownerId.toString() !== userId) {
    res.status(403).json({ message: 'Only the owner can change member roles' });
    return;
  }

  type AssignableRole = 'admin' | 'member';
  const assignable: AssignableRole[] = ['admin', 'member'];
  if (!assignable.includes(role as AssignableRole)) {
    res.status(400).json({ message: `Role must be one of: ${assignable.join(', ')}` });
    return;
  }

  await User.findByIdAndUpdate(memberId, { role });
  res.json({ message: 'Role updated' });
}
