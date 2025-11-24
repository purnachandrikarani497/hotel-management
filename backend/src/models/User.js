const { mongoose } = require('../config/db')
const UserSchema = new mongoose.Schema({
  id: { type: Number, index: true },
  email: { type: String, unique: true },
  password: String,
  firstName: String,
  lastName: String,
  phone: String,
  fullName: String,
  dob: String,
  address: String,
  idType: String,
  idNumber: String,
  idIssueDate: String,
  idExpiryDate: String,
  idDocUrl: String,
  role: { type: String, enum: ['admin','user','owner'], default: 'user' },
  isApproved: { type: Boolean, default: true },
  blocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})
module.exports = mongoose.model('User', UserSchema)
