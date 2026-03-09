import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileDown, X, Search, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2pdf from 'html2pdf.js';

const Sales = () => {
    const [bills, setBills] = useState([]);
    const [filteredBills, setFilteredBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBill, setSelectedBill] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        paymentStatus: '',
        paymentMethod: '',
        customerSearch: ''
    });

    useEffect(() => {
        fetchBills();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, bills]);

    const fetchBills = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/billing');
            setBills(response.data.data || []);
            setFilteredBills(response.data.data || []);
        } catch (error) {
            console.error('Error fetching bills:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...bills];

        // Date range filter
        if (filters.dateFrom) {
            filtered = filtered.filter(bill =>
                new Date(bill.createdAt) >= new Date(filters.dateFrom)
            );
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(bill =>
                new Date(bill.createdAt) <= endDate
            );
        }

        // Payment status filter
        if (filters.paymentStatus) {
            filtered = filtered.filter(bill => bill.paymentStatus === filters.paymentStatus);
        }

        // Payment method filter
        if (filters.paymentMethod) {
            filtered = filtered.filter(bill => bill.paymentMethod === filters.paymentMethod);
        }

        // Customer search
        if (filters.customerSearch) {
            const search = filters.customerSearch.toLowerCase();
            filtered = filtered.filter(bill =>
                bill.customerName.toLowerCase().includes(search) ||
                bill.customerPhone.includes(search) ||
                bill.invoiceNumber.toLowerCase().includes(search)
            );
        }

        setFilteredBills(filtered);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            dateFrom: '',
            dateTo: '',
            paymentStatus: '',
            paymentMethod: '',
            customerSearch: ''
        });
    };

    const openBillDetails = (bill) => {
        setSelectedBill(bill);
        setShowModal(true);
    };

    const closeBillDetails = () => {
        setShowModal(false);
        setSelectedBill(null);
    };

    const exportToExcel = () => {
        if (filteredBills.length === 0) {
            alert('No data to export');
            return;
        }

        // Prepare data for Excel
        const excelData = filteredBills.map(bill => ({
            'Invoice Number': bill.invoiceNumber,
            'Date': new Date(bill.createdAt).toLocaleDateString(),
            'Customer Name': bill.customerName,
            'Customer Phone': bill.customerPhone,
            'Items Count': bill.items.length,
            'Subtotal': `₹${bill.subtotal.toFixed(2)}`,
            'GST (18%)': `₹${bill.gst.toFixed(2)}`,
            'Discount': `₹${bill.discount.toFixed(2)}`,
            'Total Amount': `₹${bill.totalAmount.toFixed(2)}`,
            'Paid Amount': `₹${(bill.paidAmount || 0).toFixed(2)}`,
            'Remaining Balance': `₹${(bill.totalAmount - (bill.paidAmount || 0)).toFixed(2)}`,
            'Payment Method': bill.paymentMethod,
            'Payment Status': bill.paymentStatus
        }));

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

        // Set column widths
        ws['!cols'] = [
            { wch: 15 }, // Invoice Number
            { wch: 12 }, // Date
            { wch: 20 }, // Customer Name
            { wch: 15 }, // Customer Phone
            { wch: 12 }, // Items Count
            { wch: 12 }, // Subtotal
            { wch: 12 }, // GST
            { wch: 12 }, // Discount
            { wch: 15 }, // Total Amount
            { wch: 15 }, // Payment Method
            { wch: 15 }  // Payment Status
        ];

        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const fileName = `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        saveAs(data, fileName);
    };

    const downloadAsPDF = () => {
        const element = document.getElementById('bill-content');
        const opt = {
            margin: 10,
            filename: `Bill_${selectedBill.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).set(opt).save();
    };

    const getStatusBadge = (status) => {
        const statusClasses = {
            'Paid': 'badge-success',
            'Pending': 'badge-warning',
            'Partial': 'badge-info'
        };
        return <span className={`badge ${statusClasses[status]}`}>{status}</span>;
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Sales Reports</h1>
                <p>View and manage all sales transactions</p>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>From Date</label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>To Date</label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Payment Status</label>
                        <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}>
                            <option value="">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                        </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Payment Method</label>
                        <select value={filters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}>
                            <option value="">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Net Banking">Net Banking</option>
                        </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Search Customer/Invoice</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Name, phone, or invoice..."
                                value={filters.customerSearch}
                                onChange={(e) => handleFilterChange('customerSearch', e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button className="btn" onClick={clearFilters}>Clear Filters</button>
                    <button className="btn btn-primary" onClick={exportToExcel}>
                        <FileDown size={18} />
                        Export to Excel
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Bills</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{filteredBills.length}</div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>
                        ₹{filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0).toFixed(2)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>GST Collected</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        ₹{filteredBills.reduce((sum, bill) => sum + (bill.gst || 0), 0).toFixed(2)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Paid</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>
                        ₹{filteredBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0).toFixed(2)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Pending</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)' }}>
                        ₹{filteredBills.reduce((sum, bill) => sum + (bill.totalAmount - (bill.paidAmount || 0)), 0).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Bills Table */}
            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Items</th>
                                <th>Amount</th>
                                <th>Payment Method</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBills.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No bills found
                                    </td>
                                </tr>
                            ) : (
                                filteredBills.map((bill) => (
                                    <tr
                                        key={bill._id}
                                        onClick={() => openBillDetails(bill)}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{bill.invoiceNumber}</td>
                                        <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                                        <td>{bill.customerName}</td>
                                        <td>{bill.customerPhone}</td>
                                        <td>{bill.items.length}</td>
                                        <td style={{ fontWeight: 600 }}>₹{bill.totalAmount.toFixed(2)}</td>
                                        <td>{bill.paymentMethod}</td>
                                        <td>{getStatusBadge(bill.paymentStatus)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bill Details Modal */}
            {showModal && selectedBill && (
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
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card" style={{
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={closeBillDetails}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginBottom: '1.5rem' }}>Bill Details</h2>

                        <div id="bill-content" style={{ padding: '10px' }}>
                            {/* Invoice Header */}
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Invoice Number</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedBill.invoiceNumber}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Date</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                            {new Date(selectedBill.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Customer Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div><strong>Name:</strong> {selectedBill.customerName}</div>
                                    <div><strong>Phone:</strong> {selectedBill.customerPhone}</div>
                                    {selectedBill.customerAddress && (
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selectedBill.customerAddress}</div>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Items</h3>
                                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Packaging</th>
                                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Cartons</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Pack Price</th>
                                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedBill.items.map((item, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.5rem' }}>{item.name}</td>
                                                <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                                                    <span className="badge badge-info">{item.packaging}</span>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.cartonsOrdered}</td>
                                                <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.packPrice}</td>
                                                <td style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600 }}>₹{item.total.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bill Summary */}
                            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Subtotal:</span>
                                    <span>₹{selectedBill.subtotal.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>GST (18%):</span>
                                    <span>₹{selectedBill.gst.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span>Discount:</span>
                                    <span>-₹{selectedBill.discount.toFixed(2)}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '1.25rem',
                                    fontWeight: 700,
                                    marginTop: '0.75rem',
                                    paddingTop: '0.75rem',
                                    borderTop: '1px solid var(--border-color)'
                                }}>
                                    <span>Total Amount:</span>
                                    <span style={{ color: 'var(--success-color)' }}>₹{selectedBill.totalAmount.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: 'var(--success-color)' }}>
                                    <span style={{ fontWeight: 600 }}>Paid Amount:</span>
                                    <span style={{ fontWeight: 600 }}>₹{selectedBill.paidAmount?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', color: 'var(--danger-color)' }}>
                                    <span style={{ fontWeight: 600 }}>Remaining Balance:</span>
                                    <span style={{ fontWeight: 600 }}>₹{(selectedBill.totalAmount - (selectedBill.paidAmount || 0)).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div><strong>Payment Method:</strong> {selectedBill.paymentMethod}</div>
                                    <div><strong>Status:</strong> {selectedBill.paymentStatus}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-primary" onClick={() => window.print()}>
                                Print Bill
                            </button>
                            <button className="btn btn-success" onClick={downloadAsPDF}>
                                Download PDF
                            </button>
                            <button className="btn" onClick={closeBillDetails}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
