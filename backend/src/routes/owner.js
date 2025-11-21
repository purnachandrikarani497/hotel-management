const express = require('express')
const router = express.Router()
const owner = require('../controllers/ownerController')

router.get('/stats', owner.stats)
router.get('/hotels', owner.hotels)
router.post('/hotels/submit', owner.submitHotel)
router.post('/hotels/:id/amenities', owner.updateAmenities)
router.post('/hotels/:id/description', owner.updateDescription)
router.post('/hotels/:id/images', owner.updateImages)
router.post('/hotels/:id/docs', owner.updateDocs)

router.get('/rooms', owner.rooms)
router.post('/rooms', owner.createRoom)
router.post('/rooms/:id', owner.updateRoom)
router.post('/rooms/:id/block', owner.blockRoom)

router.get('/bookings', owner.ownerBookings)
router.post('/bookings/:id/approve', owner.approveBooking)
router.post('/bookings/:id/checkin', owner.checkinBooking)
router.post('/bookings/:id/checkout', owner.checkoutBooking)
router.post('/bookings/:id/cancel', owner.cancelBooking)

router.post('/pricing/:hotelId', owner.pricing)

router.get('/reviews', owner.ownerReviews)
router.post('/reviews/:id/respond', owner.respondReview)

module.exports = router