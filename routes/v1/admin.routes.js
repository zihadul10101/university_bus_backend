const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');
const {
  createSubAdmin,
  getSubAdmins,
  deleteSubAdmin,
  updateSubAdmin
} = require('../../controllers/admin.controller');


// Super Admin only
router.post('/create-sub-admin',  authMiddleware(['super_admin']), createSubAdmin);
router.get('/sub-admins',  authMiddleware(['super_admin']), getSubAdmins);
router.put("/sub-admin/:id",authMiddleware(['super_admin']),updateSubAdmin);
router.delete('/sub-admin/:id',authMiddleware(['super_admin']), deleteSubAdmin);

module.exports = router;



