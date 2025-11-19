const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { read, write, nextId } = require('./db')

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

const hotels = [
  { id: 1, name: 'Grand Luxury Hotel', location: 'New York, USA', rating: 4.8, reviews: 328, price: 299, image: '/src/assets/hotel-1.jpg', amenities: ['WiFi', 'Breakfast', 'Parking'], description: 'Experience luxury and comfort at our Grand Luxury Hotel.' },
  { id: 2, name: 'Tropical Paradise Resort', location: 'Bali, Indonesia', rating: 4.9, reviews: 512, price: 189, image: '/src/assets/hotel-2.jpg', amenities: ['WiFi', 'Breakfast', 'Parking'], description: 'Relax at our tropical paradise resort.' },
  { id: 3, name: 'Mediterranean Villa', location: 'Santorini, Greece', rating: 4.7, reviews: 256, price: 349, image: '/src/assets/hotel-3.jpg', amenities: ['WiFi', 'Breakfast'], description: 'Enjoy views at our Mediterranean villa.' },
  { id: 4, name: 'Alpine Mountain Lodge', location: 'Swiss Alps, Switzerland', rating: 4.9, reviews: 425, price: 279, image: '/src/assets/hotel-4.jpg', amenities: ['WiFi', 'Parking'], description: 'Stay at our alpine mountain lodge.' }
]

app.get('/api/hotels', (req, res) => {
  const db = read()
  const { q, minPrice, maxPrice, minRating } = req.query
  let items = [...db.hotels]
  if (q && typeof q === 'string') items = items.filter(h => h.name.toLowerCase().includes(q.toLowerCase()))
  const minP = minPrice ? Number(minPrice) : undefined
  const maxP = maxPrice ? Number(maxPrice) : undefined
  const minR = minRating ? Number(minRating) : undefined
  if (minP !== undefined) items = items.filter(h => h.price >= minP)
  if (maxP !== undefined) items = items.filter(h => h.price <= maxP)
  if (minR !== undefined) items = items.filter(h => h.rating >= minR)
  res.json({ hotels: items })
})

app.get('/api/hotels/:id', (req, res) => {
  const id = Number(req.params.id)
  const db = read()
  const hotel = db.hotels.find(h => h.id === id)
  if (!hotel) return res.status(404).json({ error: 'Not found' })
  res.json({ hotel })
})

app.get('/api/featured', (req, res) => {
  const db = read()
  res.json({ hotels: db.hotels.slice(0, 4) })
})

app.get('/api/about', (req, res) => {
  const db = read()
  res.json({ stats: db.stats })
})

app.post('/api/contact', (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body || {}
  if (!email || !message) return res.status(400).json({ error: 'Missing required fields' })
  const db = read()
  const id = nextId(db.contacts)
  db.contacts.push({ id, firstName, lastName, email, subject, message, createdAt: new Date().toISOString() })
  write(db)
  res.json({ status: 'received', id })
})

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })
  const db = read()
  const user = db.users.find(u => u.email === email)
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' })
  if (user.role === 'owner' && user.isApproved === false) return res.status(403).json({ error: 'Owner not approved' })
  res.json({ token: 'mock-token', user: { id: user.id, email: user.email, role: user.role, isApproved: user.isApproved !== false } })
})

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const db = read()
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email exists' })
  const id = nextId(db.users)
  const allowed = ['admin', 'user', 'owner']
  const userRole = allowed.includes(role) ? role : 'user'
  const isApproved = userRole === 'owner' ? false : true
  db.users.push({ id, email, password, firstName, lastName, phone, role: userRole, isApproved, createdAt: new Date().toISOString() })
  write(db)
  res.json({ status: 'created', user: { id, email, role: userRole } })
})

app.get('/api/seed/admin', (req, res) => {
  const db = read()
  const email = process.env.ADMIN_EMAIL || 'admin@staybook.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const exists = db.users.find(u => u.email === email)
  if (exists) return res.json({ status: 'exists', user: { id: exists.id, email: exists.email, role: exists.role } })
  const id = nextId(db.users)
  const user = { id, email, password, role: 'admin', isApproved: true, firstName: 'Admin', lastName: 'User', createdAt: new Date().toISOString() }
  db.users.push(user)
  write(db)
  res.json({ status: 'seeded', user: { id, email, role: 'admin' } })
})

app.post('/api/bookings', (req, res) => {
  const { hotelId, checkIn, checkOut, guests, total } = req.body || {}
  if (!hotelId || !checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing booking fields' })
  const db = read()
  const hotel = db.hotels.find(h => h.id === Number(hotelId))
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' })
  const id = nextId(db.bookings)
  db.bookings.push({ id, hotelId: Number(hotelId), checkIn, checkOut, guests: Number(guests), total: Number(total) || 0, status: 'confirmed', refundIssued: false, createdAt: new Date().toISOString() })
  write(db)
  res.json({ status: 'reserved', id })
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})

app.get('/api/admin/stats', (req, res) => {
  try {
    const db = read()
    const hotels = Array.isArray(db.hotels) ? db.hotels : []
    const bookings = Array.isArray(db.bookings) ? db.bookings : []
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
    console.error('admin/stats error', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

app.get('/api/admin/users', (req, res) => {
  const db = read()
  res.json({ users: db.users })
})

app.post('/api/admin/users/:id/block', (req, res) => {
  const id = Number(req.params.id)
  const { blocked } = req.body || {}
  const db = read()
  const user = db.users.find(u => u.id === id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  user.blocked = !!blocked
  write(db)
  res.json({ status: 'updated' })
})

app.get('/api/admin/hotels', (req, res) => {
  const db = read()
  res.json({ hotels: db.hotels })
})

app.post('/api/admin/hotels/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body || {}
  const allowed = ['approved','rejected','suspended','pending']
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const db = read()
  const h = db.hotels.find(x => x.id === id)
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.status = status
  write(db)
  res.json({ status: 'updated' })
})

app.post('/api/admin/hotels/:id/feature', (req, res) => {
  const id = Number(req.params.id)
  const { featured } = req.body || {}
  const db = read()
  const h = db.hotels.find(x => x.id === id)
  if (!h) return res.status(404).json({ error: 'Hotel not found' })
  h.featured = !!featured
  write(db)
  res.json({ status: 'updated' })
})

app.get('/api/admin/bookings', (req, res) => {
  try {
    const db = read()
    const bookings = Array.isArray(db.bookings) ? db.bookings : []
    const hotels = Array.isArray(db.hotels) ? db.hotels : []
    const items = bookings.map(b => ({ ...b, hotel: hotels.find(h => h.id === b.hotelId) }))
    res.json({ bookings: items })
  } catch (e) {
    console.error('admin/bookings error', e)
    res.status(500).json({ error: 'Internal error' })
  }
})

app.post('/api/admin/bookings/:id/cancel', (req, res) => {
  const id = Number(req.params.id)
  const db = read()
  const b = db.bookings.find(x => x.id === id)
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.status = 'cancelled'
  write(db)
  res.json({ status: 'updated' })
})

app.post('/api/admin/bookings/:id/refund', (req, res) => {
  const id = Number(req.params.id)
  const db = read()
  const b = db.bookings.find(x => x.id === id)
  if (!b) return res.status(404).json({ error: 'Booking not found' })
  b.refundIssued = true
  write(db)
  res.json({ status: 'updated' })
})

app.get('/api/admin/coupons', (req, res) => {
  const db = read()
  res.json({ coupons: db.coupons })
})

app.post('/api/admin/coupons', (req, res) => {
  const { code, discount, expiry, usageLimit, enabled } = req.body || {}
  if (!code || !discount) return res.status(400).json({ error: 'Missing fields' })
  const db = read()
  const id = nextId(db.coupons)
  db.coupons.push({ id, code, discount: Number(discount), expiry: expiry || null, usageLimit: Number(usageLimit) || 0, used: 0, enabled: enabled !== false })
  write(db)
  res.json({ status: 'created', id })
})

app.post('/api/admin/coupons/:id/status', (req, res) => {
  const id = Number(req.params.id)
  const { enabled } = req.body || {}
  const db = read()
  const c = db.coupons.find(x => x.id === id)
  if (!c) return res.status(404).json({ error: 'Coupon not found' })
  c.enabled = !!enabled
  write(db)
  res.json({ status: 'updated' })
})

app.post('/api/admin/coupons/:id', (req, res) => {
  const id = Number(req.params.id)
  const { discount, expiry, usageLimit } = req.body || {}
  const db = read()
  const c = db.coupons.find(x => x.id === id)
  if (!c) return res.status(404).json({ error: 'Coupon not found' })
  if (discount !== undefined) c.discount = Number(discount)
  if (expiry !== undefined) c.expiry = expiry
  if (usageLimit !== undefined) c.usageLimit = Number(usageLimit)
  write(db)
  res.json({ status: 'updated' })
})

app.get('/api/admin/settings', (req, res) => {
  const db = read()
  if (!db.settings) {
    db.settings = { taxRate: 10, commissionRate: 15 }
    write(db)
  }
  res.json({ settings: db.settings })
})

app.post('/api/admin/settings', (req, res) => {
  const { taxRate, commissionRate } = req.body || {}
  const db = read()
  if (taxRate !== undefined) db.settings.taxRate = Number(taxRate)
  if (commissionRate !== undefined) db.settings.commissionRate = Number(commissionRate)
  write(db)
  res.json({ status: 'updated' })
})

app.get('/api/admin/owners/pending', (req, res) => {
  const db = read()
  const owners = db.users.filter(u => u.role === 'owner' && u.isApproved === false)
  res.json({ owners })
})

app.post('/api/admin/owners/:id/approve', (req, res) => {
  const id = Number(req.params.id)
  const db = read()
  const u = db.users.find(x => x.id === id && x.role === 'owner')
  if (!u) return res.status(404).json({ error: 'Owner not found' })
  u.isApproved = true
  write(db)
  res.json({ status: 'approved' })
})

app.get('/api/admin/support', (req, res) => {
  const db = read()
  res.json({ inbox: db.contacts })
})