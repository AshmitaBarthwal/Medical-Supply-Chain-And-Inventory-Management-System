const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// @route   POST /api/payments
// @desc    Record a new payment
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { customerPhone, customerName, amountPaid, paymentMethod, billId, note } = req.body;

        if (!customerPhone || !amountPaid) {
            return res.status(400).json({ success: false, message: 'Phone and amount are required' });
        }

        // 1. Calculate current balance for this customer
        const bills = await Billing.find({ customerPhone });
        const payments = await Payment.find({ customerPhone });

        const totalBilled = Math.round(bills.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100;
        const totalPaidPreviously = Math.round(payments.reduce((sum, p) => sum + p.amountPaid, 0) * 100) / 100;
        const previousBalance = Math.round((totalBilled - totalPaidPreviously) * 100) / 100;

        const newBalance = Math.round((previousBalance - amountPaid) * 100) / 100;

        // 2. Create payment record
        const payment = new Payment({
            customerPhone,
            customerName,
            amountPaid,
            paymentMethod,
            billId,
            note,
            previousBalance,
            newBalance,
            recordedBy: req.user._id
        });

        await payment.save();

        // 3. Update specific bill if billId provided
        if (billId) {
            const bill = await Billing.findById(billId);
            if (bill) {
                bill.paidAmount += Number(amountPaid);
                if (bill.paidAmount >= bill.totalAmount) {
                    bill.paymentStatus = 'Paid';
                } else if (bill.paidAmount > 0) {
                    bill.paymentStatus = 'Partial';
                }
                await bill.save();
            }
        }

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: payment
        });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/payments/customer/:phone
// @desc    Get ledger for a specific customer
// @access  Private
router.get('/customer/:phone', auth, async (req, res) => {
    try {
        const { phone } = req.params;

        // Get all bills
        const bills = await Billing.find({ customerPhone: phone }).sort({ createdAt: 1 });

        // Get all payments
        const payments = await Payment.find({ customerPhone: phone }).sort({ date: 1 });

        // Combine into a ledger
        const ledger = [
            ...bills.map(b => ({
                date: b.createdAt,
                type: 'Invoice',
                id: b._id,
                invoiceNumber: b.invoiceNumber,
                debit: b.totalAmount,
                credit: 0,
                description: `Invoice ${b.invoiceNumber}`
            })),
            ...payments.map(p => ({
                date: p.date,
                type: 'Payment',
                id: p._id,
                debit: 0,
                credit: p.amountPaid,
                description: `Payment via ${p.paymentMethod} ${p.note ? '- ' + p.note : ''}`
            }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running balance
        let runningBalance = 0;
        const ledgerWithBalance = ledger.map(item => {
            runningBalance = Math.round((runningBalance + (item.debit - item.credit)) * 100) / 100;
            return { ...item, balance: runningBalance };
        });

        res.json({
            success: true,
            data: {
                customerName: bills[0]?.customerName || payments[0]?.customerName || 'Unknown',
                currentBalance: Math.round(runningBalance * 100) / 100,
                history: ledgerWithBalance
            }
        });
    } catch (error) {
        console.error('Ledger error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/payments/customers
// @desc    Get all customers with their balances
// @access  Private
router.get('/customers', auth, async (req, res) => {
    try {
        // Find all unique customer phone numbers from Billing
        const customersData = await Billing.aggregate([
            {
                $group: {
                    _id: "$customerPhone",
                    customerName: { $first: "$customerName" },
                    totalBilled: { $sum: "$totalAmount" }
                }
            }
        ]);

        // For each customer, find their total payments
        const customersWithBalances = await Promise.all(customersData.map(async (c) => {
            const payments = await Payment.find({ customerPhone: c._id });
            const totalPaid = Math.round(payments.reduce((sum, p) => sum + p.amountPaid, 0) * 100) / 100;
            const balance = Math.round((c.totalBilled - totalPaid) * 100) / 100;
            return {
                phone: c._id,
                name: c.customerName,
                totalBilled: Math.round(c.totalBilled * 100) / 100,
                totalPaid: totalPaid,
                balance: balance
            };
        }));

        res.json({
            success: true,
            data: customersWithBalances
        });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
