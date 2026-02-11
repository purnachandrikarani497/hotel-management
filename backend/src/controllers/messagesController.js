const { connect } = require('../config/db')
const ensureSeed = require('../seed')
const { nextIdFor } = require('../utils/ids')
const { MessageThread, Message, User } = require('../models')

async function threads(req, res) {
  await connect(); await ensureSeed();
  const userId = Number(req.query.userId)
  const ownerId = Number(req.query.ownerId)
  const filter = {}
  if (userId) filter.userId = userId
  if (ownerId) filter.ownerId = ownerId
  const items = await MessageThread.find(filter).lean()
  const enriched = []
  for (const t of items) {
    const last = await Message.find({ threadId: t.id }).sort({ createdAt: -1 }).limit(1).lean()
    const unreadForUser = await Message.countDocuments({ threadId: t.id, readByUser: false })
    const unreadForOwner = await Message.countDocuments({ threadId: t.id, readByOwner: false })
    enriched.push({ ...t, lastMessage: last[0] || null, unreadForUser, unreadForOwner })
  }
  enriched.sort((a,b)=>{
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
  const items = await MessageThread.find(filter).lean()
  const ids = items.map(t=>t.id)
  let count = 0
  if (userId) count = await Message.countDocuments({ threadId: { $in: ids }, readByUser: false })
  else if (ownerId) count = await Message.countDocuments({ threadId: { $in: ids }, readByOwner: false })
  res.json({ count })
}

module.exports = { threads, threadMessages, send, markRead, unreadCount }
