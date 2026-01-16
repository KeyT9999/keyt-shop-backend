const Product = require('../models/product.model');
const defaultProducts = require('../data/defaultProducts');

async function seedProducts() {
  // Only seed if explicitly enabled via environment variable
  // Set SEED_PRODUCTS=true in .env to enable auto-seeding
  if (process.env.SEED_PRODUCTS !== 'true') {
    console.log('ℹ️ Auto-seeding products is disabled. Set SEED_PRODUCTS=true to enable.');
    return;
  }

  if (!defaultProducts.length) return;

  // Check if any default products already exist
  const existingProducts = await Product.find({
    name: { $in: defaultProducts.map(p => p.name) }
  });

  // Only seed products that don't exist
  const existingNames = new Set(existingProducts.map(p => p.name));
  const productsToSeed = defaultProducts.filter(p => !existingNames.has(p.name));

  if (productsToSeed.length === 0) {
    console.log('ℹ️ All default products already exist. Skipping seed.');
    return;
  }

  for (const product of productsToSeed) {
    await Product.create(product);
  }

  console.log(`✅ Seeded ${productsToSeed.length} new default products (${defaultProducts.length - productsToSeed.length} already existed)`);
}

module.exports = seedProducts;

