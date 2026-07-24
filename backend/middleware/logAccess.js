import { getDB } from '../config/db.js';

export default function logAccess(accessType) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
      res.json = originalJson;
      Promise.resolve().then(async () => {
        try {
          const recordId = req.params.id || (data && data._id ? data._id.toString() : null);
          if (!recordId) return;

          const db = getDB();
          const logEntry = {
            userId: req.user._id,
            recordId,
            // REVIEW: accessorName/accessorRole are taken straight from client-supplied
            // headers with no validation, so any caller can write arbitrary text into
            // their own access log (e.g. someone else's name, HTML, etc).
            accessorName: req.headers['x-simulated-accessor'] || 'Unknown',
            accessorRole: req.headers['x-simulated-role'] || 'System',
            timestamp: new Date(),
            ipAddress: req.ip || '127.0.0.1',
            device: req.headers['user-agent'] || 'Unknown Device',
            accessType,
            isFlagged: false,
            flags: [],
            aiExplanation: null,
          };

          const currentHour = logEntry.timestamp.getHours();
          const offStart = req.user.preferences?.offHoursStart || 23;
          const offEnd = req.user.preferences?.offHoursEnd || 5;
          // REVIEW: this OR only makes sense when offStart > offEnd (an overnight
          // range that wraps past midnight, e.g. 23 -> 5). The Settings UI lets a user
          // pick any 0-23 pair with no ordering constraint - e.g. offStart=9, offEnd=17
          // makes this `hour >= 9 || hour < 17`, which is true for every hour of the day.
          if (currentHour >= offStart || currentHour < offEnd) {
            logEntry.isFlagged = true;
            logEntry.flags.push('OFF_HOURS');
          }

          const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
          const recentViews = await db.collection('accessLogs').countDocuments({
            userId: req.user._id,
            recordId,
            timestamp: { $gte: tenMinsAgo },
          });
          if (recentViews >= 3) {
            logEntry.isFlagged = true;
            logEntry.flags.push('VIEW_BURST');
          }

          // New-device check: flag the first time we ever see this device for the user.
          const seenDevice = await db.collection('accessLogs').countDocuments({
            userId: req.user._id,
            device: logEntry.device,
          });
          if (seenDevice === 0) {
            logEntry.isFlagged = true;
            logEntry.flags.push('NEW_DEVICE');
          }

          await db.collection('accessLogs').insertOne(logEntry);
        } catch (err) {
          console.error('Logging failed:', err);
        }
      });
      return originalJson.call(this, data);
    };
    next();
  };
}
