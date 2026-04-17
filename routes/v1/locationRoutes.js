const router = require('express').Router();

const {
 getRoomStatus

} = require('../../controllers/locationController');
// লাইভ ট্র্যাকিং রুমের তথ্য দেখার রুট
router.get('/status/:roomId', getRoomStatus);

module.exports = router;