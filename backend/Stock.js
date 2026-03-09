const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Medicine', 'Equipment', 'Consumables', 'Surgical', 'Other']
    },
    manufacturer: {
        type: String,
        required: true
    },
    batchNumber: {
        type: String,
        required: true
    },
    // Packaging structure
    unitsPerPack: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    packsPerCarton: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    quantityInCartons: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    // Pricing per pack
    packCostPrice: {
        type: Number,
        required: true,
        min: 0
    },
    packSellingPrice: {
        type: Number,
        required: true,
        min: 0
    },
    expiryDate: {
        type: Date,
        required: true
    },
    manufacturingDate: {
        type: Date,
        required: true
    },
    reorderLevel: {
        type: Number,
        default: 2  // Reorder level in cartons
    },
    location: {
        type: String,
        default: 'Main Storage'
    },
    status: {
        type: String,
        enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'],
        default: 'In Stock'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual fields for calculations
stockSchema.virtual('totalPacks').get(function () {
    return this.packsPerCarton * this.quantityInCartons;
});

stockSchema.virtual('totalUnits').get(function () {
    return this.unitsPerPack * this.packsPerCarton * this.quantityInCartons;
});

stockSchema.virtual('cartonCostPrice').get(function () {
    return this.packCostPrice * this.packsPerCarton;
});

stockSchema.virtual('cartonSellingPrice').get(function () {
    return this.packSellingPrice * this.packsPerCarton;
});

// Ensure virtuals are included in JSON
stockSchema.set('toJSON', { virtuals: true });
stockSchema.set('toObject', { virtuals: true });

// Update status based on quantity and expiry
stockSchema.pre('save', async function () {
    const now = new Date();

    if (this.expiryDate < now) {
        this.status = 'Expired';
    } else if (this.quantityInCartons === 0) {
        this.status = 'Out of Stock';
    } else if (this.quantityInCartons <= this.reorderLevel) {
        this.status = 'Low Stock';
    } else {
        this.status = 'In Stock';
    }

    this.updatedAt = now;
});

module.exports = mongoose.model('Stock', stockSchema);
