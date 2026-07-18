import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/medvault');

async function seed() {
  await client.connect();
  const db = client.db('medvault');
  await db.collection('users').deleteMany({});
  await db.collection('records').deleteMany({});
  await db.collection('accessLogs').deleteMany({});

  const pwd = await bcrypt.hash('password123', 10);
  const user = {
    _id: new ObjectId(),
    name: 'Maria Chen',
    email: 'maria@gmail.com',
    password: pwd,
    preferences: { offHoursStart: 23, offHoursEnd: 5 },
  };
  await db.collection('users').insertOne(user);

  // create many records for the user (1,000)
  const roles = ['Dr. Evans', 'Dr. Smith', 'Nurse Joy', 'Admin Staff'];
  const knownDevices = ['Chrome on Windows', 'Safari on iPhone', 'Chrome on Mac'];
  const now = Date.now();

  const records = [];
  const logs = [];
  for (let r = 0; r < 1000; r++) {
    const recId = new ObjectId();
    const rec = {
      _id: recId,
      userId: user._id,
      title: `Record #${r + 1}`,
      type: ['Condition', 'Lab Result', 'Visit Note'][r % 3],
      date: new Date(now - r * 24 * 3600 * 1000),
      notes: `Synthetic record ${r + 1}`,
    };
    records.push(rec);

    // add 1-3 access logs per record
    const logsForRecord = 1 + (r % 3);
    for (let i = 0; i < logsForRecord; i++) {
      const idx = r * 3 + i;
      const isOffHours = idx % 100 === 0;
      const isNewDevice = idx % 150 === 0 && !isOffHours;
      const timeOffset = now - idx * 3600 * 1000;
      const date = new Date(timeOffset);
      if (isOffHours) date.setHours(3);

      const flags = [];
      if (isOffHours) flags.push('OFF_HOURS');
      if (isNewDevice) flags.push('NEW_DEVICE');

      logs.push({
        userId: user._id,
        recordId: recId.toString(),
        accessorName: roles[idx % roles.length],
        accessorRole: 'Clinical',
        timestamp: date,
        ipAddress: `192.168.1.${idx % 255}`,
        device: isNewDevice
          ? 'Unrecognized device (Linux)'
          : knownDevices[idx % knownDevices.length],
        accessType: 'view',
        isFlagged: flags.length > 0,
        flags,
      });
    }
  }

  await db.collection('records').insertMany(records);
  await db.collection('accessLogs').insertMany(logs);
  console.log(
    `Seeded User (maria@gmail.com / password123), ${records.length} records and ${logs.length} logs.`
  );
  process.exit(0);
}
seed();
