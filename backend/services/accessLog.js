import { getDB } from '../config/db.js';

// Create an access-log entry for a patient's record and apply the anomaly
// flag rules (off-hours by the PATIENT's window, view-burst, new-device).
// Used by both the patient's self-view demo and real doctor views, so the
// flagging stays consistent everywhere.
export async function recordAccess({
  patient,
  recordId,
  accessorName,
  accessorRole,
  ipAddress,
  device,
  accessType = 'view',
}) {
  const db = getDB();
  const logEntry = {
    userId: patient._id,
    recordId: String(recordId),
    accessorName: accessorName || 'Unknown',
    accessorRole: accessorRole || 'System',
    timestamp: new Date(),
    ipAddress: ipAddress || '127.0.0.1',
    device: device || 'Unknown Device',
    accessType,
    isFlagged: false,
    flags: [],
    aiExplanation: null,
  };

  const hour = logEntry.timestamp.getHours();
  const offStart = patient.preferences?.offHoursStart ?? 23;
  const offEnd = patient.preferences?.offHoursEnd ?? 5;
  if (hour >= offStart || hour < offEnd) {
    logEntry.isFlagged = true;
    logEntry.flags.push('OFF_HOURS');
  }

  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentViews = await db.collection('accessLogs').countDocuments({
    userId: patient._id,
    recordId: logEntry.recordId,
    timestamp: { $gte: tenMinsAgo },
  });
  if (recentViews >= 3) {
    logEntry.isFlagged = true;
    logEntry.flags.push('VIEW_BURST');
  }

  const seenDevice = await db.collection('accessLogs').countDocuments({
    userId: patient._id,
    device: logEntry.device,
  });
  if (seenDevice === 0) {
    logEntry.isFlagged = true;
    logEntry.flags.push('NEW_DEVICE');
  }

  await db.collection('accessLogs').insertOne(logEntry);
  return logEntry;
}
