const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { Booking, Review, Wishlist, MessageThread, Message, Hotel, User } = require('../models')
let mailer = null
try { mailer = require('nodemailer') } catch { mailer = null }
let cloudinary = null
try { cloudinary = require('cloudinary').v2 } catch { cloudinary = null }
if (cloudinary) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    })
  } catch {}
}

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
  try {
    const h = await Hotel.findOne({ id: Number(b.hotelId) }).lean()
    const rate = Number(h?.pricing?.cancellationHourRate || 0)
    const now = new Date()
    const ciStr = String(b.checkIn || '')
    const ci = new Date(ciStr)
    if (ci instanceof Date && !isNaN(ci.getTime())) {
      const oneHourMs = 60 * 60 * 1000
      const withinOneHour = (ci.getTime() - now.getTime()) <= oneHourMs
      if (withinOneHour) {
        const fallback = Math.round((Number(h?.price || 0)) / 24)
        const fee = rate > 0 ? rate : fallback
        b.cancellationFee = fee
        if (fee > 0) b.total = Number(b.total || 0) + fee
      }
    }
  } catch (_e) { /* ignore */ }
  await b.save()
  let thread = await MessageThread.findOne({ bookingId: id })
  if (!thread) {
    const tid = await nextIdFor('MessageThread')
    const h = await Hotel.findOne({ id: Number(b.hotelId) })
    await MessageThread.create({ id: tid, bookingId: id, hotelId: Number(b.hotelId), userId: Number(b.userId)||null, ownerId: Number(h?.ownerId)||null })
    thread = await MessageThread.findOne({ id: tid }).lean()
  }
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} cancelled by user: ${r}` + (Number(b.cancellationFee||0) > 0 ? ` • Cancellation Fee ₹${Number(b.cancellationFee||0)}` : ''), readByUser: true, readByOwner: false })
  res.json({ status: 'updated' })
  setTimeout(async () => {
    try {
      const hotel = await Hotel.findOne({ id: Number(b.hotelId) }).lean()
      const owner = hotel?.ownerId ? await User.findOne({ id: Number(hotel.ownerId) }).lean() : null
      const user = b.userId ? await User.findOne({ id: Number(b.userId) }).lean() : null
      if (mailer && owner?.email) {
        try {
          const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
          const html = `<div style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\"><h2>User cancelled reservation</h2><p>Booking #${id} • ${hotel?.name || ''}</p><p>Room: ${b.roomNumber || ('#'+b.roomId)}</p><p>Status: Cancelled</p><p>Reason: ${r}</p><p>User: ${user?.fullName || `${user?.firstName||''} ${user?.lastName||''}`.trim() || ''} • ${user?.email || ''} • ${user?.phone || ''}</p></div>`
          await transporter.sendMail({ from: process.env.SMTP_USER, to: owner.email, subject: `Booking cancelled by user #${id} • ${hotel?.name || ''}`, html })
        } catch (e) { console.warn('[UserCancel] owner email failed', e?.message || e) }
      }
      if (mailer && user?.email) {
        try {
          const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
          const html2 = `<div style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\"><h2>Your booking was cancelled</h2><p>Booking #${id} • ${hotel?.name || ''}</p><p>Room: ${b.roomNumber || ('#'+b.roomId)}</p><p>Status: Cancelled</p><p>Reason: ${r}</p>${Number(b.cancellationFee||0) > 0 ? `<p>Cancellation Fee: ₹${Number(b.cancellationFee||0)}</p>` : ''}</div>`
          await transporter.sendMail({ from: process.env.SMTP_USER, to: user.email, subject: `Booking cancelled #${id} • ${hotel?.name || ''}`, html: html2 })
        } catch (e) { console.warn('[UserCancel] user email failed', e?.message || e) }
      }
    } catch (_e) { /* ignore */ }
  }, 0)
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
  if (phone !== undefined) u.phone = String(String(phone).replace(/\D/g,'').slice(0,10))
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
        const useCloud = !!(cloudinary && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
        if (useCloud) {
          const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'hotel-bookings/user-docs'
          const publicId = `user-doc-${u.id}-${Date.now()}`
          const resUp = await new Promise((resolve) => {
            const s = cloudinary.uploader.upload_stream({ folder, public_id: publicId, resource_type: 'image', overwrite: true }, (err, r) => resolve(err ? null : r))
            s.end(parsed.buf)
          })
          if (resUp && resUp.secure_url) u.idDocUrl = resUp.secure_url
        } else {
          console.error('[Upload] Cloudinary not configured, skipping local save');
        }
      }
    } catch (err) {
      console.error('[Upload] Error:', err.message);
    }
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
