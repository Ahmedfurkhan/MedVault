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

const ALLOWED_TYPES = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg' };
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

// Parse an incoming attachment (a data URL string: "data:<mime>;base64,<data>").
// Returns { ok, value } on success or { ok:false, error } on a bad file.
function parseAttachment(dataUrl, fileName) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return { ok: false, error: 'Invalid file data.' };
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_TYPES[mimeType])
    return { ok: false, error: 'Only PDF, JPG, and PNG files are allowed.' };
  const data = match[2];
  const size = Math.floor((data.length * 3) / 4); // approx decoded byte size
  if (size > MAX_ATTACHMENT_BYTES) return { ok: false, error: 'File must be 5 MB or smaller.' };
  return {
    ok: true,
    value: {
      data,
      mimeType,
      fileName: (fileName || `report.${ALLOWED_TYPES[mimeType]}`).slice(0, 200),
      size,
    },
  };
}

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
  // Exclude the (potentially large) attachment blob from list payloads; the
  // attachment metadata (fileName/mimeType/size) is still returned.
  const records = await collection
    .find(filter)
    .project({ 'attachment.data': 0 })
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
    .findOne(
      { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) },
      { projection: { 'attachment.data': 0 } }
    );
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

// Stream the stored attachment back as the original file (inline, so browsers
// preview PDFs/images and can download them).
router.get('/api/records/:id/attachment', async (req, res) => {
  const record = await getDB()
    .collection('records')
    .findOne({ _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) });
  if (!record || !record.attachment) return res.status(404).json({ error: 'No attachment' });
  const { data, mimeType, fileName } = record.attachment;
  const buffer = Buffer.from(data, 'base64');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
  res.send(buffer);
});

router.post('/api/records', async (req, res) => {
  const { title, type, date, notes, attachment, attachmentName } = req.body;
  const newRecord = {
    userId: new ObjectId(req.user._id),
    title,
    type,
    date: new Date(date || Date.now()),
    notes,
  };
  if (attachment) {
    const parsed = parseAttachment(attachment, attachmentName);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    newRecord.attachment = parsed.value;
  }
  const result = await getDB().collection('records').insertOne(newRecord);
  // Return the record without the (large) base64 blob.
  const response = {
    _id: result.insertedId,
    userId: newRecord.userId,
    title: newRecord.title,
    type: newRecord.type,
    date: newRecord.date,
    notes: newRecord.notes,
  };
  if (newRecord.attachment) {
    response.attachment = {
      fileName: newRecord.attachment.fileName,
      mimeType: newRecord.attachment.mimeType,
      size: newRecord.attachment.size,
    };
  }
  res.status(201).json(response);
});

router.put('/api/records/:id', async (req, res) => {
  try {
    const { title, type, date, notes, attachment, attachmentName, removeAttachment } = req.body;
    const updateData = { title, type, notes, updatedAt: new Date() };
    if (date) updateData.date = new Date(date);

    const update = { $set: updateData };
    if (attachment) {
      const parsed = parseAttachment(attachment, attachmentName);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      updateData.attachment = parsed.value;
    } else if (removeAttachment) {
      update.$unset = { attachment: '' };
    }

    const result = await getDB()
      .collection('records')
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user._id) },
        update,
        { returnDocument: 'after', projection: { 'attachment.data': 0 } }
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
