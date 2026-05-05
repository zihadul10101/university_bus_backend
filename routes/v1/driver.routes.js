const router = require('express').Router();
const {
  createDriver,
  updateDriver,
  deleteDriver,
  getDrivers,
  driverLogin,
  updateLocation,
  getNearbyDrivers,
  assignBus,
  getSingleDriver
} = require('../../controllers/driver.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// Sub-admin driver management
router.post('/create-driver',  authMiddleware(['super_admin', 'sub_admin']), createDriver);
router.put('/update-driver/:id',authMiddleware(['super_admin', 'sub_admin']), updateDriver);
router.delete('/delete-driver/:id', authMiddleware(['super_admin', 'sub_admin']), deleteDriver);
router.get('/all-driver',  authMiddleware(['super_admin', 'sub_admin']), getDrivers);
router.post("/assign-bus/:driverId", authMiddleware(['super_admin', 'sub_admin']),assignBus);

router.get('/single-driver/:driverId', getSingleDriver);


// Driver login 
router.post('/login', driverLogin);

// Driver update location (requires driver token)
router.put('/:id/location', authMiddleware(['driver']), updateLocation);
// GET nearest drivers
router.get("/nearby",getNearbyDrivers);


module.exports = router;