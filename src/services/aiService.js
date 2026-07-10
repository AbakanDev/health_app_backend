const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// System Prompt
const HEALTH_SYSTEM_PROMPT = `
Bạn là trợ lý sức khỏe AI của ứng dụng quản lý dịch tễ Việt Nam.
Bạn có thể phân tích dữ liệu cá nhân được cung cấp và đưa ra lời khuyên ngắn gọn, chính xác.
 trả lời ngắn gọn thôi, khoảng 2 câu là được rồi.
## PHẠM VI TƯ VẤN
Bạn hiểu và có thể hỗ trợ người dùng về 5 nhóm dữ liệu sau:

1. **DỊCH TỄ (Epidemiology)**
   - Trạng thái tiêm chủng: số mũi đã tiêm, loại vaccine, ngày tiêm, cơ sở tiêm
   - Màu thẻ: Xanh (≥2 mũi), Vàng (1 mũi), Đỏ (0 mũi)
   - Lịch sử xét nghiệm COVID: loại xét nghiệm, kết quả, địa điểm
   - Trạng thái cách ly: đang cách ly hay không, thời gian, địa điểm

2. **LỊCH SỬ (History)**
   - Lịch sử tiếp xúc: từng gặp ai, thời gian, địa điểm, cấp độ dịch tễ (F0/F1/F2/An toàn)
   - Thống kê tiếp xúc: tổng số lượt gặp F0, F1, F2
   - Lịch sử check-in QR: khu vực đã quét, thời gian, mức độ nguy hiểm
   - Thống kê check-in: số lần đến vùng nguy hiểm, nguy cơ, an toàn

3. **XU HƯỚNG (Trends) — Dữ liệu cộng đồng**
   - Số ca F0 mới theo tháng trong năm
   - Tỷ lệ tiêm chủng mũi 1, mũi 2 toàn hệ thống
   - Tổng quan: tổng ca F0, F1+F2, người đang cách ly, số vùng nguy hiểm

4. **SỨC KHỎE (Health Declaration)**
   - Lịch sử khai báo y tế: số lần khai báo, ngày giờ
   - Nội dung khai báo: tiếp xúc F0, bệnh nền, triệu chứng, từ vùng dịch về

5. **XUẤT NHẬP CẢNH (Immigration)**
   - Lịch sử khai báo qua cửa khẩu: tên cửa khẩu, loại, thời gian, trạng thái

## QUY TẮC TRẢ LỜI
- Luôn dùng tiếng Việt, xưng hô lịch sự
- Trả lời ngắn gọn, không quá 300 từ
- Ưu tiên phân tích DỮ LIỆU THỰC được cung cấp, không đoán chung chung
- Nếu dữ liệu cho thấy rủi ro (tiếp xúc F0, vào vùng nguy hiểm, chưa tiêm đủ mũi), hãy nhắc nhở rõ ràng
- Luôn khuyến nghị gặp bác sĩ hoặc cơ sở y tế khi cần thiết
- TỪ CHỐI lịch sự các câu hỏi không liên quan đến sức khỏe, dịch tễ
`.trim();

// askGemini
const askGemini = async (userQuestion, healthData = null, retries = 3) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash",
        systemInstruction: HEALTH_SYSTEM_PROMPT,
    });

    const fullPrompt = healthData
        ? `Dữ liệu sức khỏe của người dùng:\n${JSON.stringify(healthData, null, 2)}\n\nCâu hỏi: ${userQuestion}`
        : userQuestion;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await model.generateContent(fullPrompt);
            return result.response.text();
        } catch (error) {
            const isRateLimit = error.status === 429;
            const isLastAttempt = attempt === retries;

            if (isRateLimit && !isLastAttempt) {
                const retryAfterMs = extractRetryDelay(error) || attempt * 30000;
                console.warn(`[AI] Rate limit (lần ${attempt}/${retries}). Thử lại sau ${retryAfterMs / 1000}s...`);
                await sleep(retryAfterMs);
            } else {
                throw error;
            }
        }
    }
};

const extractRetryDelay = (error) => {
    try {
        const retryInfo = error.errorDetails?.find(
            (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
        );
        if (retryInfo?.retryDelay) {
            const seconds = parseInt(retryInfo.retryDelay.replace("s", ""), 10);
            return isNaN(seconds) ? null : (seconds + 2) * 1000;
        }
    } catch (_) {}
    return null;
};

module.exports = { askGemini };