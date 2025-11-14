import mongoose from 'mongoose';

const ringDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  heartRate: { type: Number, required: true },
  steps: { type: Number, required: true },
  calories: { type: Number, required: true },
  sleepMinutes: { type: Number },
  spo2: { type: Number },
  synced: { 
    type: Boolean, 
    default: false 
  },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for fast queries
ringDataSchema.index({ userId: 1, timestamp: -1 });
ringDataSchema.index({ deviceId: 1 });

export default mongoose.model('RingDataPoint', ringDataSchema);
