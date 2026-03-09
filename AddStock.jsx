import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';

const AddStock = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        category: 'Medicine',
        manufacturer: '',
        batchNumber: '',
        unitsPerPack: '1',
        packsPerCarton: '1',
        quantityInCartons: '',
        packCostPrice: '',
        packSellingPrice: '',
        expiryDate: '',
        manufacturingDate: '',
        reorderLevel: '2',
        location: 'Main Storage'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Ensure numeric fields are sent as numbers
            const dataToSend = {
                ...formData,
                unitsPerPack: Number(formData.unitsPerPack),
                packsPerCarton: Number(formData.packsPerCarton),
                quantityInCartons: Number(formData.quantityInCartons),
                packCostPrice: Number(formData.packCostPrice),
                packSellingPrice: Number(formData.packSellingPrice),
                reorderLevel: Number(formData.reorderLevel)
            };

            await axios.post('http://localhost:5001/api/stock', dataToSend);
            setMessage({ type: 'success', text: 'Stock item added successfully!' });

            // Reset form
            setFormData({
                name: '',
                category: 'Medicine',
                manufacturer: '',
                batchNumber: '',
                unitsPerPack: '1',
                packsPerCarton: '1',
                quantityInCartons: '',
                packCostPrice: '',
                packSellingPrice: '',
                expiryDate: '',
                manufacturingDate: '',
                reorderLevel: '2',
                location: 'Main Storage'
            });

            setTimeout(() => {
                navigate('/stock');
            }, 1500);
        } catch (error) {
            console.error('Error adding stock:', error);
            const serverMessage = error.response?.data?.errors
                ? error.response.data.errors.join(', ')
                : (error.response?.data?.message || 'Failed to add stock item. Please try again.');

            setMessage({
                type: 'error',
                text: serverMessage
            });
        } finally {
            setLoading(false);
        }
    };

    // Calculate totals for display
    const totalPacks = (formData.packsPerCarton || 0) * (formData.quantityInCartons || 0);
    const totalUnits = (formData.unitsPerPack || 0) * (formData.packsPerCarton || 0) * (formData.quantityInCartons || 0);
    const cartonCostPrice = (formData.packCostPrice || 0) * (formData.packsPerCarton || 0);
    const cartonSellingPrice = (formData.packSellingPrice || 0) * (formData.packsPerCarton || 0);

    return (
        <div>
            <div className="page-header">
                <h1>Add New Stock</h1>
                <p>Add a new item to your inventory with packaging details</p>
            </div>

            <div className="card" style={{ maxWidth: '900px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        <div className="input-group">
                            <label>Product Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="e.g., Paracetamol Tablets"
                            />
                        </div>

                        <div className="input-group">
                            <label>Category *</label>
                            <select name="category" value={formData.category} onChange={handleChange} required>
                                <option value="Medicine">Medicine</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Consumables">Consumables</option>
                                <option value="Surgical">Surgical</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Manufacturer *</label>
                            <input
                                type="text"
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                required
                                placeholder="Enter manufacturer name"
                            />
                        </div>

                        <div className="input-group">
                            <label>Batch Number *</label>
                            <input
                                type="text"
                                name="batchNumber"
                                value={formData.batchNumber}
                                onChange={handleChange}
                                required
                                placeholder="Enter batch number"
                            />
                        </div>
                    </div>

                    {/* Packaging Section */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1e40af' }}>📦 Packaging Details</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Units per Pack *</label>
                                <input
                                    type="number"
                                    name="unitsPerPack"
                                    value={formData.unitsPerPack}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    placeholder="e.g., 12 tablets"
                                />
                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>e.g., 12 tablets per pack</small>
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Packs per Carton *</label>
                                <input
                                    type="number"
                                    name="packsPerCarton"
                                    value={formData.packsPerCarton}
                                    onChange={handleChange}
                                    required
                                    min="1"
                                    placeholder="e.g., 20 packs"
                                />
                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>e.g., 20 packs per carton</small>
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Quantity (Cartons) *</label>
                                <input
                                    type="number"
                                    name="quantityInCartons"
                                    value={formData.quantityInCartons}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    placeholder="Number of cartons"
                                />
                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>Stock in cartons</small>
                            </div>
                        </div>

                        {/* Calculated Totals */}
                        {formData.unitsPerPack && formData.packsPerCarton && formData.quantityInCartons && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span>Packaging:</span>
                                    <strong>{formData.unitsPerPack}×{formData.packsPerCarton}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span>Total Packs:</span>
                                    <strong>{totalPacks}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Units:</span>
                                    <strong>{totalUnits}</strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pricing Section */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#15803d' }}>💰 Pricing (Per Pack)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Pack Cost Price *</label>
                                <input
                                    type="number"
                                    name="packCostPrice"
                                    value={formData.packCostPrice}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="Cost per pack"
                                />
                            </div>

                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label>Pack Selling Price *</label>
                                <input
                                    type="number"
                                    name="packSellingPrice"
                                    value={formData.packSellingPrice}
                                    onChange={handleChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    placeholder="Selling price per pack"
                                />
                            </div>
                        </div>

                        {/* Carton Prices */}
                        {formData.packCostPrice && formData.packSellingPrice && formData.packsPerCarton && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'white', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span>Carton Cost Price:</span>
                                    <strong>₹{cartonCostPrice.toFixed(2)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Carton Selling Price:</span>
                                    <strong>₹{cartonSellingPrice.toFixed(2)}</strong>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Other Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="input-group">
                            <label>Manufacturing Date *</label>
                            <input
                                type="date"
                                name="manufacturingDate"
                                value={formData.manufacturingDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Expiry Date *</label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={formData.expiryDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Reorder Level (Cartons)</label>
                            <input
                                type="number"
                                name="reorderLevel"
                                value={formData.reorderLevel}
                                onChange={handleChange}
                                min="0"
                                placeholder="Reorder when below"
                            />
                        </div>

                        <div className="input-group">
                            <label>Storage Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Enter storage location"
                            />
                        </div>
                    </div>

                    {message.text && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            marginTop: '1rem',
                            backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                            color: message.type === 'success' ? '#065f46' : '#991b1b',
                            textAlign: 'center'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Package size={18} />
                            {loading ? 'Adding...' : 'Add Stock'}
                        </button>
                        <button
                            type="button"
                            className="btn"
                            style={{ backgroundColor: 'var(--text-secondary)', color: 'white' }}
                            onClick={() => navigate('/stock')}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStock;
