const router = require('express').Router();
const authMiddleware = require('../../middleware/auth.middleware');


const bizCtrl = require('../../controllers/entrepreneur/businessController');
const adCtrl = require('../../controllers/entrepreneur/advertisementController');
const couponCtrl = require('../../controllers/entrepreneur/couponController');
const pkgCtrl = require('../../controllers/entrepreneur/packageController');
const payCtrl = require('../../controllers/entrepreneur/paymentController');

// ════════════════════════════════════════════════════════════════
// PACKAGES
// ════════════════════════════════════════════════════════════════
router.get('/packages', pkgCtrl.getAllPackages);
router.get('/packages/:id', authMiddleware(['super_admin', 'sub_admin']), pkgCtrl.getPackageById);
router.post('/packages', authMiddleware(['super_admin', 'sub_admin']), pkgCtrl.createPackage);
router.patch('/packages/:id', authMiddleware(['super_admin', 'sub_admin']), pkgCtrl.updatePackage);
router.delete('/packages/:id', authMiddleware(['super_admin', 'sub_admin']), pkgCtrl.deletePackage);

// ════════════════════════════════════════════════════════════════
// COUPONS
// ════════════════════════════════════════════════════════════════
router.post('/coupons/validate', authMiddleware(['student']), couponCtrl.validateCoupon);
router.get('/coupons/code/:code', authMiddleware(['student']), couponCtrl.getCouponByCode);

router.get('/coupons', authMiddleware(['super_admin', 'sub_admin']), couponCtrl.getAllCoupons);
router.post('/coupons', authMiddleware(['super_admin', 'sub_admin']), couponCtrl.createCoupon);
router.get('/coupons/:id',  authMiddleware(['super_admin', 'sub_admin']),couponCtrl.getCouponById);
router.patch('/coupons/:id', authMiddleware(['super_admin', 'sub_admin']), couponCtrl.updateCoupon);
router.delete('/coupons/:id', authMiddleware(['super_admin', 'sub_admin']), couponCtrl.deleteCoupon);

// ════════════════════════════════════════════════════════════════
// BUSINESSES
// ════════════════════════════════════════════════════════════════
// Public
router.get('/businesses', bizCtrl.getAllBusinesses);
router.get('/businesses/:id', bizCtrl.getBusinessById);

// Student (protected)
router.post('/businesses', authMiddleware(['student']), bizCtrl.createBusiness);
router.get('/businesses/my/list', authMiddleware(['student']), bizCtrl.getMyBusinesses);
router.patch('/businesses/:id', authMiddleware(['student']), bizCtrl.updateBusiness);
router.delete('/businesses/:id', authMiddleware(['student']), bizCtrl.deleteBusiness);
router.post('/businesses/:id/rate', authMiddleware(['student']), bizCtrl.addRating);
router.post('/businesses/:id/click', authMiddleware(['student']), bizCtrl.trackContactClick);

// Admin
router.get('/admin/businesses', authMiddleware(['super_admin', 'sub_admin']), bizCtrl.adminGetAllBusinesses);
router.patch('/admin/businesses/:id', authMiddleware(['super_admin', 'sub_admin']), bizCtrl.adminUpdateBusinessStatus);

// ════════════════════════════════════════════════════════════════
// ADVERTISEMENTS
// ════════════════════════════════════════════════════════════════
// Public
router.get('/ads', adCtrl.getApprovedAds);
router.get('/ads/:id', adCtrl.getAdById);

// Student (protected)
router.post('/ads', authMiddleware(['student']), adCtrl.submitAd);
router.get('/ads/my/list', authMiddleware(['student']), adCtrl.getMyAds);
router.post('/ads/:id/click', authMiddleware(['student']), adCtrl.trackClick);
router.post('/ads/:id/renew', authMiddleware(['student']), adCtrl.renewAd);

// Admin
router.get('/admin/ads', authMiddleware(['super_admin', 'sub_admin']), adCtrl.adminGetAllAds);
router.patch('/admin/ads/:id', authMiddleware(['super_admin', 'sub_admin']), adCtrl.adminUpdateAdStatus);
router.get('/admin/dashboard', authMiddleware(['super_admin', 'sub_admin']), adCtrl.adminDashboard);

// ════════════════════════════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════════════════════════════
router.get('/payments/my', authMiddleware(['student']), payCtrl.getMyPayments);
router.get('/admin/payments', authMiddleware(['super_admin', 'sub_admin']), payCtrl.adminGetAllPayments);
router.patch('/admin/payments/:id', authMiddleware(['super_admin', 'sub_admin']), payCtrl.adminVerifyPayment);
router.get('/admin/revenue', authMiddleware(['super_admin', 'sub_admin']), payCtrl.adminRevenueReport);

module.exports = router;