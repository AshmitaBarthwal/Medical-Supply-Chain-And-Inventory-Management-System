const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/checkRole');

// @route   GET /api/stock
// @desc    Get all stock items
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { category, status, search } = req.query;
        let query = {};

        if (category) query.category = category;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { manufacturer: { $regex: search, $options: 'i' } },
                { batchNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const stocks = await Stock.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: stocks.length,
            data: stocks
        });
    } catch (error) {
        console.error('Get stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/stock/:id
// @desc    Get single stock item
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const stock = await Stock.findById(req.params.id);

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock item not found'
            });
        }

        res.json({
            success: true,
            data: stock
        });
    } catch (error) {
        console.error('Get stock item error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/stock
// @desc    Add new stock item
// @access  Private (Admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        const stock = new Stock(req.body);
        await stock.save();

        res.status(201).json({
            success: true,
            message: 'Stock item added successfully',
            data: stock
        });
    } catch (error) {
        console.error('Add stock error detail:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: messages
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
});

// @route   PUT /api/stock/:id
// @desc    Update stock item
// @access  Private (Admin only)
router.put('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const stock = await Stock.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock item not found'
            });
        }

        res.json({
            success: true,
            message: 'Stock item updated successfully',
            data: stock
        });
    } catch (error) {
        console.error('Update stock error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: 'Validation Error',
                errors: messages
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/stock/:id
// @desc    Delete stock item
// @access  Private (Admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
    try {
        const stock = await Stock.findByIdAndDelete(req.params.id);

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: 'Stock item not found'
            });
        }

        res.json({
            success: true,
            message: 'Stock item deleted successfully'
        });
    } catch (error) {
        console.error('Delete stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/stock/stats/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats/dashboard', auth, async (req, res) => {
    try {
        const totalItems = await Stock.countDocuments();
        const lowStock = await Stock.countDocuments({ status: 'Low Stock' });
        const outOfStock = await Stock.countDocuments({ status: 'Out of Stock' });
        const expired = await Stock.countDocuments({ status: 'Expired' });

        // Calculate total inventory value
        const stocks = await Stock.find({ status: { $ne: 'Expired' } });
        const totalValue = stocks.reduce((sum, item) => sum + (item.quantityInCartons * (item.packCostPrice * item.packsPerCarton)), 0);

        res.json({
            success: true,
            data: {
                totalItems,
                lowStock,
                outOfStock,
                expired,
                totalValue
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;
