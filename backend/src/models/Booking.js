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
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Booking', BookingSchema)
