const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { MessageThread, Message, User, Hotel } = require('../models')

async function threads(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const ownerId = Number(req.query.ownerId)
  const filter = {}
  if (userId) filter.userId = userId
  if (ownerId) filter.ownerId = ownerId

  // Use aggregation to fetch threads, last message, unread counts, and hotel info in one query
  const pipeline = [
    { $match: filter },
    // Join with messages to get unread counts and last message
    {
      $lookup: {
        from: 'messages',
        localField: 'id',
        foreignField: 'threadId',
        as: 'allMessages'
      }
    },
    // Join with hotels to get hotel info
    {
      $lookup: {
        from: 'hotels',
        localField: 'hotelId',
        foreignField: 'id',
        as: 'hotelInfo'
      }
    },
    {
      $project: {
        id: 1,
        bookingId: 1,
        hotelId: 1,
        userId: 1,
        ownerId: 1,
        createdAt: 1,
        hotel: { $arrayElemAt: ['$hotelInfo', 0] },
        unreadForUser: {
          $size: {
            $filter: {
              input: '$allMessages',
              as: 'm',
              cond: { $eq: ['$$m.readByUser', false] }
            }
          }
        },
        unreadForOwner: {
          $size: {
            $filter: {
              input: '$allMessages',
              as: 'm',
              cond: { $eq: ['$$m.readByOwner', false] }
            }
          }
        },
        lastMessage: {
          $let: {
            vars: {
              sortedMessages: {
                $sortArray: { input: '$allMessages', sortBy: { createdAt: -1 } }
              }
            },
            in: { $arrayElemAt: ['$$sortedMessages', 0] }
          }
        }
      }
    },
    {
      $project: {
        id: 1,
        bookingId: 1,
        hotelId: 1,
        userId: 1,
        ownerId: 1,
        createdAt: 1,
        unreadForUser: 1,
        unreadForOwner: 1,
        lastMessage: 1,
        hotelName: '$hotel.name',
        hotelImage: '$hotel.image'
      }
    }
  ]

  const enriched = await MessageThread.aggregate(pipeline)

  enriched.sort((a, b) => {
    const at = new Date(a?.lastMessage?.createdAt || a?.createdAt || 0).getTime()
    const bt = new Date(b?.lastMessage?.createdAt || b?.createdAt || 0).getTime()
    return bt - at
  })

  res.json({ threads: enriched })
}

async function threadMessages(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const messages = await Message.find({ threadId: id }).sort({ createdAt: 1 }).lean()
  res.json({ messages })
}

async function send(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { senderRole, senderId, content } = req.body || {}
  if (!content) return res.status(400).json({ error: 'Missing content' })
  const mid = await nextIdFor('Message')
  const role = String(senderRole || 'system')
  const readByUser = role === 'user'
  const readByOwner = role === 'owner'
  await Message.create({ id: mid, threadId: id, senderRole: role, senderId: Number(senderId) || null, content: String(content || ''), readByUser, readByOwner })
  res.json({ status: 'sent', id: mid })
}

async function markRead(req, res) {
  await connect(); await ensureSeed();
  const id = Number(req.params.id)
  const { role } = req.body || {}
  if (String(role) === 'user') {
    await Message.updateMany({ threadId: id }, { $set: { readByUser: true } })
  } else if (String(role) === 'owner') {
    await Message.updateMany({ threadId: id }, { $set: { readByOwner: true } })
  }
  res.json({ status: 'updated' })
}

async function unreadCount(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const ownerId = Number(req.query.ownerId)

  // Blocked user check for immediate logout
  const checkId = userId || ownerId;
  if (checkId) {
    const user = await User.findOne({ id: checkId }).lean();
    if (user && user.blocked) {
      return res.status(403).json({ error: 'Your account has been blocked. Please contact admin.', blocked: true });
    }
  }

  const filter = {}
  if (userId) filter.userId = userId
  if (ownerId) filter.ownerId = ownerId

  // Use aggregation for faster unread count calculation
  const pipeline = [
    { $match: filter },
    {
      $lookup: {
        from: 'messages',
        localField: 'id',
        foreignField: 'threadId',
        as: 'msgs'
      }
    },
    { $unwind: '$msgs' },
    {
      $match: userId 
        ? { 'msgs.readByUser': false }
        : { 'msgs.readByOwner': false }
    },
    { $count: 'total' }
  ]

  const result = await MessageThread.aggregate(pipeline)
  const count = result.length > 0 ? result[0].total : 0
  res.json({ count })
}

module.exports = { threads, threadMessages, send, markRead, unreadCount }
