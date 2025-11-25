const { mongoose } = require('../config/db')

const ReviewSchema = new mongoose.Schema({ id: { type: Number, index: true }, userId: Number, hotelId: Number, bookingId: Number, rating: Number, comment: String, createdAt: { type: Date, default: Date.now }, response: String })

module.exports = mongoose.model('Review', ReviewSchema)
