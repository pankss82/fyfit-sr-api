import RingDataPoint from '../models/RingDataPoint.js';
import { verifyToken } from '../utils/jwt.js';

// Middleware to authenticate JWT
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const submitRingData = async (req, res) => {
  const { heartRate, steps, calories, sleepMinutes, spo2, synced } = req.body;
  const userId = req.user.userId;
  const deviceId = req.body.deviceId || req.user.deviceId; // fallback

  if (!heartRate || !steps || !calories) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const dataPoint = new RingDataPoint({
      userId,
      deviceId,
      heartRate,
      steps,
      calories,
      sleepMinutes,
      spo2,
      synced
    });

    await dataPoint.save();
    res.json({ status: 'SUCCESS', dataId: dataPoint._id });
  } catch (err) {
    console.error('Ring data save error:', err);
    res.status(500).json({ error: 'Failed to save ring data' });
  }
};

export const getRingData = async (req, res) => {
  const userId = req.user.userId;
  const { start, end, limit = 100 } = req.query;

  try {
    const query = { userId };
    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start);
      if (end) query.timestamp.$lte = new Date(end);
    }

    const data = await RingDataPoint.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.json({ status: 'SUCCESS', data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};

export const submitRingDataBatch = async (req, res) => {
  const dataPoints = req.body;
  const userId = req.user.userId;

  // === VALIDATION ===
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return res.status(400).json({ error: 'Array of data points required' });
  }
  if (dataPoints.length > 1000) {
    return res.status(400).json({ error: 'Maximum 1000 points per batch' });
  }

  const requiredFields = ['timestamp', 'deviceId', 'heartRate', 'steps', 'calories'];
  for (const point of dataPoints) {
    for (const field of requiredFields) {
      if (point[field] === undefined || point[field] === null) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}` 
        });
      }
    }
    // Validate timestamp
    if (isNaN(Date.parse(point.timestamp))) {
      return res.status(400).json({ error: 'Invalid timestamp format' });
    }
  }

  try {
    // === PREPARE DOCS ===
    const docs = dataPoints.map(point => ({
      userId,
      deviceId: point.deviceId,
      heartRate: point.heartRate,
      steps: point.steps,
      calories: point.calories,
      sleepMinutes: point.sleepMinutes ?? null,
      spo2: point.spo2 ?? null,
      synced: true,  // Already in cloud
      timestamp: new Date(point.timestamp)
    }));

    // === UPSERT: Update if exists (same user + timestamp), else insert ===
    const ops = docs.map(doc => ({
      updateOne: {
        filter: { 
          userId: doc.userId,
          timestamp: doc.timestamp 
        },
        update: { $set: doc },
        upsert: true
      }
    }));

    const result = await RingDataPoint.bulkWrite(ops, { ordered: false });

    res.json({
      status: 'SUCCESS',
      total: dataPoints.length,
      inserted: result.upsertedCount,
      modified: result.modifiedCount,
      failed: dataPoints.length - (result.upsertedCount + result.modifiedCount)
    });

  } catch (err) {
    console.error('Batch submit error:', err);
    res.status(500).json({ error: 'Failed to save batch data' });
  }
};
