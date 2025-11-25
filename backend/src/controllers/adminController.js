const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { User, Hotel, Booking, Coupon, Contact, Settings } = require('../models')

async function stats(req, res) {
  try {
    await connect(); await ensureSeed();
    const hotels = await Hotel.find().lean()
    const bookings = await Booking.find().lean()
    const totalHotels = hotels.length
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b?.total) || 0), 0)
    const byMonth = {}
    bookings.forEach(b => {
      const d = b?.createdAt ? new Date(b.createdAt) : new Date()
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      byMonth[key] = (byMonth[key] || 0) + (Number(b?.total) || 0)
    })
    const cityCounts = {}
    hotels.forEach(h => {
      const city = String(h?.location || '').split(',')[0].trim()
      if (!city) return
      cityCounts[city] = (cityCounts[city] || 0) + 1
    })
    res.json({ totalHotels, totalBookings, totalRevenue, monthlySales: byMonth, cityGrowth: cityCounts })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
}

async function users(req, res) {
  await connect(); await ensureSeed();
  const users = await User.find().lean()
  res.json({ users })
}

async function createOwner(req, res) {
  await connect(); await ensureSeed();
  const { email, password, firstName, lastName, phone } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const existing = await User.findOne({ email })
  if (existing) return res.status(409).json({ error: 'Email exists' })
  const id = await nextIdFor('User')
  await User.create({ id, email, password, firstName, lastName, phone, role: 'owner', isApproved: true })
  res.json({ status: 'created', id })
}

async function blockUser(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { blocked } = req.body || {}
  const user = await User.findOne({ id })
  if (!user) return res.status(404).json({ error: 'User not found' })
  user.blocked = !!blocked
  await user.save()
  res.json({ status: 'updated' })
}

async function hotelsList(req, res) {
  await connect(); await ensureSeed();
  const hotels = await Hotel.find({ ownerId: { $ne: null } }).lean()
  res.json({ hotels })
}

async function hotelStatus(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { status } = req.body || {}
  const allowed = ['approved','rejected','suspended','pending']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.status = status
  await h.save()
  res.json({ status: 'updated' })
}

async function hotelFeature(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { featured } = req.body || {}
  const h = await Hotel.findOne({ id })
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.featured = !!featured
  await h.save()
  res.json({ status: 'updated' })
}

async function bookings(req, res) {
  try {
    await connect(); await ensureSeed();
    const bookings = await Booking.find().lean()
    const hotels = await Hotel.find().lean()
    const hotelMap = new Map(hotels.map(h => [h.id, h]))
    const items = bookings.map(b => ({ ...b, hotel: hotelMap.get(b.hotelId) || null }))
    res.json({ bookings: items })
  } catch (e) {
    res.status(500).json({ error: 'Internal error' })
  }
}

async function cancelBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.status = 'cancelled'
  await b.save()
  res.json({ status: 'updated' })
}

async function refundBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.refundIssued = true
  await b.save()
  res.json({ status: 'updated' })
}

async function couponsList(req, res) {
  await connect(); await ensureSeed();
  const coupons = await Coupon.find().lean()
  res.json({ coupons })
}

async function createCoupon(req, res) {
  await connect(); await ensureSeed();
  const { code, discount, expiry, usageLimit, enabled, hotelId, ownerId } = req.body || {}
  if (!code || !discount) return res.status(400).json({ error: 'Missing fields' })
  const id = await nextIdFor('Coupon')
  await Coupon.create({ id, code, discount: Number(discount), expiry: expiry || null, usageLimit: Number(usageLimit) || 0, used: 0, enabled: enabled !== false, hotelId: hotelId ? Number(hotelId) : null, ownerId: ownerId ? Number(ownerId) : null })
  res.json({ status: 'created', id })
}

async function couponStatus(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { enabled } = req.body || {}
  const c = await Coupon.findOne({ id })
  if (!c) return res.status(404).json({ error: 'Coupon not found' })
  c.enabled = !!enabled
  await c.save()
  res.json({ status: 'updated' })
}

async function updateCoupon(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { discount, expiry, usageLimit } = req.body || {}
  const c = await Coupon.findOne({ id })
  if (!c) return res.status(404).json({ error: 'Coupon not found' })
  if (discount !== undefined) c.discount = Number(discount)
  if (expiry !== undefined) c.expiry = expiry
  if (usageLimit !== undefined) c.usageLimit = Number(usageLimit)
  await c.save()
  res.json({ status: 'updated' })
}

async function deleteAllCoupons(req, res) {
  await connect(); await ensureSeed();
  await Coupon.deleteMany({})
  res.json({ status: 'deleted_all' })
}
async function deleteCoupon(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const c = await Coupon.findOne({ id })
  if (!c) return res.status(404).json({ error: 'Coupon not found' })
  await c.deleteOne()
  res.json({ status: 'deleted' })
}

async function settingsGet(req, res) {
  await connect(); await ensureSeed();
  let settings = await Settings.findOne().lean()
  if (!settings) {
    const created = await Settings.create({ taxRate: 10, commissionRate: 15 })
    settings = created.toObject()
  }
  res.json({ settings })
}

async function settingsUpdate(req, res) {
  await connect(); await ensureSeed();
  const { taxRate, commissionRate } = req.body || {}
  const s = await Settings.findOne()
  if (!s) {
    await Settings.create({ taxRate: Number(taxRate) || 10, commissionRate: Number(commissionRate) || 15 })
  } else {
    if (taxRate !== undefined) s.taxRate = Number(taxRate)
    if (commissionRate !== undefined) s.commissionRate = Number(commissionRate)
    await s.save()
  }
  res.json({ status: 'updated' })
}

async function ownersPending(req, res) {
  await connect(); await ensureSeed();
  const owners = await User.find({ role: 'owner', isApproved: false }).lean()
  res.json({ owners })
}

async function ownersApprove(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const u = await User.findOne({ id, role: 'owner' })
  if (!u) return res.status(404).json({ error: 'Owner not found' })
  u.isApproved = true
  await u.save()
  res.json({ status: 'approved' })
}

async function supportInbox(req, res) {
  await connect(); await ensureSeed();
  const inbox = await Contact.find().lean()
  res.json({ inbox })
}

module.exports = {
  stats,
  users,
  createOwner,
  blockUser,
  hotelsList,
  hotelStatus,
  hotelFeature,
  bookings,
  cancelBooking,
  refundBooking,
  couponsList,
  createCoupon,
  couponStatus,
  updateCoupon,
  deleteCoupon,
  deleteAllCoupons,
  settingsGet,
  settingsUpdate,
  ownersPending,
  ownersApprove,
  supportInbox
}
