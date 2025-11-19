const fs = require('fs')
const path = require('path')

const dbDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dbDir, 'db.json')

function ensure() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    const seed = {
      stats: [
        { label: 'Hotels', value: '50,000+' },
        { label: 'Happy Customers', value: '1M+' },
        { label: 'Awards Won', value: '25+' },
        { label: 'Countries', value: '180+' }
      ],
      hotels: [
        { id: 1, name: 'Grand Luxury Hotel', location: 'New York, USA', rating: 4.8, reviews: 328, price: 299, image: '/src/assets/hotel-1.jpg', amenities: ['WiFi', 'Breakfast', 'Parking'], description: 'Experience luxury and comfort at our Grand Luxury Hotel.', status: 'approved', featured: false },
        { id: 2, name: 'Tropical Paradise Resort', location: 'Bali, Indonesia', rating: 4.9, reviews: 512, price: 189, image: '/src/assets/hotel-2.jpg', amenities: ['WiFi', 'Breakfast', 'Parking'], description: 'Relax at our tropical paradise resort.', status: 'approved', featured: false },
        { id: 3, name: 'Mediterranean Villa', location: 'Santorini, Greece', rating: 4.7, reviews: 256, price: 349, image: '/src/assets/hotel-3.jpg', amenities: ['WiFi', 'Breakfast'], description: 'Enjoy views at our Mediterranean villa.', status: 'approved', featured: false },
        { id: 4, name: 'Alpine Mountain Lodge', location: 'Swiss Alps, Switzerland', rating: 4.9, reviews: 425, price: 279, image: '/src/assets/hotel-4.jpg', amenities: ['WiFi', 'Parking'], description: 'Stay at our alpine mountain lodge.', status: 'approved', featured: false }
      ],
      users: [],
      contacts: [],
      bookings: [],
      coupons: [],
      settings: { taxRate: 10, commissionRate: 15 }
    }
    fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2))
  }
}

function read() {
  ensure()
  const raw = fs.readFileSync(dbPath, 'utf8')
  return JSON.parse(raw)
}

function write(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

function nextId(items) {
  return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1
}

module.exports = { read, write, nextId }