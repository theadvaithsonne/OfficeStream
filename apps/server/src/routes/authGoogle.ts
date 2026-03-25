import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRY } from '../lib/constants';

const router = Router();

/** GET /api/auth/google — kicks off Google OAuth redirect */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: true })
);

/** GET /api/auth/google/callback — Google redirects here after consent */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    const { userId, email } = req.user!;

    const accessToken = jwt.sign(
      { userId, email },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const frontendUrl = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }
);

export default router;
