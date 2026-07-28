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

  // Realistic synthetic medical records, grouped by record type. Titles and notes
  // read like a real patient chart instead of "Record #1".
  const recordTemplates = {
    Condition: [
      {
        title: 'Type 2 Diabetes Mellitus',
        notes: 'Managed with metformin; monitor HbA1c quarterly.',
      },
      {
        title: 'Essential Hypertension',
        notes: 'Blood pressure controlled on lisinopril 10mg daily.',
      },
      {
        title: 'Asthma (Mild Persistent)',
        notes: 'Albuterol inhaler as needed; no recent exacerbations.',
      },
      { title: 'Hypothyroidism', notes: 'On levothyroxine; TSH within target range.' },
      { title: 'Migraine (Episodic)', notes: 'Prescribed sumatriptan for acute attacks.' },
      { title: 'GERD', notes: 'Symptoms improved with omeprazole and dietary changes.' },
      {
        title: 'Seasonal Allergic Rhinitis',
        notes: 'Responds well to antihistamines during spring.',
      },
      {
        title: 'Iron-deficiency Anemia',
        notes: 'Started oral iron; recheck ferritin in 3 months.',
      },
      {
        title: 'Osteoarthritis of the Knee',
        notes: 'Managed with physical therapy and NSAIDs as needed.',
      },
      {
        title: 'Hyperlipidemia',
        notes: 'LDL elevated; initiated atorvastatin and lifestyle counseling.',
      },
    ],
    'Lab Result': [
      { title: 'Complete Blood Count (CBC)', notes: 'All values within normal limits.' },
      { title: 'Lipid Panel', notes: 'Total cholesterol 210 mg/dL; LDL mildly elevated.' },
      { title: 'Hemoglobin A1c', notes: 'Result 6.8%; consistent with controlled diabetes.' },
      { title: 'Thyroid Panel (TSH)', notes: 'TSH 2.1 mIU/L; normal thyroid function.' },
      { title: 'Vitamin D, 25-Hydroxy', notes: 'Level 22 ng/mL; supplementation recommended.' },
      { title: 'Basic Metabolic Panel', notes: 'Electrolytes and kidney function normal.' },
      { title: 'Liver Function Tests', notes: 'AST and ALT within normal range.' },
      { title: 'Urinalysis', notes: 'No signs of infection; results unremarkable.' },
      { title: 'Ferritin Level', notes: 'Improved from prior result; continue iron therapy.' },
      { title: 'Fasting Glucose', notes: 'Result 98 mg/dL; within normal fasting range.' },
    ],
    'Visit Note': [
      {
        title: 'Annual Physical Exam',
        notes: 'Routine wellness visit; vitals stable, no acute concerns.',
      },
      { title: 'Cardiology Follow-up', notes: 'Reviewed BP logs; medication regimen unchanged.' },
      {
        title: 'Dermatology Consultation',
        notes: 'Benign nevus noted; routine monitoring advised.',
      },
      {
        title: 'Influenza Vaccination',
        notes: 'Seasonal flu shot administered; no adverse reaction.',
      },
      { title: 'Telehealth Check-in', notes: 'Discussed symptom management via video visit.' },
      { title: 'Endocrinology Follow-up', notes: 'Diabetes management reviewed; labs ordered.' },
      {
        title: 'Orthopedic Consultation',
        notes: 'Evaluated knee pain; imaging and PT recommended.',
      },
      {
        title: 'Nutrition Counseling',
        notes: 'Dietary plan discussed to support cholesterol goals.',
      },
      { title: 'Pre-operative Assessment', notes: 'Cleared for outpatient procedure.' },
      {
        title: 'Emergency Department Summary',
        notes: 'Evaluated for chest pain; discharged, follow up with PCP.',
      },
    ],
  };
  const recordTypes = ['Condition', 'Lab Result', 'Visit Note'];

  // Realistic accessors (name + clinical role) shown in the access timeline.
  const accessors = [
    { name: 'Dr. Alan Evans', role: 'Endocrinologist' },
    { name: 'Dr. Priya Patel', role: 'Primary Care Physician' },
    { name: 'Dr. Marcus Smith', role: 'Cardiologist' },
    { name: 'Joy Rivera, RN', role: 'Registered Nurse' },
    { name: 'Dana Kim', role: 'Records Administrator' },
    { name: 'Dr. Sofia Nguyen', role: 'Radiologist' },
    { name: 'Dr. Omar Haddad', role: 'Dermatologist' },
    { name: 'Metro Lab Services', role: 'Laboratory Technician' },
  ];
  const knownDevices = ['Chrome on Windows', 'Safari on iPhone', 'Chrome on Mac'];
  const now = Date.now();

  const records = [];
  const logs = [];
  for (let r = 0; r < 1000; r++) {
    const recId = new ObjectId();
    const type = recordTypes[r % recordTypes.length];
    const pool = recordTemplates[type];
    const template = pool[Math.floor(r / recordTypes.length) % pool.length];
    const rec = {
      _id: recId,
      userId: user._id,
      title: template.title,
      type,
      date: new Date(now - r * 24 * 3600 * 1000),
      notes: template.notes,
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

      const accessor = accessors[idx % accessors.length];
      logs.push({
        userId: user._id,
        recordId: recId.toString(),
        accessorName: accessor.name,
        accessorRole: accessor.role,
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
