const ZiweiRecord = require('../models/ziwei-record.model');

const MAX_SAVED_RECORDS_PER_USER = 30;

const TOPIC_STRUCTURES_VI = {
  overview: `Hãy luận giải **Tổng Quan Mệnh Cách** theo đúng cấu trúc 5 phần sau (giữ nguyên định dạng tiêu đề **【...】**):

**【Định Tính Mệnh Cách】**
Khái quát trong 2–3 câu cốt lõi về khí chất bản mệnh, cục số và thế đứng của cung Mệnh.

**【Giải Mã Chính Tinh Cung Mệnh】**
Phân tích chi tiết chính tinh/phụ tinh tại cung Mệnh (hoặc sao mượn từ cung Thiên Di nếu Vô Chính Diệu), độ sáng Miếu/Vượng/Hãm, Tứ Hóa và trích dẫn quan điểm trong《Thiên Kỷ》của thầy Nghê Hải Hạ hoặc《Tử Vi Đẩu Số Toàn Thư》.

**【Tam Phương Tứ Chính Liên Động】**
Phân tích sự phối hợp giữa 4 cung Mệnh – Tài Bạch – Quan Lộc – Thiên Di và các Cách Cục (thượng cách/cát cách/cách cần lưu ý) xuất hiện trên lá số.

**【Vận Thế Đại Hạn Hiện Tại】**
Phân tích đại hạn 10 năm hiện tại đương số đang đi qua: cơ hội trọng tâm và điểm cần lưu tâm.

**【Thiên Phú & Lời Khuyên Cải Mệnh】**
Đúc kết thế mạnh bẩm sinh và phương hướng nỗ lực nhân sự thực tế theo triết lý "Nhân sự + Địa lý thắng Tiên thiên (2/3 > 1/3)" của Nghê Hải Hạ.`,

  love: `Hãy luận giải chuyên sâu **Tình Duyên & Hôn Nhân** theo đúng cấu trúc 5 phần sau:

**【Cục Diện Tình Cảm】**
Định tính tổng quan đường tình duyên và quan niệm yêu đương/hôn nhân của đương số.

**【Phân Tích Cung Phu Thê & Cung Phúc Đức】**
Áp dụng nguyên tắc cốt lõi của Nghê Hải Hạ ("Xem hôn nhân bắt buộc phải xem đồng thời cả cung Phu Thê lẫn cung Phúc Đức"): phân tích chính tinh, phụ tinh, đào hoa tinh và Tứ Hóa tại hai cung này, phác họa hình mẫu người phối ngẫu.

**【Tam Phương Hội Chiếu (Quan Lộc - Thiên Di - Tử Nữ)】**
Tác động của công việc, môi trường bên ngoài và con cái lên hạnh phúc gia đình.

**【Vận Trình Tình Cảm Giai Đoạn Hiện Tại】**
Nhận định xu hướng tình cảm trong đại hạn hiện tại và các lưu ý theo năm.

**【Lời Khuyên Giữ Gìn Hạnh Phúc】**
Đưa ra lời khuyên thiết thực trong cách chọn bạn đời và nghệ thuật ứng xử vợ chồng.`,

  career: `Hãy luận giải chuyên sâu **Sự Nghiệp & Công Danh (Quan Lộc)** theo đúng cấu trúc 5 phần sau:

**【Định Hướng Sự Nghiệp Cốt Lõi】**
Xác định đương số hợp làm quản lý/chuyên môn trong tổ chức lớn (nhóm Cơ Nguyệt Đồng Lương, Phủ Tướng) hay hợp tự khởi nghiệp, mở đường đột phá (nhóm Sát Phá Tham, Tử Vũ Liêm).

**【Phân Tích Cung Quan Lộc】**
Giải mã các sao tọa thủ tại cung Quan Lộc, độ sáng và Tứ Hóa theo góc nhìn《Thiên Kỷ》.

**【Liên Động Quan Lộc – Tài Bạch – Thiên Di】**
Mối quan hệ giữa danh tiếng/chức vụ với dòng tiền và cơ hội phát triển bên ngoài.

**【Đại Hạn Sự Nghiệp Hiện Tại】**
Đánh giá nhịp độ thăng tiến hoặc chuyển dịch công việc trong đại hạn 10 năm hiện tại.

**【Ngành Nghề Phù Hợp & Chiến Lược Phát Triển】**
Gợi ý các lĩnh vực nghề nghiệp cụ thể phù hợp nhất với bộ sao và chiến lược hành động.`,

  wealth: `Hãy luận giải chuyên sâu **Tài Bạch & Điền Trạch (Tài Chính & Tích Lũy)** theo đúng cấu trúc 5 phần sau:

**【Mô Hình Tài Chính Bẩm Sinh】**
Định tính nguồn tiền của đương số: kiếm tiền từ chuyên môn, kinh doanh thương mại, đầu tư hay quản lý kho tài sản.

**【Phân Tích Cung Tài Bạch】**
Phân tích chính tinh, Lộc Tồn, Hóa Lộc/Quyền/Khoa/Kỵ hoặc Không Kiếp tại cung Tài Bạch.

**【Cung Điền Trạch (Kho Tích Lũy & Bất Động Sản)】**
Đánh giá khả năng giữ tiền, tích lũy tài sản cố định và vận nhà cửa đất đai.

**【Vận Tài Lộc Trong Đại Hạn Hiện Tại】**
Nhận định dòng tiền vào/ra và những rủi ro tài chính cần tránh trong giai đoạn này.

**【Chiến Lược Quản Lý Tài Sản】**
Lời khuyên cụ thể về đầu tư, tiết kiệm và hợp tác tiền bạc.`,

  health: `Hãy luận giải chuyên sâu **Sức Khỏe & Tật Ách** kết hợp Đông Y《Thiên Kỷ - Nhân Kỷ》của Nghê Hải Hạ theo 4 phần sau:

**【Cấu Trúc Cung Tật Ách & Bản Mệnh】**
Phân tích các sao tại cung Tật Ách và cung Mệnh theo ngũ hành (Kim – Mộc – Thủy – Hỏa – Thổ).

**【Tạng Phủ & Hệ Cơ Quan Cần Lưu Ý】**
Đối chiếu ngũ hành sao và địa chi cung theo lý luận Đông Y của Nghê Hải Hạ (Can – Đởm, Tâm – Tiểu trường, Tỳ – Vị, Phế – Đại trường, Thận – Bàng quang) để chỉ ra những bộ phận cơ thể dễ suy yếu khi làm việc quá sức.

**【Xu Hướng Sức Khỏe Theo Vận Hạn】**
Những giai đoạn cần chú ý nghỉ ngơi và kiểm tra sức khỏe định kỳ.

**【Phương Pháp Dưỡng Sinh & Phòng Bệnh】**
Lời khuyên thực tế về giấc ngủ (theo giờ Tử Ngọ Lưu Chú), vận động, chế độ ăn uống và giữ cân bằng tinh thần.`,

  personality: `Hãy luận giải chuyên sâu **Tính Cách, Nội Tâm & Nhân Duyên** theo đúng cấu trúc 4 phần sau:

**【Khí Chất Cốt Lõi Cung Mệnh】**
Phân tích chiều sâu tâm lý, ưu điểm nổi bật và góc khuất nội tâm từ chính tinh cung Mệnh & cung Thân.

**【Đời Sống Tinh Thần (Cung Phúc Đức)】**
Thế giới nội tâm, cách đương số đối diện với áp lực và nguồn năng lượng tinh thần.

**【Phong Cách Giao Tiếp & Quan Hệ Xã Hội (Thiên Di & Nô Bộc)】**
Cách đương số xuất hiện trước đám đông, cách kết giao bạn bè và dùng người.

**【Bài Học Tu Dưỡng Bản Thân】**
Những thói quen hoặc nét tính cách cần điều chỉnh để cuộc sống viên mãn, hanh thông hơn.`,

  family: `Hãy luận giải chuyên sâu **Cung Huynh Đệ & Hợp Tác Cổ Đông** theo cấu trúc 4 phần sau:

**【Tình Cảm Anh Chị Em & Lục Thân】**
Phân tích các sao tại Cung Huynh Đệ, sự gắn kết, tương trợ hay xa cách giữa anh chị em trong gia đình.

**【Cung Huynh Đệ Là Kho Tiền Lưu Động (Tài Bạch Của Điền Trạch)】**
Đánh giá năng lực dự trữ dòng tiền mặt và tiềm lực tài chính hậu thuẫn từ gia đình.

**【Vận Hợp Tác Kinh Doanh (Đồng Tham Cung Nô Bộc)】**
Xét xem đương số có hợp hùn vốn làm ăn chung với bạn bè/anh em không, cần lưu ý điều gì (đặc biệt nếu có Cự Môn, Hóa Kỵ hoặc Lục Sát).

**【Lời Khuyên Ứng Xử & Hợp Tác】**
Nguyên tắc giữ hòa khí gia đình và phân định rạch ròi khi hợp tác làm ăn.`,

  children: `Hãy luận giải chuyên sâu **Cung Tử Nữ, Hậu Thế & Năng Lực Sáng Tạo** theo cấu trúc 4 phần sau:

**【Duyên Phận Con Cái & Khí Chất Hậu Duệ】**
Phân tích Chính tinh, Phụ tinh và Tứ Hóa tại Cung Tử Nữ để nhận diện tính cách, tài năng của con cái và mối quan hệ cha mẹ – con cái.

**【Đào Tạo Học Trò & Đội Ngũ Kế Cận】**
Trong sự nghiệp hiện đại, Cung Tử Nữ còn biểu thị học trò, nhân sự cấp dưới trực tiếp và các dự án con do đương số khai sinh.

**【Liên Động Tử Nữ – Điền Trạch – Phúc Đức】**
Sự tác động qua lại giữa phúc ấm gia trạch và vận trình hậu vận khi về già.

**【Lời Khuyên Giáo Dục & Bồi Dưỡng Hậu Vận】**
Phương pháp đồng hành cùng con cái và phát triển đội ngũ kế thừa.`,

  move: `Hãy luận giải chuyên sâu **Cung Thiên Di, Xuất Ngoại & Phát Triển Phương Xa** theo cấu trúc 4 phần sau:

**【Khí Thế Khi Bước Ra Xã Hội】**
Phân tích các sao tại Cung Thiên Di — ấn tượng đầu tiên đương số tạo ra với thế giới bên ngoài và năng lực thích nghi môi trường mới.

**【Cơ Hội Xuất Ngoại, Đi Xa & Lập Nghiệp Tha Hương】**
Đánh giá đương số hợp lập nghiệp tại quê nhà hay càng đi xa/xuất ngoại càng phát đạt (đặc biệt xét Thiên Mã, Thái Dương, Thái Âm, Cự Môn, Phá Quân).

**【Quý Nhân & Thử Thách Nơi Đất Khách】**
Nhận diện nhóm người nâng đỡ hoặc những rủi ro cần phòng tránh khi di chuyển, công tác xa.

**【Chiến Lược Mở Rộng Không Gian Phát Triển】**
Lời khuyên thực tế về hướng phát triển thị trường và giao tế xã hội.`,

  friends: `Hãy luận giải chuyên sâu **Cung Nô Bộc (Giao Hữu), Nhân Duyên & Quý Nhân** theo cấu trúc 4 phần sau:

**【Chất Lượng Mạng Lưới Bạn Bè & Cộng Sự】**
Phân tích Chính tinh và Phụ tinh tại Cung Nô Bộc: bạn bè thuộc tầng lớp nào, đắc lực trợ giúp hay dễ hao tổn vì bạn.

**【Năng Lực Dùng Người & Quản Trị Thuộc Cấp】**
Mối quan hệ với nhân viên, cộng sự dưới quyền, đối tác dịch vụ và khách hàng đại chúng.

**【Nhận Diện Quý Nhân & Phòng Ngừa Tiểu Nhân】**
Dấu hiệu nhận biết người thực lòng nâng đỡ (Khôi Việt, Phụ Bật, Hóa Lộc/Khoa) và người dễ gây thị phi (Hóa Kỵ, Âm Sát, Kiếp Sát).

**【Nguyên Tắc Kết Giao & Quản Trị Quan Hệ】**
Lời khuyên thiết thực trong việc chọn bạn mà chơi, chọn người mà giao việc.`,

  home: `Hãy luận giải chuyên sâu **Cung Điền Trạch, Bất Động Sản & Phong Thủy Gia Trạch** theo cấu trúc 4 phần sau:

**【Vận Tích Lũy Điền Sản & Kho Tài Sản Cố Định】**
Phân tích các sao tại Cung Điền Trạch (Thiên Phủ, Thái Âm, Vũ Khúc, Lộc Tồn, Tứ Hóa...) để đánh giá khả năng thừa kế tổ nghiệp hoặc tự tay gây dựng nhà cửa.

**【Môi Trường Sống & Không Khí Gia Đình】**
Đặc điểm nơi ở hiện tại, hàng xóm láng giềng và sự ấm cúng, an ổn trong gia đạo.

**【Thời Điểm Mua Bán / Đầu Tư Bất Động Sản】**
Nhận định xu hướng dịch chuyển nơi ở hoặc tích lũy đất đai theo vận hạn.

**【Gợi Ý Phong Thủy Dương Trạch Theo《Thiên Kỷ》】**
Cách bố trí không gian sống gọn gàng, tụ khí và hài hòa ngũ hành.`,

  spirit: `Hãy luận giải chuyên sâu **Cung Phúc Đức, Thế Giới Tinh Thần & Phúc Ấm** theo cấu trúc 4 phần sau:

**【Căn Cơ Phúc Ấm & Năng Lượng Tinh Thần】**
Phân tích Chính tinh, Phụ tinh và Tứ Hóa tại Cung Phúc Đức — nguồn gốc sự bình an hay trăn trở trong tâm hồn đương số.

**【Liên Động Phúc Đức – Tài Bạch – Phu Thê】**
Theo Nghê Hải Hạ, Phúc Đức vừa xung chiếu Tài Bạch (tâm an thì tài vượng), vừa quyết định độ bền vững của hôn nhân.

**【Sở Thích Tinh Thần, Triết Lý Sống & Hậu Vận】**
Khả năng nghiên cứu học thuật, tâm linh, nghệ thuật và cảnh giới an hưởng tuổi già.

**【Phương Pháp Tu Tâm Dưỡng Phúc】**
Lời khuyên giúp giải tỏa áp lực vô hình và bồi đắp phúc lực bền lâu.`,

  parents: `Hãy luận giải chuyên sâu **Cung Phụ Mẫu, Bề Trên & Văn Thư Pháp Lý** theo cấu trúc 4 phần sau:

**【Duyên Phận Với Cha Mẹ & Gia Phong Nguồn Cội】**
Phân tích các sao tại Cung Phụ Mẫu kết hợp Thái Dương (Cha) và Thái Âm (Mẹ) để thấu hiểu sự che chở, ảnh hưởng từ đấng sinh thành.

**【Quan Hệ Với Thầy Cô, Cấp Trên & Cơ Quan Công Quyền】**
Đánh giá mức độ được bề trên, sếp trực tiếp hoặc quý nhân tiền bối nâng đỡ trong sự nghiệp.

**【Văn Thư, Bằng Cấp, Hợp Đồng & Pháp Lý】**
Cung Phụ Mẫu đồng thời là cung Văn Thư — lưu ý về giấy tờ, thi cử, ký kết hợp đồng và tín dụng.

**【Lời Khuyên Báo Hiếu & Ứng Xử Với Bề Trên】**
Cách hóa giải khoảng cách thế hệ và tranh thủ sự dẫn dắt của bậc tiền bối.`,
};

const SYSTEM_INSTRUCTION_INTERPRET = `Bạn là Đại Sư Tử Vi Đẩu Số uyên bác, am hiểu sâu sắc học phái《Thiên Kỷ》(天纪) của thầy Nghê Hải Hạ (Ni Haixia) kết hợp nguyên điển《Tử Vi Đẩu Số Toàn Thư》và《Cốt Tủy Phú》.
Nguyên tắc luận giải bắt buộc:
1. Luôn sử dụng tiếng Việt chuẩn xác về thuật ngữ Tử Vi (Tử Vi, Thiên Cơ, Thái Dương, Vũ Khúc, Thiên Đồng, Liêm Trinh, Thiên Phủ, Thái Âm, Tham Lang, Cự Môn, Thiên Tướng, Thiên Lương, Thất Sát, Phá Quân; Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ; Miếu, Vượng, Đắc, Lợi, Bình, Hãm).
2. Tuân thủ triết lý của thầy Nghê Hải Hạ:
   - "Đại đạo chí giản — lấy Mệnh cung làm gốc, Tam phương tứ chính (Mệnh – Tài – Quan – Di) làm dụng."
   - "Xem hôn nhân không bao giờ chỉ nhìn cung Phu Thê mà phải xét đồng thời cung Phúc Đức."
   - "Cung Vô Chính Diệu thì mượn sao đối cung xung chiếu để luận."
   - "Mệnh lý là công cụ giúp con người hiểu mình để sửa đổi hành vi: Nhân sự nỗ lực + Địa lý điều chỉnh thắng Mệnh số tiên thiên (2/3 > 1/3)."
3. Trình bày rõ ràng, mạch lạc, dùng các tiêu đề dạng **【Tiêu Đề Mục】** trên một dòng riêng và in đậm **từ khóa quan trọng** để giao diện hiển thị đẹp mắt. Không phán đoán mê tín cực đoan gây hoang mang; luôn đưa ra giải pháp chuyển hóa tích cực và thiết thực.`;

const SYSTEM_INSTRUCTION_HEMING = `Bạn là Đại Sư Tử Vi Hợp Bàn (Xem Hợp Hôn & Hợp Tác Đôi) theo học phái《Thiên Kỷ》của thầy Nghê Hải Hạ.
Khi phân tích sự tương hợp giữa 2 lá số (Đương số A và Đương số B), hãy áp dụng nghiêm ngặt quy tắc Hợp Bàn của Nghê Hải Hạ:
1. Tầng 1 (Khí chất & Nội tâm): Đối chiếu cung Mệnh và cung Phúc Đức của A và B xem thuộc nhóm nào (Tử Phủ Vũ Tướng / Sát Phá Tham / Cơ Nguyệt Đồng Lương / Cự Nhật) — tương đồng hay bù trừ âm dương (ví dụ Tử Vi + Thiên Phủ, Thái Dương + Thái Âm, Thiên Lương + Thiên Đồng, hoặc Sát Phá Tham bù trừ với Cơ Nguyệt Đồng Lương).
2. Tầng 2 (Cung Phu Thê & Sự Nghiệp): Đối chiếu cung Phu Thê (nếu xem tình cảm/hôn nhân) và cung Quan Lộc + Nô Bộc/Huynh Đệ (nếu xem hợp tác kinh doanh). Lưu ý lời dạy của Nghê sư: "Xem hôn nhân bắt buộc phải xem cả cung Phúc Đức của hai người; xem hợp tác làm ăn cần lưu ý Cự Môn hoặc Hóa Kỵ ở cung Nô Bộc/Huynh Đệ."
3. Tầng 3 (Tứ Hóa & Đại Hạn): Xem sự bổ trợ về Hóa Lộc, Hóa Quyền, Hóa Khoa và cảnh báo điểm dễ va chạm từ Hóa Kỵ hoặc Tứ Sát.

Hãy trình bày bài phân tích theo đúng 6 mục sau (giữ nguyên định dạng **【...】**):
**【Đánh Giá Độ Tương Hợp Tổng Quan (Chấm Điểm / 5 Sao)】**
**【Tương Tác Tính Cách & Nội Tâm (Mệnh Cung & Phúc Đức)】**
**【Phân Tích Duyên Phận Hôn Nhân (Cung Phu Thê Đôi Bên)】**
**【Tương Hợp Sự Nghiệp & Tài Chính (Quan Lộc & Tài Bạch)】**
**【Điểm Dễ Xung Khắc Cần Lưu Ý】**
**【Bí Quyết Hòa Hợp & Hóa Giải Thực Tế】**`;

/**
 * Danh sách 3 cụm AI Provider trên Backend (DeepSeek -> SiliconFlow -> xKiro)
 * Tự động failover sang provider kế tiếp nếu provider trước bị lỗi hoặc quá tải.
 */
function getAiProviders() {
  const providers = [];

  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (deepseekKey) {
    const base = (process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');
    providers.push({
      name: 'DeepSeek',
      endpoint: `${base}/chat/completions`,
      apiKey: deepseekKey,
      model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
    });
  }

  const siliconKey = (process.env.SILICONFLOW_API_KEY || '').trim();
  if (siliconKey) {
    const base = (process.env.SILICONFLOW_API_BASE || 'https://api.siliconflow.com/v1').replace(/\/+$/, '');
    providers.push({
      name: 'SiliconFlow',
      endpoint: `${base}/chat/completions`,
      apiKey: siliconKey,
      model: (process.env.SILICONFLOW_MODEL || 'deepseek-ai/DeepSeek-V3').trim(),
    });
  }

  const xkiroKey = (process.env.XKIRO_API_KEY || '').trim();
  if (xkiroKey) {
    const base = (process.env.XKIRO_API_BASE || 'https://api.xkiro.com/v1').replace(/\/+$/, '');
    providers.push({
      name: 'xKiro',
      endpoint: `${base}/chat/completions`,
      apiKey: xkiroKey,
      model: (process.env.XKIRO_MODEL || 'cohere/command-a').trim(),
    });
  }

  return providers;
}

async function callAiWithMultiProviderFailover(prompt, systemInstruction) {
  const providers = getAiProviders();
  if (providers.length === 0) {
    const err = new Error('Hệ thống AI Luận Giải đang được cấu hình trên máy chủ. Vui lòng thử lại sau ít phút.');
    err.statusCode = 503;
    throw err;
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);

      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.45,
          max_tokens: 2800,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`[${provider.name} HTTP ${response.status}] ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return {
          text: content.trim(),
          provider: provider.name,
          model: provider.model,
        };
      }
      throw new Error(`[${provider.name}] Empty completion content`);
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ [ZiweiAI] Provider ${provider.name} failed, trying next fallback:`, err.message);
    }
  }

  const fallbackErr = new Error(
    'Hệ thống Đại Sư AI đang bận xử lý nhiều lá số cùng lúc. Vui lòng bấm thử lại sau giây lát.'
  );
  fallbackErr.statusCode = 502;
  fallbackErr.cause = lastError;
  throw fallbackErr;
}

/**
 * Luận giải lá số đơn (theo Topic, theo Cung/Sao, hoặc hội thoại hỏi đáp nhiều lượt)
 */
async function interpretChart({ chartSummary, topic, messages = [] }) {
  if (!chartSummary || typeof chartSummary !== 'string' || !chartSummary.trim()) {
    const err = new Error('Thiếu dữ liệu tóm tắt lá số Tử Vi.');
    err.statusCode = 400;
    throw err;
  }

  let taskPrompt = '';
  if (topic && TOPIC_STRUCTURES_VI[topic]) {
    taskPrompt = TOPIC_STRUCTURES_VI[topic];
  } else if (Array.isArray(messages) && messages.length > 0) {
    const recentMessages = messages.slice(-8);
    const historyText = recentMessages
      .map((m) => `${m.role === 'assistant' ? 'Đại Sư AI' : 'Đương số'}: ${String(m.content || '').slice(0, 1500)}`)
      .join('\n\n');
    const lastUserQuestion = recentMessages[recentMessages.length - 1]?.content || 'Hãy luận giải tổng quan lá số.';
    taskPrompt = `Lịch sử trao đổi trước đó:\n${historyText}\n\nYêu cầu hiện tại của đương số:\n${lastUserQuestion}\n\nHãy trả lời sâu sắc, bám sát các sao và cung vị thực tế trên lá số của đương số, chia rõ các đề mục **【...】** dễ đọc.`;
  } else {
    taskPrompt = TOPIC_STRUCTURES_VI.overview;
  }

  const fullPrompt = [
    `Dưới đây là toàn bộ cấu trúc Lá Số Tử Vi Đẩu Số của đương số:`,
    chartSummary.slice(0, 12000),
    ``,
    `=== NHIỆM VỤ LUẬN GIẢI ===`,
    taskPrompt,
  ].join('\n');

  const result = await callAiWithMultiProviderFailover(fullPrompt, SYSTEM_INSTRUCTION_INTERPRET);
  return {
    reply: result.text,
    provider: result.provider,
    topic: topic || 'custom',
  };
}

/**
 * Luận giải Hợp Hôn / Hợp Tác Đôi (Chấm 2 lá số A & B)
 */
async function analyzeHeming({ chartASummary, chartBSummary, question }) {
  if (!chartASummary || !chartBSummary) {
    const err = new Error('Vui lòng cung cấp đầy đủ dữ liệu của cả 2 lá số (A và B).');
    err.statusCode = 400;
    throw err;
  }

  const customFocus =
    question && typeof question === 'string' && question.trim()
      ? `\n\nCâu hỏi trọng tâm cần giải đáp kỹ thêm: "${question.trim().slice(0, 500)}"`
      : '';

  const fullPrompt = [
    `=== LÁ SỐ BÊN A (ĐƯƠNG SỐ THỨ NHẤT) ===`,
    String(chartASummary).slice(0, 8000),
    ``,
    `=== LÁ SỐ BÊN B (ĐƯƠNG SỐ THỨ HAI) ===`,
    String(chartBSummary).slice(0, 8000),
    ``,
    `=== YÊU CẦU PHÂN TÍCH HỢP BÀN (HEMING) ===`,
    `Hãy đối chiếu chi tiết hai lá số A và B theo học phái Thiên Kỷ của Nghê Hải Hạ.${customFocus}`,
  ].join('\n');

  const result = await callAiWithMultiProviderFailover(fullPrompt, SYSTEM_INSTRUCTION_HEMING);
  return {
    reply: result.text,
    provider: result.provider,
  };
}

/**
 * Danh sách lá số đã lưu của user
 */
async function listUserRecords(userId) {
  const records = await ZiweiRecord.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(MAX_SAVED_RECORDS_PER_USER)
    .lean();
  return records;
}

/**
 * Lưu hoặc cập nhật lá số của user
 */
async function saveUserRecord(userId, payload = {}) {
  const name = String(payload.name || 'Lá số Tử Vi').trim().slice(0, 80);
  const gender = payload.gender === 'female' ? 'female' : 'male';
  const year = Number(payload.year) || 2000;
  const month = Number(payload.month) || 1;
  const day = Number(payload.day) || 1;
  const clockHour = Number(payload.clockHour) || 0;
  const clockMinute = Number(payload.clockMinute) || 0;

  const existing = await ZiweiRecord.findOne({
    userId,
    name,
    gender,
    year,
    month,
    day,
    clockHour,
  });

  if (existing) {
    existing.clockMinute = clockMinute;
    existing.unknownTime = Boolean(payload.unknownTime);
    existing.city = String(payload.city || 'Hà Nội').slice(0, 80);
    existing.longitude = Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : 105.85;
    existing.utcOffsetMinutes = Number.isFinite(Number(payload.utcOffsetMinutes))
      ? Number(payload.utcOffsetMinutes)
      : 420;
    existing.wuxingJuName = String(payload.wuxingJuName || '').slice(0, 40);
    existing.mingMainStars = String(payload.mingMainStars || '').slice(0, 120);
    if (payload.aiReadings && typeof payload.aiReadings === 'object') {
      for (const [k, v] of Object.entries(payload.aiReadings)) {
        if (typeof v === 'string' && v.trim()) {
          existing.aiReadings.set(k.slice(0, 40), v.slice(0, 15000));
        }
      }
    }
    await existing.save();
    return existing.toObject();
  }

  const count = await ZiweiRecord.countDocuments({ userId });
  if (count >= MAX_SAVED_RECORDS_PER_USER) {
    const oldest = await ZiweiRecord.findOne({ userId }).sort({ updatedAt: 1 });
    if (oldest) {
      await ZiweiRecord.deleteOne({ _id: oldest._id });
    }
  }

  const created = await ZiweiRecord.create({
    userId,
    name,
    gender,
    year,
    month,
    day,
    clockHour,
    clockMinute,
    unknownTime: Boolean(payload.unknownTime),
    city: String(payload.city || 'Hà Nội').slice(0, 80),
    longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : 105.85,
    utcOffsetMinutes: Number.isFinite(Number(payload.utcOffsetMinutes))
      ? Number(payload.utcOffsetMinutes)
      : 420,
    wuxingJuName: String(payload.wuxingJuName || '').slice(0, 40),
    mingMainStars: String(payload.mingMainStars || '').slice(0, 120),
    aiReadings: payload.aiReadings && typeof payload.aiReadings === 'object' ? payload.aiReadings : {},
  });

  return created.toObject();
}

async function deleteUserRecord(userId, recordId) {
  const deleted = await ZiweiRecord.findOneAndDelete({ _id: recordId, userId });
  return Boolean(deleted);
}

module.exports = {
  interpretChart,
  analyzeHeming,
  listUserRecords,
  saveUserRecord,
  deleteUserRecord,
};
