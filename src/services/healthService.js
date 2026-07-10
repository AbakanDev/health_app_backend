const db = require('../config/db');

// Lịch sử tiêm chủng
const getVaccineDosesByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT t.SoMui, t.LoaiVacXin, t.NgayTiem, n.HoTen
            FROM TIEMCHUNG t
            JOIN NGUOIDUNG n ON t.MaNguoiDung = n.MaNguoiDung
            WHERE n.CCCD = ?
            ORDER BY t.NgayTiem DESC
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows; 
    } catch (error) {
        throw error;
    }
};

// Lịch sử cách ly
const getActiveQuarantines = async (cccd) => {
    const query = `
        SELECT 
            cl.MaCachLy,
            DATE_FORMAT(cl.NgayBatDau, '%d/%m/%Y') AS NgayBatDau,
            DATE_FORMAT(cl.NgayKetThuc, '%d/%m/%Y') AS NgayKetThuc,
            cl.DiaDiem AS DiaDiemChiTiet,
            csyt.TenCoSo AS TenCoSoYTe
        FROM CACHLY cl
        JOIN NGUOIDUNG nd ON cl.MaNguoiDung = nd.MaNguoiDung
        LEFT JOIN COSOYTE csyt ON cl.MaCoSo = csyt.MaCoSo
        WHERE nd.CCCD = ? AND CURDATE() BETWEEN cl.NgayBatDau AND cl.NgayKetThuc;
    `;
    
    const [rows] = await db.execute(query, [cccd]);
    return rows;
};

// Lịch sử xét nghiệm
const getTestHistoryByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT 
                n.HoTen,
                n.CCCD,
                x.MaXetNghiem,
                ROW_NUMBER() OVER(PARTITION BY x.MaNguoiDung ORDER BY x.NgayXetNghiem ASC) AS LanXetNghiem,
                x.LoaiXetNghiem,
                DATE_FORMAT(x.NgayXetNghiem, '%d/%m/%Y') AS NgayXetNghiem,
                x.KetQua, 
                c.TenCoSo AS DiaDiemXetNghiem
            FROM XETNGHIEM x
            JOIN NGUOIDUNG n ON x.MaNguoiDung = n.MaNguoiDung
            LEFT JOIN COSOYTE c ON x.MaCoSo = c.MaCoSo
            WHERE n.CCCD = ?
            ORDER BY x.NgayXetNghiem DESC;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows;
    } catch (error) {
        throw error;
    }
};

// Biểu đồ xu hướng F0
const getF0TrendThisYear = async () => {
    const query = `
        SELECT 
            MONTH(NgayXetNghiem) as month, 
            COUNT(MaXetNghiem) as total_cases 
        FROM XETNGHIEM 
        WHERE 
            YEAR(NgayXetNghiem) = YEAR(CURDATE()) 
            AND KetQua = 'Dương tính' 
        GROUP BY MONTH(NgayXetNghiem)
        ORDER BY month ASC;
    `;

    const [rows] = await db.execute(query);
    const monthlyData = new Array(12).fill(0);

    rows.forEach(row => {
        const monthIndex = row.month - 1;
        monthlyData[monthIndex] = row.total_cases;
    });

    return monthlyData;
};

// Tỷ lệ tiêm chủng
const getVaccinationRates = async () => {
    const query = `
        SELECT 
            ROUND(
                COUNT(DISTINCT CASE WHEN T.SoMui >= 1 THEN T.MaNguoiDung END) * 100.0 
                / COUNT(DISTINCT N.MaNguoiDung), 2
            ) AS TyLeMui1,
            
            ROUND(
                COUNT(DISTINCT CASE WHEN T.SoMui >= 2 THEN T.MaNguoiDung END) * 100.0 
                / COUNT(DISTINCT N.MaNguoiDung), 2
            ) AS TyLeMui2
        FROM NGUOIDUNG N
        LEFT JOIN TIEMCHUNG T ON N.MaNguoiDung = T.MaNguoiDung;
    `;

    const [rows] = await db.execute(query);
    return rows[0]; 
};

// Tổng quan Dashboard
const getDashboardStats = async () => {
    try {
        const queryF0 = `
            SELECT COUNT(*) AS SoCaF0
            FROM (
                SELECT MaNguoiDung, KetQua, 
                       ROW_NUMBER() OVER (PARTITION BY MaNguoiDung ORDER BY NgayXetNghiem DESC) as rn
                FROM XETNGHIEM
            ) tmp
            WHERE rn = 1 AND KetQua = N'Dương tính';
        `;

        const queryF1F2 = `
            SELECT COUNT(DISTINCT MaNguoiDung) AS SoCaF1F2
            FROM GHINHANCAPDO 
            WHERE MaCapDo IN ('F1', 'F2')
              AND MaNguoiDung NOT IN (
                  SELECT MaNguoiDung
                  FROM (
                      SELECT MaNguoiDung, KetQua, 
                             ROW_NUMBER() OVER (PARTITION BY MaNguoiDung ORDER BY NgayXetNghiem DESC) as rn
                      FROM XETNGHIEM
                  ) tmp
                  WHERE rn = 1 AND KetQua = N'Dương tính'
              );
        `;

        const queryCachLy = `
            SELECT COUNT(DISTINCT MaNguoiDung) AS SoNguoiCachLy
            FROM CACHLY
            WHERE NgayBatDau <= CURDATE() 
              AND (NgayKetThuc IS NULL OR NgayKetThuc >= CURDATE());
        `;
        
        const queryVungNguyHiem = `
            SELECT COUNT(*) AS SoVungNguyHiem
            FROM (
                SELECT k.MaKhuVuc
                FROM KHUVUC k
                JOIN LICHSUCHECKIN c ON k.MaKhuVuc = c.MaKhuVuc
                JOIN GHINHANCAPDO g ON c.MaNguoiDung = g.MaNguoiDung
                WHERE g.MaCapDo = 'F0' 
                GROUP BY k.MaKhuVuc
                HAVING COUNT(DISTINCT c.MaNguoiDung) > 4
            ) AS DanhSachVungNguyHiem;
        `;

        const [[f0Result], [f1f2Result], [cachLyResult], [vungNguyHiemResult]] = await Promise.all([
            db.execute(queryF0),
            db.execute(queryF1F2),
            db.execute(queryCachLy),
            db.execute(queryVungNguyHiem) 
        ]);

        return {
            SoCaF0: f0Result[0].SoCaF0 || 0,
            SoCaF1F2: f1f2Result[0].SoCaF1F2 || 0,
            SoNguoiCachLy: cachLyResult[0].SoNguoiCachLy || 0,
            SoVungNguyHiem: vungNguyHiemResult[0].SoVungNguyHiem || 0 
        };
    } catch (error) {
        throw error;
    }
};

// Thống kê tiếp xúc
const getContactStatsByCCCD = async (cccd) => {
    try {
        const query = `
            WITH TargetUser AS (
                SELECT MaNguoiDung FROM NGUOIDUNG WHERE CCCD = ? LIMIT 1
            ),
            NguoiTiepXuc AS (
                SELECT 
                    CASE 
                        WHEN MaNguoiDung1 = (SELECT MaNguoiDung FROM TargetUser) THEN MaNguoiDung2 
                        ELSE MaNguoiDung1 
                    END AS MaNguoiDungKhac
                FROM LICHSUTIEPXUC
                WHERE MaNguoiDung1 = (SELECT MaNguoiDung FROM TargetUser) 
                   OR MaNguoiDung2 = (SELECT MaNguoiDung FROM TargetUser)
            ),
            TrangThaiMoiNhat AS (
                SELECT MaNguoiDung, MaCapDo 
                FROM GHINHANCAPDO
                WHERE MaGhiNhanCapDo IN (
                    SELECT MAX(MaGhiNhanCapDo) 
                    FROM GHINHANCAPDO 
                    GROUP BY MaNguoiDung
                )
            )
            SELECT 
                COALESCE(SUM(CASE WHEN t.MaCapDo = 'F0' THEN 1 ELSE 0 END), 0) AS SoLuotF0,
                COALESCE(SUM(CASE WHEN t.MaCapDo = 'F1' THEN 1 ELSE 0 END), 0) AS SoLuotF1,
                COALESCE(SUM(CASE WHEN t.MaCapDo = 'F2' THEN 1 ELSE 0 END), 0) AS SoLuotF2,
                COUNT(n.MaNguoiDungKhac) AS TongLuotTiepXuc
            FROM NguoiTiepXuc n
            LEFT JOIN TrangThaiMoiNhat t ON n.MaNguoiDungKhac = t.MaNguoiDung;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows[0]; 
    } catch (error) {
        throw error;
    }
};

// Lịch sử tiếp xúc
const getContactHistoryByCCCD = async (cccd) => {
    try {
        const query = `
            WITH TargetUser AS (
                SELECT MaNguoiDung FROM NGUOIDUNG WHERE CCCD = ? LIMIT 1
            )
            SELECT 
                lstx.MaLichSuTiepXuc,
                DATE_FORMAT(lstx.ThoiGian, '%d/%m/%Y %H:%i') AS ThoiGianTiepXuc,
                lstx.DiaDiem AS DiaDiemTiepXuc,
                nd.HoTen AS TenNguoiTiepXuc,
                COALESCE(cd.MaCapDo, 'An Toàn') AS CapDoDichTeHienTai
            FROM LICHSUTIEPXUC lstx
            JOIN NGUOIDUNG nd ON nd.MaNguoiDung = CASE 
                WHEN lstx.MaNguoiDung1 = (SELECT MaNguoiDung FROM TargetUser) THEN lstx.MaNguoiDung2 
                ELSE lstx.MaNguoiDung1 
            END
            LEFT JOIN (
                SELECT g1.MaNguoiDung, g1.MaCapDo
                FROM GHINHANCAPDO g1
                INNER JOIN (
                    SELECT MaNguoiDung, MAX(NgayGhiNhan) AS NgayGhiNhanMoiNhat
                    FROM GHINHANCAPDO
                    GROUP BY MaNguoiDung
                ) g2 ON g1.MaNguoiDung = g2.MaNguoiDung AND g1.NgayGhiNhan = g2.NgayGhiNhanMoiNhat
            ) cd ON nd.MaNguoiDung = cd.MaNguoiDung
            WHERE lstx.MaNguoiDung1 = (SELECT MaNguoiDung FROM TargetUser) 
               OR lstx.MaNguoiDung2 = (SELECT MaNguoiDung FROM TargetUser)
            ORDER BY lstx.ThoiGian DESC;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows; 
    } catch (error) {
        throw error;
    }
};

// Thống kê Check-in
const getCheckinStatsByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT 
                COUNT(c.MaLichSuCheckIn) AS TongLuotCheckIn,
                SUM(CASE WHEN k.Capdovung = 3 THEN 1 ELSE 0 END) AS SoLuotNguyHiem,
                SUM(CASE WHEN k.Capdovung = 2 THEN 1 ELSE 0 END) AS SoLuotNguyCo,
                SUM(CASE WHEN k.Capdovung = 1 THEN 1 ELSE 0 END) AS SoLuotAnToan
            FROM LICHSUCHECKIN c
            JOIN KHUVUC k ON c.MaKhuVuc = k.MaKhuVuc
            JOIN NGUOIDUNG n ON c.MaNguoiDung = n.MaNguoiDung
            WHERE n.CCCD = ?;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows[0];
    } catch (error) {
        throw error;
    }
};

// Lịch sử Check-in
const getCheckinHistoryByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT 
                k.TenKhuVuc,
                DATE_FORMAT(c.ThoiGianCheckIn, '%d/%m/%Y %H:%i') AS ThoiGianCheckIn,
                CASE 
                    WHEN k.Capdovung = 3 THEN N'Nguy Hiểm'
                    WHEN k.Capdovung = 2 THEN N'Nguy Cơ'
                    WHEN k.Capdovung = 1 THEN N'An Toàn'
                    ELSE N'Chưa xác định'
                END AS TrangThaiKhuVuc
            FROM LICHSUCHECKIN c
            JOIN KHUVUC k ON c.MaKhuVuc = k.MaKhuVuc
            JOIN NGUOIDUNG n ON c.MaNguoiDung = n.MaNguoiDung
            WHERE n.CCCD = ?
            ORDER BY c.ThoiGianCheckIn DESC;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows; 
    } catch (error) {
        throw error;
    }
};

// Lịch sử khai báo y tế
const getHealthDeclarationHistoryByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT 
                ROW_NUMBER() OVER (ORDER BY t.ThoiGianKhaiBaoYTe ASC) AS LanKhaiBao,
                DATE_FORMAT(t.ThoiGianKhaiBaoYTe, '%d/%m/%Y') AS Ngay,
                DATE_FORMAT(t.ThoiGianKhaiBaoYTe, '%Hh%i') AS Gio
            FROM TOKHAIYTE t
            JOIN NGUOIDUNG n ON t.MaNguoiDung = n.MaNguoiDung
            WHERE n.CCCD = ?
            ORDER BY t.ThoiGianKhaiBaoYTe DESC;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows; 
    } catch (error) {
        throw error;
    }
};

// Tạo tờ khai y tế
const createHealthDeclaration = async (declarationData) => {
    const { MaTaiKhoan, TiepXucF0, CoBenhNen, ChiTietBenhNen, DiVeTuVungDich, danhSachTrieuChung } = declarationData;
    const MaToKhai = `TK_${Date.now()}`;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        await conn.execute(
            `CALL sp_KhaiBaoYTe(?, ?, ?, ?, ?, ?)`,
            [MaTaiKhoan, MaToKhai, TiepXucF0, CoBenhNen, ChiTietBenhNen || null, DiVeTuVungDich]
        );

        if (danhSachTrieuChung && danhSachTrieuChung.length > 0) {
            for (const maTC of danhSachTrieuChung) {
                await conn.execute(
                    `CALL sp_GhiNhanTrieuChung(?, ?, ?)`,
                    [MaTaiKhoan, MaToKhai, maTC]
                );
            }
        }

        const [rows] = await conn.execute(
            `SELECT 
                1 AS LanKhaiBao,
                DATE_FORMAT(ThoiGianKhaiBaoYTe, '%d/%m/%Y') AS Ngay,
                DATE_FORMAT(ThoiGianKhaiBaoYTe, '%Hh%i') AS Gio
             FROM TOKHAIYTE
             WHERE MaToKhai = ?`,
            [MaToKhai]
        );

        await conn.commit();
        return { MaToKhai, khaiBao: rows[0] };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Lịch sử khai báo xuất nhập cảnh
const getImmigrationHistoryByCCCD = async (cccd) => {
    try {
        const query = `
            SELECT 
                xnc.MaToKhaiXNC,
                DATE_FORMAT(xnc.ThoiGianKhaiBaoXNC, '%d/%m/%Y') AS Ngay,
                DATE_FORMAT(xnc.ThoiGianKhaiBaoXNC, '%Hh%i') AS Gio,
                ck.TenCuaKhau,
                ck.LoaiCuaKhau,
                ck.TrangThai AS TrangThaiCuaKhau,
                nd.HoTen,
                nd.CCCD
            FROM TOKHAIXNC xnc
            JOIN CUAKHAU ck ON xnc.MaCuaKhau = ck.MaCuaKhau
            JOIN NGUOIDUNG nd ON xnc.MaNguoiDung = nd.MaNguoiDung
            WHERE nd.CCCD = ?
            ORDER BY xnc.ThoiGianKhaiBaoXNC DESC;
        `;
        
        const [rows] = await db.execute(query, [cccd]);
        return rows; 
    } catch (error) {
        throw error;
    }
};

// Danh sách cửa khẩu
const getAllCuaKhau = async () => {
    try {
        const query = `
            SELECT MaCuaKhau, TenCuaKhau, LoaiCuaKhau, TrangThai
            FROM CUAKHAU
            ORDER BY LoaiCuaKhau, TenCuaKhau;
        `;
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        throw error;
    }
};

// Tạo tờ khai xuất nhập cảnh
const createImmigrationDeclaration = async ({ MaNguoiDung, MaCuaKhau }) => {
    const MaToKhaiXNC = `XNC_${Date.now()}`;
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.execute(
            `INSERT INTO TOKHAIXNC (MaToKhaiXNC, ThoiGianKhaiBaoXNC, MaNguoiDung, MaCuaKhau)
             VALUES (?, NOW(), ?, ?)`,
            [MaToKhaiXNC, MaNguoiDung, MaCuaKhau]
        );

        const [rows] = await conn.execute(
            `SELECT 
                xnc.MaToKhaiXNC,
                DATE_FORMAT(xnc.ThoiGianKhaiBaoXNC, '%d/%m/%Y') AS Ngay,
                DATE_FORMAT(xnc.ThoiGianKhaiBaoXNC, '%Hh%i')    AS Gio,
                ck.TenCuaKhau,
                ck.LoaiCuaKhau,
                ck.TrangThai AS TrangThaiCuaKhau
             FROM TOKHAIXNC xnc
             JOIN CUAKHAU ck ON xnc.MaCuaKhau = ck.MaCuaKhau
             WHERE xnc.MaToKhaiXNC = ?`,
            [MaToKhaiXNC]
        );

        await conn.commit();
        return { MaToKhaiXNC, toKhai: rows[0] };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Tạo lượt Check-in
const createCheckin = async ({ MaTaiKhoan, MaKhuVuc }) => {
    try {
        await db.execute(
            `CALL sp_CheckIn(?, ?)`,
            [MaTaiKhoan, MaKhuVuc]
        );

        const [rows] = await db.execute(
            `SELECT 
                k.TenKhuVuc,
                DATE_FORMAT(NOW(), '%d/%m/%Y %H:%i') AS ThoiGianCheckIn,
                CASE 
                    WHEN k.Capdovung = 3 THEN 'Nguy Hiểm'
                    WHEN k.Capdovung = 2 THEN 'Nguy Cơ'
                    WHEN k.Capdovung = 1 THEN 'An Toàn'
                    ELSE 'Chưa xác định'
                END AS TrangThaiKhuVuc
             FROM KHUVUC k
             WHERE k.MaKhuVuc = ?`,
            [MaKhuVuc]
        );

        return rows[0];
    } catch (error) {
        throw error;
    }
};

// Cập nhật chỉ số y tế tổng quan
const getMedicalOverview = async () => {
    try {
        const queryF0 = `SELECT COUNT(DISTINCT MaNguoiDung) AS TongCaBenh FROM GHINHANCAPDO WHERE MaCapDo = 'F0';`;
        
        const queryNguoiDung = `SELECT COUNT(MaNguoiDung) AS TongBenhNhan FROM NGUOIDUNG;`;
        
        const queryThangNay = `
            SELECT 
                (SELECT COUNT(*) FROM TIEMCHUNG WHERE MONTH(NgayTiem) = MONTH(CURRENT_DATE()) AND YEAR(NgayTiem) = YEAR(CURRENT_DATE())) AS TiemChungThangNay,
                (SELECT COUNT(*) FROM XETNGHIEM WHERE MONTH(NgayXetNghiem) = MONTH(CURRENT_DATE()) AND YEAR(NgayXetNghiem) = YEAR(CURRENT_DATE())) AS XetNghiemThangNay,
                (SELECT COUNT(*) FROM CACHLY WHERE MONTH(NgayBatDau) = MONTH(CURRENT_DATE()) AND YEAR(NgayBatDau) = YEAR(CURRENT_DATE())) AS CachLyThangNay;
        `;

        const [[f0Result]] = await db.execute(queryF0);
        const [[nguoiDungResult]] = await db.execute(queryNguoiDung);
        const [[thangNayResult]] = await db.execute(queryThangNay);

        return {
            TongCaBenh: f0Result.TongCaBenh || 0,
            TongBenhNhan: nguoiDungResult.TongBenhNhan || 0,
            TiemChungThangNay: thangNayResult.TiemChungThangNay || 0,
            XetNghiemThangNay: thangNayResult.XetNghiemThangNay || 0,
            CachLyThangNay: thangNayResult.CachLyThangNay || 0
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    getVaccineDosesByCCCD,
    getActiveQuarantines,
    getTestHistoryByCCCD,
    getF0TrendThisYear,
    getVaccinationRates,
    getDashboardStats,
    getContactStatsByCCCD,
    getContactHistoryByCCCD,
    getCheckinStatsByCCCD,
    getCheckinHistoryByCCCD,
    getHealthDeclarationHistoryByCCCD,
    createHealthDeclaration,
    getImmigrationHistoryByCCCD,
    getAllCuaKhau,
    createImmigrationDeclaration,
    createCheckin,
    getMedicalOverview,
};