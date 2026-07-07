const router = require('express').Router();

const {
 getRoomStatus,
 getAllLiveRooms

} = require('../../controllers/locationController');

//router.get('/status/:roomId', getRoomStatus);
router.get('/active-trips', getAllLiveRooms); // সব লাইভ বাসের জন্য
router.get('/status/:roomId', getRoomStatus); // নির্দিষ্ট বাসের জন্য


module.exports = router;