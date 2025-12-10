const { connect } = require('../config/db');
const ensureSeed = require('../seed');
const { Hotel, Booking, Review, Room, Coupon, User, Settings } = require('../models');
const BASE_URL = process.env.API_BASE || process.env.VITE_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

function toPublicUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (/^https?:\/\//.test(url)) return url;
  if (/^data:/.test(url)) return url;
  if (url.startsWith('/uploads/')) return `${BASE_URL}${url}`;
  if (url.startsWith('uploads/')) return `${BASE_URL}/${url}`;
  return '';
}

async function list(req, res) {
  try {
    await connect();
    await ensureSeed();

    const { q, minPrice, maxPrice, minRating } = req.query;
    const filter = { ownerId: { $ne: null }, status: 'approved' };

    if (q && typeof q === 'string') {
      const qstr = String(q).trim();
      if (qstr) {
        filter.$or = [
          { name: { $regex: qstr, $options: 'i' } },
          { location: { $regex: qstr, $options: 'i' } },
        ];
      }
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    const items = await Hotel.find(filter).lean();

    // compute review aggregates
    const hotelIds = items.map(h => h.id);
    let revs = [];
    if (hotelIds.length) {
      revs = await Review.find({ hotelId: { $in: hotelIds } }).lean();
    }
    const group = {};
    for (const r of revs) {
      const hid = Number(r.hotelId || 0);
      if (!hid) continue;
      const g = group[hid] || { sum: 0, count: 0 };
      g.sum += Number(r.rating || 0);
      g.count += 1;
      group[hid] = g;
    }

    const hotels = items.map(h => {
      const primary = h.image || (Array.isArray(h.images) && h.images.length > 0 ? h.images[0] : '');
      const resolved = toPublicUrl(primary);
      const g = group[h.id] || { sum: 0, count: 0 };
      const avg = g.count ? (g.sum / g.count) : 0;
      const rounded = Math.round(avg * 10) / 10;
      const count = g.count || Number(h.reviews || 0);
      return {
        ...h,
        rating: count > 0 ? rounded : undefined,
        reviews: count,
        image: resolved || 'https://placehold.co/800x600?text=Hotel'
      };
    });

    res.json({ hotels });

  } catch (e) {
    console.error('[hotelsController.list] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function getById(req, res) {
  try {
    await connect();
    await ensureSeed();

    const id = Number(req.params.id);
    const hotelRaw = await Hotel.findOne({ id }).lean();
    if (!hotelRaw) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (String(hotelRaw.status || '') !== 'approved' || hotelRaw.ownerId == null) {
      return res.status(404).json({ error: 'Not found' });
    }

    const primary = hotelRaw.image || (Array.isArray(hotelRaw.images) && hotelRaw.images.length > 0 ? hotelRaw.images[0] : '');
    const resolved = toPublicUrl(primary);
    const gallery = Array.isArray(hotelRaw.images) ? hotelRaw.images.map(toPublicUrl).filter(Boolean) : [];

    let ownerEmail = ''
    let ownerPhone = ''
    let ownerName = ''
    try {
      const owner = hotelRaw.ownerId ? await User.findOne({ id: Number(hotelRaw.ownerId) }).lean() : null
      ownerEmail = String(owner?.email || '')
      ownerPhone = String(owner?.phone || '')
      ownerName = String((owner?.fullName || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim()) || '')
    } catch (_) {}

    const hotel = {
      ...hotelRaw,
      contactEmail: String(hotelRaw.contactEmail || ownerEmail || ''),
      contactPhone1: String(hotelRaw.contactPhone1 || ownerPhone || ''),
      contactPhone2: String(hotelRaw.contactPhone2 || ''),
      ownerName: String(hotelRaw.ownerName || ownerName || ''),
      image: resolved || 'https://placehold.co/800x600?text=Hotel',
      images: gallery
    };

    res.json({ hotel });

  } catch (e) {
    console.error('[hotelsController.getById] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function getReviews(req, res) {
  try {
    await connect();
    await ensureSeed();

    const id = Number(req.params.id);
    const items = await Review.find({ hotelId: id }).sort({ createdAt: -1 }).lean();

    const userIds = Array.from(new Set(items.map(r => Number(r.userId || 0)).filter(Boolean)));
    let users = [];
    if (userIds.length) {
      users = await User.find({ id: { $in: userIds } }).lean();
    }
    const umap = new Map(users.map(u => [u.id, u]));

    const enriched = items.map(r => ({
      ...r,
      user: umap.get(Number(r.userId || 0)) || null
    }));

    res.json({ reviews: enriched });

  } catch (e) {
    console.error('[hotelsController.getReviews] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function getRooms(req, res) {
  try {
    await connect();
    await ensureSeed();

    const id = Number(req.params.id);
    const items = await Room.find({ hotelId: id }).lean();

    const dateStrRaw = String(req.query.date || '').slice(0, 10);
    const now = new Date();
    const curYMD = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const ymd = dateStrRaw || curYMD;
    const dayStart = new Date(`${ymd}T00:00:00+05:30`);
    const dayEnd   = new Date(`${ymd}T23:59:59+05:30`);

    const bookings = await Booking.find({ hotelId: id, status: { $in: ['pending', 'confirmed', 'checked_in'] } }).lean();
    const roomTypeMap = new Map(items.map(r => [Number(r.id), String(r.type || '')]));
    const typeUsed = {};
    for (const b of bookings) {
      const bCi = new Date(b.checkIn);
      const bCo = new Date(b.checkOut);
      const overlaps = dayStart < bCo && dayEnd > bCi;
      if (overlaps) {
        const t = roomTypeMap.get(Number(b.roomId || 0)) || String(b.roomType || '');
        if (!t) continue;
        typeUsed[t] = (typeUsed[t] || 0) + 1;
      }
    }

    const typeTotals = items
      .filter((r) => !!r.availability)
      .reduce((acc, r) => {
        const t = String(r.type || '');
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});

    const seen = new Set();
    const aggregated = [];
    for (const r of items) {
      const t = String(r.type || '');
      if (seen.has(t)) continue;
      seen.add(t);
      const total = Number(typeTotals[t] || 0);
      const used = Math.max(0, Number(typeUsed[t] || 0));
      const available = Math.max(0, total - used);
      const rep = items.find((i) => String(i.type || '') === t && !!i.availability) || r;
      aggregated.push({
        ...rep,
        availability: available > 0,
        total,
        used,
        available,
      });
    }

    res.json({ rooms: aggregated });

  } catch (e) {
    console.error('[hotelsController.getRooms] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function featured(req, res) {
  try {
    await connect();
    await ensureSeed();

    const items = await Hotel.find({ ownerId: { $ne: null }, status: 'approved' }).lean();

    // compute review aggregates like in list()
    const hotelIds = items.map(h => h.id);
    let revs = [];
    if (hotelIds.length) {
      revs = await Review.find({ hotelId: { $in: hotelIds } }).lean();
    }
    const group = {};
    for (const r of revs) {
      const hid = Number(r.hotelId || 0);
      if (!hid) continue;
      const g = group[hid] || { sum: 0, count: 0 };
      g.sum += Number(r.rating || 0);
      g.count += 1;
      group[hid] = g;
    }

    const hotels = items.map(h => {
      const primary = h.image || (Array.isArray(h.images) && h.images.length > 0 ? h.images[0] : '');
      const resolved = toPublicUrl(primary);
      const g = group[h.id] || { sum: 0, count: 0 };
      const avg = g.count ? (g.sum / g.count) : 0;
      const rounded = Math.round(avg * 10) / 10;
      const count = g.count || Number(h.reviews || 0);
      return {
        ...h,
        rating: count > 0 ? rounded : undefined,
        reviews: count,
        image: resolved || 'https://placehold.co/800x600?text=Hotel'
      };
    });

    const sorted = hotels.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    res.json({ hotels: sorted.slice(0, 4) });

  } catch (e) {
    console.error('[hotelsController.featured] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function about(req, res) {
  try {
    await connect();
    await ensureSeed();

    const totalHotels = await Hotel.countDocuments({ ownerId: { $ne: null }, status: 'approved' });
    const totalBookings = await Booking.countDocuments();

    const s = await Settings.findOne().lean();
    const activeHotels = await Hotel.find({ ownerId: { $ne: null }, status: 'approved' }).lean();
    const citiesSet = new Set(
      activeHotels
        .map(h => String(h?.location || '').split(',')[0].trim())
        .filter(Boolean)
    );
    const citiesCount = citiesSet.size;
    const stats = [
      { label: 'Hotels', value: String(totalHotels) },
      { label: 'Happy Customers', value: String(totalBookings) },
      { label: 'Cities', value: String(citiesCount) }
    ];
    const ourStory = s?.ourStory || '';
    const ourMission = s?.ourMission || '';
    const contact = {
      name: s?.contactName || '',
      email: s?.contactEmail || '',
      phone1: s?.contactPhone1 || '',
      phone2: s?.contactPhone2 || ''
    };
    res.json({ stats, ourStory, ourMission, contact });

  } catch (e) {
    console.error('[hotelsController.about] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function getCoupons(req, res) {
  try {
    await connect();
    await ensureSeed();

    const id = Number(req.params.id);
    const date = String(req.query.date || '').slice(0, 10);
    const q = { hotelId: id, enabled: true };
    const items = await Coupon.find(q).lean();

    const filtered = items.filter(c => {
      const hasQuota = Number(c.usageLimit || 0) === 0 || Number(c.used || 0) < Number(c.usageLimit || 0);
      const matchesDate = date ? String(c.expiry || '').slice(0,10) === date : true;
      return hasQuota && matchesDate;
    });

    res.json({ coupons: filtered });

  } catch (e) {
    console.error('[hotelsController.getCoupons] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

module.exports = {
  list,
  getById,
  getReviews,
  getRooms,
  featured,
  about,
  getCoupons
};
