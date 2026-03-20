/**
 * One-off: set isTiemBanhNetflix = true for a product by MongoDB _id.
 * Usage: node scripts/set-product-netflix-flag.js <productObjectId>
 *
 * Requires MONGODB_URL or MONGODB_URI in .env (same as server).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Product = require('../src/models/product.model');

async function main() {
  const id = process.argv[2]?.trim();
  if (!id) {
    console.error('Usage: node scripts/set-product-netflix-flag.js <productObjectId>');
    process.exit(1);
  }
  if (!mongoose.isValidObjectId(id)) {
    console.error('Invalid ObjectId:', id);
    process.exit(1);
  }

  await connectDB();

  const product = await Product.findById(id);
  if (!product) {
    console.error('Product not found:', id);
    process.exit(1);
  }

  product.isTiemBanhNetflix = true;
  // Không mix với preloaded account cho cùng SKU Netflix Tiệm Bánh
  if (product.isPreloadedAccount) {
    product.isPreloadedAccount = false;
    product.preloadedAccounts = [];
    console.warn('Cleared isPreloadedAccount / preloadedAccounts for this product.');
  }
  await product.save();

  console.log('OK — isTiemBanhNetflix = true');
  console.log('  _id:', product._id.toString());
  console.log('  name:', product.name);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
