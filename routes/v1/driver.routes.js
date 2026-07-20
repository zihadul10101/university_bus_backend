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
  getSingleDriver,
  updateStatus
} = require('../../controllers/driver.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require('../../utils/upload');

// Sub-admin driver management
router.post(
  '/create-driver',
  authMiddleware(['super_admin', 'sub_admin']),
  upload.uploadSingleImage("image"),
  createDriver
);
router.put('/update-driver/:id',authMiddleware(['super_admin', 'sub_admin']), updateDriver);
router.delete('/delete-driver/:id', authMiddleware(['super_admin', 'sub_admin']), deleteDriver);
router.get('/all-driver',  authMiddleware(['super_admin', 'sub_admin']), getDrivers);
//router.post("/assign-bus/:driverId", authMiddleware(['super_admin', 'sub_admin']),assignBus);
router.post("/assign-bus/:driverId", assignBus);
router.get('/single-driver/:driverId', getSingleDriver);


// Driver login 
router.post('/login', driverLogin);

router.put('/:id/location', authMiddleware(['driver']), updateLocation);
// Driver status toggle (Online/Offline)
router.patch('/update-status/:id', authMiddleware(['driver']), updateStatus);
router.get("/nearby",getNearbyDrivers);


module.exports = router;