import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthPayload } from '../middleware/auth';
import {
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  REFRESH_TOKEN_MAX_SESSIONS,
  REFRESH_COOKIE_PATH,
  USER_STATUSES,
} from '../lib/constants';

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Signs a short-lived JWT access token for the given payload. */
function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/** Signs a long-lived JWT refresh token for the given payload. */
function signRefreshToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/** Sets the refresh token as an httpOnly cookie scoped to /api/auth. */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: REFRESH_COOKIE_PATH,
  });
}

// ─── Route handlers ───────────────────────────────────────────────────────────

/** POST /api/auth/register — creates a new account and returns tokens. */
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as Record<string, string>;

  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email, and password are required' });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: 'Email already in use' });
    return;
  }

  const user = await User.create({ name, email, password });
  const payload: AuthPayload = { userId: String(user._id), email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokens.push(refreshToken);
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ accessToken, user });
}

/** POST /api/auth/login — validates credentials and returns tokens. */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as Record<string, string>;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const payload: AuthPayload = { userId: String(user._id), email: user.email };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  user.refreshTokens.push(refreshToken);
  if (user.refreshTokens.length > REFRESH_TOKEN_MAX_SESSIONS) user.refreshTokens.shift();
  await user.save();

  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user });
}

/**
 * POST /api/auth/refresh — rotates the refresh token and returns a new access token.
 * Detects token reuse and revokes all sessions when reuse is suspected.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const token: string | undefined = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ message: 'No refresh token' });
    return;
  }

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as AuthPayload;
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user || !user.refreshTokens.includes(token)) {
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }
    res.clearCookie('refreshToken', { path: REFRESH_COOKIE_PATH });
    res.status(401).json({ message: 'Refresh token reuse detected' });
    return;
  }

  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  const newRefreshToken = signRefreshToken({ userId: String(user._id), email: user.email });
  user.refreshTokens.push(newRefreshToken);
  await user.save();

  const newAccessToken = signAccessToken({ userId: String(user._id), email: user.email });
  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken: newAccessToken });
}

/** POST /api/auth/logout — invalidates the current refresh token and clears the cookie. */
export async function logout(req: Request, res: Response): Promise<void> {
  const token: string | undefined = req.cookies?.refreshToken;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as AuthPayload;
      const user = await User.findById(payload.userId);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
        await user.save();
      }
    } catch {
      // Token already invalid — just clear the cookie
    }
  }

  res.clearCookie('refreshToken', { path: REFRESH_COOKIE_PATH });
  res.json({ message: 'Logged out' });
}

/** GET /api/auth/me — returns the authenticated user's profile. */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ user });
}

/** PATCH /api/auth/me/status — updates the authenticated user's presence status. */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as { status: string };
  if (!USER_STATUSES.includes(status as (typeof USER_STATUSES)[number])) {
    res.status(400).json({ message: `Status must be one of: ${USER_STATUSES.join(', ')}` });
    return;
  }
  const user = await User.findByIdAndUpdate(req.user!.userId, { status }, { new: true });
  res.json({ user });
}
