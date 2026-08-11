import express from 'express';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import './config/passport.js';
import authRoutes from './routes/auth.js';
import recordRoutes from './routes/records.js';
import logRoutes from './routes/accessLogs.js';
import dashboardRoutes from './routes/dashboard.js';
import assistantRoutes from './routes/assistant.js';
import doctorRoutes from './routes/doctor.js';

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT || 5000);

// Raised limit so base64-encoded record attachments (PDF/JPG/PNG, up to ~5 MB) fit.
app.use(express.json({ limit: '8mb' }));

// Behind Render's proxy in production, trust X-Forwarded-Proto so `secure: 'auto'`
// can correctly detect HTTPS.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 86400000,
      // 'auto' = mark the cookie Secure only when the request is actually HTTPS.
      // This keeps login working over http://localhost even if NODE_ENV=production,
      // while still using Secure cookies on the HTTPS deploy.
      secure: 'auto',
      // The frontend is served from the same Express origin, so 'lax' is sufficient
      // and avoids the Secure-only requirement that 'none' imposes.
      sameSite: 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(authRoutes);
app.use(recordRoutes);
app.use(logRoutes);
app.use(dashboardRoutes);
app.use(assistantRoutes);
app.use(doctorRoutes);

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));

// Bind the port immediately so the app (and static SPA) is reachable, then connect
// to MongoDB. A DB hiccup logs an error instead of taking the whole service offline.
app.listen(port, () => console.log(`Server running on port ${port}`));
connectDB()
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('DB connection failed:', err));
