const healthService = require('../services/healthService');
const { askGemini } = require('../services/aiService');

const getVaccineInfo = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ message: 'Vui lòng cung cấp CCCD' });
        }

        const data = await healthService.getVaccineDosesByCCCD(cccd);

        if (data.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy dữ liệu tiêm chủng cho CCCD này' });
        }

        return res.status(200).json({
            message: 'Lấy dữ liệu thành công',
            data: data
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu tiêm chủng' });
    }
};

const getQuarantineStatus = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp CCCD' 
            });
        }

        const quarantineList = await healthService.getActiveQuarantines(cccd);
        
        const isQuarantined = quarantineList.length > 0;

        return res.status(200).json({
            success: true,
            message: isQuarantined ? 'Công dân đang trong diện cách ly' : 'Công dân không bị cách ly',
            isQuarantined: isQuarantined,
            data: quarantineList
        });
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu cách ly:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi trên server khi lấy dữ liệu cách ly',
            error: error.message
        });
    }
};

const getTestHistory = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp CCCD' });
        }

        const data = await healthService.getTestHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy lịch sử xét nghiệm cho công dân này' 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy lịch sử xét nghiệm thành công',
            totalTests: data.length,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử xét nghiệm:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy lịch sử xét nghiệm' });
    }
};

const getTestStatus = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp CCCD' });
        }

        const data = await healthService.getTestHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Công dân chưa có dữ liệu xét nghiệm',
                hasTested: false,
                latestTest: null
            });
        }

        const latestTest = data[0];

        return res.status(200).json({
            success: true,
            message: 'Lấy tình trạng xét nghiệm mới nhất thành công',
            hasTested: true,
            latestTest: latestTest
        });

    } catch (error) {
        console.error('Lỗi khi lấy tình trạng xét nghiệm:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy tình trạng xét nghiệm' });
    }
};

const getTrendAnalysis = async (req, res) => {
    try {
        const trendData = await healthService.getF0TrendThisYear();
        
        return res.status(200).json({
            success: true,
            message: "Lấy dữ liệu xu hướng thành công",
            data: trendData
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu trend analysis:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy dữ liệu xu hướng"
        });
    }
};

const getVaccineRates = async (req, res) => {
    try {
        const rateData = await healthService.getVaccinationRates();
        
        return res.status(200).json({
            success: true,
            message: "Lấy dữ liệu tỷ lệ tiêm chủng thành công",
            data: rateData
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu tỷ lệ tiêm chủng:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy tỷ lệ tiêm chủng"
        });
    }
};

const getDashboardSummary = async (req, res) => {
    try {
        const stats = await healthService.getDashboardStats();
        
        return res.status(200).json({
            success: true,
            message: "Lấy số liệu tổng quan thành công",
            data: stats
        });
    } catch (error) {
        console.error("Lỗi khi lấy số liệu dashboard:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy dữ liệu tổng quan"
        });
    }
};

const getContactStats = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getContactStatsByCCCD(cccd);

        if (!data || data.TongLuotTiepXuc === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không tìm thấy lịch sử tiếp xúc hoặc công dân chưa từng tiếp xúc ai',
                data: {
                    SoLuotF0: 0,
                    SoLuotF1: 0,
                    SoLuotF2: 0,
                    TongLuotTiepXuc: 0
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu thống kê tiếp xúc thành công',
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy thống kê tiếp xúc theo CCCD:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy dữ liệu thống kê tiếp xúc' 
        });
    }
};

const getContactHistory = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getContactHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không có dữ liệu lịch sử tiếp xúc nào',
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết lịch sử tiếp xúc thành công',
            totalContacts: data.length,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy chi tiết lịch sử tiếp xúc:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy chi tiết lịch sử tiếp xúc' 
        });
    }
};

const getCheckinStats = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getCheckinStatsByCCCD(cccd);

        return res.status(200).json({
            success: true,
            message: 'Lấy thống kê tổng quan check-in thành công',
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy thống kê check-in:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy thống kê tổng quan check-in' 
        });
    }
};

const getCheckinHistory = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getCheckinHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không có dữ liệu lịch sử check-in nào',
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết lịch sử check-in thành công',
            totalCheckins: data.length,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử check-in:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy chi tiết lịch sử check-in' 
        });
    }
};

const getHealthDeclarationHistory = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getHealthDeclarationHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không có dữ liệu lịch sử khai báo y tế nào',
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy lịch sử khai báo y tế thành công',
            totalDeclarations: data.length,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử khai báo y tế:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy lịch sử khai báo y tế' 
        });
    }
};

const submitHealthDeclaration = async (req, res) => {
    try {
        const { TiepXucF0, CoBenhNen, ChiTietBenhNen, DiVeTuVungDich, danhSachTrieuChung } = req.body;
        const MaTaiKhoan = req.user.MaTaiKhoan; 

        if (TiepXucF0 === undefined || CoBenhNen === undefined || DiVeTuVungDich === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc trong tờ khai'
            });
        }

        const result = await healthService.createHealthDeclaration({
            MaTaiKhoan,
            TiepXucF0,
            CoBenhNen,
            ChiTietBenhNen,
            DiVeTuVungDich,
            danhSachTrieuChung
        });

        return res.status(201).json({
            success: true,
            message: 'Khai báo y tế thành công',
            data: { MaToKhai: result.MaToKhai }
        });

    } catch (error) {
        console.error('Lỗi khi tạo tờ khai y tế:', error);
        if (error.message.includes('[Lỗi QH')) {
            return res.status(403).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi tạo tờ khai y tế' });
    }
};

const getImmigrationHistory = async (req, res) => {
    try {
        const cccd = req.params.cccd;

        if (!cccd) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp số CCCD' 
            });
        }

        const data = await healthService.getImmigrationHistoryByCCCD(cccd);

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Không có dữ liệu lịch sử xuất nhập cảnh nào',
                data: []
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy lịch sử xuất nhập cảnh thành công',
            totalDeclarations: data.length,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử xuất nhập cảnh:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi lấy lịch sử xuất nhập cảnh' 
        });
    }
};

const getCuaKhauList = async (req, res) => {
    try {
        const data = await healthService.getAllCuaKhau();
        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách cửa khẩu thành công',
            data
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách cửa khẩu:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách cửa khẩu'
        });
    }
};

const submitImmigrationDeclaration = async (req, res) => {
    try {
        const { MaCuaKhau } = req.body;
        const MaNguoiDung = req.user.MaNguoiDung; 

        console.log('>>> req.body:', req.body);
        console.log('>>> MaCuaKhau:', MaCuaKhau);
        console.log('>>> MaNguoiDung:', MaNguoiDung);

        if (!MaCuaKhau) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chọn cửa khẩu'
            });
        }

        const result = await healthService.createImmigrationDeclaration({
            MaNguoiDung,
            MaCuaKhau
        });

        return res.status(201).json({
            success: true,
            message: 'Khai báo xuất nhập cảnh thành công',
            data: { MaToKhaiXNC: result.MaToKhaiXNC }
        });
    } catch (error) {
        console.error('Lỗi khi tạo tờ khai XNC:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo tờ khai xuất nhập cảnh'
        });
    }
};

const submitCheckin = async (req, res) => {
    try {
        const { MaKhuVuc } = req.body;
        const MaTaiKhoan = req.user.MaTaiKhoan;

        if (!MaKhuVuc) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã khu vực (MaKhuVuc)'
            });
        }

        const data = await healthService.createCheckin({ MaTaiKhoan, MaKhuVuc });

        return res.status(201).json({
            success: true,
            message: `Check-in thành công tại ${data.TenKhuVuc}`,
            data: data
        });

    } catch (error) {
        console.error('Lỗi khi check-in:', error);
        if (error.message.includes('[Lỗi QH')) {
            return res.status(403).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: error.message || 'Lỗi server khi thực hiện check-in' });
    }
};

const askHealthAI = async (req, res) => {
    try {
        const { question, healthData } = req.body;
        
        if (!question || question.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập câu hỏi'
            });
        }

        const aiResponse = await askGemini(question, healthData || null);

        return res.status(200).json({
            success: true,
            answer: aiResponse
        });

    } catch (error) {
        console.error('Lỗi khi gọi AI:', error);

        if (error.status === 429) {
            return res.status(503).json({
                success: false,
                message: 'AI đang quá tải, vui lòng thử lại sau ít phút.'
            });
        }

        if (error.status === 400 || error.status === 403) {
            return res.status(500).json({
                success: false,
                message: 'Cấu hình AI không hợp lệ, liên hệ quản trị viên.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi xử lý câu hỏi AI'
        });
    }
};

const getDashboardOverview = async (req, res) => {
    try {
        const overviewData = await healthService.getMedicalOverview();
        
        return res.status(200).json({
            success: true,
            message: "Lấy số liệu tổng quan y tế thành công",
            data: overviewData
        });
    } catch (error) {
        console.error("Lỗi khi lấy số liệu dashboard y tế:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy dữ liệu tổng quan"
        });
    }
};

module.exports = {
    getVaccineInfo,
    getQuarantineStatus,
    getTestHistory, 
    getTestStatus,
    getTrendAnalysis,
    getVaccineRates,
    getDashboardSummary,
    getContactStats,
    getContactHistory,
    getCheckinStats,
    getCheckinHistory,
    getHealthDeclarationHistory,
    submitHealthDeclaration,
    getImmigrationHistory,
    getCuaKhauList,
    submitImmigrationDeclaration,
    submitCheckin,
    askHealthAI,
    getDashboardOverview,
};