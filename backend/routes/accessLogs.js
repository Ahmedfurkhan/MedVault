import { Router } from 'express';
import { getDB } from '../config/db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
router.get('/api/access-logs', requireAuth, async (req, res) => {
  const { recordId } = req.query;
  const logs = await getDB()
    .collection('accessLogs')
    .find({ recordId, userId: req.user._id })
    .sort({ timestamp: -1 })
    .toArray();
  res.json(logs);
});
export default router;
