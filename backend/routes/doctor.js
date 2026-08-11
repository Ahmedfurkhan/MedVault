import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import requireDoctor from '../middleware/requireDoctor.js';
import { recordAccess } from '../services/accessLog.js';

const router = Router();
router.use('/api/doctor', requireDoctor);

// List patients the doctor can open (everyone who isn't a doctor), with search.
router.get('/api/doctor/patients', async (req, res) => {
  const q = (req.query.q || '').trim();
  const filter = { role: { $ne: 'doctor' } };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const patients = await getDB()
    .collection('users')
    .find(filter, { projection: { name: 1, email: 1 } })
    .sort({ name: 1 })
    .limit(100)
    .toArray();

  // Attach a lightweight record count for each patient.
  const withCounts = await Promise.all(
    patients.map(async (p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      recordCount: await getDB().collection('records').countDocuments({ userId: p._id }),
    }))
  );
  res.json(withCounts);
});

// A patient's records (read-only; attachment blob excluded from the list).
router.get('/api/doctor/patients/:patientId/records', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const q = (req.query.q || '').trim();
  const patientId = new ObjectId(req.params.patientId);

  const filter = { userId: patientId };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { type: rx }, { notes: rx }];
  }
  const collection = getDB().collection('records');
  const total = await collection.countDocuments(filter);
  const records = await collection
    .find(filter)
    .project({ 'attachment.data': 0 })
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  res.json({ records, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

// Open one record. This is a REAL clinical access: it writes an access-log
// entry (attributed to this doctor) that the patient then sees in their audit.
router.get('/api/doctor/patients/:patientId/records/:recordId', async (req, res) => {
  const db = getDB();
  const patientId = new ObjectId(req.params.patientId);
  const record = await db
    .collection('records')
    .findOne(
      { _id: new ObjectId(req.params.recordId), userId: patientId },
      { projection: { 'attachment.data': 0 } }
    );
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const patient = await db.collection('users').findOne({ _id: patientId });
  if (patient) {
    await recordAccess({
      patient,
      recordId: record._id,
      accessorName: req.user.name || 'Doctor',
      accessorRole: req.user.specialty || 'Physician',
      ipAddress: req.ip,
      device: req.headers['user-agent'],
      accessType: 'view',
    });
  }
  res.json(record);
});

// Serve a patient's report attachment to the doctor.
router.get('/api/doctor/patients/:patientId/records/:recordId/attachment', async (req, res) => {
  const record = await getDB()
    .collection('records')
    .findOne({
      _id: new ObjectId(req.params.recordId),
      userId: new ObjectId(req.params.patientId),
    });
  if (!record || !record.attachment) return res.status(404).json({ error: 'No attachment' });
  const { data, mimeType, fileName } = record.attachment;
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
  res.send(Buffer.from(data, 'base64'));
});

export default router;
