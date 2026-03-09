import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [billingStats, setBillingStats] = useState(null);
    const [salesTrend, setSalesTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [stockRes, alertsRes, billingRes, salesRes] = await Promise.all([
                axios.get('http://localhost:5001/api/stock/stats/dashboard'),
                axios.get('http://localhost:5001/api/alerts'),
                axios.get('http://localhost:5001/api/billing/stats/summary'),
                axios.get('http://localhost:5001/api/predictions/sales-trend?days=7')
            ]);

            setStats(stockRes.data.data);
            setAlerts(alertsRes.data.data.summary);
            setBillingStats(billingRes.data.data);
            setSalesTrend(salesRes.data.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    const statCards = [
        {
            title: 'Total Items',
            value: stats?.totalItems || 0,
            icon: Package,
            color: '#2563eb',
            bgColor: '#dbeafe'
        },
        {
            title: 'Total Value',
            value: `₹${(stats?.totalValue || 0).toLocaleString()}`,
            icon: DollarSign,
            color: '#10b981',
            bgColor: '#d1fae5'
        },
        {
            title: 'Low Stock',
            value: stats?.lowStock || 0,
            icon: AlertTriangle,
            color: '#f59e0b',
            bgColor: '#fef3c7'
        },
        {
            title: 'Total Alerts',
            value: alerts?.totalAlerts || 0,
            icon: TrendingUp,
            color: '#ef4444',
            bgColor: '#fee2e2'
        }
    ];

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>Dashboard Overview</h1>
                <p>Welcome to your medical inventory management system</p>
            </div>

            <div className="stats-grid">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="stat-card">
                            <div className="stat-icon" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
                                <Icon size={24} />
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">{stat.title}</div>
                                <div className="stat-value">{stat.value}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="charts-grid">
                <div className="card chart-card">
                    <h3>Sales Trend (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="card chart-card">
                    <h3>Stock Status</h3>
                    <div className="status-list">
                        <div className="status-item">
                            <span className="status-label">In Stock</span>
                            <span className="badge badge-success">{stats?.totalItems - (stats?.lowStock + stats?.outOfStock + stats?.expired) || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Low Stock</span>
                            <span className="badge badge-warning">{stats?.lowStock || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Out of Stock</span>
                            <span className="badge badge-danger">{stats?.outOfStock || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="status-label">Expired</span>
                            <span className="badge badge-danger">{stats?.expired || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="quick-stats">
                <div className="card">
                    <h3>Today's Performance</h3>
                    <div className="performance-grid">
                        <div className="performance-item">
                            <div className="performance-label">Bills Generated</div>
                            <div className="performance-value">{billingStats?.todayBills || 0}</div>
                        </div>
                        <div className="performance-item">
                            <div className="performance-label">Today's Revenue</div>
                            <div className="performance-value">₹{(billingStats?.todayRevenue || 0).toLocaleString()}</div>
                        </div>
                        <div className="performance-item">
                            <div className="performance-label">Total Bills</div>
                            <div className="performance-value">{billingStats?.totalBills || 0}</div>
                        </div>
                        <div className="performance-item">
                            <div className="performance-label">Total Revenue</div>
                            <div className="performance-value">₹{(billingStats?.totalRevenue || 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
