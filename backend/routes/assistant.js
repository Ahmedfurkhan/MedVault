import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import requireAuth from '../middleware/requireAuth.js';
import { answerQuestion } from '../services/assistant.js';

const router = Router();

router.post('/api/assistant', requireAuth, async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question || !question.trim())
      return res.status(400).json({ error: 'A question is required.' });

    const db = getDB();
    const userId = new ObjectId(req.user._id);

    const [totalRecords, totalAccessEvents, flaggedEvents, recentLogs] = await Promise.all([
      db.collection('records').countDocuments({ userId }),
      db.collection('accessLogs').countDocuments({ userId }),
      db.collection('accessLogs').countDocuments({ userId, isFlagged: true }),
      db.collection('accessLogs').find({ userId }).sort({ timestamp: -1 }).limit(25).toArray(),
    ]);

    // Join record titles for readable grounding.
    const recordIds = [...new Set(recentLogs.map((l) => l.recordId))]
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const records = await db
      .collection('records')
      .find({ _id: { $in: recordIds } })
      .toArray();
    const titleById = Object.fromEntries(records.map((r) => [r._id.toString(), r.title]));

    const context = {
      summary: { totalRecords, totalAccessEvents, flaggedEvents },
      recentAccessEvents: recentLogs.map((l) => ({
        record: titleById[l.recordId] || 'Unknown record',
        accessedBy: l.accessorName,
        role: l.accessorRole,
        when: l.timestamp,
        ip: l.ipAddress,
        flagged: l.isFlagged,
        flags: l.flags,
      })),
    };

    const answer = await answerQuestion(
      question.trim(),
      context,
      Array.isArray(history) ? history : []
    );
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
