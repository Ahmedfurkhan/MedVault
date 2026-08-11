import { recordAccess } from '../services/accessLog.js';

// Patient self-view demo: after a record is returned, log a simulated access
// (the accessor identity comes from x-simulated-* headers) attributed to the
// logged-in patient. Delegates the flag rules to the shared recordAccess helper.
export default function logAccess(accessType) {
  return async (req, res, next) => {
    const originalJson = res.json;
    res.json = function (data) {
      res.json = originalJson;
      Promise.resolve().then(async () => {
        try {
          const recordId = req.params.id || (data && data._id ? data._id.toString() : null);
          if (!recordId) return;
          await recordAccess({
            patient: req.user,
            recordId,
            accessorName: req.headers['x-simulated-accessor'] || 'Unknown',
            accessorRole: req.headers['x-simulated-role'] || 'System',
            ipAddress: req.ip,
            device: req.headers['user-agent'],
            accessType,
          });
        } catch (err) {
          console.error('Logging failed:', err);
        }
      });
      return originalJson.call(this, data);
    };
    next();
  };
}
