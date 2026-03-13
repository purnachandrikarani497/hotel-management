// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
(() => {
  try {
    const candidates = [
      path.resolve(__dirname, '../.env'),
      path.resolve(__dirname, '.env'),
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'backend/.env'),
    ];
    let loadedFrom = '';
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const result = dotenv.config({ path: p, override: true });
          try {
            const content = fs.readFileSync(p, 'utf8');
            const parsed = dotenv.parse(content);
            const normalize = (k) => String(k || '').replace(/^\uFEFF/, '').trim();
            for (const [k, v] of Object.entries(parsed || {})) {
              const nk = normalize(k);
              if (!(nk in process.env)) process.env[nk] = String(v || '');
            }
            const extract = (name) => {
              try {
                const re = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, 'm');
                const m = content.match(re);
                if (m && m[1] != null) {
                  const raw = String(m[1]);
                  const val = raw.replace(/\r?\n.*/s, '').trim().replace(/^"(.*)"$/, '$1');
                  return val;
                }
              } catch {}
              return '';
            };
            if (!process.env.PORT) {
              const v = extract('PORT');
              if (v) process.env.PORT = v;
            }
            if (!process.env.MONGODB_URI && !process.env.MONGO_URL) {
              const v1 = extract('MONGODB_URI');
              const v2 = extract('MONGO_URL');
              if (v1) process.env.MONGODB_URI = v1;
              if (v2) process.env.MONGO_URL = v2;
            }
          } catch {}
          loadedFrom = p;
          break;
        }
      } catch {}
    }
    console.log('[Server] dotenv loaded from:', loadedFrom || '(none)');
  } catch (e) {
    console.warn('[Server] dotenv load failed:', e?.message || e);
  }
})();

console.log('[Server] Environment Variables:', {
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
  MONGO_URL: process.env.MONGO_URL ? 'SET' : 'NOT SET',
  NODE_ENV: process.env.NODE_ENV
});
console.log('[Server] Env debug sample:', {
  PORT_val: process.env.PORT,
  MONGODB_URI_val: process.env.MONGODB_URI,
  MONGO_URL_val: process.env.MONGO_URL,
  FRONTEND_BASE_URL_val: process.env.FRONTEND_BASE_URL
});


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
const checkBlocked   = require('./middleware/checkBlocked');
const userRoutes     = require('./routes/user');
const ownerRoutes    = require('./routes/owner');
const messagesRoutes = require('./routes/messages');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
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

const port = Number(process.env.PORT) || 5000;

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
app.use('/api/bookings', checkBlocked, bookingsRoutes);
app.use('/api/user', checkBlocked, userRoutes);
app.use('/api/owner', checkBlocked, ownerRoutes);
app.use('/api/messages', messagesRoutes);
