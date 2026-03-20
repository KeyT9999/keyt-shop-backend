const crypto = require('crypto');
const AffiliateProfile = require('../models/affiliateProfile.model');
const AffiliateEarning = require('../models/affiliateEarning.model');
const AffiliateWithdrawal = require('../models/affiliateWithdrawal.model');
const User = require('../models/user.model');

const MIN_WITHDRAWAL_AMOUNT = 50000;
const REFERRAL_CODE_LENGTH = 8;

function toMoney(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function extractObjectId(value) {
  if (!value) return null;
  if (value._id) return value._id;
  return value;
}

function sanitizeSeed(seed) {
  return String(seed || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function buildRandomCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let output = '';
  for (let i = 0; i < length; i += 1) {
    const index = crypto.randomInt(0, chars.length);
    output += chars[index];
  }
  return output;
}

async function generateUniqueReferralCode(seed) {
  const sanitized = sanitizeSeed(seed);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const prefix = sanitized.slice(0, 4).padEnd(4, 'K');
    const candidate = `${prefix}${buildRandomCode(REFERRAL_CODE_LENGTH - 4)}`.slice(
      0,
      REFERRAL_CODE_LENGTH
    );
    const exists = await AffiliateProfile.exists({ referralCode: candidate });
    if (!exists) {
      return candidate;
    }
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const candidate = buildRandomCode(REFERRAL_CODE_LENGTH);
    const exists = await AffiliateProfile.exists({ referralCode: candidate });
    if (!exists) {
      return candidate;
    }
  }

  throw new Error('Không thể tạo referral code duy nhất');
}

async function ensureAffiliateProfileForUser(userId) {
  let profile = await AffiliateProfile.findOne({ userId });
  if (profile) {
    return profile;
  }

  const user = await User.findById(userId).select('username email displayName');
  if (!user) {
    throw new Error('Không tìm thấy user để tạo affiliate profile');
  }

  const referralCode = await generateUniqueReferralCode(
    user.displayName || user.username || user.email || 'KEYT'
  );

  profile = await AffiliateProfile.create({
    userId,
    referralCode
  });

  return profile;
}

async function findAffiliateProfileByCode(referralCode) {
  const code = String(referralCode || '').trim().toUpperCase();
  if (!code) return null;
  return AffiliateProfile.findOne({ referralCode: code });
}

async function buildOrderAffiliateAttribution({ referralCode, buyerUserId }) {
  const profile = await findAffiliateProfileByCode(referralCode);
  if (!profile) return null;

  if (buyerUserId && String(profile.userId) === String(buyerUserId)) {
    return null;
  }

  return {
    referrerUserId: profile.userId,
    referralCode: profile.referralCode
  };
}

function computeItemAffiliateSnapshot(product, item) {
  const affiliateEnabled = product?.affiliateEnabled === true;
  const rawRate = Number(product?.affiliateCommissionPercent) || 0;
  const affiliateCommissionRate = affiliateEnabled ? Math.max(0, rawRate) : 0;
  const lineTotal = toMoney((Number(item.price) || 0) * (Number(item.quantity) || 0));
  const affiliateCommissionAmount =
    affiliateEnabled && affiliateCommissionRate > 0
      ? toMoney((lineTotal * affiliateCommissionRate) / 100)
      : 0;

  return {
    affiliateEnabled,
    affiliateCommissionRate,
    affiliateCommissionAmount
  };
}

function resolveAffiliateTargetStatus(order) {
  if (order.orderStatus === 'cancelled' || order.paymentStatus === 'failed') {
    return 'void';
  }
  if (order.paymentStatus !== 'paid') {
    return 'void';
  }
  if (order.orderStatus === 'completed') {
    return 'available';
  }
  return 'pending';
}

function reverseRootImpact(profile, earning) {
  const amount = toMoney(earning.commissionAmount);

  if (earning.status === 'pending') {
    profile.pendingBalance = Math.max(0, toMoney(profile.pendingBalance) - amount);
    profile.totalEarned = Math.max(0, toMoney(profile.totalEarned) - amount);
  }

  if (earning.status === 'available') {
    profile.availableBalance = Math.max(0, toMoney(profile.availableBalance) - amount);
    profile.totalEarned = Math.max(0, toMoney(profile.totalEarned) - amount);
  }
}

function applyRootImpact(profile, earning, targetStatus) {
  const amount = toMoney(earning.commissionAmount);

  if (targetStatus === 'pending') {
    profile.pendingBalance = toMoney(profile.pendingBalance) + amount;
    profile.totalEarned = toMoney(profile.totalEarned) + amount;
    earning.availableAt = undefined;
    earning.voidedAt = undefined;
  }

  if (targetStatus === 'available') {
    profile.availableBalance = toMoney(profile.availableBalance) + amount;
    profile.totalEarned = toMoney(profile.totalEarned) + amount;
    earning.availableAt = new Date();
    earning.voidedAt = undefined;
  }

  if (targetStatus === 'void') {
    earning.voidedAt = new Date();
  }
}

async function syncAffiliateForOrder(order) {
  const referrerUserId = order.affiliateReferrerUserId;
  if (!referrerUserId) {
    return { updated: false };
  }

  const eligibleItems = (order.items || []).filter(
    (item) => item.affiliateEnabled && toMoney(item.affiliateCommissionAmount) > 0
  );

  if (eligibleItems.length === 0) {
    return { updated: false };
  }

  const profile = await ensureAffiliateProfileForUser(referrerUserId);
  const existingRoots = await AffiliateEarning.find({
    orderId: order._id,
    sourceType: 'order_item'
  });
  const rootMap = new Map(existingRoots.map((earning) => [earning.itemIndex, earning]));
  const targetStatus = resolveAffiliateTargetStatus(order);
  let profileDirty = false;

  for (let itemIndex = 0; itemIndex < order.items.length; itemIndex += 1) {
    const item = order.items[itemIndex];
    if (!item.affiliateEnabled || toMoney(item.affiliateCommissionAmount) <= 0) {
      continue;
    }

    const root = rootMap.get(itemIndex);
    const commissionAmount = toMoney(item.affiliateCommissionAmount);
    const commissionRate = Number(item.affiliateCommissionRate) || 0;

    if (!root) {
      if (targetStatus === 'void') {
        continue;
      }

      const earning = new AffiliateEarning({
        referrerUserId,
        buyerUserId: order.userId || undefined,
        orderId: order._id,
        orderCode: order.orderCode,
        itemIndex,
        segmentIndex: 0,
        sourceType: 'order_item',
        referralCode: order.affiliateReferralCode || '',
        productId: extractObjectId(item.productId),
        productName: item.name,
        buyerName: order.customer?.name || '',
        buyerEmail: order.customer?.email || '',
        currency: item.currency || 'VND',
        commissionRate,
        commissionAmount,
        status: targetStatus
      });

      applyRootImpact(profile, earning, targetStatus);
      await earning.save();
      profileDirty = true;
      continue;
    }

    if (root.status === targetStatus || root.status === 'paid_out') {
      continue;
    }

    reverseRootImpact(profile, root);
    applyRootImpact(profile, root, targetStatus);
    root.status = targetStatus;
    root.orderCode = order.orderCode;
    root.buyerUserId = order.userId || undefined;
    root.buyerName = order.customer?.name || root.buyerName;
    root.buyerEmail = order.customer?.email || root.buyerEmail;
    root.referralCode = order.affiliateReferralCode || root.referralCode;
    await root.save();
    profileDirty = true;
  }

  if (profileDirty) {
    await profile.save();
  }

  return { updated: profileDirty };
}

async function getUserAffiliateDashboard(userId) {
  const profile = await ensureAffiliateProfileForUser(userId);
  const [earnings, withdrawals] = await Promise.all([
    AffiliateEarning.find({ referrerUserId: userId })
      .sort({ createdAt: -1, itemIndex: -1 })
      .limit(100)
      .lean(),
    AffiliateWithdrawal.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
  ]);

  return {
    profile,
    earnings,
    withdrawals
  };
}

async function updateAffiliateBankInfo(userId, data) {
  const profile = await ensureAffiliateProfileForUser(userId);
  profile.bankName = String(data.bankName || '').trim();
  profile.bankAccountNumber = String(data.bankAccountNumber || '').trim();
  profile.bankAccountHolder = String(data.bankAccountHolder || '').trim();
  await profile.save();
  return profile;
}

function assertBankInfo(profile) {
  if (!profile.bankName || !profile.bankAccountNumber || !profile.bankAccountHolder) {
    throw new Error('Vui lòng cập nhật đầy đủ thông tin ngân hàng trước khi rút tiền');
  }
}

async function createAffiliateWithdrawalRequest(userId, amountInput) {
  const profile = await ensureAffiliateProfileForUser(userId);
  const amount = toMoney(amountInput);

  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    throw new Error(`Số tiền rút tối thiểu là ${MIN_WITHDRAWAL_AMOUNT.toLocaleString('vi-VN')}đ`);
  }

  assertBankInfo(profile);

  if (toMoney(profile.availableBalance) < amount) {
    throw new Error('Số dư khả dụng không đủ để tạo yêu cầu rút tiền');
  }

  profile.availableBalance = toMoney(profile.availableBalance) - amount;
  profile.reservedBalance = toMoney(profile.reservedBalance) + amount;

  const withdrawal = await AffiliateWithdrawal.create({
    userId,
    profileId: profile._id,
    amount,
    bankName: profile.bankName,
    bankAccountNumber: profile.bankAccountNumber,
    bankAccountHolder: profile.bankAccountHolder,
    status: 'pending'
  });

  await profile.save();

  return withdrawal;
}

async function approveAffiliateWithdrawal(withdrawalId, adminId, adminNote) {
  const withdrawal = await AffiliateWithdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new Error('Không tìm thấy yêu cầu rút tiền');
  }

  if (!['pending', 'approved'].includes(withdrawal.status)) {
    throw new Error('Yêu cầu rút tiền này không thể duyệt');
  }

  withdrawal.status = 'approved';
  withdrawal.processedBy = adminId;
  withdrawal.approvedAt = withdrawal.approvedAt || new Date();
  if (typeof adminNote === 'string') {
    withdrawal.adminNote = adminNote.trim();
  }
  await withdrawal.save();

  return withdrawal;
}

async function rejectAffiliateWithdrawal(withdrawalId, adminId, adminNote) {
  const withdrawal = await AffiliateWithdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new Error('Không tìm thấy yêu cầu rút tiền');
  }

  if (!['pending', 'approved'].includes(withdrawal.status)) {
    throw new Error('Yêu cầu rút tiền này không thể từ chối');
  }

  const profile = await AffiliateProfile.findById(withdrawal.profileId);
  if (!profile) {
    throw new Error('Không tìm thấy affiliate profile');
  }

  profile.reservedBalance = Math.max(0, toMoney(profile.reservedBalance) - toMoney(withdrawal.amount));
  profile.availableBalance = toMoney(profile.availableBalance) + toMoney(withdrawal.amount);

  withdrawal.status = 'rejected';
  withdrawal.processedBy = adminId;
  withdrawal.rejectedAt = new Date();
  if (typeof adminNote === 'string') {
    withdrawal.adminNote = adminNote.trim();
  }

  await profile.save();
  await withdrawal.save();

  return withdrawal;
}

async function getNextSegmentIndex(orderId, itemIndex) {
  const lastSegment = await AffiliateEarning.findOne({ orderId, itemIndex })
    .sort({ segmentIndex: -1 })
    .select('segmentIndex')
    .lean();
  return (lastSegment?.segmentIndex || 0) + 1;
}

async function allocateWithdrawalAcrossEarnings(withdrawal) {
  let remaining = toMoney(withdrawal.amount);

  const earnings = await AffiliateEarning.find({
    referrerUserId: withdrawal.userId,
    status: 'available'
  }).sort({ createdAt: 1, itemIndex: 1 });

  for (const earning of earnings) {
    if (remaining <= 0) break;

    const earningAmount = toMoney(earning.commissionAmount);
    if (earningAmount <= remaining) {
      earning.status = 'paid_out';
      earning.withdrawalId = withdrawal._id;
      earning.paidOutAt = new Date();
      await earning.save();
      remaining -= earningAmount;
      continue;
    }

    const paidAmount = remaining;
    const remainderAmount = earningAmount - paidAmount;
    const nextSegmentIndex = await getNextSegmentIndex(earning.orderId, earning.itemIndex);

    const paidSegment = new AffiliateEarning({
      referrerUserId: earning.referrerUserId,
      buyerUserId: earning.buyerUserId,
      orderId: earning.orderId,
      orderCode: earning.orderCode,
      itemIndex: earning.itemIndex,
      segmentIndex: nextSegmentIndex,
      sourceType: 'payout_split',
      sourceEarningId: earning._id,
      withdrawalId: withdrawal._id,
      referralCode: earning.referralCode,
      productId: earning.productId,
      productName: earning.productName,
      buyerName: earning.buyerName,
      buyerEmail: earning.buyerEmail,
      currency: earning.currency,
      commissionRate: earning.commissionRate,
      commissionAmount: paidAmount,
      status: 'paid_out',
      paidOutAt: new Date()
    });

    earning.commissionAmount = remainderAmount;
    await earning.save();
    await paidSegment.save();
    remaining = 0;
  }

  return remaining;
}

async function markAffiliateWithdrawalPaid(withdrawalId, adminId, adminNote) {
  const withdrawal = await AffiliateWithdrawal.findById(withdrawalId);
  if (!withdrawal) {
    throw new Error('Không tìm thấy yêu cầu rút tiền');
  }

  if (!['pending', 'approved'].includes(withdrawal.status)) {
    throw new Error('Yêu cầu rút tiền này không thể đánh dấu đã trả');
  }

  const profile = await AffiliateProfile.findById(withdrawal.profileId);
  if (!profile) {
    throw new Error('Không tìm thấy affiliate profile');
  }

  profile.reservedBalance = Math.max(0, toMoney(profile.reservedBalance) - toMoney(withdrawal.amount));
  profile.totalWithdrawn = toMoney(profile.totalWithdrawn) + toMoney(withdrawal.amount);

  withdrawal.status = 'paid';
  withdrawal.processedBy = adminId;
  withdrawal.approvedAt = withdrawal.approvedAt || new Date();
  withdrawal.paidAt = new Date();
  if (typeof adminNote === 'string') {
    withdrawal.adminNote = adminNote.trim();
  }

  await profile.save();
  await withdrawal.save();
  await allocateWithdrawalAcrossEarnings(withdrawal);

  return withdrawal;
}

async function getAdminAffiliateOverview() {
  const [topAffiliates, recentEarnings, recentWithdrawals, totalGeneratedAgg, totalPaidOutAgg] =
    await Promise.all([
      AffiliateProfile.find({})
        .populate('userId', 'username email displayName')
        .sort({ totalEarned: -1, updatedAt: -1 })
        .limit(10)
        .lean(),
      AffiliateEarning.find({})
        .populate('referrerUserId', 'username email displayName')
        .populate('buyerUserId', 'username email displayName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      AffiliateWithdrawal.find({})
        .populate('userId', 'username email displayName')
        .populate('processedBy', 'username email displayName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      AffiliateEarning.aggregate([
        { $match: { status: { $ne: 'void' } } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
      ]),
      AffiliateWithdrawal.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

  const [pendingEarningsTotal, availableEarningsTotal, pendingWithdrawalsCount] = await Promise.all([
    AffiliateProfile.aggregate([{ $group: { _id: null, total: { $sum: '$pendingBalance' } } }]),
    AffiliateProfile.aggregate([{ $group: { _id: null, total: { $sum: '$availableBalance' } } }]),
    AffiliateWithdrawal.countDocuments({ status: 'pending' })
  ]);

  return {
    stats: {
      totalGenerated: totalGeneratedAgg[0]?.total || 0,
      totalPaidOut: totalPaidOutAgg[0]?.total || 0,
      totalPending: pendingEarningsTotal[0]?.total || 0,
      totalAvailable: availableEarningsTotal[0]?.total || 0,
      pendingWithdrawals: pendingWithdrawalsCount
    },
    topAffiliates,
    recentEarnings,
    recentWithdrawals
  };
}

async function listAffiliateEarningsForAdmin({ status, page = 1, limit = 20 }) {
  const query = {};
  if (status && ['pending', 'available', 'void', 'paid_out'].includes(status)) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, earnings] = await Promise.all([
    AffiliateEarning.countDocuments(query),
    AffiliateEarning.find(query)
      .populate('referrerUserId', 'username email displayName')
      .populate('buyerUserId', 'username email displayName')
      .populate('withdrawalId', 'status paidAt amount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  return {
    earnings,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum))
  };
}

async function listAffiliateWithdrawalsForAdmin({ status, page = 1, limit = 20 }) {
  const query = {};
  if (status && ['pending', 'approved', 'paid', 'rejected'].includes(status)) {
    query.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, withdrawals] = await Promise.all([
    AffiliateWithdrawal.countDocuments(query),
    AffiliateWithdrawal.find(query)
      .populate('userId', 'username email displayName')
      .populate('processedBy', 'username email displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean()
  ]);

  return {
    withdrawals,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.max(1, Math.ceil(total / limitNum))
  };
}

module.exports = {
  MIN_WITHDRAWAL_AMOUNT,
  ensureAffiliateProfileForUser,
  findAffiliateProfileByCode,
  buildOrderAffiliateAttribution,
  computeItemAffiliateSnapshot,
  syncAffiliateForOrder,
  getUserAffiliateDashboard,
  updateAffiliateBankInfo,
  createAffiliateWithdrawalRequest,
  approveAffiliateWithdrawal,
  rejectAffiliateWithdrawal,
  markAffiliateWithdrawalPaid,
  getAdminAffiliateOverview,
  listAffiliateEarningsForAdmin,
  listAffiliateWithdrawalsForAdmin
};
