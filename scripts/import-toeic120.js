const fs = require('fs');
const path = require('path');

const COURSE_DIR = path.resolve(__dirname, '../src/data/courses/toeic120');
const VOCAB_DIR = path.join(COURSE_DIR, 'vocabulary');

const partsData = [
  {
    partNumber: 1,
    lessonCode: '1-1',
    slug: 'phan-1-tu-1-den-20-trang-516',
    title: 'Phần 1 — Từ 1 đến 20 (Trang 516)',
    description: 'Thành ngữ & cụm từ TOEIC từ 1 đến 20 (Trang 516) kèm Quiz luyện tập.',
    items: [
      { order: 1, term: 'across the board', meaning: 'toàn diện, trên mọi lĩnh vực' },
      { order: 2, term: 'around the corner', meaning: 'rất gần, sắp xảy ra' },
      { order: 3, term: 'as we speak', meaning: 'bây giờ, ngay lúc này' },
      { order: 4, term: 'at any rate', meaning: 'dù sao đi nữa' },
      { order: 5, term: 'back out', meaning: 'rút khỏi (một cam kết)' },
      { order: 6, term: 'be better off', meaning: 'tốt hơn, khấm khá hơn' },
      { order: 7, term: 'be jammed with', meaning: 'chật ních, kẹt cứng' },
      { order: 8, term: "be on one's way", meaning: 'đang đi, đã lên đường' },
      { order: 9, term: 'be on track', meaning: 'đang đi đúng hướng' },
      { order: 10, term: 'be open to', meaning: 'sẵn sàng đón nhận/tiếp thu' },
      { order: 11, term: 'be set to do', meaning: 'đã sẵn sàng để' },
      { order: 12, term: 'be up for', meaning: 'sẵn sàng cho điều gì' },
      { order: 13, term: 'better (to be) safe than sorry', meaning: 'cẩn thận vẫn hơn, cẩn tắc vô ưu' },
      { order: 14, term: 'big on', meaning: 'rất yêu thích' },
      { order: 15, term: 'big-name', meaning: 'nổi tiếng, quan trọng' },
      { order: 16, term: 'blow A away', meaning: 'làm cho A ngạc nhiên/ấn tượng' },
      { order: 17, term: 'bottom line', meaning: 'điểm mấu chốt, điểm cốt yếu' },
      { order: 18, term: 'break ground', meaning: 'khởi công, động thổ' },
      { order: 19, term: 'build up', meaning: 'gây dựng, bồi đắp' },
      { order: 20, term: 'by all means', meaning: 'bằng mọi cách' }
    ]
  },
  {
    partNumber: 2,
    lessonCode: '1-2',
    slug: 'phan-2-tu-21-den-40-trang-517',
    title: 'Phần 2 — Từ 21 đến 40 (Trang 517)',
    description: 'Thành ngữ & cụm từ TOEIC từ 21 đến 40 (Trang 517) kèm Quiz luyện tập.',
    items: [
      { order: 21, term: 'call a meeting', meaning: 'triệu tập cuộc họp' },
      { order: 22, term: 'catch up', meaning: 'bắt kịp, xử lý công việc (bị dồn ứ)' },
      { order: 23, term: 'come along', meaning: 'đến, tới; nhanh lên' },
      { order: 24, term: 'come around', meaning: 'thay đổi ý kiến, tỉnh lại' },
      { order: 25, term: 'count A in', meaning: 'cho ai tham gia cùng' },
      { order: 26, term: 'cover for', meaning: 'bao che cho' },
      { order: 27, term: 'curve ball', meaning: 'việc bất ngờ, ngoài dự tính' },
      { order: 28, term: 'cut into', meaning: 'xen ngang, cắt bớt' },
      { order: 29, term: 'cut it close', meaning: 'sát giờ, vừa kịp lúc' },
      { order: 30, term: 'cut to the chase', meaning: 'vào thẳng vấn đề' },
      { order: 31, term: 'do not make sense', meaning: 'không có nghĩa gì, không hợp lý' },
      { order: 32, term: 'fall behind', meaning: 'chậm hơn so với dự định, rớt lại phía sau' },
      { order: 33, term: 'fall within (= fall under)', meaning: 'nằm trong, ở vào khoảng' },
      { order: 34, term: 'for some time', meaning: 'trong một thời gian dài' },
      { order: 35, term: 'gain a foothold in', meaning: 'đạt được vị trí/chỗ đứng' },
      { order: 36, term: 'get back to', meaning: 'liên lạc lại với' },
      { order: 37, term: 'get in the way of', meaning: 'ngáng đường, gây trở ngại' },
      { order: 38, term: 'get in touch with', meaning: 'liên lạc với' },
      { order: 39, term: 'get into', meaning: 'có hứng thú với, có dính líu với' },
      { order: 40, term: 'get underway', meaning: 'bắt đầu' }
    ]
  },
  {
    partNumber: 3,
    lessonCode: '1-3',
    slug: 'phan-3-tu-41-den-60-trang-518',
    title: 'Phần 3 — Từ 41 đến 60 (Trang 518)',
    description: 'Thành ngữ & cụm từ TOEIC từ 41 đến 60 (Trang 518) kèm Quiz luyện tập.',
    items: [
      { order: 41, term: 'get word', meaning: 'nghe được, được biết' },
      { order: 42, term: 'give A a go', meaning: 'thử làm gì' },
      { order: 43, term: 'give A a hand', meaning: 'giúp ai' },
      { order: 44, term: 'give A a round of applause', meaning: 'cho ai một tràng pháo tay' },
      { order: 45, term: 'go ahead', meaning: 'tiến hành, tiến lên' },
      { order: 46, term: "go out of one's way", meaning: 'cất công, chịu khó để làm gì' },
      { order: 47, term: 'go over', meaning: 'xem xét, cân nhắc; ôn lại' },
      { order: 48, term: 'hang in', meaning: 'không từ bỏ' },
      { order: 49, term: "have a lot on one's plate", meaning: 'có nhiều việc phải làm' },
      { order: 50, term: 'have a point', meaning: 'có lý' },
      { order: 51, term: 'have a taste of', meaning: 'nếm thử' },
      { order: 52, term: 'heads up', meaning: 'lời cảnh báo trước' },
      { order: 53, term: 'here we go', meaning: 'đi thôi, bắt đầu nào' },
      { order: 54, term: 'hit the road', meaning: 'khởi hành' },
      { order: 55, term: 'hit the store', meaning: 'được đưa ra thị trường' },
      { order: 56, term: 'hold off on', meaning: 'hoãn lại' },
      { order: 57, term: 'in a bind', meaning: 'gặp khó khăn/rắc rối' },
      { order: 58, term: 'in a rush', meaning: 'đang vội' },
      { order: 59, term: 'in due time', meaning: 'khi đến lúc, vào đúng thời điểm' },
      { order: 60, term: 'in no time', meaning: 'sắp, chẳng bao lâu nữa' }
    ]
  },
  {
    partNumber: 4,
    lessonCode: '1-4',
    slug: 'phan-4-tu-61-den-80-trang-519',
    title: 'Phần 4 — Từ 61 đến 80 (Trang 519)',
    description: 'Thành ngữ & cụm từ TOEIC từ 61 đến 80 (Trang 519) kèm Quiz luyện tập.',
    items: [
      { order: 61, term: 'in shape', meaning: 'cân đối, khỏe mạnh' },
      { order: 62, term: 'in talks with', meaning: 'đang trao đổi/đàm phán với' },
      { order: 63, term: 'in the long run', meaning: 'về lâu dài, cuối cùng' },
      { order: 64, term: 'in the works', meaning: 'đang được lên kế hoạch/thực hiện' },
      { order: 65, term: 'iron out', meaning: 'tìm ra giải pháp, giải quyết được vấn đề' },
      { order: 66, term: "it can't be helped", meaning: 'không thể làm gì được, không tránh khỏi' },
      { order: 67, term: 'jot down', meaning: 'viết ra, ghi nhanh lại' },
      { order: 68, term: 'jump the gun', meaning: 'hấp tấp làm gì, hành động quá sớm' },
      { order: 69, term: 'keep A in the loop', meaning: 'cho ai đó nắm được thông tin' },
      { order: 70, term: 'keep A posted', meaning: 'cập nhật tin tức cho ai' },
      { order: 71, term: 'keep up with', meaning: 'theo kịp, nắm bắt được' },
      { order: 72, term: 'live with', meaning: 'chấp nhận, chịu đựng' },
      { order: 73, term: "lose one's spot", meaning: 'mất chỗ (trong hàng)' },
      { order: 74, term: 'make good money', meaning: 'kiếm được nhiều tiền' },
      { order: 75, term: 'make it', meaning: 'làm được, thành công' },
      { order: 76, term: 'mark A down', meaning: 'giảm giá; ghi lại' },
      { order: 77, term: 'miss out on', meaning: 'bỏ lỡ cơ hội' },
      { order: 78, term: 'new face', meaning: 'gương mặt mới' },
      { order: 79, term: 'not for the world', meaning: 'không bao giờ' },
      { order: 80, term: 'of late', meaning: 'gần đây' }
    ]
  },
  {
    partNumber: 5,
    lessonCode: '1-5',
    slug: 'phan-5-tu-81-den-100-trang-520',
    title: 'Phần 5 — Từ 81 đến 100 (Trang 520)',
    description: 'Thành ngữ & cụm từ TOEIC từ 81 đến 100 (Trang 520) kèm Quiz luyện tập.',
    items: [
      { order: 81, term: "off the top of one's head", meaning: 'không suy nghĩ, không tìm hiểu' },
      { order: 82, term: 'on a walk-in basis', meaning: 'không cần hẹn trước' },
      { order: 83, term: 'on the alert', meaning: 'cảnh giác, đề phòng' },
      { order: 84, term: "one's hands are tied", meaning: 'bó tay, bị ràng buộc' },
      { order: 85, term: 'out of the question', meaning: 'không thể xảy ra, không thực tế' },
      { order: 86, term: 'point taken', meaning: 'đã biết, đã hiểu' },
      { order: 87, term: 'pose a problem', meaning: 'nêu ra một vấn đề' },
      { order: 88, term: 'put A out', meaning: 'làm ai khó chịu' },
      { order: 89, term: 'put on hold', meaning: 'bảo lưu, hoãn lại' },
      { order: 90, term: 'put together', meaning: 'kết hợp lại' },
      { order: 91, term: 'receive word from', meaning: 'nghe được tin tức từ' },
      { order: 92, term: 'ring up', meaning: 'tính tiền (ở quầy thu ngân)' },
      { order: 93, term: 'run into', meaning: 'bắt gặp, tình cờ gặp' },
      { order: 94, term: 'run long', meaning: 'tồn tại lâu' },
      { order: 95, term: 'say the word', meaning: 'cứ nói ra, cứ yêu cầu' },
      { order: 96, term: 'send A off', meaning: 'gửi đi (thư, hàng hóa)' },
      { order: 97, term: 'sort out', meaning: 'tìm cách, giải quyết' },
      { order: 98, term: 'stand out', meaning: 'nổi bật, dễ thấy' },
      { order: 99, term: 'stay on the line', meaning: 'giữ máy chờ' },
      { order: 100, term: 'take note of', meaning: 'chăm chú, để ý' }
    ]
  },
  {
    partNumber: 6,
    lessonCode: '1-6',
    slug: 'phan-6-tu-101-den-120-trang-521',
    title: 'Phần 6 — Từ 101 đến 120 (Trang 521)',
    description: 'Thành ngữ & cụm từ TOEIC từ 101 đến 120 (Trang 521) kèm Quiz luyện tập.',
    items: [
      { order: 101, term: 'take on', meaning: 'đảm nhận' },
      { order: 102, term: "take one's chances", meaning: 'chấp nhận mạo hiểm' },
      { order: 103, term: "take one's time", meaning: 'từ từ, không vội' },
      { order: 104, term: "take one's word", meaning: 'tin lời ai' },
      { order: 105, term: 'take up', meaning: 'chiếm, sử dụng (thời gian, không gian)' },
      { order: 106, term: 'team up with', meaning: 'hợp tác với' },
      { order: 107, term: 'tell me about it', meaning: 'cứ nói/chia sẻ với tôi' },
      { order: 108, term: 'throw a party', meaning: 'tổ chức một bữa tiệc' },
      { order: 109, term: 'toss-up', meaning: 'tình huống 50/50' },
      { order: 110, term: 'tune in', meaning: 'xem/nghe chương trình trên TV/radio' },
      { order: 111, term: 'turn out', meaning: 'hóa ra, thành ra' },
      { order: 112, term: 'up and running', meaning: 'hoạt động tốt' },
      { order: 113, term: 'up in the air', meaning: 'vẫn chưa quyết định, không chắc chắn' },
      { order: 114, term: 'up-and-coming', meaning: 'đầy hứa hẹn, có triển vọng' },
      { order: 115, term: 'wave down', meaning: 'vẫy tay ra hiệu dừng xe lại' },
      { order: 116, term: 'without further ado', meaning: 'không chần chừ thêm nữa' },
      { order: 117, term: 'word of mouth', meaning: 'lời truyền miệng' },
      { order: 118, term: 'work against the clock', meaning: 'chạy đua với thời gian' },
      { order: 119, term: 'work around', meaning: 'xoay xở làm gì' },
      { order: 120, term: 'work out', meaning: 'giải quyết (một vấn đề)' }
    ]
  }
];

function generateFiles() {
  // 1. Create directories
  fs.mkdirSync(VOCAB_DIR, { recursive: true });

  // 2. course.json
  const courseMeta = {
    code: 'TOEIC120',
    title: '120 thành ngữ và cụm từ TOEIC',
    shortDescription: '120 thành ngữ và cụm từ TOEIC thông dụng chia thành 6 Quiz luyện tập (Trang 516 - 521).',
    description: 'Nắm vững 120 thành ngữ và cụm từ thường gặp nhất trong các đề thi TOEIC. Học qua Flashcard, luyện gõ, làm 6 bài Quiz trắc nghiệm, phản xạ nhanh và nghe phát âm chuẩn.',
    level: 'OTHER',
    thumbnail: '',
    isPublished: true,
    sortOrder: 6,
    stats: {
      totalVocabulary: 120,
      totalKanji: 0,
      totalGrammar: 0,
      totalExams: 6
    }
  };
  fs.writeFileSync(path.join(COURSE_DIR, 'course.json'), JSON.stringify(courseMeta, null, 2), 'utf8');
  console.log('✅ Generated course.json');

  // 3. lessons.json
  const lessonsMeta = partsData.map((p, idx) => ({
    lessonCode: p.lessonCode,
    slug: p.slug,
    title: p.title,
    description: p.description,
    order: idx + 1,
    itemCount: p.items.length
  }));
  fs.writeFileSync(path.join(VOCAB_DIR, 'lessons.json'), JSON.stringify(lessonsMeta, null, 2), 'utf8');
  console.log(`✅ Generated lessons.json with ${lessonsMeta.length} lessons`);

  // 4. individual lesson-*.json files
  for (const part of partsData) {
    const fileName = `lesson-${part.lessonCode}.json`;
    const formattedItems = part.items.map((item, itemIdx) => ({
      order: itemIdx + 1,
      term: item.term,
      reading: '',
      romaji: '',
      partOfSpeech: 'Thành ngữ / Cụm từ',
      meaning: item.meaning,
      examples: []
    }));
    fs.writeFileSync(path.join(VOCAB_DIR, fileName), JSON.stringify(formattedItems, null, 2), 'utf8');
    console.log(`✅ Generated ${fileName} (${formattedItems.length} items)`);
  }

  console.log('🎉 Successfully generated all TOEIC120 data files!');
}

generateFiles();
