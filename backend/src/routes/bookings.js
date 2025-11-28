const express = require('express')
const router = express.Router()
const bookings = require('../controllers/bookingsController')

router.post('/', bookings.create)
router.get('/invoice/:id', bookings.invoice)
router.post('/confirm/:id', bookings.confirm)
router.get('/email/owner-confirm/:id', bookings.ownerConfirmEmail)
router.get('/email/owner-cancel/:id', bookings.ownerCancelEmail)
router.get('/email/user-cancel/:id', bookings.userCancelEmail)
router.post('/email/owner-cancel/:id', bookings.ownerCancelEmail)
router.post('/email/user-cancel/:id', bookings.userCancelEmail)

router.get('/email/user-cancel-query', bookings.userCancelEmailQuery)
router.get('/email/owner-cancel-query', bookings.ownerCancelEmailQuery)

router.get('/email/user-cancel', bookings.userCancelEmailQuery)
router.get('/email/owner-cancel', bookings.ownerCancelEmailQuery)

module.exports = router
