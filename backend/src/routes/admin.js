const express = require('express')
const router = express.Router()
const admin = require('../controllers/adminController')

router.get('/stats', admin.stats)
router.get('/users', admin.users)
router.post('/owners', admin.createOwner)
router.post('/users/owner', admin.createOwner)
router.post('/users/:id/block', admin.blockUser)

router.get('/hotels', admin.hotelsList)
router.post('/hotels/:id/status', admin.hotelStatus)
router.post('/hotels/:id/feature', admin.hotelFeature)

router.get('/bookings', admin.bookings)
router.post('/bookings/:id/cancel', admin.cancelBooking)
router.post('/bookings/:id/refund', admin.refundBooking)

router.get('/coupons', admin.couponsList)
router.post('/coupons', admin.createCoupon)
router.post('/coupons/:id/status', admin.couponStatus)
router.post('/coupons/:id', admin.updateCoupon)
router.delete('/coupons/:id', admin.deleteCoupon)
router.delete('/coupons', admin.deleteAllCoupons)

router.get('/settings', admin.settingsGet)
router.post('/settings', admin.settingsUpdate)



router.get('/support', admin.supportInbox)

module.exports = router
