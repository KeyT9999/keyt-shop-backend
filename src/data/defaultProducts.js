const defaultProducts = [
  {
    name: 'Netflix Premium',
    price: 89000,
    currency: 'VNĐ',
    billingCycle: 'tháng',
    category: 'Giải trí',
    isHot: true,
    promotion: 'Liên hệ ngay',
    features: ['Xem Ultra HD 4K mượt mà', 'Không quảng cáo làm phiền', 'Tài khoản Shop cấp', 'Hỗ trợ kích hoạt nhanh'],
    description: 'Tài khoản Netflix Premium riêng tư, xem phim chất lượng cao cho cả gia đình.',
    imageUrl: 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=800&q=80',
    stock: 120
  },
  {
    name: 'Canva Pro',
    price: 189000,
    currency: 'VNĐ',
    billingCycle: 'tháng',
    category: 'Thiết kế',
    isHot: true,
    promotion: 'Tặng combo 4 khóa học',
    features: ['Nâng chính chủ – dùng an toàn', 'Tặng combo 4 khoá học Canva', 'Template & công cụ AI không giới hạn', 'Hỗ trợ setup chi tiết'],
    description: 'Truy cập đầy đủ Canva Pro cho thiết kế chuyên nghiệp, phù hợp team Marketing.',
    imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
    stock: 85
  },
  {
    name: 'Google Drive + Gemini + NotebookLM',
    price: 349000,
    currency: 'VNĐ',
    billingCycle: 'năm',
    category: 'Năng suất',
    isHot: false,
    promotion: 'Combo AI + 2TB',
    features: ['2TB Google Drive chính chủ', 'Gemini Advanced + NotebookLM trọn gói', 'Sao lưu, bảo mật & AI hỗ trợ học tập'],
    description: 'Gói Google cao cấp cho lưu trữ 2TB cùng bộ AI Gemini, NotebookLM phục vụ học tập và làm việc.',
    imageUrl: 'https://images.unsplash.com/photo-1509475826633-fed577a2c71b?auto=format&fit=crop&w=800&q=80',
    stock: 60
  }
];

module.exports = defaultProducts;

