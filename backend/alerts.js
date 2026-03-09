const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const auth = require('../middleware/auth');
const { sendAlertEmail } = require('../utils/emailService');

// @route   GET /api/alerts
// @desc    Get all alerts (low stock, expiring soon, expired)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Low stock items
        const lowStock = await Stock.find({
            status: 'Low Stock',
            quantityInCartons: { $gt: 0 }
        }).sort({ quantityInCartons: 1 });

        // Out of stock items
        const outOfStock = await Stock.find({
            status: 'Out of Stock'
        });

        // Expired items
        const expired = await Stock.find({
            status: 'Expired'
        });

        // Expiring soon (within 30 days)
        const expiringSoon = await Stock.find({
            expiryDate: {
                $gte: now,
                $lte: thirtyDaysFromNow
            },
            status: { $ne: 'Expired' }
        }).sort({ expiryDate: 1 });

        res.json({
            success: true,
            data: {
                lowStock,
                outOfStock,
                expired,
                expiringSoon,
                summary: {
                    lowStockCount: lowStock.length,
                    outOfStockCount: outOfStock.length,
                    expiredCount: expired.length,
                    expiringSoonCount: expiringSoon.length,
                    totalAlerts: lowStock.length + outOfStock.length + expired.length + expiringSoon.length
                }
            }
        });
    } catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/alerts/critical
// @desc    Get critical alerts only
// @access  Private
router.get('/critical', auth, async (req, res) => {
    try {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const criticalAlerts = await Stock.find({
            $or: [
                { status: 'Out of Stock' },
                { status: 'Expired' },
                {
                    expiryDate: {
                        $gte: now,
                        $lte: sevenDaysFromNow
                    },
                    status: { $ne: 'Expired' }
                }
            ]
        }).sort({ expiryDate: 1 });

        res.json({
            success: true,
            count: criticalAlerts.length,
            data: criticalAlerts
        });
    } catch (error) {
        console.error('Get critical alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/alerts/send-email
// @desc    Send alert email to specified address
// @access  Private
router.post('/send-email', auth, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address format'
            });
        }

        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            return res.status(500).json({
                success: false,
                message: 'Email service not configured. Please contact administrator.'
            });
        }

        // Fetch all alerts
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const lowStock = await Stock.find({
            status: 'Low Stock',
            quantityInCartons: { $gt: 0 }
        }).sort({ quantityInCartons: 1 });

        const outOfStock = await Stock.find({
            status: 'Out of Stock'
        });

        const expired = await Stock.find({
            status: 'Expired'
        });

        const expiringSoon = await Stock.find({
            expiryDate: {
                $gte: now,
                $lte: thirtyDaysFromNow
            },
            status: { $ne: 'Expired' }
        }).sort({ expiryDate: 1 });

        const alertData = {
            lowStock,
            outOfStock,
            expired,
            expiringSoon,
            summary: {
                lowStockCount: lowStock.length,
                outOfStockCount: outOfStock.length,
                expiredCount: expired.length,
                expiringSoonCount: expiringSoon.length,
                totalAlerts: lowStock.length + outOfStock.length + expired.length + expiringSoon.length
            }
        };

        // Check if there are any alerts to send
        if (alertData.summary.totalAlerts === 0) {
            return res.status(200).json({
                success: true,
                message: 'No alerts to send at this time'
            });
        }

        // Send email
        const result = await sendAlertEmail(email, alertData);

        if (result.success) {
            res.json({
                success: true,
                message: `Alert email sent successfully to ${email}`,
                alertCount: alertData.summary.totalAlerts
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send email: ' + result.error
            });
        }
    } catch (error) {
        console.error('Send alert email error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while sending email'
        });
    }
});

module.exports = router;
