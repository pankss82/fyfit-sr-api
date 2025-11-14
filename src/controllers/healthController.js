import mongoose from 'mongoose';

export const healthCheck = (req, res) => {
  res.json({
    status: 'UP',
    checks: {
      mongo: { healthy: mongoose.connection.readyState === 1 }
    }
  });
};
