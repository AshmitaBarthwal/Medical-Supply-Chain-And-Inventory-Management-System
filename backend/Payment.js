const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    customerPhone: {
        type: String,
        required: true,
        index: true
    },
    customerName: {
        type: String,
        required: true
    },
    amountPaid: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Net Banking'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Billing',
        required: false // Can be a general payment or against a specific bill
    },
    previousBalance: {
        type: Number,
        required: true
    },
    newBalance: {
        type: Number,
        required: true
    },
    note: {
        type: String
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
