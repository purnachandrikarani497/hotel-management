const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { Hotel, Booking, Room, Review, MessageThread, Message } = require('../models')
const fs = require('fs')
const path = require('path')

function ensureUploadsDir() {
  const uploadsDir = path.join(__dirname, '../uploads')
  try { fs.mkdirSync(uploadsDir, { recursive: true }) } catch {}
  return uploadsDir
}

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string') return null
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return null
  const mime = match[1]
  const base64 = match[2]
  const buf = Buffer.from(base64, 'base64')
  let ext = 'png'
  if (mime.includes('jpeg')) ext = 'jpg'
  else if (mime.includes('png')) ext = 'png'
  else if (mime.includes('gif')) ext = 'gif'
  else if (mime.includes('webp')) ext = 'webp'
  return { buf, ext }
}

function saveImagesFromDataUrls(prefix, entityId, list) {
  const uploadsDir = ensureUploadsDir()
  const urls = []
  const items = Array.isArray(list) ? list : []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const parsed = dataUrlToBuffer(item)
    if (!parsed) continue
    const ts = Date.now()
    const filename = `${prefix}-${entityId}-${ts}-${i}.${parsed.ext}`
    const filePath = path.join(uploadsDir, filename)
    try { fs.writeFileSync(filePath, parsed.buf) } catch {}
    urls.push(`/uploads/${filename}`)
  }
  return urls
}

async function stats(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId)
  const hotels = await Hotel.find({ ownerId }).lean()
  const hotelIds = hotels.map(h => h.id)
  const ownerBookings = await Booking.find({ hotelId: { $in: hotelIds } }).lean()
  const totalBookings = ownerBookings.length
  const totalRevenue = ownerBookings.reduce((s,b)=>s+(Number(b.total)||0),0)
  const rooms = await Room.find({ hotelId: { $in: hotelIds } }).lean()
  const totalRooms = rooms.length
  const pendingBookings = ownerBookings.filter(b => ['held','pending'].includes(String(b.status||''))).length
  let hotelStatus = 'pending'
  if (hotels && hotels.length) {
    const statuses = new Set((hotels||[]).map(h=>String(h.status||'pending')))
    if (statuses.has('approved')) hotelStatus = 'approved'
    else if (statuses.has('pending')) hotelStatus = 'pending'
    else if (statuses.has('rejected')) hotelStatus = 'rejected'
    else if (statuses.has('suspended')) hotelStatus = 'suspended'
    else hotelStatus = String(hotels[0].status||'pending')
  }
  res.json({ totalRooms, totalBookings, totalRevenue, pendingBookings, hotelStatus })
}

async function hotels(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId)
  const hotels = await Hotel.find({ ownerId }).lean()
  res.json({ hotels })
}

async function submitHotel(req, res) {
  await connect(); await ensureSeed();
  const { ownerId, name, location, price, amenities, description } = req.body || {}
  if (!ownerId || !name || !location) return res.status(400).json({ error: 'Missing fields' })
  const existing = await Hotel.findOne({ ownerId: Number(ownerId) })
  if (existing) return res.status(409).json({ error: 'Hotel already registered', id: existing.id })
  const id = await nextIdFor('Hotel')
  await Hotel.create({ id, ownerId: Number(ownerId), name, location, price: Number(price)||0, image: '', amenities: Array.isArray(amenities)?amenities:[], description: String(description||''), status: 'approved', featured: false, images: [], docs: [], pricing: { normalPrice: Number(price)||0, weekendPrice: Number(price)||0, seasonal: [], specials: [] } })
  res.json({ status: 'submitted', id })
}

async function updateAmenities(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { amenities } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.amenities = Array.isArray(amenities)?amenities:[]
  await h.save()
  res.json({ status: 'updated' })
}

async function updateDescription(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { description } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.description = String(description||'')
  await h.save()
  res.json({ status: 'updated' })
}

async function updateImages(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { images } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  const savedUrls = saveImagesFromDataUrls('hotel', id, Array.isArray(images)?images:[])
  h.images = (savedUrls.length ? savedUrls : (Array.isArray(images)?images:[]))
  if (h.images.length > 0) h.image = h.images[0]
  await h.save()
  res.json({ status: 'updated' })
}

async function updateDocs(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { docs } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.docs = Array.isArray(docs)?docs:[]
  await h.save()
  res.json({ status: 'updated' })
}

async function updateInfo(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { name, location, price, description, status, featured } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  if (name !== undefined) h.name = String(name)
  if (location !== undefined) h.location = String(location)
  if (price !== undefined) h.price = Number(price) || 0
  if (description !== undefined) h.description = String(description)
  if (status !== undefined) {
    const allowed = ['approved','rejected','suspended','pending']
    const s = String(status)
    if (!allowed.includes(s)) return res.status(400).json({ error: 'Invalid status' })
    h.status = s
  }
  if (featured !== undefined) h.featured = !!featured
  await h.save()
  res.json({ status: 'updated' })
}

async function rooms(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId)
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h=>h.id)
  const rooms = await Room.find({ hotelId: { $in: hotelIds } }).lean()
  res.json({ rooms })
}

async function createRoom(req, res) {
  await connect(); await ensureSeed();
  const { ownerId, hotelId, type, price, amenities, photos, availability, members } = req.body || {}
  const h = await Hotel.findOne({ id: Number(hotelId) })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  if (h.ownerId == null && ownerId) { h.ownerId = Number(ownerId); await h.save() }
  if (Number(h.ownerId) !== Number(ownerId)) return res.status(403).json({ error: 'Not authorized' })
  const id = await nextIdFor('Room')
  const savedUrls = saveImagesFromDataUrls('room', id, Array.isArray(photos)?photos:[])
  await Room.create({ id, hotelId: Number(hotelId), type: String(type||'Standard'), price: Number(price)||0, members: Number(members)||1, amenities: Array.isArray(amenities)?amenities:[], photos: savedUrls.length ? savedUrls : (Array.isArray(photos)?photos:[]), availability: availability!==false, blocked:false })
  res.json({ status: 'created', id })
}

async function updateRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { price, availability, amenities, photos, members, type } = req.body || {}
  const r = await Room.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Room not found' })
  if (price!==undefined) r.price = Number(price)
  if (availability!==undefined) r.availability = !!availability
  if (members!==undefined) r.members = Number(members)
  if (type!==undefined) r.type = String(type||r.type)
  if (Array.isArray(amenities)) r.amenities = amenities
  if (Array.isArray(photos)) {
    const savedUrls = saveImagesFromDataUrls('room', id, photos)
    r.photos = savedUrls.length ? savedUrls : photos
  }
  await r.save()
  res.json({ status: 'updated' })
}

async function blockRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { blocked } = req.body || {}
  const r = await Room.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Room not found' })
  r.blocked = !!blocked
  await r.save()
  res.json({ status: 'updated' })
}

async function deleteRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const r = await Room.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Room not found' })
  await Room.deleteOne({ id })
  res.json({ status: 'deleted' })
}

async function ownerBookings(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId)
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h=>h.id)
  const bookings = await Booking.find({ hotelId: { $in: hotelIds } }).lean()
  res.json({ bookings })
}

async function approveBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.status = 'confirmed'
  await b.save()
  let thread = await MessageThread.findOne({ bookingId: id })
  if (!thread) {
    const tid = await nextIdFor('MessageThread')
    const h = await Hotel.findOne({ id: Number(b.hotelId) })
    await MessageThread.create({ id: tid, bookingId: id, hotelId: Number(b.hotelId), userId: Number(b.userId)||null, ownerId: Number(h?.ownerId)||null })
    thread = await MessageThread.findOne({ id: tid }).lean()
  }
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} approved`, readByUser: false, readByOwner: true })
  res.json({ status: 'updated' })
}

async function checkinBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.status = 'checked_in'
  await b.save()
  res.json({ status: 'updated' })
}

async function checkoutBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.status = 'checked_out'
  await b.save()
  res.json({ status: 'updated' })
}

async function cancelBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { reason } = req.body || {}
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  const ci = new Date(b.checkIn)
  const msUntilCi = (ci instanceof Date && !isNaN(ci.getTime())) ? (ci.getTime() - Date.now()) : null
  if (!reason || String(reason).trim().length < 5) return res.status(400).json({ error: 'Cancellation reason required' })
  if (msUntilCi !== null && msUntilCi < 24*60*60*1000) return res.status(409).json({ error: 'Owner cancellations must be at least 24 hours before check-in' })
  b.status = 'cancelled'
  b.cancelReason = String(reason).trim()
  await b.save()
  let thread = await MessageThread.findOne({ bookingId: id })
  if (!thread) {
    const tid = await nextIdFor('MessageThread')
    const h = await Hotel.findOne({ id: Number(b.hotelId) })
    await MessageThread.create({ id: tid, bookingId: id, hotelId: Number(b.hotelId), userId: Number(b.userId)||null, ownerId: Number(h?.ownerId)||null })
    thread = await MessageThread.findOne({ id: tid }).lean()
  }
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} cancelled by owner: ${String(reason).trim()}`, readByUser: false, readByOwner: true })
  res.json({ status: 'updated' })
}

async function pricing(req, res) {
  await connect(); await ensureSeed();
  const hotelId = Number(req.params.hotelId)
  const { normalPrice, weekendPrice, seasonal, specials } = req.body || {}
  const h = await Hotel.findOne({ id: hotelId })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  if (!h.pricing) h.pricing = { normalPrice: Number(h.price)||0, weekendPrice: Number(h.price)||0, seasonal: [], specials: [] }
  if (normalPrice!==undefined) h.pricing.normalPrice = Number(normalPrice)
  if (weekendPrice!==undefined) h.pricing.weekendPrice = Number(weekendPrice)
  if (Array.isArray(seasonal)) h.pricing.seasonal = seasonal.map(s=>({ start:String(s.start), end:String(s.end), price:Number(s.price)||0 }))
  if (Array.isArray(specials)) h.pricing.specials = specials.map(sp=>({ date:String(sp.date), price:Number(sp.price)||0 }))
  await h.save()
  res.json({ status: 'updated' })
}

async function deletePricing(req, res) {
  await connect(); await ensureSeed();
  const hotelId = Number(req.params.hotelId)
  const h = await Hotel.findOne({ id: hotelId })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.pricing = { normalPrice: Number(h.price)||0, weekendPrice: Number(h.price)||0, seasonal: [], specials: [] }
  await h.save()
  res.json({ status: 'deleted' })
}

async function ownerReviews(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId)
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h=>h.id)
  const items = await Review.find({ hotelId: { $in: hotelIds } }).lean()
  res.json({ reviews: items })
}

async function respondReview(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { response } = req.body || {}
  const r = await Review.findOne({ id })
  if (!r) return res.status(404).json({ error: 'Review not found' })
  r.response = String(response||'')
  await r.save()
  res.json({ status: 'updated' })
}

async function deleteHotel(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  await Review.deleteMany({ hotelId: id })
  await Booking.deleteMany({ hotelId: id })
  await Room.deleteMany({ hotelId: id })
  await Hotel.deleteOne({ id })
  res.json({ status: 'deleted' })
}

module.exports = {
  stats,
  hotels,
  submitHotel,
  updateAmenities,
  updateDescription,
  updateImages,
  updateDocs,
  updateInfo,
  deleteHotel,
  rooms,
  createRoom,
  updateRoom,
  blockRoom,
  deleteRoom,
  ownerBookings,
  approveBooking,
  checkinBooking,
  checkoutBooking,
  cancelBooking,
  pricing,
  deletePricing,
  ownerReviews,
  respondReview
}