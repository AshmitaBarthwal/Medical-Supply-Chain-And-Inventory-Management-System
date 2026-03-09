const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Stock = require('../models/Stock');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/checkRole');

// @route   GET /api/billing
// @desc    Get all bills
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { startDate, endDate, paymentStatus } = req.query;
        let query = {};

        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const bills = await Billing.find(query)
            .populate('items.stockId', 'name')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: bills.length,
            data: bills
        });
    } catch (error) {
        console.error('Get bills error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/billing/:id
// @desc    Get single bill
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const bill = await Billing.findById(req.params.id)
            .populate('items.stockId', 'name')
            .populate('createdBy', 'name email');

        if (!bill) {
            return res.status(404).json({
                success: false,
                message: 'Bill not found'
            });
        }

        res.json({
            success: true,
            data: bill
        });
    } catch (error) {
        console.error('Get bill error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/billing
// @desc    Create new bill
// @access  Private (Admin only)
router.post('/', auth, requireAdmin, async (req, res) => {
    try {
        console.log('Creating bill with data:', JSON.stringify(req.body, null, 2));
        const { customerName, customerPhone, customerAddress, items, paymentMethod, discount } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No items provided for billing'
            });
        }

        // 1. First pass: Validate all stock availability without saving
        const stockUpdates = [];
        let subtotal = 0;
        const processedItems = [];

        for (const item of items) {
            const stock = await Stock.findById(item.stockId);

            if (!stock) {
                console.error(`Stock item not found: ${item.stockId}`);
                return res.status(404).json({
                    success: false,
                    message: `Stock item not found: ${item.stockId}`
                });
            }

            if (stock.quantityInCartons < item.cartonsOrdered) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${stock.name}. Available: ${stock.quantityInCartons} cartons`
                });
            }

            const itemTotal = Math.round((stock.packSellingPrice * stock.packsPerCarton * item.cartonsOrdered) * 100) / 100;
            subtotal += itemTotal;

            processedItems.push({
                stockId: stock._id,
                name: stock.name,
                packaging: `${stock.unitsPerPack}×${stock.packsPerCarton}`,
                cartonsOrdered: item.cartonsOrdered,
                packsPerCarton: stock.packsPerCarton,
                packPrice: stock.packSellingPrice,
                total: itemTotal
            });

            // Prepare the update
            stockUpdates.push({
                stock, // Mongoose document
                deduction: item.cartonsOrdered
            });
        }

        // Calculate GST (18%) and total
        const gst = Math.round((subtotal * 0.18) * 100) / 100;
        const totalAmount = Math.round((subtotal + gst - (Number(discount) || 0)) * 100) / 100;

        // 2. Second pass: Create and save the bill
        // If this fails (e.g. validation), no stock has been touched yet
        const bill = new Billing({
            customerName,
            customerPhone,
            customerAddress,
            items: processedItems,
            subtotal,
            gst,
            discount: Number(discount) || 0,
            totalAmount,
            paidAmount: Number(req.body.amountPaid) || 0,
            paymentMethod,
            createdBy: req.user._id
        });

        await bill.save();
        console.log('Bill created successfully:', bill.invoiceNumber);

        // Record initial payment if any
        if (Number(req.body.amountPaid) > 0) {
            const Payment = require('../models/Payment');
            const initialPayment = new Payment({
                customerPhone,
                customerName,
                amountPaid: Number(req.body.amountPaid),
                paymentMethod,
                billId: bill._id,
                note: `Initial payment for invoice ${bill.invoiceNumber}`,
                previousBalance: bill.totalAmount, // It was 0 before this bill
                newBalance: bill.totalAmount - Number(req.body.amountPaid),
                recordedBy: req.user._id
            });
            await initialPayment.save();
        }

        // 3. Third pass: Update all stock quantities
        for (const update of stockUpdates) {
            update.stock.quantityInCartons -= update.deduction;
            await update.stock.save();
            console.log(`Updated stock for ${update.stock.name}. New quantity: ${update.stock.quantityInCartons} cartons`);
        }

        res.status(201).json({
            success: true,
            message: 'Bill created successfully',
            data: bill
        });
    } catch (error) {
        console.error('Create bill error detail:', error);

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

// @route   GET /api/billing/stats/summary
// @desc    Get billing statistics
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayBills = await Billing.find({ createdAt: { $gte: today } });
        const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

        const allBills = await Billing.find();
        const totalRevenue = allBills.reduce((sum, bill) => sum + bill.totalAmount, 0);

        res.json({
            success: true,
            data: {
                todayBills: todayBills.length,
                todayRevenue,
                totalBills: allBills.length,
                totalRevenue
            }
        });
    } catch (error) {
        console.error('Get billing stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/billing/product-sales/summary
// @desc    Get summary of sales for all products
// @access  Private
router.get('/product-sales/summary', auth, async (req, res) => {
    try {
        const summary = await Billing.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.stockId",
                    totalCartonsSold: { $sum: "$items.cartonsOrdered" },
                    totalRevenue: { $sum: "$items.total" },
                    lastSoldDate: { $max: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "stocks",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 1,
                    name: "$productInfo.name",
                    category: "$productInfo.category",
                    totalCartonsSold: 1,
                    totalRevenue: 1,
                    lastSoldDate: 1
                }
            },
            { $sort: { totalCartonsSold: -1 } }
        ]);

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Product sales summary error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/billing/product-history/:stockId
// @desc    Get detailed sales history for a specific product
// @access  Private
router.get('/product-history/:stockId', auth, async (req, res) => {
    try {
        const history = await Billing.find({ "items.stockId": req.params.stockId })
            .select('customerName customerPhone createdAt items invoiceNumber')
            .sort({ createdAt: -1 });

        const formattedHistory = history.map(bill => {
            const item = bill.items.find(i => i.stockId.toString() === req.params.stockId);
            return {
                invoiceNumber: bill.invoiceNumber,
                customerName: bill.customerName,
                customerPhone: bill.customerPhone,
                date: bill.createdAt,
                quantity: item.cartonsOrdered,
                rate: item.packPrice,
                total: item.total
            };
        });

        res.json({ success: true, data: formattedHistory });
    } catch (error) {
        console.error('Product history error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
