const mongoose = require('mongoose');
const { SPORT_IDS } = require('../constants/sports');

const enrollmentSettingSchema = new mongoose.Schema({
  deporte: { type: String, enum: SPORT_IDS, required: true, unique: true },
  abierto: { type: Boolean, default: false, required: true }
}, { timestamps: true });

module.exports = mongoose.model('EnrollmentSetting', enrollmentSettingSchema);
