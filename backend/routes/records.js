import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import requireAuth from '../middleware/requireAuth.js';
import logAccess from '../middleware/logAccess.js';

const router = Router();
// Scope auth to the record endpoints only. This router is mounted at '/', so an
// unscoped router.use(requireAuth) would 401 every request - including the SPA's
// static files and index.html in production.
router.use('/api/records', requireAuth);

router.get('/api/records', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const q = (req.query.q || '').trim();

  const filter = { userId: new ObjectId(req.user._id) };
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    filter.$or = [{ title: rx }, { type: rx }, { notes: rx }];
  }

  const collection = getDB().collection('records');
  const total = await collection.countDocuments(filter);
  const records = await collection
    .find(filter)
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  res.json({
    records,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

router.get('/api/records/:id', logAccess('view'), async (req, res) => {
  const record = await getDB()
    .collection('records')
    .findOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) });
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

router.post('/api/records', async (req, res) => {
  const { title, type, date, notes } = req.body;
  const newRecord = {
    userId: new ObjectId(req.user._id),
    title,
    type,
    date: new Date(date || Date.now()),
    notes,
  };
  const result = await getDB().collection('records').insertOne(newRecord);
  res.status(201).json({ _id: result.insertedId, ...newRecord });
});

router.put('/api/records/:id', async (req, res) => {
  try {
    const { title, type, date, notes } = req.body;
    const updateData = { title, type, notes, updatedAt: new Date() };
    if (date) updateData.date = new Date(date);

    const result = await getDB()
      .collection('records')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
    if (!result) return res.status(404).json({ error: 'Record not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/records/:id', async (req, res) => {
  const result = await getDB()
    .collection('records')
    .deleteOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;
