const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const Billing = require('../models/Billing');
const auth = require('../middleware/auth');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

// @route   GET /api/predictions/sales-trend
// @desc    Get sales trend predictions
// @access  Private
router.get('/sales-trend', auth, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const bills = await Billing.find({
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        // Group by date
        const salesByDate = {};
        bills.forEach(bill => {
            const date = bill.createdAt.toISOString().split('T')[0];
            if (!salesByDate[date]) {
                salesByDate[date] = { count: 0, revenue: 0 };
            }
            salesByDate[date].count += 1;
            salesByDate[date].revenue += bill.totalAmount;
        });

        const trend = Object.keys(salesByDate).map(date => ({
            date,
            bills: salesByDate[date].count,
            revenue: salesByDate[date].revenue
        }));

        res.json({
            success: true,
            data: trend
        });
    } catch (error) {
        console.error('Get sales trend error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/predictions/top-selling
// @desc    Get top selling products
// @access  Private
router.get('/top-selling', auth, async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const bills = await Billing.find().populate('items.stockId');

        const productSales = {};
        bills.forEach(bill => {
            bill.items.forEach(item => {
                if (item.stockId) {
                    const productId = item.stockId._id.toString();
                    if (!productSales[productId]) {
                        productSales[productId] = {
                            name: item.name,
                            totalQuantity: 0,
                            totalRevenue: 0
                        };
                    }
                    productSales[productId].totalQuantity += item.quantity;
                    productSales[productId].totalRevenue += item.total;
                }
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: topProducts
        });
    } catch (error) {
        console.error('Get top selling error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/predictions/reorder-suggestions
// @desc    Get reorder suggestions based on sales velocity
// @access  Private
router.get('/reorder-suggestions', auth, async (req, res) => {
    try {
        // Get low stock items
        const lowStockItems = await Stock.find({
            $or: [
                { status: 'Low Stock' },
                { status: 'Out of Stock' }
            ]
        });

        // Calculate sales velocity for each item
        const suggestions = [];

        for (const item of lowStockItems) {
            const bills = await Billing.find({
                'items.stockId': item._id,
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            });

            let totalSold = 0;
            bills.forEach(bill => {
                const billItem = bill.items.find(i => i.stockId.toString() === item._id.toString());
                if (billItem) totalSold += billItem.quantity;
            });

            const avgDailySales = totalSold / 30;
            const suggestedReorderQty = Math.ceil(avgDailySales * 30); // 30 days supply

            if (suggestedReorderQty > 0) {
                suggestions.push({
                    item: {
                        id: item._id,
                        name: item.name,
                        currentStock: item.quantity,
                        status: item.status
                    },
                    analytics: {
                        totalSoldLast30Days: totalSold,
                        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
                        suggestedReorderQty
                    }
                });
            }
        }

        res.json({
            success: true,
            count: suggestions.length,
            data: suggestions
        });
    } catch (error) {
        console.error('Get reorder suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/predictions/lstm-demand
// @desc    Get LSTM-based demand prediction for a specific medicine or all medicines via FastAPI service
// @access  Private
router.post('/lstm-demand', auth, async (req, res) => {
    try {
        const { medicineName } = req.body;

        let medicineNames = [];
        if (medicineName) {
            medicineNames = [medicineName];
        } else {
            const allBills = await Billing.find({}, 'items.name');
            medicineNames = [...new Set(allBills.flatMap(bill => bill.items.map(i => i.name)))];
        }

        if (medicineNames.length === 0) {
            return res.status(400).json({ success: false, message: 'No medicine sales data found' });
        }

        const bills = await Billing.find({
            'items.name': { $in: medicineNames }
        }).sort({ createdAt: 1 });

        // Process each medicine and call FastAPI
        const results = await Promise.all(medicineNames.map(async (name) => {
            const history = bills.flatMap(bill =>
                bill.items
                    .filter(item => item.name === name)
                    .map(item => ({
                        date: bill.createdAt,
                        quantity: (item.cartonsOrdered || 0) * (item.packsPerCarton || 0)
                    }))
            );

            if (history.length === 0) return null;

            // Group by day for the last 30 days as requested by the user
            const dailyData = {};
            history.forEach(h => {
                const dateKey = new Date(h.date).toISOString().split('T')[0];
                dailyData[dateKey] = (dailyData[dateKey] || 0) + h.quantity;
            });

            // Get last 30 days sequence
            const sequence = [];
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const k = d.toISOString().split('T')[0];
                sequence.push(dailyData[k] || 0);
            }

            try {
                // Call FastAPI AI Service
                const aiResponse = await axios.post('http://localhost:8000/predict', { sequence });

                // Get month-wise labels for display (consistent with previous monthly UI)
                const lastDate = history[history.length - 1].date;
                const nextMonth = new Date(lastDate);
                nextMonth.setMonth(nextMonth.getMonth() + 1);

                return {
                    name,
                    thisMonth: {
                        label: new Date(lastDate).toLocaleString('default', { month: 'long', year: 'numeric' }),
                        value: history.reduce((sum, h) => sum + h.quantity, 0) // Total historical sum (or logic of choice)
                    },
                    nextMonth: {
                        label: nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
                        value: aiResponse.data.prediction
                    }
                };
            } catch (err) {
                console.error(`AI Service error for ${name}:`, err.message);
                return null;
            }
        }));

        const filteredResults = results.filter(r => r !== null);

        if (filteredResults.length === 0) {
            return res.status(400).json({ success: false, message: 'No predictions could be generated' });
        }

        res.json({
            success: true,
            results: filteredResults
        });

    } catch (error) {
        console.error('LSTM prediction error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
