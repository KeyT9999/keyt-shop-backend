const Order = require('../models/order.model');
const Product = require('../models/product.model');
const tiemBanh = require('./tiembanh.service');
const emailService = require('./email.service');
const subscriptionService = require('./subscription.service');

function hasPreloadedAccountProduct(order) {
  return order.items.some((item) => {
    const product = item.productId?._id ? item.productId : null;
    return (
      product &&
      product.isPreloadedAccount &&
      product.preloadedAccounts &&
      product.preloadedAccounts.length > 0
    );
  });
}

function hasTiemBanhNetflixProduct(order) {
  return order.items.some((item) => {
    const product = item.productId?._id ? item.productId : null;
    return product && product.isTiemBanhNetflix;
  });
}

/** Mọi line đều là sản phẩm Netflix Tiệm Bánh */
function isNetflixOnlyOrder(order) {
  return (
    order.items.length > 0 &&
    order.items.every((item) => {
      const product = item.productId?._id ? item.productId : null;
      return product && product.isTiemBanhNetflix;
    })
  );
}

function ensureSlots(item, product) {
  if (!item.tiemBanhSlots) item.tiemBanhSlots = [];
  while (item.tiemBanhSlots.length < item.quantity) {
    item.tiemBanhSlots.push({ provisionStatus: 'pending' });
  }
  if (item.tiemBanhSlots.length > item.quantity) {
    item.tiemBanhSlots.splice(item.quantity);
  }
}

/** Đủ slot và mỗi slot Netflix đều ok */
function isNetflixOnlyOrderReady(order) {
  if (!isNetflixOnlyOrder(order) || order.paymentStatus !== 'paid') return false;
  for (const item of order.items) {
    const product = item.productId?._id ? item.productId : null;
    if (!product?.isTiemBanhNetflix) return false;
    if (!item.tiemBanhSlots || item.tiemBanhSlots.length < item.quantity) return false;
    for (let s = 0; s < item.quantity; s++) {
      if (item.tiemBanhSlots[s]?.provisionStatus !== 'ok') return false;
    }
  }
  return true;
}

/**
 * Gọi get-cookie cho từng slot Netflix; không đổi orderStatus (trừ save).
 * Idempotent: bỏ qua slot đã ok.
 */
async function provisionNetflixSlots(order) {
  await order.populate('items.productId');
  let dirty = false;

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const product = item.productId;
    if (!product || !product.isTiemBanhNetflix) continue;

    ensureSlots(item, product);

    for (let s = 0; s < item.quantity; s++) {
      const slot = item.tiemBanhSlots[s];
      if (slot.provisionStatus === 'ok') continue;

      try {
        const raw = await tiemBanh.getCookie();
        const mapped = tiemBanh.mapGetCookieSuccess(raw);
        if (!mapped) {
          slot.provisionStatus = 'failed';
          dirty = true;
          continue;
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
        dirty = true;
      } catch (e) {
        console.error('❌ Tiệm Bánh get-cookie:', e.message);
        slot.provisionStatus = 'failed';
        dirty = true;
      }
    }
  }

  if (dirty) await order.save();
}

function calculateSubscriptionEndDate(product, itemName, startDate) {
  const endDate = new Date(startDate);
  const nameMatch = itemName.match(/(\d+)\s*(năm|tháng|ngày|month|year|day|days)/i);
  if (nameMatch) {
    const duration = parseInt(nameMatch[1], 10);
    const unit = nameMatch[2].toLowerCase();
    if (unit === 'năm' || unit === 'year') endDate.setFullYear(endDate.getFullYear() + duration);
    else if (unit === 'tháng' || unit === 'month') endDate.setMonth(endDate.getMonth() + duration);
    else if (unit === 'ngày' || unit === 'day' || unit === 'days') endDate.setDate(endDate.getDate() + duration);
    return endDate;
  }
  if (product.billingCycle) {
    const billingMatch = product.billingCycle.match(/(\d+)\s*(năm|tháng|ngày|month|year|day|days)/i);
    if (billingMatch) {
      const duration = parseInt(billingMatch[1], 10);
      const unit = billingMatch[2].toLowerCase();
      if (unit === 'năm' || unit === 'year') endDate.setFullYear(endDate.getFullYear() + duration);
      else if (unit === 'tháng' || unit === 'month') endDate.setMonth(endDate.getMonth() + duration);
      else if (unit === 'ngày' || unit === 'day' || unit === 'days') endDate.setDate(endDate.getDate() + duration);
      return endDate;
    }
  }
  endDate.setFullYear(endDate.getFullYear() + 1);
  return endDate;
}

async function createSubscriptionsFromOrder(order) {
  if (!order.userId || typeof order.userId === 'string') {
    await order.populate('userId', 'email');
  }
  const customerEmail = (order.userId && order.userId.email) || order.customer.email;

  for (const item of order.items) {
    try {
      const pid = item.productId?._id || item.productId;
      const product = await Product.findById(pid);
      if (!product) continue;
      const startDate = order.completedAt || new Date();
      const endDate = calculateSubscriptionEndDate(product, item.name, startDate);
      await subscriptionService.save({
        customerEmail: customerEmail.toLowerCase(),
        serviceName: item.name,
        startDate,
        endDate,
        contactZalo: order.customer.phone || null,
        contactInstagram: null
      });
    } catch (subErr) {
      console.error(`❌ Subscription Netflix provision: ${subErr.message}`);
    }
  }
}

/**
 * Hoàn tất đơn chỉ-toàn-Netflix (confirmed → processing → completed, trừ kho, email).
 */
async function completeNetflixOnlyOrder(order) {
  order.orderStatus = 'confirmed';
  order.confirmedAt = new Date();
  await order.save();

  order.orderStatus = 'processing';
  order.processingAt = new Date();
  await order.save();

  await order.populate('items.productId');
  const productIds = order.items.map((item) => item.productId?._id || item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const instructionsSet = new Set();
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const pid = item.productId?._id?.toString() || item.productId?.toString();
    const product = productMap.get(pid);
    if (product?.completionInstructions?.trim()) {
      instructionsSet.add(product.completionInstructions.trim());
    }
    if (!product) continue;
    if (product.isTiemBanhNetflix) {
      if (product.stock >= item.quantity) {
        product.stock -= item.quantity;
        await product.save();
      }
    }
  }

  const completionInstructions = Array.from(instructionsSet).join('\n\n');
  order.orderStatus = 'completed';
  order.completedAt = new Date();
  await order.save();

  try {
    await emailService.sendOrderCompletedEmailToUser(order, completionInstructions);
  } catch (emailErr) {
    console.error('⚠️ Netflix-only complete email:', emailErr.message);
  }

  if (order.paymentStatus === 'paid') {
    await createSubscriptionsFromOrder(order);
  }
}

module.exports = {
  provisionNetflixSlots,
  completeNetflixOnlyOrder,
  hasTiemBanhNetflixProduct,
  hasPreloadedAccountProduct,
  isNetflixOnlyOrder,
  isNetflixOnlyOrderReady,
  ensureSlots
};
