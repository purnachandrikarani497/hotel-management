const { connect } = require('../config/db');
const ensureSeed = require('../seed');
const { Hotel, Booking, Review, Room, Coupon, User } = require('../models');
const BASE_URL = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}`;

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
      filter.name = { $regex: q, $options: 'i' };
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
      const avg = g.count ? (g.sum / g.count) : Number(h.rating || 0);
      return {
        ...h,
        rating: Math.round(avg * 10) / 10,
        reviews: g.count || Number(h.reviews || 0),
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

    const primary = hotelRaw.image || (Array.isArray(hotelRaw.images) && hotelRaw.images.length > 0 ? hotelRaw.images[0] : '');
    const resolved = toPublicUrl(primary);
    const gallery = Array.isArray(hotelRaw.images) ? hotelRaw.images.map(toPublicUrl).filter(Boolean) : [];

    const hotel = {
      ...hotelRaw,
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

    res.json({ rooms: items });

  } catch (e) {
    console.error('[hotelsController.getRooms] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function featured(req, res) {
  try {
    await connect();
    await ensureSeed();

    const items = await Hotel.find({ ownerId: { $ne: null }, status: 'approved' }).limit(4).lean();

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
      const avg = g.count ? (g.sum / g.count) : Number(h.rating || 0);
      return {
        ...h,
        rating: Math.round(avg * 10) / 10,
        reviews: g.count || Number(h.reviews || 0),
        image: resolved || 'https://placehold.co/800x600?text=Hotel'
      };
    });

    res.json({ hotels });

  } catch (e) {
    console.error('[hotelsController.featured] error:', e);
    res.status(503).json({ error: 'Database unavailable' });
  }
}

async function about(req, res) {
  try {
    await connect();
    await ensureSeed();

    const totalHotels = await Hotel.countDocuments();
    const totalBookings = await Booking.countDocuments();

    const stats = [
      { label: 'Hotels', value: String(totalHotels) },
      { label: 'Happy Customers', value: String(totalBookings) },
      { label: 'Awards Won', value: '25+' },
      { label: 'Countries', value: '180+' }
    ];

    res.json({ stats });

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
