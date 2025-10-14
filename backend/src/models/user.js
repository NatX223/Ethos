const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  fid: {
    type: Number,
    unique: true,
    sparse: true
  },
  dataStreams: {
    strava: {
      accessToken: String,
      refreshToken: String,
      athleteId: String
    },
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);