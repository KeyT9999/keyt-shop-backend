const express = require('express');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const NetflixReplacementTicket = require('../models/netflixReplacementTicket.model');
const tiemBanh = require('../services/tiembanh.service');

const router = express.Router();

/**
 * GET /api/netflix/replacement-tickets/me
 */
router.get('/replacement-tickets/me', async (req, res) => {
  try {
    const tickets = await NetflixReplacementTicket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id orderId itemIndex slotIndex status consumed decisionReason createdAt updatedAt approvedAt rejectedAt')
      .lean();
    res.json({ tickets });
  } catch (err) {
    console.error('❌ replacement-tickets/me:', err);
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

async function assertCustomerOwnsOrder(order, userId) {
  const user = await User.findById(userId);
  if (!user) return false;
  if (order.userId && order.userId.toString() === userId.toString()) return true;
  if (
    order.customer?.email &&
    user.email &&
    order.customer.email.toLowerCase() === user.email.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * POST /api/netflix/orders/:orderId/items/:itemIndex/slots/:slotIndex/regen-link
 */
router.post('/orders/:orderId/items/:itemIndex/slots/:slotIndex/regen-link', async (req, res) => {
  try {
    const { orderId, itemIndex, slotIndex } = req.params;
    const i = parseInt(itemIndex, 10);
    const s = parseInt(slotIndex, 10);
    if (Number.isNaN(i) || Number.isNaN(s)) {
      return res.status(400).json({ message: 'Invalid index' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!(await assertCustomerOwnsOrder(order, req.user.id))) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập đơn này' });
    }
    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Đơn chưa thanh toán' });
    }
    if (!order.items[i]) return res.status(400).json({ message: 'itemIndex không hợp lệ' });
    const item = order.items[i];
    if (!item.tiemBanhSlots || !item.tiemBanhSlots[s]) {
      return res.status(400).json({ message: 'slotIndex không hợp lệ' });
    }
    const slot = item.tiemBanhSlots[s];
    if (slot.provisionStatus !== 'ok' || !slot.logId) {
      return res.status(400).json({ message: 'Chưa có slot Netflix hoạt động để làm mới link' });
    }

    try {
      const regen = await tiemBanh.regenerateToken(slot.logId);
      if (regen.success) {
        slot.pcLoginLink = regen.pcLink;
        slot.mobileLoginLink = regen.mobileLink;
        slot.tokenExpires = regen.tokenExpires;
        slot.timeRemaining = regen.tokenExpires
          ? Math.max(0, regen.tokenExpires - Math.floor(Date.now() / 1000))
          : undefined;
        slot.lastRegenAt = new Date();
        await order.save();
        return res.json({
          success: true,
          pcLoginLink: slot.pcLoginLink,
          mobileLoginLink: slot.mobileLoginLink,
          tokenExpires: slot.tokenExpires,
          usedFallback: false
        });
      }
    } catch (e) {
      console.warn('[Netflix regen] regenerate-token failed:', e.message);
    }

    if ((slot.regenFallbackCount || 0) >= 1) {
      return res.status(503).json({
        message: 'Không thể làm mới link; đã dùng hết lần fallback lấy cookie mới (1 lần/slot).'
      });
    }

    const raw = await tiemBanh.getCookie();
    const mapped = tiemBanh.mapGetCookieSuccess(raw);
    if (!mapped) {
      return res.status(503).json({ message: 'Tiệm Bánh không trả cookie mới' });
    }

    slot.logId = mapped.logId;
    slot.cookie = mapped.cookie;
    slot.pcLoginLink = mapped.pcLoginLink;
    slot.mobileLoginLink = mapped.mobileLoginLink;
    slot.tokenExpires = mapped.tokenExpires;
    slot.timeRemaining = mapped.timeRemaining;
    slot.cookieNumber = mapped.cookieNumber;
    slot.regenFallbackCount = (slot.regenFallbackCount || 0) + 1;
    slot.lastRegenAt = new Date();
    await order.save();

    return res.json({
      success: true,
      pcLoginLink: slot.pcLoginLink,
      mobileLoginLink: slot.mobileLoginLink,
      tokenExpires: slot.tokenExpires,
      usedFallback: true
    });
  } catch (err) {
    console.error('❌ regen-link:', err);
    res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
  }
});

/**
 * POST /api/netflix/replacement-request
 * body: { orderId, itemIndex, slotIndex, evidence }
 */
router.post('/replacement-request', async (req, res) => {
  try {
    const { orderId, itemIndex, slotIndex, evidence } = req.body;
    const i = parseInt(itemIndex, 10);
    const s = parseInt(slotIndex, 10);
    if (!orderId || Number.isNaN(i) || Number.isNaN(s)) {
      return res.status(400).json({ message: 'Thiếu orderId hoặc index không hợp lệ' });
    }

    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!(await assertCustomerOwnsOrder(order, req.user.id))) {
      return res.status(403).json({ message: 'Bạn không có quyền' });
    }
    if (!order.items[i]) return res.status(400).json({ message: 'itemIndex không hợp lệ' });
    const prod = order.items[i].productId;
    const product = prod?._id ? prod : null;
    if (!product?.isTiemBanhNetflix) {
      return res.status(400).json({ message: 'Line item không phải Netflix Tiệm Bánh' });
    }
    if (!order.items[i].tiemBanhSlots?.[s]) {
      return res.status(400).json({ message: 'slotIndex không hợp lệ' });
    }

    const dup = await NetflixReplacementTicket.findOne({
      orderId,
      itemIndex: i,
      slotIndex: s,
      status: 'pending'
    });
    if (dup) {
      return res.status(400).json({ message: 'Đã có yêu cầu đổi cookie đang chờ duyệt' });
    }

    const ticket = await NetflixReplacementTicket.create({
      orderId,
      itemIndex: i,
      slotIndex: s,
      userId: req.user.id,
      evidence: typeof evidence === 'string' ? evidence.slice(0, 4000) : '',
      status: 'pending'
    });

    res.status(201).json({ success: true, ticketId: ticket._id, status: ticket.status });
  } catch (err) {
    console.error('❌ replacement-request:', err);
    res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
  }
});

/**
 * POST /api/netflix/provision-replacement
 * body: { ticketId }
 */
router.post('/provision-replacement', async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'ticketId bắt buộc' });

    const ticket = await NetflixReplacementTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy ticket' });
    if (ticket.status !== 'approved' || ticket.consumed) {
      return res.status(400).json({ message: 'Ticket chưa được duyệt hoặc đã dùng' });
    }

    const order = await Order.findById(ticket.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!(await assertCustomerOwnsOrder(order, req.user.id))) {
      return res.status(403).json({ message: 'Bạn không có quyền' });
    }

    const i = ticket.itemIndex;
    const s = ticket.slotIndex;
    if (!order.items[i]?.tiemBanhSlots?.[s]) {
      return res.status(400).json({ message: 'Slot không tồn tại' });
    }

    const slot = order.items[i].tiemBanhSlots[s];
    const raw = await tiemBanh.getCookie();
    const mapped = tiemBanh.mapGetCookieSuccess(raw);
    if (!mapped) {
      return res.status(503).json({ message: 'Tiệm Bánh không trả cookie mới' });
    }

    slot.logId = mapped.logId;
    slot.cookie = mapped.cookie;
    slot.pcLoginLink = mapped.pcLoginLink;
    slot.mobileLoginLink = mapped.mobileLoginLink;
    slot.tokenExpires = mapped.tokenExpires;
    slot.timeRemaining = mapped.timeRemaining;
    slot.cookieNumber = mapped.cookieNumber;
    slot.provisionStatus = 'ok';
    slot.provisionedAt = new Date();
    slot.regenFallbackCount = 0;
    await order.save();

    ticket.consumed = true;
    await ticket.save();

    res.json({
      success: true,
      pcLoginLink: slot.pcLoginLink,
      mobileLoginLink: slot.mobileLoginLink,
      tokenExpires: slot.tokenExpires,
      cookie: slot.cookie
    });
  } catch (err) {
    console.error('❌ provision-replacement:', err);
    res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
  }
});

module.exports = router;
