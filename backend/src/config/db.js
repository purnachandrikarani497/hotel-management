const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
let dotenv = null
try { dotenv = require('dotenv') } catch { dotenv = null }
mongoose.set('strictQuery', false)

;(function ensureEnv() {
  try {
    if (!process.env.MONGODB_URI && !process.env.MONGO_URL) {
      const candidates = [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../.env'),
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'backend/.env')
      ]
      for (const p of candidates) {
        try {
          if (fs.existsSync(p)) {
            console.log('[DB.env] loading from', p)
            if (dotenv) {
              try { dotenv.config({ path: p, override: true }) } catch {}
            }
            const content = fs.readFileSync(p, 'utf8')
            console.log('[DB.env] content has keys', { has_MONGODB_URI: /MONGODB_URI/.test(content), has_MONGO_URL: /MONGO_URL/.test(content), length: content.length })
            const parse = dotenv && typeof dotenv.parse === 'function' ? dotenv.parse : null
            let parsed = {}
            try { parsed = parse ? parse(content) : {} } catch {}
            const extract = (name) => {
              try {
                const re = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, 'm')
                const m = content.match(re)
                if (m && m[1] != null) {
                  const raw = String(m[1])
                  const val = raw.replace(/\r?\n.*/s, '').trim().replace(/^"(.*)"$/, '$1')
                  return val
                }
              } catch {}
              return ''
            }
            const mongo1 = parsed.MONGODB_URI || extract('MONGODB_URI')
            const mongo2 = parsed.MONGO_URL || extract('MONGO_URL')
            if (mongo1 && !process.env.MONGODB_URI) process.env.MONGODB_URI = mongo1
            if (mongo2 && !process.env.MONGO_URL) process.env.MONGO_URL = mongo2
            console.log('[DB.env] after parse', { MONGODB_URI: !!process.env.MONGODB_URI, MONGO_URL: !!process.env.MONGO_URL })
            break
          }
        } catch {}
      }
    }
  } catch {}
})()

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not set in environment variables!');
  console.log('Falling back to localhost for development only.');
}

const finalUri = MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_app';

let connected = false;
async function connect() {
  if (connected && isConnected()) return;
  try {
    const dbName = process.env.MONGODB_DB || 'hotel_app';
    const maskedUri = finalUri.replace(/\/\/.*@/, '//***:***@');
    
    console.log(`[MongoDB] Attempting connection to: ${maskedUri}`);
    
    await mongoose.connect(finalUri, { 
      autoIndex: true, 
      serverSelectionTimeoutMS: 10000, 
      dbName 
    });
    
    connected = true;
    console.log('[MongoDB] Successfully connected to Database');
  } catch (e) {
    connected = false;
    console.error('[MongoDB] Connection failed:', e?.message || e);
    throw e;
  }
}

function isConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1
}

mongoose.connection.on('connected', () => {
  connected = true
  console.log('[MongoDB] connection state: connected')
})
mongoose.connection.on('error', (err) => {
  connected = false
  console.error('[MongoDB] connection state: error', err?.message || err)
})
mongoose.connection.on('disconnected', () => {
  connected = false
  console.warn('[MongoDB] connection state: disconnected')
})

module.exports = { connect, isConnected, mongoose }
