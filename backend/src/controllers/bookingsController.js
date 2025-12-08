const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { Booking, Hotel, Room, Settings, MessageThread, Message, Coupon, User } = require('../models')
let mailer = null
try { mailer = require('nodemailer') } catch { mailer = null }

async function create(req, res) {
  await connect(); await ensureSeed();
  const { hotelId, checkIn, checkOut, guests, userId, roomType, couponCode, couponId } = req.body || {}
  if (!hotelId || !checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing booking fields' })
  const hotel = await Hotel.findOne({ id: Number(hotelId) })
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' })
  if (String(hotel.status || '') !== 'approved' || hotel.ownerId == null) return res.status(403).json({ error: 'Hotel not available' })
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
  const filter = { hotelId: Number(hotelId), availability: true, blocked: { $ne: true } }
  if (roomType) filter.type = String(roomType)
  let rooms = await Room.find(filter).lean()
  rooms = (rooms || []).slice().sort((a, b) => {
    const ra = String(a.roomNumber || '').trim()
    const rb = String(b.roomNumber || '').trim()
    const na = /^\d+$/.test(ra) ? Number(ra) : Number.MAX_SAFE_INTEGER
    const nb = /^\d+$/.test(rb) ? Number(rb) : Number.MAX_SAFE_INTEGER
    if (na !== nb) return na - nb
    return Number(a.id || 0) - Number(b.id || 0)
  })
  if (!rooms || rooms.length === 0) {
    return res.status(409).json({ error: 'No rooms available' })
  }
  let chosenRoomId = null
  for (const r of rooms) {
    const existing = await Booking.find({ roomId: r.id, status: { $in: ['pending','confirmed','checked_in'] } }).lean()
    const overlaps = existing.some(b => {
      const bCi = new Date(b.checkIn)
      const bCo = new Date(b.checkOut)
      return ci < bCo && co > bCi
    })
    if (!overlaps) { chosenRoomId = r.id; break }
  }
  if (!chosenRoomId) {
    return res.status(409).json({ error: 'No rooms available for the selected dates' })
  }
  const chosenRoom = rooms.find(x => x.id === chosenRoomId) || await Room.findOne({ id: Number(chosenRoomId) }).lean()
  if (chosenRoom && Number(guests) > Number(chosenRoom.members || 0)) {
    return res.status(400).json({ error: 'Guests exceed room capacity' })
  }
  const basePricePerDay = Number(chosenRoom?.price || 0)
  const diffMs = co.getTime() - ci.getTime()
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const stayDays = diffHours > 0 && diffHours <= 24 ? 1 : Math.floor(diffHours / 24)
  const extraHours = diffHours > 24 ? (diffHours - stayDays * 24) : 0

  const pricing = hotel?.pricing || { normalPrice: Number(hotel.price)||0, weekendPrice: Number(hotel.price)||0, seasonal: [], specials: [] }
  const weekendSurcharge = Number(pricing?.weekendPrice || 0)
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
  function seasonExtra(d) {
    for (const s of seasonal) {
      const st = parseDateStr(s?.start)
      const en = parseDateStr(s?.end)
      const price = Number(s?.price || 0)
      if (st && en && d >= st && d <= en) return price
    }
    return 0
  }
  function specialFor(d) {
    for (const sp of specials) {
      const sd = parseDateStr(sp?.date)
      if (sd && isSameDay(sd, d)) return Number(sp?.price || 0)
    }
    return 0
  }
  function applyPricing(d, base) {
    const dow = d.getDay() // 0 Sun ... 6 Sat
    const isWknd = dow === 5 || dow === 6 || dow === 0 // Fri-Sun
    const weekendExtra = isWknd ? weekendSurcharge : 0
    const seasonalExtra = seasonExtra(d)
    const specialExtra = specialFor(d)
    const total = Number(base || 0) + Number(weekendExtra || 0) + Number(seasonalExtra || 0) + Number(specialExtra || 0)
    return Math.max(0, total)
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
  const ownerActionToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const userActionToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const chosenRoomDoc = await Room.findOne({ id: Number(chosenRoomId) }).lean()
  await Booking.create({ id, userId: Number(userId) || null, hotelId: Number(hotelId), roomId: Number(chosenRoomId), roomNumber: String(chosenRoomDoc?.roomNumber || ''), checkIn, checkOut, guests: Number(guests), total: computedTotal, couponId: appliedCouponId, couponCode: appliedCouponCode, status: 'confirmed', paid: false, ownerActionToken, userActionToken })
  if (appliedCouponId) {
    try { await Coupon.updateOne({ id: Number(appliedCouponId) }, { $inc: { used: 1 } }) } catch {}
  }
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

  try {
    const owner = hotel.ownerId ? await User.findOne({ id: Number(hotel.ownerId) }).lean() : null
    const user = userId ? await User.findOne({ id: Number(userId) }).lean() : null
    const base = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}`
    const ownerConfirmLink = `${base}/api/bookings/email/owner-confirm/${id}?token=${ownerActionToken}`
    const ownerCancelLink = `${base}/api/bookings/email/owner-cancel-query?id=${id}&token=${ownerActionToken}`
    const userCancelLink = `${base}/api/bookings/email/user-cancel-query?id=${id}&token=${userActionToken}`
    if (mailer && owner?.email) {
      try {
        const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
        const ownerHtml = `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
            <h2>New booking received: #${id}</h2>
            <p>Hotel: <b>${hotel.name}</b> (#${hotel.id})</p>
            <p>Room: ${String(chosenRoomDoc?.roomNumber || '') || '#'+chosenRoomId}</p>
            <p>Dates: ${checkIn} → ${checkOut}</p>
            <p>Guests: ${guests}</p>
            <p>Total: ₹${computedTotal}</p>
            <hr/>
            <p>User details:</p>
            <p>Name: ${user?.fullName || `${user?.firstName||''} ${user?.lastName||''}`.trim() || ''}<br/>
               Email: ${user?.email || ''}<br/>
               Phone: ${user?.phone || ''}</p>
            <p style="margin-top:16px">Status: Booked</p>
          </div>`
        await transporter.sendMail({ from: process.env.SMTP_USER, to: owner.email, subject: `New booking #${id} • ${hotel.name}`, html: ownerHtml })
      } catch (e) { console.warn('[BookingCreate] owner email send failed', e?.message || e) }
    }
    // Do not send reservation emails to the user on booking creation
  } catch (_e) { /* ignore */ }

  res.json({ status: 'reserved', id, roomId: chosenRoomId, roomNumber: String(chosenRoomDoc?.roomNumber || '') })
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
  if (b.status === 'confirmed') {
    b.paid = true
    await b.save()
    return res.json({ status: 'confirmed' })
  }
  // allow confirming pending/held bookings
  b.status = 'confirmed'
  b.paid = true
  await b.save()
  if (b.couponId) {
    const c = await Coupon.findOne({ id: Number(b.couponId) })
    if (c) { c.used = Number(c.used||0) + 1; await c.save() }
  }
  if (b.roomId) {
    await Room.updateOne({ id: Number(b.roomId) }, { $set: { blocked: false } })
  }
  const thread = await MessageThread.findOne({ bookingId: id })
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} confirmed`, readByUser: true, readByOwner: true })
  try {
    const hotel = await Hotel.findOne({ id: Number(b.hotelId) }).lean()
    const user = b.userId ? await User.findOne({ id: Number(b.userId) }).lean() : null
    const base = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}`
    const userCancelLink = `${base}/api/bookings/email/user-cancel-query?id=${id}&token=${b.userActionToken || ''}`
    if (mailer && user?.email) {
      try {
        const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
        const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><h2>Your room is confirmed</h2><p>Booking #${id} • ${hotel?.name || ''}</p><p>Room: ${b.roomNumber || ('#'+b.roomId)}</p><p>Check-in: ${b.checkIn} • Check-out: ${b.checkOut} • Guests: ${b.guests}</p><p>Status: Confirmed</p></div>`
        await transporter.sendMail({ from: process.env.SMTP_USER, to: user.email, subject: `Booking confirmed #${id} • ${hotel?.name || ''}`, html })
      } catch (e) { console.warn('[BookingConfirm] user email send failed', e?.message || e) }
    }
  } catch (_e) { /* ignore */ }
  res.json({ status: 'confirmed' })
}

async function ownerConfirmEmail(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const token = String(req.query.token || '')
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).send('Booking not found')
  if (!b.ownerActionToken || b.ownerActionToken !== token) return res.status(403).send('Invalid token')
  req.params.id = String(id)
  return confirm(req, res)
}

async function ownerCancelEmail(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const token = String(req.query.token || req.body?.token || '')
  const reasonRaw = String(req.query.reason || req.body?.reason || '')
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).send('Booking not found')
  if (!b.ownerActionToken || b.ownerActionToken !== token) return res.status(403).send('Invalid token')
  const extra = String(req.query.other || req.body?.other || '').trim()
  const defaultReason = 'Owner cancelled via email'
  const reason = reasonRaw ? (reasonRaw === 'Other' ? (extra ? `Other: ${extra}` : 'Other') : decodeURIComponent(reasonRaw)) : defaultReason
  b.status = 'cancelled'
  b.cancelReason = reason
  await b.save()
  const thread = await MessageThread.findOne({ bookingId: id })
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} cancelled by owner: ${reason}`, readByUser: false, readByOwner: true })
  try {
    const hotel = await Hotel.findOne({ id: Number(b.hotelId) }).lean()
    const user = b.userId ? await User.findOne({ id: Number(b.userId) }).lean() : null
    if (mailer && user?.email) {
      try {
        const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
        const owner = hotel?.ownerId ? await User.findOne({ id: Number(hotel.ownerId) }).lean() : null
        const html = `<div style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\"><h2>Your reservation was cancelled</h2><p>Booking #${id} • ${hotel?.name || ''}</p><p>Room: ${b.roomNumber || ('#'+b.roomId)}</p><p>Status: Cancelled</p><p>Reason: ${reason}</p><p>Owner: ${owner?.fullName || `${owner?.firstName||''} ${owner?.lastName||''}`.trim() || ''} • ${owner?.email || ''} • ${owner?.phone || ''}</p></div>`
        await transporter.sendMail({ from: process.env.SMTP_USER, to: user.email, subject: `Booking cancelled by owner #${id} • ${hotel?.name || ''}`, html })
      } catch (e) { console.warn('[OwnerCancelEmail] user email failed', e?.message || e) }
    }
  } catch (_e) { /* ignore */ }
  res.send('Cancelled')
}

async function userCancelEmail(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const token = String(req.query.token || req.body?.token || '')
  const reasonRaw = String(req.query.reason || req.body?.reason || '')
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).send('Booking not found')
  if (!b.userActionToken || b.userActionToken !== token) return res.status(403).send('Invalid token')
  const extra = String(req.query.other || req.body?.other || '').trim()
  const defaultReason = 'User cancelled via email'
  const reason = reasonRaw ? (reasonRaw === 'Other' ? (extra ? `Other: ${extra}` : 'Other') : decodeURIComponent(reasonRaw)) : defaultReason
  req.params.id = String(id)
  req.body = { ...(req.body || {}), reason }
  return require('./userController').cancelBooking(req, res)
}

async function userCancelEmailQuery(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.query.id)
  const token = String(req.query.token || req.body?.token || '')
  const reasonRaw = String(req.query.reason || req.body?.reason || '')
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).send('Booking not found')
  if (!b.userActionToken || b.userActionToken !== token) return res.status(403).send('Invalid token')
  const extra = String(req.query.other || req.body?.other || '').trim()
  const defaultReason = 'User cancelled via email'
  const reason = reasonRaw ? (reasonRaw === 'Other' ? (extra ? `Other: ${extra}` : 'Other') : decodeURIComponent(reasonRaw)) : defaultReason
  req.params.id = String(id)
  req.body = { ...(req.body || {}), reason }
  return require('./userController').cancelBooking(req, res)
}

async function ownerCancelEmailQuery(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.query.id)
  const token = String(req.query.token || req.body?.token || '')
  const reasonRaw = String(req.query.reason || req.body?.reason || '')
  const b = await Booking.findOne({ id })
  if (!b) return res.status(404).send('Booking not found')
  if (!b.ownerActionToken || b.ownerActionToken !== token) return res.status(403).send('Invalid token')
  const extra = String(req.query.other || req.body?.other || '').trim()
  const defaultReason = 'Owner cancelled via email'
  const reason = reasonRaw ? (reasonRaw === 'Other' ? (extra ? `Other: ${extra}` : 'Other') : decodeURIComponent(reasonRaw)) : defaultReason
  b.status = 'cancelled'
  b.cancelReason = reason
  await b.save()
  const thread = await MessageThread.findOne({ bookingId: id })
  const mid = await nextIdFor('Message')
  await Message.create({ id: mid, threadId: Number(thread?.id || 0), senderRole: 'system', senderId: null, content: `Booking #${id} cancelled by owner: ${reason}`, readByUser: false, readByOwner: true })
  try {
    const hotel = await Hotel.findOne({ id: Number(b.hotelId) }).lean()
    const user = b.userId ? await User.findOne({ id: Number(b.userId) }).lean() : null
    if (mailer && user?.email) {
      try {
        const transporter = mailer.createTransport({ host: process.env.SMTP_HOST, service: /gmail\.com$/i.test(String(process.env.SMTP_HOST||'')) ? 'gmail' : undefined, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE||'false') === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
        const owner = hotel?.ownerId ? await User.findOne({ id: Number(hotel.ownerId) }).lean() : null
        const html = `<div style=\"font-family:Arial,sans-serif;max-width:640px;margin:auto\"><h2>Your reservation was cancelled</h2><p>Booking #${id} • ${hotel?.name || ''}</p><p>Room: ${b.roomNumber || ('#'+b.roomId)}</p><p>Status: Cancelled</p><p>Reason: ${reason}</p><p>Owner: ${owner?.fullName || `${owner?.firstName||''} ${owner?.lastName||''}`.trim() || ''} • ${owner?.email || ''} • ${owner?.phone || ''}</p></div>`
        await transporter.sendMail({ from: process.env.SMTP_USER, to: user.email, subject: `Booking cancelled by owner #${id} • ${hotel?.name || ''}`, html })
      } catch (e) { console.warn('[OwnerCancelEmailQuery] user email failed', e?.message || e) }
    }
  } catch (_e) { /* ignore */ }
  res.send('Cancelled')
}

module.exports = { create, invoice, confirm, ownerConfirmEmail, ownerCancelEmail, userCancelEmail, userCancelEmailQuery, ownerCancelEmailQuery }
