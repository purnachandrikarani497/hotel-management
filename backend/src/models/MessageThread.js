const { mongoose } = require('../config/db')

const MessageThreadSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  bookingId: Number,
  hotelId: { type: Number, index: true },
  userId: { type: Number, index: true },
  ownerId: { type: Number, index: true },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('MessageThread', MessageThreadSchema)