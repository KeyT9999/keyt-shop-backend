const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: ''
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: false
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;

