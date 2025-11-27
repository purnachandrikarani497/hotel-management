const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { Booking, Review, Wishlist, MessageThread, Message, Hotel, User } = require('../models')
const fs = require('fs')
const path = require('path')

function ensureUploadsDir() { const uploadsDir = path.join(__dirname, '../uploads'); try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch {} return uploadsDir }
function dataUrlToBuffer(dataUrl) { if (typeof dataUrl !== 'string') return null; const match = dataUrl.match(/^data:(.+);base64,(.+)$/); if (!match) return null; const mime = match[1]; const base64 = match[2]; const buf = Buffer.from(base64, 'base64'); let ext = 'png'; if (mime.includes('jpeg')) ext = 'jpg'; else if (mime.includes('png')) ext = 'png'; else if (mime.includes('gif')) ext = 'gif'; else if (mime.includes('webp')) ext = 'webp'; return { buf, ext } }

async function bookings(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const items = await Booking.find({ userId }).lean()
  res.json({ bookings: items })
}

async function cancelBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { reason } = req.body || {}
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  const r = String(reason || '').trim()
  if (r.length < 3) return res.status(400).json({ error: 'Please select a cancellation reason' })
  b.status = 'cancelled'
  b.cancelReason = r
  await b.save()
  let thread = await MessageThread.findOne({ bookingId: id })
  if (!thread) {
    const tid = await nextIdFor('MessageThread')
    const h = await Hotel.findOne({ id: Number(b.hotelId) })
    await MessageThread.create({ id: tid, bookingId: id, hotelId: Number(b.hotelId), userId: Number(b.userId)||null, ownerId: Number(h?.ownerId)||null })
    thread = await MessageThread.findOne({ id: tid }).lean()
  }
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} cancelled by user: ${r}`, readByUser: true, readByOwner: false })
  res.json({ status: 'updated' })
}

async function reviews(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const items = await Review.find({ userId }).lean()
  res.json({ reviews: items })
}

async function createReview(req, res) {
  try {
    await connect(); await ensureSeed();
    const { userId, hotelId, bookingId, rating, comment } = req.body || {}
    if (!userId || !hotelId || !rating) return res.status(400).json({ error: 'Missing fields' })
    let bid = bookingId ? Number(bookingId) : null
    if (!bid) {
      const last = await Booking.find({ userId: Number(userId), hotelId: Number(hotelId) }).sort({ id: -1 }).limit(1).lean()
      bid = Number(last?.[0]?.id || 0) || null
    }
    const id = await nextIdFor('Review')
    await Review.create({ id, userId: Number(userId), hotelId: Number(hotelId), bookingId: bid, rating: Math.max(1, Math.min(5, Number(rating))), comment: String(comment||'') })
    res.json({ status: 'created', id })
  } catch (e) {
    console.error('[CreateReview] error', e?.message || e)
    res.status(503).json({ error: 'Database unavailable' })
  }
}

async function updateReview(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { rating, comment } = req.body || {}
  const r = await Review.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Review not found' })
  if (rating !== undefined) r.rating = Number(rating)
  if (comment !== undefined) r.comment = String(comment)
  await r.save()
  res.json({ status: 'updated' })
}

async function deleteReview(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const r = await Review.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Review not found' })
  await Review.deleteOne({ id })
  res.json({ status: 'deleted' })
}

async function wishlist(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const items = await Wishlist.find({ userId }).lean()
  res.json({ wishlist: items })
}

async function addWishlist(req, res) {
  await connect(); await ensureSeed();
  const { userId, hotelId } = req.body || {}
  if (!userId || !hotelId) return res.status(400).json({ error: 'Missing fields' })
  const exists = await Wishlist.findOne({ userId: Number(userId), hotelId: Number(hotelId) })
  if (exists) return res.status(409).json({ error: 'Exists' })
  await Wishlist.create({ userId: Number(userId), hotelId: Number(hotelId) })
  res.json({ status: 'added' })
}

async function removeWishlist(req, res) {
  await connect(); await ensureSeed();
  const hotelId = Number(req.params.hotelId)
  const userId = Number(req.query.userId)
  const exists = await Wishlist.findOne({ userId, hotelId })
  if (!exists) return res.status(404).json({ error: 'Not found' })
  await Wishlist.deleteOne({ userId, hotelId })
  res.json({ status: 'removed' })
}

async function details(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const hasBooking = await Booking.findOne({ userId }).lean()
  if (!hasBooking) return res.status(403).json({ error: 'No booking yet' })
  const u = await User.findOne({ id: userId }).lean()
  if (!u) return res.status(404).json({ error: 'User not found' })
  res.json({ user: u })
}

async function updateDetails(req, res) {
  await connect(); await ensureSeed();
  const { userId, firstName, lastName, phone, fullName, dob, address, idType, idNumber, idIssueDate, idExpiryDate, idDocImage } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'Missing userId' })
  const hasBooking = await Booking.findOne({ userId: Number(userId) }).lean()
  if (!hasBooking) return res.status(403).json({ error: 'No booking yet' })
  const u = await User.findOne({ id: Number(userId) })
  if (!u) return res.status(404).json({ error: 'User not found' })
  if (firstName !== undefined) u.firstName = String(firstName)
  if (lastName !== undefined) u.lastName = String(lastName)
  if (phone !== undefined) u.phone = String(phone)
  if (fullName !== undefined) u.fullName = String(fullName)
  if (dob !== undefined) u.dob = String(dob)
  if (address !== undefined) u.address = String(address)
  if (idType !== undefined) u.idType = String(idType)
  if (idNumber !== undefined) u.idNumber = String(idNumber)
  if (idIssueDate !== undefined) u.idIssueDate = String(idIssueDate)
  if (idExpiryDate !== undefined) u.idExpiryDate = String(idExpiryDate)
  if (idDocImage) {
    try {
      const parsed = dataUrlToBuffer(idDocImage)
      if (parsed) {
        const uploadsDir = ensureUploadsDir()
        const filename = `user-doc-${u.id}-${Date.now()}.${parsed.ext}`
        const filePath = path.join(uploadsDir, filename)
        try { fs.writeFileSync(filePath, parsed.buf) } catch {}
        u.idDocUrl = `/uploads/${filename}`
      }
    } catch {}
  }
  await u.save()
  res.json({ status: 'updated' })
}

module.exports = {
  bookings,
  cancelBooking,
  reviews,
  createReview,
  updateReview,
  deleteReview,
  wishlist,
  addWishlist,
  removeWishlist,
  details,
  updateDetails
}
