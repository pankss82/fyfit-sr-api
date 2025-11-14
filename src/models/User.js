import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  deviceId: { type: String, required: true },
  fcmToken: { type: String },
  age: { type: Number },
  deviceType: { type: String },
  gender: { type: String },
  mobileNo: { type: Number },
  profileUrl: { type: String },
  uid: { type: String }
}, { timestamps: true,
  collection: 'users'  // THIS LINE IS CRITICAL
   });

export default mongoose.model('User', userSchema, 'users');
