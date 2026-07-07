// const router = require('express').Router();
// const { createBus, getAllBuses, addTrip, updateTrip, deleteTrip, getCurrentTrips, getTripsStatus, getLiveTrips, smartTripSearch, getBusById, updateBus, deleteBus } 
// = require('../../controllers/bus.controller');
// const authMiddleware = require('../../middleware/auth.middleware');



// // //super Admin and sub-admin routes (create/update/delete)

// router.post('/create-bus',authMiddleware(['super_admin','sub_admin']),createBus);
// router.post('/:busId/add-trip', authMiddleware(['super_admin', 'sub_admin']),addTrip);
//  router.put('/:busId/trip/:tripId', authMiddleware(['super_admin', 'sub_admin']),updateTrip);
//  router.delete('/:busId/trip/:tripId',  authMiddleware(['super_admin', 'sub_admin']), deleteTrip);

//  router.put('/:busId',authMiddleware(['super_admin', 'sub_admin']),updateBus);
//  router.delete('/:busId',authMiddleware(['super_admin', 'sub_admin']), deleteBus);

//  router.get("/current-trips", getCurrentTrips);
//  router.get("/getLiveTrips", getLiveTrips);

//  router.get("/trip-status",getTripsStatus);




//  router.get('/all-bus', getAllBuses);

// router.get('/:busId',getBusById);


// module.exports = router;



const router = require('express').Router();
const { 
  createBus, 
  getAllBuses, 
  addTrip, 
  updateTrip, 
  deleteTrip, 
  getCurrentTrips, 
  getTripsStatus, 
  getLiveTrips, 
  smartTripSearch, 
  getBusById, 
  updateBus, 
  deleteBus 
} = require('../../controllers/bus.controller');

const authMiddleware = require('../../middleware/auth.middleware');

// ==========================================
// 1. FIXED GET ROUTES (সব ফিক্সড রাউট উপরে থাকবে)
// ==========================================
router.get("/current-trips", getCurrentTrips);
router.get("/getLiveTrips", getLiveTrips);
router.get("/trip-status", getTripsStatus);
router.get('/all-bus', getAllBuses);

// ==========================================
// 2. ADMIN PROTECTED ROUTES (Create/Update/Delete)
// ==========================================
router.post('/create-bus', authMiddleware(['super_admin', 'sub_admin']), createBus);
router.post('/:busId/add-trip', authMiddleware(['super_admin', 'sub_admin']), addTrip);
router.put('/:busId/trip/:tripId', authMiddleware(['super_admin', 'sub_admin']), updateTrip);
router.delete('/:busId/trip/:tripId', authMiddleware(['super_admin', 'sub_admin']), deleteTrip);

router.put('/:busId', authMiddleware(['super_admin', 'sub_admin']), updateBus);
router.delete('/:busId', authMiddleware(['super_admin', 'sub_admin']), deleteBus);

// ==========================================
// 3. DYNAMIC GET ROUTES (ডাইনামিক রাউট সবার নিচে সুরক্ষিত থাকবে)
// ==========================================
router.get('/:busId', getBusById);

module.exports = router;