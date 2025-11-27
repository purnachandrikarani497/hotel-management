const { mongoose } = require('../config/db')

const BookingSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  userId: Number,
  hotelId: Number,
  roomId: Number,
  checkIn: String,
  checkOut: String,
  guests: Number,
  total: Number,
  couponId: { type: Number, default: null },
  couponCode: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  holdExpiresAt: Date,
  paid: { type: Boolean, default: false },
  refundIssued: { type: Boolean, default: false },
  cancelReason: { type: String, default: '' },
  checkinAt: Date,
  checkoutAt: Date,
  extraHours: { type: Number, default: 0 },
  extraCharges: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Booking', BookingSchema)
