const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    // Dữ liệu điều kiện cần mà khách hàng đã nhập
    requiredFieldsData: [{
      label: String,    // "Email Canva", "Account:MK", etc.
      value: String    // Giá trị khách hàng nhập
    }],
    // Feedback/Review từ khách hàng
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        trim: true
      },
      createdAt: {
        type: Date
      }
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    customer: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      }
    },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'Order must contain at least one item']
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    // Order status - workflow của đơn hàng
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled'],
      default: 'pending',
      index: true
    },
    // Payment status - trạng thái thanh toán (tách riêng với order status)
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      index: true
    },
    // Backward compatibility - giữ field cũ (không required)
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled']
    },
    note: {
      type: String,
      trim: true
    },
    // Admin management fields
    confirmedAt: {
      type: Date
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    processingAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    adminNotes: {
      type: String,
      trim: true
    },
    // PayOS payment fields
    payosOrderCode: {
      type: Number,
      unique: true,
      sparse: true
    },
    paymentLinkId: {
      type: String
    },
    checkoutUrl: {
      type: String
    },
    qrCode: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook để migrate dữ liệu cũ (backward compatibility)
orderSchema.pre('save', function (next) {
  // Nếu có status cũ nhưng chưa có orderStatus/paymentStatus, migrate
  if (this.status && (!this.orderStatus || !this.paymentStatus)) {
    if (this.status === 'pending') {
      this.orderStatus = 'pending';
      this.paymentStatus = 'pending';
    } else if (this.status === 'paid') {
      // Giữ orderStatus là pending (chưa được admin xác nhận)
      this.orderStatus = this.orderStatus || 'pending';
      this.paymentStatus = 'paid';
    } else if (this.status === 'cancelled') {
      this.orderStatus = 'cancelled';
      this.paymentStatus = this.paymentStatus || 'pending';
    }
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;

