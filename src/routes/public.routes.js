const express = require('express');
const router = express.Router();
const { RECAPTCHA_SITE_KEY } = process.env;

// Public config endpoint
router.get('/config', (req, res) => {
  res.json({ recaptchaSiteKey: RECAPTCHA_SITE_KEY });
});

module.exports = router;
