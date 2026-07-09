const router = require('express').Router();

const {
 getRoomStatus,
 getAllLiveRooms

} = require('../../controllers/locationController');


router.get('/active-trips', getAllLiveRooms); 
router.get('/status/:roomId', getRoomStatus); 


module.exports = router;