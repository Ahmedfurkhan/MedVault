import { Router } from 'express';
import { evaluateRiskDashboard } from '../services/anomaly.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
router.get('/api/risk-dashboard', requireAuth, async (req, res) => {
  try {
    const data = await evaluateRiskDashboard(req.user._id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
export default router;
