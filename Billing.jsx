import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Billing = () => {
    const { canEdit } = useAuth();
    const [stocks, setStocks] = useState([]);
    const [cart, setCart] = useState([]);
    const [customerInfo, setCustomerInfo] = useState({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        paymentMethod: 'Cash',
        discount: 0
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/stock');
            const availableStocks = response.data.data.filter(s => s.quantityInCartons > 0 && s.status !== 'Expired');
            setStocks(availableStocks);
        } catch (error) {
            console.error('Error fetching stocks:', error);
        }
    };

    const addToCart = (stock) => {
        const existingItem = cart.find(item => item.stockId === stock._id);

        if (existingItem) {
            if (existingItem.cartonsOrdered < stock.quantityInCartons) {
                setCart(cart.map(item =>
                    item.stockId === stock._id
                        ? { ...item, cartonsOrdered: item.cartonsOrdered + 1 }
                        : item
                ));
            } else {
                alert('Not enough stock available');
            }
        } else {
            setCart([...cart, {
                stockId: stock._id,
                name: stock.name,
                packaging: `${stock.unitsPerPack}×${stock.packsPerCarton}`,
                cartonsOrdered: 1,
                packsPerCarton: stock.packsPerCarton,
                packPrice: stock.packSellingPrice,
                maxCartons: stock.quantityInCartons
            }]);
        }
    };

    const updateQuantity = (stockId, newQuantity) => {
        const item = cart.find(i => i.stockId === stockId);

        if (newQuantity <= 0) {
            removeFromCart(stockId);
        } else if (newQuantity <= item.maxCartons) {
            setCart(cart.map(item =>
                item.stockId === stockId
                    ? { ...item, cartonsOrdered: newQuantity }
                    : item
            ));
        } else {
            alert('Not enough stock available');
        }
    };

    const removeFromCart = (stockId) => {
        setCart(cart.filter(item => item.stockId !== stockId));
    };

    const calculateSubtotal = () => {
        return cart.reduce((sum, item) => {
            // packPrice × packsPerCarton × cartonsOrdered
            return sum + (item.packPrice * item.packsPerCarton * item.cartonsOrdered);
        }, 0);
    };

    const calculateGST = () => {
        return calculateSubtotal() * 0.18; // 18% GST
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateGST() - (customerInfo.discount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            alert('Please add items to cart');
            return;
        }

        if (!/^\d{10}$/.test(customerInfo.customerPhone)) {
            setMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const billData = {
                ...customerInfo,
                discount: Number(customerInfo.discount) || 0,
                items: cart.map(item => ({
                    stockId: item.stockId,
                    cartonsOrdered: Number(item.cartonsOrdered)
                }))
            };

            await axios.post('http://localhost:5001/api/billing', billData);
            setMessage({ type: 'success', text: 'Bill created successfully!' });

            // Reset form
            setCart([]);
            setCustomerInfo({
                customerName: '',
                customerPhone: '',
                customerAddress: '',
                paymentMethod: 'Cash',
                discount: 0,
                amountPaid: ''
            });

            fetchStocks(); // Refresh stock list
        } catch (error) {
            console.error('Error creating bill:', error);
            const serverMessage = error.response?.data?.errors
                ? error.response.data.errors.join(', ')
                : (error.response?.data?.message || 'Failed to create bill');

            setMessage({
                type: 'error',
                text: serverMessage
            });
            fetchStocks(); // Refresh stock list even on failure to stay in sync
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Billing</h1>
                <p>Create new invoice and manage sales {!canEdit() && <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>Read-Only</span>}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Available Products</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Packaging</th>
                                    <th>Available</th>
                                    <th>Pack Price</th>
                                    <th>Carton Price</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stocks.map(stock => (
                                    <tr key={stock._id}>
                                        <td style={{ fontWeight: 500 }}>{stock.name}</td>
                                        <td>
                                            <span className="badge badge-info">
                                                {stock.unitsPerPack}×{stock.packsPerCarton}
                                            </span>
                                        </td>
                                        <td>{stock.quantityInCartons} cartons</td>
                                        <td>₹{stock.packSellingPrice}</td>
                                        <td>₹{stock.cartonSellingPrice || (stock.packSellingPrice * stock.packsPerCarton)}</td>
                                        <td>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                                onClick={() => addToCart(stock)}
                                                disabled={!canEdit()}
                                            >
                                                <Plus size={14} />
                                                Add
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Cart</h3>
                        {cart.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                Cart is empty
                            </p>
                        ) : (
                            <div>
                                {cart.map(item => {
                                    const itemTotal = item.packPrice * item.packsPerCarton * item.cartonsOrdered;
                                    return (
                                        <div key={item.stockId} style={{
                                            padding: '0.75rem',
                                            borderBottom: '1px solid var(--border-color)',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                        Packaging: {item.packaging}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.stockId)}
                                                    style={{ padding: '0.25rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-color)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                ₹{item.packPrice} × {item.packsPerCarton} packs × {item.cartonsOrdered} cartons = ₹{itemTotal.toFixed(2)}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cartons:</span>
                                                <button
                                                    onClick={() => updateQuantity(item.stockId, item.cartonsOrdered - 1)}
                                                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', borderRadius: '0.25rem' }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{item.cartonsOrdered}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.stockId, item.cartonsOrdered + 1)}
                                                    style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', background: 'white', cursor: 'pointer', borderRadius: '0.25rem' }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                                                    ({item.packsPerCarton * item.cartonsOrdered} packs)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Subtotal:</span>
                                        <span>₹{calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>GST (18%):</span>
                                        <span>₹{calculateGST().toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Discount:</span>
                                        <span>-₹{(customerInfo.discount || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.125rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                                        <span>Total:</span>
                                        <span style={{ color: 'var(--primary-color)' }}>₹{calculateTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Customer Details</h3>
                        {!canEdit() && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: '#fef3c7',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                fontSize: '0.875rem',
                                color: '#92400e',
                                textAlign: 'center'
                            }}>
                                ⚠️ You have read-only access. Only admins can create bills.
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Customer Name *</label>
                                <input
                                    type="text"
                                    value={customerInfo.customerName}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customerName: e.target.value })}
                                    required
                                    disabled={!canEdit()}
                                />
                            </div>

                            <div className="input-group">
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    value={customerInfo.customerPhone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 10) {
                                            setCustomerInfo({ ...customerInfo, customerPhone: val });
                                        }
                                    }}
                                    maxLength={10}
                                    placeholder="10-digit mobile number"
                                    required
                                    disabled={!canEdit()}
                                />
                            </div>

                            <div className="input-group">
                                <label>Address</label>
                                <textarea
                                    value={customerInfo.customerAddress}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, customerAddress: e.target.value })}
                                    rows="2"
                                    disabled={!canEdit()}
                                />
                            </div>

                            <div className="input-group">
                                <label>Payment Method *</label>
                                <select
                                    value={customerInfo.paymentMethod}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, paymentMethod: e.target.value })}
                                    required
                                    disabled={!canEdit()}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Net Banking">Net Banking</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Discount (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customerInfo.discount}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, discount: parseFloat(e.target.value) || 0 })}
                                    disabled={!canEdit()}
                                />
                            </div>

                            <div className="input-group">
                                <label>Amount Paid (₹)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customerInfo.amountPaid || ''}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, amountPaid: e.target.value })}
                                    placeholder="Leave empty for pending"
                                    disabled={!canEdit()}
                                />
                            </div>

                            {message.text && (
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                                    color: message.type === 'success' ? '#065f46' : '#991b1b',
                                    textAlign: 'center',
                                    fontSize: '0.875rem'
                                }}>
                                    {message.text}
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !canEdit()}>
                                <ShoppingCart size={18} />
                                {loading ? 'Processing...' : 'Create Bill'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Billing;
