import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, ExternalLink, Calendar, Package, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProductSales = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProductSalesSummary();
    }, []);

    const fetchProductSalesSummary = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/api/billing/product-sales/summary');
            setProducts(response.data.data);
        } catch (err) {
            console.error('Failed to fetch product sales summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductHistory = async (stockId) => {
        setHistoryLoading(true);
        try {
            const response = await axios.get(`http://localhost:5001/api/billing/product-history/${stockId}`);
            setHistory(response.data.data);
            setSelectedProduct(products.find(p => p._id === stockId));
        } catch (err) {
            console.error('Failed to fetch product history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!history.length) return;

        const headers = ['Date', 'Invoice', 'Customer Name', 'Phone', 'Quantity (Cartons)', 'Rate', 'Total'];
        const csvRows = [
            headers.join(','),
            ...history.map(row => [
                new Date(row.date).toLocaleDateString(),
                row.invoiceNumber,
                `"${row.customerName}"`,
                row.customerPhone,
                row.quantity,
                row.rate,
                row.total
            ].join(','))
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedProduct.name}_sales_history.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="product-sales">
            <div className="page-header">
                <h1>Product Sales History</h1>
                <p>Monitor which products are being sold to which customers</p>
            </div>

            {selectedProduct ? (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>
                            ← Back to Products
                        </button>
                    </div>

                    <div className="card stats-card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div className="stats-icon" style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9' }}>
                                <Package size={24} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0 }}>{selectedProduct.name}</h2>
                                <p style={{ margin: 0, color: '#666' }}>{selectedProduct.category}</p>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={exportToCSV} disabled={history.length === 0}>
                            <Download size={18} />
                            Export History (CSV)
                        </button>
                    </div>

                    <div className="card">
                        <h3>Customer Sales Breakdown</h3>
                        {historyLoading ? (
                            <p style={{ textAlign: 'center', padding: '2rem' }}>Loading sales history...</p>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Invoice</th>
                                            <th>Customer Name</th>
                                            <th>Phone</th>
                                            <th style={{ textAlign: 'right' }}>Quantity</th>
                                            <th style={{ textAlign: 'right' }}>Rate</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((row, index) => (
                                            <tr key={index}>
                                                <td>{new Date(row.date).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 600 }}>{row.invoiceNumber}</td>
                                                <td>{row.customerName}</td>
                                                <td>{row.customerPhone}</td>
                                                <td style={{ textAlign: 'right' }}>{row.quantity} Cartons</td>
                                                <td style={{ textAlign: 'right' }}>₹{row.rate.toFixed(2)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{row.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {history.length === 0 && (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center' }}>No sales history found for this product</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder="Search products by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Category</th>
                                        <th style={{ textAlign: 'right' }}>Total Sold</th>
                                        <th style={{ textAlign: 'right' }}>Total Revenue</th>
                                        <th>Last Sold</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading products...</td></tr>
                                    ) : (
                                        filteredProducts.map((p) => (
                                            <tr key={p._id} style={{ cursor: 'pointer' }} onClick={() => fetchProductHistory(p._id)}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td>{p.category}</td>
                                                <td style={{ textAlign: 'right' }}>{p.totalCartonsSold} Cartons</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                                                    ₹{p.totalRevenue.toFixed(2)}
                                                </td>
                                                <td>{new Date(p.lastSoldDate).toLocaleDateString()}</td>
                                                <td>
                                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                                        <ExternalLink size={14} style={{ marginRight: '0.25rem' }} />
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {!loading && filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center' }}>No sold products found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductSales;
