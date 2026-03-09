import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, AlertCircle, XCircle, Clock, Mail, X } from 'lucide-react';

const Alerts = () => {
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchAlerts();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/alerts');
            setAlerts(response.data.data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!emailAddress) {
            setEmailMessage({ type: 'error', text: 'Please enter an email address' });
            return;
        }

        setSendingEmail(true);
        setEmailMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                'http://localhost:5001/api/alerts/send-email',
                { email: emailAddress },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setEmailMessage({
                    type: 'success',
                    text: `Email sent successfully to ${emailAddress}!`
                });
                setTimeout(() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setEmailMessage({ type: '', text: '' });
                }, 2000);
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to send email. Please try again.';
            setEmailMessage({ type: 'error', text: errorMsg });
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    const renderAlertCard = (item, type) => {
        const icons = {
            lowStock: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
            outOfStock: { Icon: XCircle, color: '#ef4444', bg: '#fee2e2' },
            expired: { Icon: AlertCircle, color: '#991b1b', bg: '#fee2e2' },
            expiringSoon: { Icon: Clock, color: '#f59e0b', bg: '#fef3c7' }
        };

        const { Icon, color, bg } = icons[type];

        return (
            <div key={item._id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '0.5rem',
                        backgroundColor: bg,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <Icon size={24} />
                    </div>

                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            {item.name}
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            <div>
                                <strong>Category:</strong> {item.category}
                            </div>
                            <div>
                                <strong>Batch:</strong> {item.batchNumber}
                            </div>
                            <div>
                                <strong>Packaging:</strong> <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{item.unitsPerPack}×{item.packsPerCarton}</span>
                            </div>
                            <div>
                                <strong>Cartons:</strong> {item.quantityInCartons || 0}
                            </div>
                            <div>
                                <strong>Expiry:</strong> {new Date(item.expiryDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <span className={`badge ${type === 'expired' || type === 'outOfStock' ? 'badge-danger' : 'badge-warning'
                        }`}>
                        {item.status}
                    </span>
                </div>
            </div>
        );
    };

    // Filter alerts by category
    const filterByCategory = (items) => {
        if (!categoryFilter) return items;
        return items.filter(item => item.category === categoryFilter);
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Alerts & Notifications</h1>
                    <p>Monitor stock levels and expiry dates</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowEmailModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Mail size={18} />
                    Send Email Alert
                </button>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{
                        width: '90%',
                        maxWidth: '500px',
                        padding: '2rem',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => {
                                setShowEmailModal(false);
                                setEmailAddress('');
                                setEmailMessage({ type: '', text: '' });
                            }}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '0.25rem'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Send Alert Email</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Send a comprehensive alert report to the specified email address.
                        </p>

                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <label>Select Recipient</label>
                            <select
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                disabled={sendingEmail}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'white'
                                }}
                            >
                                <option value="">-- Choose a user --</option>
                                {users.map(user => (
                                    <option key={user._id} value={user.email}>
                                        {user.name} ({user.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {emailMessage.text && (
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                backgroundColor: emailMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: emailMessage.type === 'success' ? '#065f46' : '#991b1b',
                                fontSize: '0.875rem'
                            }}>
                                {emailMessage.text}
                            </div>
                        )}

                        {alerts?.summary.totalAlerts === 0 && (
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                marginBottom: '1rem',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                fontSize: '0.875rem'
                            }}>
                                ℹ️ There are no alerts to send at this time.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowEmailModal(false);
                                    setEmailAddress('');
                                    setEmailMessage({ type: '', text: '' });
                                }}
                                disabled={sendingEmail}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendEmail}
                                disabled={sendingEmail || !emailAddress || alerts?.summary.totalAlerts === 0}
                                style={{ minWidth: '120px' }}
                            >
                                {sendingEmail ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Low Stock</div>
                        <div className="stat-value">{alerts?.summary.lowStockCount || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                        <XCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Out of Stock</div>
                        <div className="stat-value">{alerts?.summary.outOfStockCount || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                        <AlertCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Expired</div>
                        <div className="stat-value">{alerts?.summary.expiredCount || 0}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Expiring Soon</div>
                        <div className="stat-value">{alerts?.summary.expiringSoonCount || 0}</div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', flex: 1 }}>
                        {[
                            { key: 'all', label: 'All Alerts' },
                            { key: 'lowStock', label: 'Low Stock' },
                            { key: 'outOfStock', label: 'Out of Stock' },
                            { key: 'expired', label: 'Expired' },
                            { key: 'expiringSoon', label: 'Expiring Soon' }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeTab === tab.key ? '2px solid var(--primary-color)' : 'none',
                                    color: activeTab === tab.key ? 'var(--primary-color)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === tab.key ? 600 : 400,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="input-group" style={{ minWidth: '180px', marginBottom: 0, marginLeft: '1rem' }}>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">All Categories</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Consumables">Consumables</option>
                            <option value="Surgical">Surgical</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            <div>
                {activeTab === 'all' && (
                    <>
                        {filterByCategory(alerts?.outOfStock || []).length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--danger-color)' }}>
                                    Out of Stock ({filterByCategory(alerts.outOfStock).length})
                                </h3>
                                {filterByCategory(alerts.outOfStock).map(item => renderAlertCard(item, 'outOfStock'))}
                            </div>
                        )}

                        {filterByCategory(alerts?.expired || []).length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--danger-color)' }}>
                                    Expired ({filterByCategory(alerts.expired).length})
                                </h3>
                                {filterByCategory(alerts.expired).map(item => renderAlertCard(item, 'expired'))}
                            </div>
                        )}

                        {filterByCategory(alerts?.expiringSoon || []).length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--warning-color)' }}>
                                    Expiring Soon ({filterByCategory(alerts.expiringSoon).length})
                                </h3>
                                {filterByCategory(alerts.expiringSoon).map(item => renderAlertCard(item, 'expiringSoon'))}
                            </div>
                        )}

                        {filterByCategory(alerts?.lowStock || []).length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--warning-color)' }}>
                                    Low Stock ({filterByCategory(alerts.lowStock).length})
                                </h3>
                                {filterByCategory(alerts.lowStock).map(item => renderAlertCard(item, 'lowStock'))}
                            </div>
                        )}

                        {alerts?.summary.totalAlerts === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No alerts at this time</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'lowStock' && (
                    <>
                        {filterByCategory(alerts?.lowStock || []).map(item => renderAlertCard(item, 'lowStock'))}
                        {filterByCategory(alerts?.lowStock || []).length === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No low stock items</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'outOfStock' && (
                    <>
                        {filterByCategory(alerts?.outOfStock || []).map(item => renderAlertCard(item, 'outOfStock'))}
                        {filterByCategory(alerts?.outOfStock || []).length === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No out of stock items</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'expired' && (
                    <>
                        {filterByCategory(alerts?.expired || []).map(item => renderAlertCard(item, 'expired'))}
                        {filterByCategory(alerts?.expired || []).length === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No expired items</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'expiringSoon' && (
                    <>
                        {filterByCategory(alerts?.expiringSoon || []).map(item => renderAlertCard(item, 'expiringSoon'))}
                        {filterByCategory(alerts?.expiringSoon || []).length === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No items expiring soon</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Alerts;
