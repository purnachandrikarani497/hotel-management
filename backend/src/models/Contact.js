const { mongoose } = require('../config/db')

const ContactSchema = new mongoose.Schema({ id: { type: Number, index: true }, firstName: String, lastName: String, email: String, subject: String, message: String, createdAt: { type: Date, default: Date.now } })

module.exports = mongoose.model('Contact', ContactSchema)
