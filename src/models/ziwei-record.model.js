const mongoose = require('mongoose');

const ziweiRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    gender: {
      type: String,
      enum: ['male', 'female'],
      required: true,
    },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    month: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    clockHour: { type: Number, default: 8, min: 0, max: 23 },
    clockMinute: { type: Number, default: 0, min: 0, max: 59 },
    unknownTime: { type: Boolean, default: false },
    city: { type: String, default: 'Hà Nội', maxlength: 80 },
    longitude: { type: Number, default: 105.85 },
    utcOffsetMinutes: { type: Number, default: 420 },
    wuxingJuName: { type: String, default: '', maxlength: 40 },
    mingMainStars: { type: String, default: '', maxlength: 120 },
    aiReadings: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

const ZiweiRecord = mongoose.model('ZiweiRecord', ziweiRecordSchema);

module.exports = ZiweiRecord;

