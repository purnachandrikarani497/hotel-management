const { mongoose } = require('../config/db')
const PricingSchema = require('./Pricing')

const HotelSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  ownerId: { type: Number, default: null },
  name: String,
  location: String,
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  image: String,
  amenities: [String],
  description: String,
  status: { type: String, enum: ['approved','rejected','suspended','pending'], default: 'approved' },
  featured: { type: Boolean, default: false },
  images: [String],
  docs: [String],
  pricing: { type: PricingSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Hotel', HotelSchema)
