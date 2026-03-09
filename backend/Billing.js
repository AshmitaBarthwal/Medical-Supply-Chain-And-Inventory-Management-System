const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit mobile number!`
        }
    },
    customerAddress: {
        type: String
    },
    items: [{
        stockId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Stock',
            required: true
        },
        name: String,
        packaging: String,  // e.g., "12×20" (units per pack × packs per carton)
        cartonsOrdered: {
            type: Number,
            required: true,
            min: 1
        },
        packsPerCarton: {
            type: Number,
            required: true
        },
        packPrice: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true
        }
    }],
    subtotal: {
        type: Number,
        required: true
    },
    gst: {
        type: Number,
        default: 0  // 18% GST
    },
    discount: {
        type: Number,
        default: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'UPI', 'Net Banking'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Pending', 'Partial'],
        default: function () {
            if (this.paidAmount >= this.totalAmount) return 'Paid';
            if (this.paidAmount > 0) return 'Partial';
            return 'Pending';
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-generate invoice number
billingSchema.pre('validate', async function () {
    if (!this.invoiceNumber) {
        const count = await mongoose.model('Billing').countDocuments();
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        this.invoiceNumber = `INV${year}${month}${(count + 1).toString().padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('Billing', billingSchema);
