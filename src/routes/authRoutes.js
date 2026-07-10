const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Khai báo API đăng nhập và đăng ký
router.post('/login', authController.login);
router.post('/register', authController.register);

// API DÀNH CHO ANDROID GỌI THÔNG TIN DỊCH TỄ/TIÊM CHỦNG
router.get('/tiemchung/:cccd', authController.getThongTinTiemChung);

module.exports = router;