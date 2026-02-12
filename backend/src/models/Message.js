const { mongoose } = require('../config/db')

const MessageSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  threadId: { type: Number, index: true },
  senderRole: { type: String, enum: ['user','owner','system'], default: 'system' },
  senderId: Number,
  content: String,
  readByUser: { type: Boolean, default: false },
  readByOwner: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Message', MessageSchema)