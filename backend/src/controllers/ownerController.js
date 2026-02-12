// controllers/ownerController.js

const { connect } = require('../config/db');
const ensureSeed = require('../seed');
const { nextIdFor } = require('../utils/ids');
const { User, Hotel, Booking, Room, Review, MessageThread, Message } = require('../models')

let cloudinary = null;
try { cloudinary = require('cloudinary').v2 } catch { cloudinary = null }
if (cloudinary) {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  } catch {}
}

function dataUrlToBuffer(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const buf = Buffer.from(base64, 'base64');
  let ext = 'png';
  if (mime.includes('jpeg')) ext = 'jpg';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('gif')) ext = 'gif';
  else if (mime.includes('webp')) ext = 'webp';
  return { buf, ext };
}

async function saveImagesFromDataUrls(prefix, entityId, list) {
  const urls = [];
  const items = Array.isArray(list) ? list : [];
  const useCloud = !!(cloudinary && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || `hotel-bookings/${prefix}`;
  if (useCloud) {
    for (let i = 0; i < items.length; i++) {
      const parsed = dataUrlToBuffer(items[i]);
      if (!parsed) continue;
      const publicId = `${prefix}-${entityId}-${Date.now()}-${i}`;
      try {
        const res = await new Promise((resolve) => {
          const s = cloudinary.uploader.upload_stream({ folder, public_id: publicId, resource_type: 'image', overwrite: true }, (err, r) => resolve(err ? null : r));
          s.end(parsed.buf);
        });
        if (res && res.secure_url) urls.push(res.secure_url);
      } catch {}
    }
    return urls;
  }
  console.error('[Upload] Cloudinary not configured, skipping local save');
  return urls;
}

async function stats(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);

  // Check if owner is blocked
  if (ownerId) {
    const owner = await User.findOne({ id: ownerId }).lean();
    if (owner && owner.blocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.', blocked: true });
    }
  }

  const hotels = await Hotel.find({ ownerId }).lean();
  const hotelIds = hotels.map(h => Number(h.id)).filter(Boolean);
  const ownerBookings = await Booking.find({ hotelId: { $in: hotelIds } }).lean();
   const totalBookings = ownerBookings.length;
   const revenueStatuses = ['checked_out', 'checked_in', 'pending'];
   const totalRevenue = ownerBookings
     .filter(b => revenueStatuses.includes(String(b.status || '')))
     .reduce((s, b) => s + (Number(b.total) || 0), 0);
  const rooms = await Room.find({ hotelId: { $in: hotelIds } }).lean();
  const totalRooms = rooms.length;
  const pendingBookings = ownerBookings.filter(b => ['pending'].includes(String(b.status || ''))).length;
  let hotelStatus = 'pending';
  if (hotels && hotels.length) {
    const statuses = new Set(hotels.map(h => String(h.status || 'pending')));
    if (statuses.has('approved')) hotelStatus = 'approved';
    else if (statuses.has('pending')) hotelStatus = 'pending';
    else if (statuses.has('rejected')) hotelStatus = 'rejected';
    else if (statuses.has('suspended')) hotelStatus = 'suspended';
    else hotelStatus = String(hotels[0].status || 'pending');
  } else {
    const owner = await User.findOne({ id: ownerId }).lean();
    hotelStatus = owner?.isApproved ? 'approved' : 'pending';
  }
  res.json({ totalRooms, totalBookings, totalRevenue, pendingBookings, hotelStatus });
}

async function hotels(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);

  // Check if owner is blocked
  if (ownerId) {
    const owner = await User.findOne({ id: ownerId }).lean();
    if (owner && owner.blocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.', blocked: true });
    }
  }

  const hotels = await Hotel.find({ ownerId }).lean();
  res.json({ hotels });
}

async function submitHotel(req, res) {
  await connect(); await ensureSeed();
  const { ownerId, name, location, price, amenities, description } = req.body || {};
  if (!ownerId || !name || !location) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const existing = await Hotel.findOne({ ownerId: Number(ownerId) });
  if (existing) {
    return res.status(409).json({ error: 'Hotel already registered', id: existing.id });
  }
  const id = await nextIdFor('Hotel');
  await Hotel.create({
    id,
    ownerId: Number(ownerId),
    name: String(name),
    location: String(location),
    price: Number(price) || 0,
    image: '',
    amenities: Array.isArray(amenities) ? amenities : [],
    description: String(description || ''),
    status: 'approved',
    featured: false,
    images: [],
    docs: [],
    pricing: {
      normalPrice: Number(price) || 0,
      weekendPrice: Number(price) || 0,
      seasonal: [],
      specials: []
    }
  });
  res.json({ status: 'submitted', id });
}

async function updateAmenities(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { amenities } = req.body || {};
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  h.amenities = Array.isArray(amenities) ? amenities : [];
  await h.save();
  res.json({ status: 'updated' });
}

async function updateDescription(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { description } = req.body || {};
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  h.description = String(description || '');
  await h.save();
  res.json({ status: 'updated' });
}

async function updateImages(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { images } = req.body || {};
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  const savedUrls = await saveImagesFromDataUrls('hotel', id, Array.isArray(images) ? images : []);
  h.images = savedUrls.length ? savedUrls : (Array.isArray(images) ? images : []);
  if (h.images.length > 0) h.image = h.images[0];
  await h.save();
  res.json({ status: 'updated' });
}

async function updateDocs(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { docs } = req.body || {};
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  h.docs = Array.isArray(docs) ? docs : [];
  await h.save();
  res.json({ status: 'updated' });
}

async function updateInfo(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { name, location, price, description, status, featured, contactEmail, contactPhone1, contactPhone2, ownerName } = req.body || {};
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  if (name !== undefined) h.name = String(name);
  if (location !== undefined) h.location = String(location);
  if (price !== undefined) h.price = Number(price) || 0;
  if (description !== undefined) h.description = String(description);
  if (contactEmail !== undefined) h.contactEmail = String(contactEmail);
  if (contactPhone1 !== undefined) h.contactPhone1 = String(String(contactPhone1).replace(/\D/g,'').slice(0,10));
  if (contactPhone2 !== undefined) h.contactPhone2 = String(String(contactPhone2).replace(/\D/g,'').slice(0,10));
  if (ownerName !== undefined) h.ownerName = String(ownerName);
  if (status !== undefined) {
    const allowed = ['approved','rejected','suspended','pending'];
    const s = String(status);
    if (!allowed.includes(s)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    h.status = s;
  }
  if (featured !== undefined) h.featured = !!featured;
  await h.save();
  res.json({ status: 'updated' });
}

async function remapHotelId(req, res) {
  await connect(); await ensureSeed();
  const { fromId, toId } = req.body || {}
  const a = Number(fromId), b = Number(toId)
  if (!a || !b) return res.status(400).json({ error: 'fromId and toId required' })
  if (a === b) return res.json({ status: 'noop' })
  const existsFrom = await Hotel.findOne({ id: a }).lean()
  if (!existsFrom) return res.status(404).json({ error: 'Source hotel not found' })
  const existsTo = await Hotel.findOne({ id: b }).lean()
  if (existsTo) return res.status(409).json({ error: 'Target id already exists' })
  await Hotel.updateOne({ id: a }, { $set: { id: b } })
  await Room.updateMany({ hotelId: a }, { $set: { hotelId: b } })
  await Booking.updateMany({ hotelId: a }, { $set: { hotelId: b } })
  await Review.updateMany({ hotelId: a }, { $set: { hotelId: b } })
  await MessageThread.updateMany({ hotelId: a }, { $set: { hotelId: b } })
  try { const Coupon = require('../models/Coupon'); await Coupon.updateMany({ hotelId: a }, { $set: { hotelId: b } }) } catch {}
  res.json({ status: 'remapped', fromId: a, toId: b })
}

async function rooms(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h => Number(h.id)).filter(Boolean);
  const rooms = await Room.find({ hotelId: { $in: hotelIds } }).lean();
  res.json({ rooms });
}

async function createRoom(req, res) {
  await connect(); await ensureSeed();
  const { ownerId, hotelId, type, price, amenities, photos, availability, members, roomNumber } = req.body || {};
  const hidN = Number(hotelId);
  const hidS = String(hotelId);
  let h = await Hotel.findOne({ id: hidN });
  if (!h) {
    const raw = await Hotel.collection.findOne({ id: hidS });
    if (raw && raw._id) {
      h = await Hotel.findById(raw._id);
    }
  }
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  if (h.ownerId == null && ownerId) {
    h.ownerId = Number(ownerId);
    await h.save();
  }
  if (Number(h.ownerId) !== Number(ownerId)) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  const id = await nextIdFor('Room');
  const savedUrls = await saveImagesFromDataUrls('room', id, Array.isArray(photos) ? photos : []);
  await Room.create({
    id,
    hotelId: Number(h?.id || hidN),
    type: String(type || 'Standard'),
    roomNumber: String(roomNumber || ''),
    price: Number(price) || 0,
    members: Number(members) || 1,
    amenities: Array.isArray(amenities) ? amenities : [],
    photos: savedUrls.length ? savedUrls : (Array.isArray(photos) ? photos : []),
    availability: availability !== false,
    blocked: false
  });
  res.json({ status: 'created', id });
}

async function updateRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { price, availability, amenities, photos, members, type, roomNumber } = req.body || {};
  const r = await Room.findOne({ id }).lean();
  if (!r) {
    return res.json({ status: 'not_found' });
  }

  // Check if hotel is blocked
  const h = await Hotel.findOne({ id: r.hotelId }).lean();
  if (h && h.status === 'suspended') {
    return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  }

  const $set = {};
  if (price !== undefined) $set.price = Number(price);
  if (availability !== undefined) $set.availability = !!availability;
  if (members !== undefined) $set.members = Number(members);
  if (type !== undefined) $set.type = String(type || r.type);
  if (roomNumber !== undefined) $set.roomNumber = String(roomNumber);
  if (Array.isArray(amenities)) $set.amenities = amenities;
  if (Array.isArray(photos)) {
    const savedUrls = await saveImagesFromDataUrls('room', id, photos);
    $set.photos = savedUrls.length ? savedUrls : photos;
  }
  await Room.updateOne({ id }, { $set });
  res.json({ status: 'updated' });
}

async function blockRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { blocked } = req.body || {};
  const r = await Room.findOne({ id }).lean();
  if (!r) {
    return res.json({ status: 'not_found' });
  }

  // Check if hotel is blocked
  const h = await Hotel.findOne({ id: r.hotelId }).lean();
  if (h && h.status === 'suspended') {
    return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  }

  await Room.updateOne({ id }, { $set: { blocked: !!blocked } });
  res.json({ status: 'updated' });
}

async function deleteRoom(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const r = await Room.findOne({ id });
  if (!r) {
    return res.json({ status: 'not_found' });
  }

  // Check if hotel is blocked
  const h = await Hotel.findOne({ id: r.hotelId }).lean();
  if (h && h.status === 'suspended') {
    return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  }

  await Room.deleteOne({ id });
  res.json({ status: 'deleted' });
}

async function ownerBookings(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h => Number(h.id)).filter(Boolean);
  const bookings = await Booking.find({ hotelId: { $in: hotelIds } }).lean();
  const userIds = Array.from(new Set(bookings.map(b => Number(b.userId || 0)).filter(Boolean)));
  const users = userIds.length ? await User.find({ id: { $in: userIds } }).lean() : [];
  const umap = new Map(users.map(u => [u.id, u]));
  const items = bookings.map(b => ({
    ...b,
    user: umap.get(Number(b.userId || 0)) || null
  }));
  res.json({ bookings: items });
}

async function guests(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);
  const hotels = await Hotel.find({ ownerId }).lean();
  const hotelIds = hotels.map(h => Number(h.id)).filter(Boolean);
  const bookings = await Booking.find({ hotelId: { $in: hotelIds } }).lean();
  const byUser = {};
  bookings.forEach(b => {
    const key = Number(b.userId || 0);
    if (!key) return;
    const cur = byUser[key];
    const created = new Date(b.createdAt || 0).getTime();
    if (!cur || created > new Date(cur.lastBooking?.createdAt || 0).getTime()) {
      byUser[key] = {
        lastBooking: {
          id: b.id,
          hotelId: b.hotelId,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guests: Number(b.guests || 0),
          status: b.status,
          createdAt: b.createdAt
        }
      };
    }
  });
  const userIds = Object.keys(byUser).map(id => Number(id));
  const users = await User.find({ id: { $in: userIds } }).lean();
  const map = new Map(users.map(u => [u.id, u]));
  const guests = userIds.map(id => ({
    user: map.get(id) || null,
    lastBooking: byUser[id]?.lastBooking || null
  }));
  res.json({ guests });
}

async function approveBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const b = await Booking.findOne({ id });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  b.status = 'pending';
  await b.save();

  let thread = await MessageThread.findOne({ bookingId: id });
  if (!thread) {
    const tid = await nextIdFor('MessageThread');
    const h = await Hotel.findOne({ id: Number(b.hotelId) });
    await MessageThread.create({
      id: tid,
      bookingId: id,
      hotelId: Number(b.hotelId),
      userId: Number(b.userId) || null,
      ownerId: Number(h?.ownerId) || null
    });
    thread = await MessageThread.findOne({ id: tid }).lean();
  }

  const mid = await nextIdFor('Message');
  await Message.create({
    id: mid,
    threadId: Number(thread?.id || 0),
    senderRole: 'system',
    senderId: null,
    content: `Booking #${id} approved • awaiting payment`,
    readByUser: false,
    readByOwner: true
  });

  res.json({ status: 'updated' });
}

async function checkinBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const b = await Booking.findOne({ id });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  b.status = 'checked_in';
  b.checkinAt = new Date();
  await b.save();
  let thread = await MessageThread.findOne({ bookingId: id });
  if (!thread) {
    const tid = await nextIdFor('MessageThread');
    const h = await Hotel.findOne({ id: Number(b.hotelId) });
    await MessageThread.create({
      id: tid,
      bookingId: id,
      hotelId: Number(b.hotelId),
      userId: Number(b.userId) || null,
      ownerId: Number(h?.ownerId) || null
    });
    thread = await MessageThread.findOne({ id: tid }).lean();
  }
  const mid = await nextIdFor('Message');
  await Message.create({
    id: mid,
    threadId: Number(thread?.id || 0),
    senderRole: 'system',
    senderId: null,
    content: `Check-in complete for booking #${id}`,
    readByUser: false,
    readByOwner: true
  });
  res.json({ status: 'updated' });
}

async function checkoutBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const b = await Booking.findOne({ id });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (String(b.status||'') !== 'checked_in') return res.status(400).json({ error: 'Booking must be checked-in first' });
  const now = new Date();
  b.status = 'checked_out';
  b.checkoutAt = now;
  try {
    const h = await Hotel.findOne({ id: Number(b.hotelId) }).lean();
    const pricing = h?.pricing || {};
    const rate = Number(pricing?.extraHourRate || 0);
    const plannedDateStr = String(b.checkOut || '');
    let planned = new Date(plannedDateStr);
    if (!(planned instanceof Date) || isNaN(planned.getTime())) {
      planned = new Date(plannedDateStr);
    }
    // Assume standard checkout hour at 10:00 local time
    if (planned instanceof Date && !isNaN(planned.getTime())) {
      planned.setHours(10, 0, 0, 0);
      const diffMs = now.getTime() - planned.getTime();
      const extra = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60)) : 0;
      const hourlyRate = rate > 0 ? rate : Math.round((Number(h?.price || 0)) / 24);
      const extraAmount = extra > 0 ? extra * hourlyRate : 0;
      b.extraHours = extra;
      b.extraCharges = extraAmount;
      if (extraAmount > 0) b.total = Number(b.total || 0) + extraAmount;
    }
  } catch (_e) { /* ignore */ }
  await b.save();
  let thread = await MessageThread.findOne({ bookingId: id });
  if (!thread) {
    const tid = await nextIdFor('MessageThread');
    const h = await Hotel.findOne({ id: Number(b.hotelId) });
    await MessageThread.create({
      id: tid,
      bookingId: id,
      hotelId: Number(b.hotelId),
      userId: Number(b.userId) || null,
      ownerId: Number(h?.ownerId) || null
    });
    thread = await MessageThread.findOne({ id: tid }).lean();
  }
  const mid = await nextIdFor('Message');
  await Message.create({
    id: mid,
    threadId: Number(thread?.id || 0),
    senderRole: 'system',
    senderId: null,
    content: `Checkout complete for booking #${id}. Please share your rating and feedback.`,
    readByUser: false,
    readByOwner: true
  });
  res.json({ status: 'updated' });
}

async function cancelBooking(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { reason } = req.body || {};
  const b = await Booking.findOne({ id });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (!reason || String(reason).trim().length < 5) {
    return res.status(400).json({ error: 'Cancellation reason required' });
  }
  const s = String(b.status || '').toLowerCase();
  if (s === 'checked_in' || s === 'checked_out') {
    return res.status(409).json({ error: 'Cannot cancel after check-in' });
  }
  b.status = 'cancelled';
  b.cancelReason = String(reason).trim();
  await b.save();

  let thread = await MessageThread.findOne({ bookingId: id });
  if (!thread) {
    const tid = await nextIdFor('MessageThread');
    const h = await Hotel.findOne({ id: Number(b.hotelId) });
    await MessageThread.create({
      id: tid,
      bookingId: id,
      hotelId: Number(b.hotelId),
      userId: Number(b.userId) || null,
      ownerId: Number(h?.ownerId) || null
    });
    thread = await MessageThread.findOne({ id: tid }).lean();
  }

  const mid = await nextIdFor('Message');
  await Message.create({
    id: mid,
    threadId: Number(thread?.id || 0),
    senderRole: 'system',
    senderId: null,
    content: `Booking #${id} cancelled by owner: ${String(reason).trim()}`,
    readByUser: false,
    readByOwner: true
  });

  res.json({ status: 'updated' });
}

async function pricing(req, res) {
  await connect(); await ensureSeed();
  const hotelId = Number(req.params.hotelId);
  const { normalPrice, weekendPrice, seasonal, specials, extraHourRate, cancellationHourRate } = req.body || {};
  const h = await Hotel.findOne({ id: hotelId });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  
  // Check if hotel is blocked
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });

  if (!h.pricing) {
    h.pricing = {
      normalPrice: Number(h.price) || 0,
      weekendPrice: Number(h.price) || 0,
      seasonal: [],
      specials: [],
      extraHourRate: 0,
      cancellationHourRate: 0
    };
  }
  if (normalPrice !== undefined) h.pricing.normalPrice = Number(normalPrice);
  if (weekendPrice !== undefined) h.pricing.weekendPrice = Number(weekendPrice);
  if (Array.isArray(seasonal)) {
    h.pricing.seasonal = seasonal.map(s => ({
      start: String(s.start),
      end: String(s.end),
      price: Number(s.price) || 0
    }));
  }
  if (Array.isArray(specials)) {
    h.pricing.specials = specials.map(sp => ({
      date: String(sp.date),
      price: Number(sp.price) || 0
    }));
  }
  if (extraHourRate !== undefined) h.pricing.extraHourRate = Number(extraHourRate) || 0;
  if (cancellationHourRate !== undefined) h.pricing.cancellationHourRate = Number(cancellationHourRate) || 0;
  await h.save();
  res.json({ status: 'updated' });
}

async function deletePricing(req, res) {
  await connect(); await ensureSeed();
  const hotelId = Number(req.params.hotelId);
  const h = await Hotel.findOne({ id: hotelId });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });

  // Check if hotel is blocked
  if (h.status === 'suspended') return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });

  h.pricing = {
    normalPrice: Number(h.price) || 0,
    weekendPrice: Number(h.price) || 0,
    seasonal: [],
    specials: [],
    extraHourRate: 0,
    cancellationHourRate: 0
  };
  await h.save();
  res.json({ status: 'deleted' });
}

async function ownerReviews(req, res) {
  await connect(); await ensureSeed();
  const ownerId = Number(req.query.ownerId);
  const hotelIds = (await Hotel.find({ ownerId }).lean()).map(h => h.id);
  const items = await Review.find({ hotelId: { $in: hotelIds } }).sort({ createdAt: -1 }).lean();
  const userIds = Array.from(new Set(items.map(r => Number(r.userId || 0)).filter(Boolean)));
  const users = userIds.length ? await User.find({ id: { $in: userIds } }).lean() : [];
  const umap = new Map(users.map(u => [u.id, u]));
  const enriched = items.map(r => ({
    ...r,
    user: umap.get(Number(r.userId || 0)) || null
  }));
  res.json({ reviews: enriched });
}

async function respondReview(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const { response } = req.body || {};
  const r = await Review.findOne({ id });
  if (!r) return res.status(404).json({ error: 'Review not found' });

  // Check if hotel is blocked
  const h = await Hotel.findOne({ id: r.hotelId }).lean();
  if (h && h.status === 'suspended') {
    return res.status(403).json({ error: 'This hotel is blocked. Please contact admin.' });
  }

  r.response = String(response || '');
  await r.save();

  // Also send this response as a message to the user inbox
  if (response && String(response).trim()) {
    let thread = null;
    if (r.bookingId) {
      thread = await MessageThread.findOne({ bookingId: r.bookingId });
    }

    if (!thread) {
      // Fallback to searching by userId and hotelId if no thread by bookingId
      thread = await MessageThread.findOne({ 
        userId: Number(r.userId), 
        hotelId: Number(r.hotelId) 
      });
    }

    if (!thread) {
      // Create a new thread if none exists
      const tid = await nextIdFor('MessageThread');
      thread = await MessageThread.create({
        id: tid,
        bookingId: r.bookingId || null,
        hotelId: Number(r.hotelId),
        userId: Number(r.userId),
        ownerId: Number(h?.ownerId) || null
      });
    }

    const mid = await nextIdFor('Message');
    await Message.create({
      id: mid,
      threadId: Number(thread.id),
      senderRole: 'owner',
      senderId: Number(h?.ownerId) || null,
      content: `Owner response to your review: ${String(response).trim()}`,
      readByUser: false,
      readByOwner: true
    });
  }

  res.json({ status: 'updated' });
}

async function deleteHotel(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id);
  const h = await Hotel.findOne({ id });
  if (!h) return res.status(404).json({ error: 'Hotel not found' });
  await Review.deleteMany({ hotelId: id });
  await Booking.deleteMany({ hotelId: id });
  await Room.deleteMany({ hotelId: id });
  await Hotel.deleteOne({ id });
  res.json({ status: 'deleted' });
}


module.exports = {
  stats,
  hotels,
  submitHotel,
  updateAmenities,
  updateDescription,
  updateImages,
  updateDocs,
  updateInfo,
  remapHotelId,
  deleteHotel,
  rooms,
  createRoom,
  updateRoom,
  blockRoom,
  deleteRoom,
  ownerBookings,
  guests,
  approveBooking,
  checkinBooking,
  checkoutBooking,
  cancelBooking,
  pricing,
  deletePricing,
  ownerReviews,
  respondReview
};
