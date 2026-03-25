import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User } from '../models/User';
import { AuthPayload } from '../middleware/auth';

/** Configures Passport with Google OAuth2 strategy. Call once at app startup. */
export function configurePassport(): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL: `${process.env.API_URL ?? 'http://localhost:5000'}/api/auth/google/callback`,
        },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          // Find by googleId first, then by email (link existing account)
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              if (!user.avatar && profile.photos?.[0]?.value) {
                user.avatar = profile.photos[0].value;
              }
              await user.save();
            } else {
              // Brand-new user via Google
              user = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                avatar: profile.photos?.[0]?.value,
                // Password not required for OAuth users — set a placeholder
                password: `google_oauth_${profile.id}`,
              });
            }
          }

          const payload: AuthPayload = { userId: String(user._id), email: user.email };
          done(null, payload);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

    // Minimal serialise/deserialise — only used during the OAuth redirect dance
    passport.serializeUser((user, done) => done(null, user.userId));
    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await User.findById(id);
        const payload: AuthPayload | null = user ? { userId: String(user._id), email: user.email } : null;
        done(null, payload);
      } catch (err) {
        done(err);
      }
    });
  } else {
    console.warn('[passport] GOOGLE_CLIENT_ID/SECRET not set — Google OAuth disabled');
  }
}
