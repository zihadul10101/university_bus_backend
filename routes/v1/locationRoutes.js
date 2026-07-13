// const router = require('express').Router();

// const {
//  getRoomStatus,
//  getAllLiveRooms

// } = require('../../controllers/locationController');


// router.get('/active-trips', getAllLiveRooms); 
// router.get('/status/:roomId', getRoomStatus); 


// module.exports = router;

const router = require('express').Router();

const {
  getRoomStatus,
  getAllLiveRooms,
  updateLocationRest,
} = require('../../controllers/locationController');

router.get('/active-trips', getAllLiveRooms);
router.get('/status/:roomId', getRoomStatus);

// ✅ NEW: driver app এর background/headless task যখন socket এ পৌঁছাতে
// পারে না, তখনকার fallback। ফ্রন্টএন্ডের locationService.ts এই রুটই কল করে।
router.post('/update', updateLocationRest);

module.exports = router;