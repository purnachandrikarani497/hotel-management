// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
try { dotenv.config({ path: path.resolve(__dirname, '../../frontend/.env') }) } catch {}

const nodemailer = require("nodemailer");   // <-- ADDED
                                             
// Create SMTP transporter (Gmail)
const transporter = nodemailer.createTransport({   // <-- ADDED
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

const apiUrlRaw = process.env.VITE_API_URL || process.env.API_URL || '';
let fromApiPort = 0;
try {
  if (apiUrlRaw) {
    const u = new URL(apiUrlRaw);
    const p = String(u.port || '').trim();
    fromApiPort = p ? Number(p) : 0;
  }
} catch {}
const envPortRaw = String(process.env.PORT || process.env.API_PORT || '').trim();
const port = fromApiPort || (envPortRaw ? Number(envPortRaw) : 0) || 5000;

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

// removed held-expiry timer: bookings create directly as 'pending'

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

// ---------------------
// CONTACT API + EMAIL
// ---------------------
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

  // ----- SEND EMAIL USING SMTP (OPTIONAL) -----
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,  // send to user
      subject: `Thanks for contacting us`,
      text: `We received your message: ${message}`,
    });

    console.log("Email sent successfully");
  } catch (err) {
    console.log("Email send error:", err.message);
  }

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
