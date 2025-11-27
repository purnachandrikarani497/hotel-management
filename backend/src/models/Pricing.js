const { mongoose } = require('../config/db')
const PricingSchema = new mongoose.Schema({
  normalPrice: { type: Number, default: 0 },
  weekendPrice: { type: Number, default: 0 },
  seasonal: [{ start: String, end: String, price: Number }],
  specials: [{ date: String, price: Number }],
  extraHourRate: { type: Number, default: 0 },
  cancellationHourRate: { type: Number, default: 0 }
}, { _id: false })
module.exports = PricingSchema
