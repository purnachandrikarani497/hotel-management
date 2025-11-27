// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { connect, isConnected } = require('./config/db');
const ensureSeed = require('./seed');
const { nextIdFor } = require('./utils/ids');
const models = require('./models');
const { Contact } = models;

const hotelsRoutes   = require('./routes/hotels');
const publicRoutes   = require('./routes/public');
const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const bookingsRoutes = require('./routes/bookings');
const userRoutes     = require('./routes/user');
const ownerRoutes    = require('./routes/owner');
const messagesRoutes = require('./routes/messages');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  console.warn('[Server] could not ensure uploads directory:', err);
}

app.get('/uploads/:name', (req, res) => {
  try {
    const name = path.basename(String(req.params.name || ''));
    const filePath = path.join(uploadsDir, name);
    if (fs.existsSync(filePath)) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.sendFile(filePath);
    }
    const transparentPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res
      .status(200)
      .send(Buffer.from(transparentPngBase64, 'base64'));
  } catch (e) {
    return res.status(404).end();
  }
});

app.use('/uploads', express.static(uploadsDir));

const port = Number(process.env.PORT || 5000);

(async () => {
  try {
    await connect();
    await ensureSeed();
    await Promise.all(
      Object.values(models).map((m) =>
        typeof m?.init === 'function' ? m.init() : Promise.resolve()
      )
    );
    console.log(`[Server] DB health: ${isConnected()}`);
  } catch (e) {
    console.error('[Server] DB init failed', e?.message || e);
  } finally {
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
      console.log(`[Server] DB connected: ${isConnected()}`);
    });
  }
})();

setInterval(async () => {
  try {
    await connect();
    const { Booking, Room } = require('./models');
    const now = new Date();
    const holds = await Booking.find({
      status: 'held',
      holdExpiresAt: { $lte: now },
    }).lean();
    for (const b of holds) {
      const doc = await Booking.findOne({ id: b.id });
      if (doc) {
        doc.status = 'expired';
        await doc.save();
      }
      if (b.roomId) {
        const r = await Room.findOne({ id: Number(b.roomId) });
        if (r) {
          r.blocked = false;
          await r.save();
        }
      }
    }
  } catch (e) {
    // optionally log error
  }
}, 30000);

app.get('/', async (req, res) => {
  await connect();
  await ensureSeed();
  res.json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db/health', async (req, res) => {
  try {
    await connect();
    res.json({ connected: isConnected() });
  } catch (e) {
    res.json({ connected: false });
  }
});

app.post('/api/contact', async (req, res) => {
  await connect();
  await ensureSeed();
  const { firstName, lastName, email, subject, message } = req.body || {};
  if (!email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = await nextIdFor('Contact');
  await Contact.create({
    id,
    firstName,
    lastName,
    email,
    subject,
    message,
  });
  res.json({ status: 'received', id });
});

app.use('/api/hotels', hotelsRoutes);
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/messages', messagesRoutes);
