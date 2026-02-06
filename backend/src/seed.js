const { connect } = require('./config/db')
const { nextIdFor } = require('./utils/ids')
const { Hotel, Settings, User } = require('./models')

async function ensureSeed() {
  try {
    await connect()
  } catch (e) {
    console.error('[Seed] database connect failed, skip seed')
    return
  }

  // Seed Admin if missing
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@staybook.com'
    const admin = await User.findOne({ email: adminEmail })
    if (!admin) {
        const id = await nextIdFor('User')
        const password = process.env.ADMIN_PASSWORD || 'admin123'
        await User.create({ id, email: adminEmail, password, role: 'admin', isApproved: true, firstName: 'Admin', lastName: 'User' })
        console.log('[Seed] admin user created')
    }
  } catch (e) {
    console.warn('[Seed] admin check failed', e.message)
  }

  let count = 0
  try {
    count = await Hotel.countDocuments()
  } catch (e) {
    console.error('[Seed] count failed, skip seed')
    return
  }
  if (count === 0) {
    console.log('[Seed] no base hotels to seed (dummy data disabled)')
  } else {
    // Aggressively remove dummy hotels (those with no ownerId or legacy paths)
    try {
      const result = await Hotel.deleteMany({ 
        $or: [
          { ownerId: null },
          { image: /^\/src\/assets\// },
          { name: { $in: ['Grand Luxury Hotel', 'Tropical Paradise Resort', 'Mediterranean Villa', 'Alpine Mountain Lodge'] } }
        ]
      });
      if (result.deletedCount > 0) {
        console.log(`[Seed] removed ${result.deletedCount} dummy/legacy hotels`);
      }
    } catch (e) {
      console.warn('[Seed] cleanup dummy hotels failed', e.message);
    }
  }

  let exists = 0
  try {
    exists = await Settings.countDocuments()
  } catch (e) {
    exists = 0
  }
  if (exists === 0) {
    console.log('[Seed] seeding default settings');
    await Settings.create({ taxRate: 10, commissionRate: 15 });
  }
  console.log('[Seed] completed')
}

module.exports = ensureSeed