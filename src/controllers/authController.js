import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';

export const register = async (req, res) => {
  const { email, password, name, deviceId, fcmToken, age, deviceType, gender, mobileNo, profileUrl } = req.body;

  if (!email || !password || !name || !deviceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed, name, deviceId, fcmToken, age, deviceType, gender, mobileNo, profileUrl });
    await user.save();

    const accessToken = generateToken({ userId: user._id });
    const refreshToken = generateToken({ userId: user._id }, '7d');

    res.json({
      status: 'SUCCESS',
      userId: user._id,
      accessToken,
      refreshToken,
      expiresIn: 3600
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ userId: user._id });
    res.json({ accessToken: token, expiresIn: 3600 });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
