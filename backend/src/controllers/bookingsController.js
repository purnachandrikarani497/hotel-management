const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { Booking, Hotel, Room, Settings, MessageThread, Message, Coupon } = require('../models')

async function create(req, res) {
  await connect(); await ensureSeed();
  const { hotelId, checkIn, checkOut, guests, userId, roomType, couponCode, couponId } = req.body || {}
  if (!hotelId || !checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing booking fields' })
  const hotel = await Hotel.findOne({ id: Number(hotelId) })
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' })
  const ci = new Date(checkIn)
  let co = new Date(checkOut)
  if (!(ci instanceof Date) || isNaN(ci.getTime())) return res.status(400).json({ error: 'Invalid check-in' })
  if (!(co instanceof Date) || isNaN(co.getTime())) co = new Date(ci.getTime() + 24 * 60 * 60 * 1000)
  if (ci >= co) co = new Date(ci.getTime() + 24 * 60 * 60 * 1000)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (ci < startOfToday) return res.status(400).json({ error: 'Check-in must be today or later' })
  const isTodayCi = ci.getFullYear()===now.getFullYear() && ci.getMonth()===now.getMonth() && ci.getDate()===now.getDate()
  if (isTodayCi) {
    const ciMinutes = ci.getHours()*60 + ci.getMinutes()
    const nowMinutes = now.getHours()*60 + now.getMinutes()
    if (ciMinutes < nowMinutes) return res.status(400).json({ error: 'Check-in time must be later than now' })
  }
  const settings = await Settings.findOne().lean()
  const holdMinutes = Number(settings?.holdMinutes || 15)
  if (userId) {
    const existingHeld = await Booking.findOne({ userId: Number(userId), hotelId: Number(hotelId), status: 'held' })
    if (existingHeld) {
      const notExpired = existingHeld.holdExpiresAt && new Date(existingHeld.holdExpiresAt) > now
      if (notExpired) {
        return res.json({ status: 'reserved', id: existingHeld.id, roomId: existingHeld.roomId, holdExpiresAt: existingHeld.holdExpiresAt })
      } else {
        existingHeld.status = 'expired'
        await existingHeld.save()
        if (existingHeld.roomId) {
          const r = await Room.findOne({ id: Number(existingHeld.roomId) })
          if (r) { r.blocked = false; await r.save() }
        }
      }
    }
  }
  const filter = { hotelId: Number(hotelId), availability: true }
  if (roomType) filter.type = String(roomType)
  let rooms = await Room.find(filter).lean()
  if (!rooms || rooms.length === 0) {
    const newRoomId = await nextIdFor('Room')
    await Room.create({ id: newRoomId, hotelId: Number(hotelId), type: String(roomType||'Standard'), price: Number(hotel.price)||0, members: 2, amenities: [], photos: [], availability: true, blocked: false })
    rooms = await Room.find(filter).lean()
    if (!rooms || rooms.length === 0) return res.status(409).json({ error: 'No rooms available' })
  }
  let chosenRoomId = null
  for (const r of rooms) {
    const existing = await Booking.find({ roomId: r.id, status: { $in: ['held','pending','confirmed','checked_in'] } }).lean()
    const overlaps = existing.some(b => {
      const bCi = new Date(b.checkIn)
      const bCo = new Date(b.checkOut)
      const isHeldActive = b.status === 'held' ? (b.holdExpiresAt && new Date(b.holdExpiresAt) > now) : true
      if (!isHeldActive) return false
      return ci < bCo && co > bCi
    })
    if (!overlaps) { chosenRoomId = r.id; break }
  }
  if (!chosenRoomId) {
    const newRoomId = await nextIdFor('Room')
    await Room.create({ id: newRoomId, hotelId: Number(hotelId), type: String(roomType||'Standard'), price: Number(hotel.price)||0, members: 2, amenities: [], photos: [], availability: true, blocked: false })
    chosenRoomId = newRoomId
  }
  const chosenRoom = rooms.find(x => x.id === chosenRoomId) || await Room.findOne({ id: Number(chosenRoomId) }).lean()
  const basePricePerDay = Number(chosenRoom?.price || 0)
  const diffMs = co.getTime() - ci.getTime()
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const stayDays = diffHours > 0 && diffHours <= 24 ? 1 : Math.floor(diffHours / 24)
  const extraHours = diffHours > 24 ? (diffHours - stayDays * 24) : 0

  const pricing = hotel?.pricing || { normalPrice: Number(hotel.price)||0, weekendPrice: Number(hotel.price)||0, seasonal: [], specials: [] }
  const normalPrice = Number(pricing?.normalPrice || basePricePerDay)
  const weekendPrice = Number(pricing?.weekendPrice || basePricePerDay)
  const seasonal = Array.isArray(pricing?.seasonal) ? pricing.seasonal : []
  const specials = Array.isArray(pricing?.specials) ? pricing.specials : []

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }
  function parseDateStr(s) {
    if (!s) return null
    const d = new Date(s)
    return (d instanceof Date && !isNaN(d.getTime())) ? d : null
  }
  function inSeason(d) {
    for (const s of seasonal) {
      const st = parseDateStr(s?.start)
      const en = parseDateStr(s?.end)
      const price = Number(s?.price || 0)
      if (st && en && d >= st && d <= en) return price
    }
    return null
  }
  function specialFor(d) {
    for (const sp of specials) {
      const sd = parseDateStr(sp?.date)
      if (sd && isSameDay(sd, d)) return Number(sp?.price || 0)
    }
    return null
  }
  function applyPricing(d, base) {
    const special = specialFor(d)
    if (special !== null && !isNaN(special) && special > 0) return special
    const seasonPrice = inSeason(d)
    if (seasonPrice !== null && !isNaN(seasonPrice) && seasonPrice > 0) return seasonPrice
    const dow = d.getDay() // 0 Sun ... 6 Sat
    const isWeekend = dow === 5 || dow === 6 || dow === 0 // Fri-Sun
    if (isWeekend) return weekendPrice || base
    return normalPrice || base
  }

  let computedTotal = 0
  const day = new Date(ci.getFullYear(), ci.getMonth(), ci.getDate())
  for (let i = 0; i < stayDays; i++) {
    const cur = new Date(day)
    cur.setDate(day.getDate() + i)
    computedTotal += applyPricing(cur, basePricePerDay)
  }
  if (extraHours > 0) {
    const lastDay = new Date(day)
    lastDay.setDate(day.getDate() + Math.max(stayDays - 1, 0))
    const adjustedDayPrice = applyPricing(lastDay, basePricePerDay)
    const hourlyRate = adjustedDayPrice / 24
    computedTotal += Math.round(hourlyRate * extraHours)
  }
  let appliedCouponId = null
  let appliedCouponCode = ''
  if (couponId || couponCode) {
    const dateStr = `${ci.getFullYear()}-${String(ci.getMonth()+1).padStart(2,'0')}-${String(ci.getDate()).padStart(2,'0')}`
    const q = {}
    if (couponId) q.id = Number(couponId)
    if (!q.id && couponCode) q.code = String(couponCode)
    const c = await Coupon.findOne({ ...q, enabled: true }).lean()
    if (c) {
      const hasQuota = Number(c.usageLimit||0) === 0 || Number(c.used||0) < Number(c.usageLimit||0)
      const matchesDate = String(c.expiry||'').slice(0,10) ? String(c.expiry||'').slice(0,10) === dateStr : true
      const matchesHotel = !c.hotelId || Number(c.hotelId) === Number(hotelId)
      if (hasQuota && matchesDate && matchesHotel) {
        const pct = Number(c.discount||0)
        if (!isNaN(pct) && pct > 0) {
          const cut = Math.round(computedTotal * pct / 100)
          computedTotal = Math.max(0, computedTotal - cut)
          appliedCouponId = Number(c.id) || null
          appliedCouponCode = String(c.code||'')
        }
      }
    }
  }
  const id = await nextIdFor('Booking')
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000)
  await Booking.create({ id, userId: Number(userId) || null, hotelId: Number(hotelId), roomId: Number(chosenRoomId), checkIn, checkOut, guests: Number(guests), total: computedTotal, couponId: appliedCouponId, couponCode: appliedCouponCode, status: 'held', holdExpiresAt, paid: false })
  // Do not hard-block room for all dates; overlap logic prevents conflicts
  let thread = await MessageThread.findOne({ bookingId: id })
  if (!thread) {
    const tid = await nextIdFor('MessageThread')
    const ownerId = Number(hotel.ownerId) || null
    const uid = Number(userId) || null
    await MessageThread.create({ id: tid, bookingId: id, hotelId: Number(hotelId), userId: uid, ownerId })
    thread = await MessageThread.findOne({ id: tid }).lean()
  }
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Reservation #${id} created`, readByUser: true, readByOwner: false })
  res.json({ status: 'reserved', id, roomId: chosenRoomId, holdExpiresAt })
}

async function invoice(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id }).lean()
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  const h = await Hotel.findOne({ id: b.hotelId }).lean()
  const s = await Settings.findOne().lean()
  const taxRate = Number(s?.taxRate || 0)
  const subtotal = Number(b.total || 0)
  const tax = Math.round(subtotal * taxRate) / 100
  const total = subtotal + tax
  res.json({ invoice: { id, userId: b.userId, hotel: { id: h?.id, name: h?.name }, subtotal, taxRate, tax, total, createdAt: b.createdAt } })
}

async function confirm(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  const now = new Date()
  if (b.status !== 'held') return res.status(409).json({ error: 'Booking not in held state' })
  if (b.holdExpiresAt && new Date(b.holdExpiresAt) <= now) return res.status(409).json({ error: 'Hold expired' })
  b.status = 'pending'
  b.paid = true
  await b.save()
  if (b.couponId) {
    const c = await Coupon.findOne({ id: Number(b.couponId) })
    if (c) { c.used = Number(c.used||0) + 1; await c.save() }
  }
  if (b.roomId) {
    const r = await Room.findOne({ id: Number(b.roomId) })
    if (r) { r.blocked = false; await r.save() }
  }
  const thread = await MessageThread.findOne({ bookingId: id })
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} pending owner approval`, readByUser: true, readByOwner: false })
  res.json({ status: 'confirmed' })
}

module.exports = { create, invoice, confirm }
