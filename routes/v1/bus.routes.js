const router = require('express').Router();
const { createBus, getAllBuses, addTrip, updateTrip, deleteTrip, getCurrentTrips, getTripsStatus, getLiveTrips, smartTripSearch, getBusById, updateBus, deleteBus } 
= require('../../controllers/bus.controller');
const authMiddleware = require('../../middleware/auth.middleware');



// //super Admin and sub-admin routes (create/update/delete)

router.post('/create-bus',authMiddleware(['super_admin','sub_admin']),createBus);
router.post('/:busId/add-trip', authMiddleware(['super_admin', 'sub_admin']),addTrip);
 router.put('/:busId/trip/:tripId', authMiddleware(['super_admin', 'sub_admin']),updateTrip);
 router.delete('/:busId/trip/:tripId',  authMiddleware(['super_admin', 'sub_admin']), deleteTrip);

 router.put('/:busId',authMiddleware(['super_admin', 'sub_admin']),updateBus);
 router.delete('/:busId',authMiddleware(['super_admin', 'sub_admin']), deleteBus);

// // Read-only routes accessible by admin + student
 //router.get("/current-trips",authMiddleware(['super_admin', 'sub_admin','student','driver']), getCurrentTrips);
 router.get("/current-trips", getCurrentTrips);
 //router.get("/trip-status", authMiddleware(['super_admin', 'sub_admin','student','driver']),getTripsStatus);
 router.get("/trip-status",getTripsStatus);




 //router.get('/all-bus',authMiddleware(['super_admin', 'sub_admin','student','driver']), getAllBuses);
 router.get('/all-bus', getAllBuses);
//router.get('/:busId',authMiddleware(['super_admin', 'sub_admin','student','driver']),getBusById);
router.get('/:busId',getBusById);


module.exports = router;

