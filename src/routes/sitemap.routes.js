const express = require('express');
const router = express.Router();
const Product = require('../models/product.model'); // Adjust the path if necessary

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ 
      status: { $in: ['active', 'in_stock', 'available'] } 
    }).select('slug _id updatedAt');

    const baseUrl = 'https://www.taphoakeyt.com';

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static Routes
    const staticPages = [
      { url: '/', priority: 1.0, changefreq: 'daily' },
      { url: '/products', priority: 0.9, changefreq: 'daily' },
      { url: '/purchase-guide', priority: 0.8, changefreq: 'monthly' },
      { url: '/faq', priority: 0.7, changefreq: 'monthly' },
      { url: '/warranty-refund', priority: 0.7, changefreq: 'monthly' },
      { url: '/privacy-policy', priority: 0.4, changefreq: 'yearly' },
      { url: '/terms-of-service', priority: 0.4, changefreq: 'yearly' },
      { url: '/photo-frame', priority: 0.6, changefreq: 'monthly' },
      { url: '/evidence', priority: 0.6, changefreq: 'monthly' },
    ];

    staticPages.forEach(page => {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += `  </url>\n`;
    });

    // Dynamic Product Routes
    products.forEach(product => {
      const productId = product.slug || product._id.toString(); // Fallback to ID if slug isn't there
      const lastModDate = product.updatedAt ? product.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${baseUrl}/products/${productId}</loc>\n`;
      sitemap += `    <lastmod>${lastModDate}</lastmod>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `  </url>\n`;
    });

    sitemap += `</urlset>\n`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;
