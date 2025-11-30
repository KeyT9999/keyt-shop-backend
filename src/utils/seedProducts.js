const Product = require('../models/product.model');
const defaultProducts = require('../data/defaultProducts');

async function seedProducts() {
  if (!defaultProducts.length) return;

  for (const product of defaultProducts) {
    await Product.findOneAndUpdate(
      { name: product.name },
      { $set: product },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`✅ Seeded/updated ${defaultProducts.length} default products`);
}

module.exports = seedProducts;

