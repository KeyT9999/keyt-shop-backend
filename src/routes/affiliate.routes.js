const express = require('express');
const { body, query, validationResult } = require('express-validator');
const affiliateService = require('../services/affiliate.service');

const router = express.Router();

function mapProfile(profile) {
  return {
    _id: profile._id,
    referralCode: profile.referralCode,
    bankName: profile.bankName || '',
    bankAccountNumber: profile.bankAccountNumber || '',
    bankAccountHolder: profile.bankAccountHolder || '',
    availableBalance: profile.availableBalance || 0,
    pendingBalance: profile.pendingBalance || 0,
    reservedBalance: profile.reservedBalance || 0,
    totalEarned: profile.totalEarned || 0,
    totalWithdrawn: profile.totalWithdrawn || 0,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

function mapEarning(earning) {
  return {
    _id: earning._id,
    orderId: earning.orderId,
    orderCode: earning.orderCode,
    itemIndex: earning.itemIndex,
    segmentIndex: earning.segmentIndex,
    productId: earning.productId,
    productName: earning.productName,
    buyerName: earning.buyerName,
    buyerEmail: earning.buyerEmail,
    currency: earning.currency,
    commissionRate: earning.commissionRate,
    commissionAmount: earning.commissionAmount,
    status: earning.status,
    paidOutAt: earning.paidOutAt || null,
    availableAt: earning.availableAt || null,
    voidedAt: earning.voidedAt || null,
    createdAt: earning.createdAt,
    updatedAt: earning.updatedAt
  };
}

function mapWithdrawal(withdrawal) {
  return {
    _id: withdrawal._id,
    amount: withdrawal.amount,
    currency: withdrawal.currency,
    bankName: withdrawal.bankName,
    bankAccountNumber: withdrawal.bankAccountNumber,
    bankAccountHolder: withdrawal.bankAccountHolder,
    status: withdrawal.status,
    adminNote: withdrawal.adminNote || '',
    approvedAt: withdrawal.approvedAt || null,
    paidAt: withdrawal.paidAt || null,
    rejectedAt: withdrawal.rejectedAt || null,
    createdAt: withdrawal.createdAt,
    updatedAt: withdrawal.updatedAt
  };
}

/**
 * GET /api/affiliate/me
 */
router.get('/me', async (req, res) => {
  try {
    const data = await affiliateService.getUserAffiliateDashboard(req.user.id);
    res.json({
      minimumWithdrawalAmount: affiliateService.MIN_WITHDRAWAL_AMOUNT,
      profile: mapProfile(data.profile),
      earnings: data.earnings.map(mapEarning),
      withdrawals: data.withdrawals.map(mapWithdrawal)
    });
  } catch (err) {
    console.error('❌ affiliate/me:', err);
    res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
  }
});

/**
 * PUT /api/affiliate/me/bank
 */
router.put(
  '/me/bank',
  [
    body('bankName').trim().notEmpty().withMessage('Tên ngân hàng là bắt buộc'),
    body('bankAccountNumber').trim().notEmpty().withMessage('Số tài khoản là bắt buộc'),
    body('bankAccountHolder').trim().notEmpty().withMessage('Tên chủ tài khoản là bắt buộc')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await affiliateService.updateAffiliateBankInfo(req.user.id, req.body);
      res.json({
        message: 'Đã cập nhật thông tin ngân hàng',
        profile: mapProfile(profile)
      });
    } catch (err) {
      console.error('❌ affiliate/me/bank:', err);
      res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
    }
  }
);

/**
 * POST /api/affiliate/withdrawals
 */
router.post(
  '/withdrawals',
  [body('amount').isNumeric().withMessage('Số tiền rút không hợp lệ')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const withdrawal = await affiliateService.createAffiliateWithdrawalRequest(
        req.user.id,
        req.body.amount
      );
      res.status(201).json({
        message: 'Đã tạo yêu cầu rút tiền',
        withdrawal: mapWithdrawal(withdrawal)
      });
    } catch (err) {
      console.error('❌ affiliate/withdrawals:', err);
      res.status(400).json({ message: err.message || 'Không thể tạo yêu cầu rút tiền' });
    }
  }
);

/**
 * GET /api/affiliate/earnings
 */
router.get(
  '/earnings',
  [query('status').optional().isIn(['pending', 'available', 'void', 'paid_out'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const data = await affiliateService.getUserAffiliateDashboard(req.user.id);
      const filtered = req.query.status
        ? data.earnings.filter((earning) => earning.status === req.query.status)
        : data.earnings;
      res.json({ earnings: filtered.map(mapEarning) });
    } catch (err) {
      console.error('❌ affiliate/earnings:', err);
      res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
    }
  }
);

/**
 * GET /api/affiliate/withdrawals
 */
router.get(
  '/withdrawals',
  [query('status').optional().isIn(['pending', 'approved', 'paid', 'rejected'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const data = await affiliateService.getUserAffiliateDashboard(req.user.id);
      const filtered = req.query.status
        ? data.withdrawals.filter((withdrawal) => withdrawal.status === req.query.status)
        : data.withdrawals;
      res.json({ withdrawals: filtered.map(mapWithdrawal) });
    } catch (err) {
      console.error('❌ affiliate/withdrawals:list:', err);
      res.status(500).json({ message: err.message || 'Lỗi máy chủ' });
    }
  }
);

module.exports = router;
