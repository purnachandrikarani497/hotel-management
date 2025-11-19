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
  res.json({ token: 'mock-token', user: { email } })
})

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })
  const db = read()
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'Email exists' })
  const id = nextId(db.users)
  db.users.push({ id, email, password, firstName, lastName, phone, createdAt: new Date().toISOString() })
  write(db)
  res.json({ status: 'created', user: { id, email } })
})

app.post('/api/bookings', (req, res) => {
  const { hotelId, checkIn, checkOut, guests, total } = req.body || {}
  if (!hotelId || !checkIn || !checkOut || !guests) return res.status(400).json({ error: 'Missing booking fields' })
  const db = read()
  const hotel = db.hotels.find(h => h.id === Number(hotelId))
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' })
  const id = nextId(db.bookings)
  db.bookings.push({ id, hotelId: Number(hotelId), checkIn, checkOut, guests: Number(guests), total: Number(total) || 0, createdAt: new Date().toISOString() })
  write(db)
  res.json({ status: 'reserved', id })
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})