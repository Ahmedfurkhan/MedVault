import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { explainAnomaly } from './aiExplain.js';

export async function evaluateRiskDashboard(userId) {
  const db = getDB();

  const pipeline = [
    { $match: { userId: new ObjectId(userId) } },
    {
      $facet: {
        offHoursLogs: [{ $match: { flags: 'OFF_HOURS' } }, { $count: 'count' }],
        viewBurstLogs: [{ $match: { flags: 'VIEW_BURST' } }, { $count: 'count' }],
        newDeviceLogs: [{ $match: { flags: 'NEW_DEVICE' } }, { $count: 'count' }],
        recentAlerts: [
          { $match: { isFlagged: true } },
          { $sort: { timestamp: -1 } },
          { $limit: 10 },
        ],
        trendData: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              accessCount: { $sum: 1 },
              flagCount: { $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 14 },
        ],
      },
    },
  ];

  const result = await db.collection('accessLogs').aggregate(pipeline).toArray();
  const data = result[0];

  const offHoursCount = data.offHoursLogs[0]?.count || 0;
  const viewBurstCount = data.viewBurstLogs[0]?.count || 0;
  const newDeviceCount = data.newDeviceLogs[0]?.count || 0;
  const flaggedLogs = data.recentAlerts || [];
  const trendData = data.trendData || [];

  const baseScore = Math.min(
    Math.max(10 + offHoursCount * 25 + viewBurstCount * 40 + newDeviceCount * 30, 0),
    100
  );
  const severityLabel =
    baseScore > 70 ? 'High Risk' : baseScore > 30 ? 'Moderate Risk' : 'Low Risk';

  for (const log of flaggedLogs) {
    if (!log.aiSeverity) {
      const ai = await explainAnomaly(log);
      log.aiExplanation = ai.explanation;
      log.aiSeverity = ai.severity;
      log.aiAction = ai.action;
      // Only cache genuine AI output; a transient failure falls back but stays
      // unpersisted so it retries on the next dashboard load.
      if (ai.generated) {
        await db.collection('accessLogs').updateOne(
          { _id: log._id },
          {
            $set: {
              aiExplanation: ai.explanation,
              aiSeverity: ai.severity,
              aiAction: ai.action,
            },
          }
        );
      }
    }
  }

  return {
    riskScore: baseScore,
    severityLabel,
    offHoursCount,
    viewBurstCount,
    newDeviceCount,
    alerts: flaggedLogs,
    trendData,
  };
}
