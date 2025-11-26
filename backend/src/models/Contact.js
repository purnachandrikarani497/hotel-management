const { mongoose } = require('../config/db')

const ContactSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  firstName: String,
  lastName: String,
  email: String,
  subject: String,
  message: String,
  hotelId: { type: Number, default: null },
  hotelName: String,
  hotelEmail: String,
  contact1: String,
  contact2: String,
  ownerName: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Contact', ContactSchema)
