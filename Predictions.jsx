import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Package, BarChart3, AlertTriangle, Search, Loader, Brain } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Predictions = () => {
    const [salesTrend, setSalesTrend] = useState([]);
    const [topSelling, setTopSelling] = useState([]);
    const [reorderSuggestions, setReorderSuggestions] = useState([]);
    const [outbreaks, setOutbreaks] = useState([]);
    const [loading, setLoading] = useState(true);

    // LSTM States
    const [medicineSearch, setMedicineSearch] = useState('');
    const [lstmPrediction, setLstmPrediction] = useState(null);
    const [lstmLoading, setLstmLoading] = useState(false);
    const [lstmError, setLstmError] = useState('');

    useEffect(() => {
        fetchPredictions();
        fetchLSTMPrediction();
    }, []);

    const fetchPredictions = async () => {
        try {
            const [salesRes, topSellingRes, reorderRes, outbreaksRes] = await Promise.all([
                axios.get('http://localhost:5001/api/predictions/sales-trend?days=30'),
                axios.get('http://localhost:5001/api/predictions/top-selling?limit=10'),
                axios.get('http://localhost:5001/api/predictions/reorder-suggestions'),
                axios.get('http://localhost:5001/api/news/outbreaks')
            ]);

            setSalesTrend(salesRes.data.data);
            setTopSelling(topSellingRes.data.data);
            setReorderSuggestions(reorderRes.data.data);
            setOutbreaks(outbreaksRes.data.data);
        } catch (error) {
            console.error('Error fetching predictions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLSTMPrediction = async () => {
        setLstmLoading(true);
        setLstmError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5001/api/predictions/lstm-demand',
                {}, // Pass empty object to fetch all
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setLstmPrediction(res.data.results);
            } else {
                setLstmError(res.data.error || 'Failed to get predictions');
            }
        } catch (error) {
            setLstmError(error.response?.data?.message || 'Error fetching automated predictions');
        } finally {
            setLstmLoading(false);
        }
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Analytics & Predictions</h1>
                <p>Sales trends and inventory insights</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <TrendingUp size={20} />
                    Sales Trend (Last 30 Days)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" orientation="left" stroke="#2563eb" />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="bills" fill="#2563eb" name="Bills Count" />
                        <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue (₹)" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={20} />
                        Top Selling Products
                    </h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Product</th>
                                    <th>Quantity Sold</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topSelling.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No sales data available
                                        </td>
                                    </tr>
                                ) : (
                                    topSelling.map((product, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 600 }}>#{index + 1}</td>
                                            <td style={{ fontWeight: 500 }}>{product.name}</td>
                                            <td>{product.totalQuantity}</td>
                                            <td>₹{product.totalRevenue.toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={20} />
                        Reorder Suggestions
                    </h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Current Stock</th>
                                    <th>Avg Daily Sales</th>
                                    <th>Suggested Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reorderSuggestions.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No reorder suggestions
                                        </td>
                                    </tr>
                                ) : (
                                    reorderSuggestions.map((suggestion, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 500 }}>{suggestion.item.name}</td>
                                            <td>
                                                <span className={`badge ${suggestion.item.status === 'Out of Stock' ? 'badge-danger' : 'badge-warning'
                                                    }`}>
                                                    {suggestion.item.currentStock}
                                                </span>
                                            </td>
                                            <td>{suggestion.analytics.avgDailySales}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                                {suggestion.analytics.suggestedReorderQty}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {reorderSuggestions.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#dbeafe', border: '1px solid #93c5fd' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '0.5rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Package size={24} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#1e40af' }}>
                                Reorder Recommendations
                            </h4>
                            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
                                Based on sales velocity analysis, we recommend reordering {reorderSuggestions.length} items to maintain optimal stock levels.
                                The suggested quantities are calculated for a 30-day supply.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="card" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={20} className="text-primary" />
                    LSTM Month-wise Demand Forecasting
                </h3>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Filter medicines..."
                            value={medicineSearch}
                            onChange={(e) => setMedicineSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.5rem',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {lstmError && (
                    <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c', marginBottom: '1rem' }}>
                        {lstmError}
                    </div>
                )}

                {lstmLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <Loader size={32} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto' }} />
                        <p style={{ marginTop: '1rem', color: '#64748b' }}>Generating AI Demand Forecasts...</p>
                    </div>
                ) : Array.isArray(lstmPrediction) ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Current Demand</th>
                                    <th>Predicted Demand</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lstmPrediction
                                    .filter(med => med.name.toLowerCase().includes(medicineSearch.toLowerCase()))
                                    .map((med, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 600 }}>{med.name}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{Math.round(med.thisMonth.value)} units</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{med.thisMonth.label}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#059669' }}>{Math.round(med.nextMonth.value)} units</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{med.nextMonth.label}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {med.nextMonth.value > med.thisMonth.value ? (
                                                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Increasing Demand</span>
                                                ) : (
                                                    <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>Stable/Lower</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', border: '2px dashed #e2e8f0', borderRadius: '0.5rem' }}>
                        No demand predictions available at the moment.
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} className="text-warning" />
                    Latest Disease Outbreaks (WHO)
                </h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th style={{ minWidth: '200px' }}>Suggested Medicines</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outbreaks.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No recent outbreak data available
                                    </td>
                                </tr>
                            ) : (
                                outbreaks.map((outbreak, index) => (
                                    <tr key={index}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {outbreak.PublicationDate ? new Date(outbreak.PublicationDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{outbreak.Title}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {outbreak.suggestedMedicines.map((med, i) => (
                                                    <span key={i} className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                                                        {med}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.875rem' }}>
                                            {outbreak.Introduction ? outbreak.Introduction.substring(0, 150) + '...' : 'No description available'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <a
                        href="https://www.who.int/emergencies/disease-outbreak-news"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.875rem', color: 'var(--primary-color)', textDecoration: 'underline' }}
                    >
                        View all on WHO website
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Predictions;
