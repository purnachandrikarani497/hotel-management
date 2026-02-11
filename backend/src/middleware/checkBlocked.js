const { User } = require('../models');
const { connect } = require('../config/db');

async function checkBlocked(req, res, next) {
  try {
    await connect();
    const userId = Number(req.query.userId || req.body.userId || req.query.ownerId || req.body.ownerId);
    
    if (userId) {
      const user = await User.findOne({ id: userId }).lean();
      if (user && user.blocked) {
        return res.status(403).json({ 
          error: 'Your account has been blocked. Please contact admin.',
          blocked: true 
        });
      }
    }
    next();
  } catch (e) {
    console.error('[checkBlocked middleware] error:', e);
    next();
  }
}

module.exports = checkBlocked;
