const express = require('express');
const router = express.Router();
const healthDataController = require('../controllers/healthDataController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/vaccine-doses/:cccd', verifyToken, healthDataController.getVaccineInfo);
router.get('/quarantine-status/:cccd', verifyToken, healthDataController.getQuarantineStatus);
router.get('/test-history/:cccd', verifyToken, healthDataController.getTestHistory);
router.get('/test-status/:cccd', verifyToken, healthDataController.getTestStatus);
router.get('/trend-f0', healthDataController.getTrendAnalysis);
router.get('/vaccine-rates', healthDataController.getVaccineRates);
router.get('/dashboard-summary', healthDataController.getDashboardSummary);
router.get('/contact-stats/:cccd', verifyToken, healthDataController.getContactStats);
router.get('/contact-history/:cccd', verifyToken, healthDataController.getContactHistory);
router.get('/checkin-stats/:cccd', verifyToken, healthDataController.getCheckinStats);
router.get('/checkin-history/:cccd', verifyToken, healthDataController.getCheckinHistory);
router.get('/health-declaration-history/:cccd', verifyToken, healthDataController.getHealthDeclarationHistory);
router.post('/health-declaration', verifyToken, healthDataController.submitHealthDeclaration);
router.get('/immigration-history/:cccd', healthDataController.getImmigrationHistory);
router.get('/cua-khau', verifyToken, healthDataController.getCuaKhauList);
router.post('/immigration-declaration', verifyToken, healthDataController.submitImmigrationDeclaration);
router.post('/checkin', verifyToken, healthDataController.submitCheckin);
router.post("/ai/ask", healthDataController.askHealthAI);
router.get('/dashboard-overview', verifyToken, healthDataController.getDashboardOverview);

module.exports = router;