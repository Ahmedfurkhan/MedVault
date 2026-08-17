import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 1_000_000; // ~1 MB

// Validate an incoming avatar data URL. Returns { ok, value } or { ok:false, error }.
function validateAvatar(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return { ok: false, error: 'Invalid image.' };
  const mimeType = match[1].toLowerCase();
  if (!AVATAR_TYPES.includes(mimeType))
    return { ok: false, error: 'Profile photo must be a PNG, JPG, or WEBP image.' };
  const size = Math.floor((match[2].length * 3) / 4);
  if (size > MAX_AVATAR_BYTES)
    return { ok: false, error: 'Profile photo must be 1 MB or smaller.' };
  return { ok: true, value: dataUrl };
}

router.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, specialty } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required.' });

    const userRole = role === 'doctor' ? 'doctor' : 'patient';

    const db = getDB();
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email in use.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      preferences: { offHoursStart: 23, offHoursEnd: 5 },
    };
    if (userRole === 'doctor') user.specialty = (specialty || 'Physician').slice(0, 80);
    const result = await db.collection('users').insertOne(user);

    const safeUser = {
      _id: result.insertedId,
      name,
      email: user.email,
      role: userRole,
      specialty: user.specialty,
    };
    req.login(safeUser, (err) =>
      err ? res.status(500).json({ error: 'Login failed' }) : res.status(201).json(safeUser)
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/auth/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: info.message || 'Login failed.' });
    req.login(user, (loginErr) => {
      if (loginErr) return res.status(500).json({ error: loginErr.message });
      const safeUser = { ...user };
      delete safeUser.password;
      return res.json(safeUser);
    });
  })(req, res, next);
});

router.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, avatar, removeAvatar, offHoursStart, offHoursEnd } = req.body;
    const update = {};
    const unset = {};
    if (name) update.name = name;
    if (phone !== undefined) update.phone = String(phone).slice(0, 40);
    if (avatar) {
      const parsed = validateAvatar(avatar);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      update.avatar = parsed.value;
    } else if (removeAvatar) {
      unset.avatar = '';
    }
    if (offHoursStart !== undefined && offHoursEnd !== undefined) {
      update.preferences = {
        offHoursStart: Number(offHoursStart),
        offHoursEnd: Number(offHoursEnd),
      };
    }

    const db = getDB();
    const mutation = { $set: update };
    if (Object.keys(unset).length) mutation.$unset = unset;
    await db.collection('users').updateOne({ _id: new ObjectId(req.user._id) }, mutation);

    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
    const safeUser = { ...user };
    delete safeUser.password;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both current and new passwords are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Your current password is incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne({ _id: user._id }, { $set: { password: hashed } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/auth/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const db = getDB();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    // Always return a generic message so we never reveal which emails are registered.
    const generic = {
      message: 'If that email is registered, a password reset link has been generated.',
    };
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db
      .collection('users')
      .updateOne({ _id: user._id }, { $set: { resetTokenHash: tokenHash, resetTokenExp } });

    const response = { ...generic };
    // In production the link below would be emailed to the user. Outside production we
    // return it so the reset flow is demoable without an email service or new secrets.
    if (process.env.NODE_ENV !== 'production') {
      response.devToken = token;
      response.devResetUrl = `${process.env.FRONTEND_URL || ''}/?token=${token}`;
    }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/auth/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'Token and new password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const db = getDB();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await db
      .collection('users')
      .findOne({ resetTokenHash: tokenHash, resetTokenExp: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { resetTokenHash: '', resetTokenExp: '' },
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/auth/logout', (req, res) => req.logout(() => res.json({ success: true })));
router.get('/api/auth/me', (req, res) =>
  req.isAuthenticated() ? res.json(req.user) : res.status(401).json({ error: 'Not authenticated' })
);

export default router;
