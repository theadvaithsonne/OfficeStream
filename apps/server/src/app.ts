import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { configurePassport } from './lib/passport';
import { swaggerSpec } from './lib/swagger';
import authRoutes from './routes/auth';
import authGoogleRoutes from './routes/authGoogle';
import officeRoutes from './routes/offices';
import notificationRoutes from './routes/notifications';
import tokenRoutes from './routes/token';
import recordingRoutes from './routes/recording';
import messageRoutes from './routes/messages';

configurePassport();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Session needed for Passport OAuth state verification only
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'officestream-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 10 * 60 * 1000 },
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/auth', authGoogleRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/recording', recordingRoutes);
app.use('/api/messages', messageRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

export default app;
