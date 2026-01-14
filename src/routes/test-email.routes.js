const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');

/**
 * Test email endpoint
 * POST /api/test-email
 */
router.post('/test-email', async (req, res) => {
    try {
        console.log('🧪 Testing email...');

        // Create a test order object
        const testOrder = {
            _id: '507f1f77bcf86cd799439011',
            orderCode: 123456,
            customer: {
                name: 'Test User',
                email: req.body.email || 'trankimthang0207@gmail.com',
                phone: '0123456789'
            },
            items: [{
                productId: '507f1f77bcf86cd799439011',
                name: 'Test Product',
                price: 100000,
                quantity: 1,
                currency: 'VND'
            }],
            totalAmount: 100000,
            orderStatus: 'pending',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Test sending to user
        try {
            await emailService.sendOrderCreatedEmailToUser(testOrder);
            console.log('✅ Test email sent to user');
        } catch (err) {
            console.error('❌ Failed to send test email to user:', err);
        }

        // Test sending to admin
        try {
            await emailService.sendOrderCreatedEmailToAdmin(testOrder);
            console.log('✅ Test email sent to admin');
        } catch (err) {
            console.error('❌ Failed to send test email to admin:', err);
        }

        res.json({
            success: true,
            message: 'Test emails sent. Check console logs and inbox.',
            testOrder
        });
    } catch (err) {
        console.error('❌ Test email error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;
