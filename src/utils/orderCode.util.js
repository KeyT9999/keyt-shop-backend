const Order = require('../models/order.model');

/**
 * Sinh mã đơn hàng 6 chữ số ngẫu nhiên và duy nhất
 * @returns {Promise<number>} Mã đơn hàng 6 chữ số (100000-999999)
 */
async function generateUniqueOrderCode() {
    const MAX_RETRIES = 10;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        // Sinh số ngẫu nhiên từ 100000 đến 999999
        const orderCode = Math.floor(Math.random() * 900000) + 100000;

        // Kiểm tra xem mã này đã tồn tại chưa
        const existingOrder = await Order.findOne({ orderCode });

        if (!existingOrder) {
            return orderCode;
        }

        attempts++;
        console.warn(`⚠️ Mã đơn hàng ${orderCode} đã tồn tại, thử lại... (lần ${attempts}/${MAX_RETRIES})`);
    }

    // Nếu sau MAX_RETRIES lần vẫn trùng, throw error
    throw new Error('Không thể tạo mã đơn hàng duy nhất sau nhiều lần thử. Vui lòng thử lại.');
}

module.exports = {
    generateUniqueOrderCode
};
