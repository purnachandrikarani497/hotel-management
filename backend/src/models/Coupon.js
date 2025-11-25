const { mongoose } = require('../config/db')

const CouponSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  code: { type: String, unique: true },
  discount: Number,
  expiry: String,
  usageLimit: Number,
  used: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  hotelId: { type: Number, default: null },
  ownerId: { type: Number, default: null }
})

module.exports = mongoose.model('Coupon', CouponSchema)
