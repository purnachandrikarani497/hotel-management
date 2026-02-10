const { mongoose } = require('../config/db')

const BookingSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  userId: Number,
  hotelId: Number,
  roomId: Number,
  roomNumber: { type: String, default: '' },
  checkIn: String,
  checkOut: String,
  guests: Number,
  roomCount: { type: Number, default: 1 },
  total: Number,
  couponId: { type: Number, default: null },
  couponCode: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  holdExpiresAt: Date,
  paid: { type: Boolean, default: false },
  refundIssued: { type: Boolean, default: false },
  paymentMode: { type: String, default: '' },
  paymentRef: { type: String, default: '' },
  cancelReason: { type: String, default: '' },
  checkinAt: Date,
  checkoutAt: Date,
  extraHours: { type: Number, default: 0 },
  extraCharges: { type: Number, default: 0 },
  cancellationFee: { type: Number, default: 0 },
  ownerActionToken: { type: String, default: '' },
  userActionToken: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Booking', BookingSchema)
