import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Printer, DollarSign, Calendar, History, FileDown } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../context/AuthContext';

const CustomerLedger = () => {
    const { canEdit } = useAuth();
    const [phone, setPhone] = useState('');
    const [ledger, setLedger] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentModal, setPaymentModal] = useState({ show: false, billId: null });
    const [receiptModal, setReceiptModal] = useState({ show: false, payment: null });
    const [paymentData, setPaymentData] = useState({ amount: '', method: 'Cash', note: '' });

    useEffect(() => {
        fetchAllCustomers();
    }, []);

    const fetchAllCustomers = async () => {
        setListLoading(true);
        try {
            const response = await axios.get('http://localhost:5001/api/payments/customers');
            setCustomers(response.data.data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setListLoading(false);
        }
    };

    const fetchLedger = async (searchPhone) => {
        if (!searchPhone || searchPhone.length !== 10) return;

        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`http://localhost:5001/api/payments/customer/${searchPhone}`);
            setLedger(response.data.data);
            setPhone(searchPhone); // Ensure phone state is set if selected from list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch ledger');
            setLedger(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLedger(phone);
    };

    const handleSelectCustomer = (selectedPhone) => {
        setPhone(selectedPhone);
        fetchLedger(selectedPhone);
    };

    const handleBackToList = () => {
        setLedger(null);
        setPhone('');
        fetchAllCustomers();
    };
    const handleRecordPayment = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5001/api/payments', {
                customerPhone: phone,
                customerName: ledger.customerName,
                amountPaid: Number(paymentData.amount),
                paymentMethod: paymentData.method,
                note: paymentData.note
            });
            setPaymentModal({ show: false, billId: null });
            setPaymentData({ amount: '', method: 'Cash', note: '' });
            fetchLedger(phone); // Refresh
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record payment');
        }
    };

    const printLedger = () => {
        window.print();
    };

    const exportToCSV = () => {
        if (!ledger || !ledger.history.length) return;

        const headers = ['Date', 'Type', 'Description', 'Debit (Billed)', 'Credit (Paid)', 'Balance'];
        const csvRows = [
            headers.join(','),
            ...ledger.history.map(item => [
                new Date(item.date).toLocaleDateString(),
                item.description.includes('Invoice') ? 'Invoice' : 'Payment',
                `\"${item.description}\"`,
                item.debit || 0,
                item.credit || 0,
                item.balance
            ].join(','))
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ledger_${ledger.customerName}_${phone}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const downloadAsPDF = () => {
        const element = document.getElementById('printable-ledger');
        const opt = {
            margin: 10,
            filename: `Ledger_${ledger.customerName}_${phone}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };

    return (
        <div>
            <div className="page-header">
                <h1>Customer Ledger</h1>
                <p>Track payment history and outstanding balances</p>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label>Search Customer Phone (10 digits)</label>
                        <input
                            type="text"
                            placeholder="Enter 10 digit number..."
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= 10) setPhone(val);
                            }}
                            maxLength={10}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading || phone.length !== 10}>
                        <Search size={18} />
                        Search
                    </button>
                    {ledger && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={printLedger}>
                                <Printer size={18} />
                                Print
                            </button>
                            <button type="button" className="btn btn-primary" onClick={downloadAsPDF}>
                                <FileDown size={18} />
                                Download PDF
                            </button>
                            <button type="button" className="btn btn-success" onClick={exportToCSV}>
                                <History size={18} />
                                Download CSV
                            </button>
                        </div>
                    )}
                </form>
            </div>

            {loading && <p>Loading ledger...</p>}
            {error && <div className="alert alert-danger">{error}</div>}

            {ledger ? (
                <div id="printable-ledger">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button className="btn btn-secondary no-print" onClick={handleBackToList}>
                            ← Back to Customer List
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="card stats-card">
                            <div className="stats-icon" style={{ backgroundColor: '#e0f2fe', color: '#0ea5e9' }}>
                                <History size={24} />
                            </div>
                            <div className="stats-info">
                                <h3>{ledger.customerName}</h3>
                                <p>Customer Name</p>
                            </div>
                        </div>
                        <div className="card stats-card">
                            <div className="stats-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                                <DollarSign size={24} />
                            </div>
                            <div className="stats-info">
                                <h3 style={{ color: ledger.currentBalance > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                                    ₹{ledger.currentBalance.toFixed(2)}
                                </h3>
                                <p>Outstanding Balance</p>
                            </div>
                        </div>
                        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setPaymentModal({ show: true, billId: null })}
                                disabled={!canEdit()}
                            >
                                <DollarSign size={18} />
                                Record General Payment
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Transaction History</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                        <th style={{ textAlign: 'right' }}>Debit (Billed)</th>
                                        <th style={{ textAlign: 'right' }}>Credit (Paid)</th>
                                        <th style={{ textAlign: 'right' }}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ledger.history.map((item, index) => (
                                        <tr key={index}>
                                            <td>{new Date(item.date).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {item.description}
                                                    {item.type === 'Payment' && (
                                                        <button
                                                            className="btn"
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', border: '1px solid var(--border-color)' }}
                                                            onClick={() => setReceiptModal({ show: true, payment: item })}
                                                        >
                                                            View Receipt
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{item.debit > 0 ? `₹${item.debit.toFixed(2)}` : '-'}</td>
                                            <td style={{ textAlign: 'right' }}>{item.credit > 0 ? `₹${item.credit.toFixed(2)}` : '-'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{item.balance.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {ledger.history.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center' }}>No transaction history found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Customer Directory</h3>
                        <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            Total Customers: {customers.length}
                        </div>
                    </div>
                    {listLoading ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>Loading customer list...</p>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Customer Name</th>
                                        <th>Phone Number</th>
                                        <th style={{ textAlign: 'right' }}>Total Billed</th>
                                        <th style={{ textAlign: 'right' }}>Total Paid</th>
                                        <th style={{ textAlign: 'right' }}>Balance Due</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.filter(c =>
                                        c.name?.toLowerCase().includes(phone.toLowerCase()) ||
                                        c.phone.includes(phone)
                                    ).map((customer) => (
                                        <tr key={customer.phone} style={{ cursor: 'pointer' }} onClick={() => handleSelectCustomer(customer.phone)}>
                                            <td style={{ fontWeight: 600 }}>{customer.name}</td>
                                            <td>{customer.phone}</td>
                                            <td style={{ textAlign: 'right' }}>₹{customer.totalBilled.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>₹{customer.totalPaid.toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: customer.balance > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                                                ₹{customer.balance.toFixed(2)}
                                            </td>
                                            <td>
                                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                                                    View Ledger
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center' }}>No customers found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {paymentModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2>Record Payment</h2>
                            <button className="close-btn" onClick={() => setPaymentModal({ show: false, billId: null })}>×</button>
                        </div>
                        <form onSubmit={handleRecordPayment}>
                            <div className="input-group">
                                <label>Amount Received (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Payment Method</label>
                                <select
                                    value={paymentData.method}
                                    onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Card">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Net Banking">Net Banking</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Note (Optional)</label>
                                <input
                                    type="text"
                                    value={paymentData.note}
                                    onChange={(e) => setPaymentData({ ...paymentData, note: e.target.value })}
                                    placeholder="e.g. Month end settlement"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPaymentModal({ show: false, billId: null })}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    Save Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {receiptModal.show && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header no-print">
                            <h2>Payment Receipt</h2>
                            <button className="close-btn" onClick={() => setReceiptModal({ show: false, payment: null })}>×</button>
                        </div>
                        <div id="payment-receipt-content" style={{ padding: '1rem', border: '2px solid #eee', borderRadius: '0.5rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                                <h1 style={{ margin: 0 }}>🏥 Medico</h1>
                                <p style={{ margin: '0.25rem 0', color: '#666' }}>Medical Inventory & Billing System</p>
                                <h2 style={{ margin: '1rem 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Receipt</h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#666' }}>Customer Name</p>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{ledger.customerName}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#666' }}>Customer Phone</p>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{phone}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#666' }}>Date</p>
                                    <p style={{ margin: 0 }}>{new Date(receiptModal.payment.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#666' }}>Payment Method</p>
                                    <p style={{ margin: 0 }}>{receiptModal.payment.description.split('via ')[1] || 'N/A'}</p>
                                </div>
                            </div>

                            <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                                <p style={{ margin: '0 0 0.5rem', color: '#666' }}>Amount Received</p>
                                <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>₹{receiptModal.payment.credit.toFixed(2)}</h1>
                            </div>

                            <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
                                <p>Thank you for your payment!</p>
                                <p style={{ marginTop: '1rem', fontSize: '0.75rem' }}>Generated on {new Date().toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="modal-footer no-print" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setReceiptModal({ show: false, payment: null })}>
                                Close
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                                <Printer size={18} />
                                Print Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerLedger;
