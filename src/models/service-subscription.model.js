const mongoose = require('mongoose');

const serviceSubscriptionSchema = new mongoose.Schema(
  {
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    contactZalo: {
      type: String,
      trim: true
    },
    contactInstagram: {
      type: String,
      trim: true
    },
    serviceName: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    preExpiryNotified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Index for finding subscriptions by end date
serviceSubscriptionSchema.index({ endDate: 1 });
serviceSubscriptionSchema.index({ endDate: 1, preExpiryNotified: 1 });

const ServiceSubscription = mongoose.model('ServiceSubscription', serviceSubscriptionSchema);

module.exports = ServiceSubscription;

