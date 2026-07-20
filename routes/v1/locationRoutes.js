// const router = require('express').Router();

// const {
//  getRoomStatus,
//  getAllLiveRooms

// } = require('../../controllers/locationController');


// router.get('/active-trips', getAllLiveRooms); 
// router.get('/status/:roomId', getRoomStatus); 


// module.exports = router;

const router = require('express').Router();

// Adjust this import to match your existing auth middleware
// (the one already used to protect driver routes elsewhere, e.g. in
// routes/v1/driver.routes.js). Named here as `protect` + `requireRole`
// following a common pattern - rename to match what you already have.


const {
  getRoomStatus,
  getAllLiveRooms,
  submitLocationBatch,
} = require('../../controllers/locationController');

router.get('/active-trips', getAllLiveRooms);
router.get('/status/:roomId', getRoomStatus);

// Offline-queue flush: driver app POSTs a batch of queued GPS points once
// connectivity returns, in case the socket reconnection hasn't caught up
// yet or dropped points during the gap.
router.post('/batch',  submitLocationBatch);

module.exports = router;