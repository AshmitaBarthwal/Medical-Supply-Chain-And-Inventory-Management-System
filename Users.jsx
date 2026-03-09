import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users as UsersIcon,
    UserPlus,
    Trash2,
    Shield,
    Mail,
    User as UserIcon,
    AlertCircle,
    X,
    Copy,
    Check
} from 'lucide-react';
import './Users.css';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff' });
    const [createdUser, setCreatedUser] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data.data);
            setLoading(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5001/api/users', newUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCreatedUser(response.data.data);
            setUsers([response.data.data, ...users]);
            setNewUser({ name: '', email: '', role: 'staff' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Are you sure you want to remove this user?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5001/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete user');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const RoleBadge = ({ role }) => {
        return (
            <span className={`role-badge ${role}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
        );
    };

    return (
        <div className="users-page">
            <div className="users-header">
                <div className="users-title">
                    <h1>
                        <UsersIcon />
                        User Management
                    </h1>
                    <p>Manage team members and their permissions</p>
                </div>
                <button
                    onClick={() => { setShowAddModal(true); setCreatedUser(null); }}
                    className="btn-add-user"
                >
                    <UserPlus size={20} />
                    Add New User
                </button>
            </div>

            {error && (
                <div className="error-alert">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="text-center">Loading users...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center">No users found.</td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id}>
                                    <td>
                                        <div className="user-info-cell">
                                            <div className="user-avatar">
                                                <UserIcon size={20} />
                                            </div>
                                            <div className="user-details">
                                                <div className="name">{user.name}</div>
                                                <div className="email">
                                                    <Mail size={14} />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => handleDeleteUser(user._id)}
                                            className="btn-delete"
                                            title="Remove User"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Add Team Member</h2>
                            <button onClick={() => setShowAddModal(false)} className="btn-close">
                                <X size={24} />
                            </button>
                        </div>

                        {!createdUser ? (
                            <div className="modal-body">
                                <form onSubmit={handleAddUser} className="user-form">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            required
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Role / Permissions</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        >
                                            <option value="staff">Staff (Sales Only)</option>
                                            <option value="manager">Manager (Stock & Sales)</option>
                                            <option value="admin">Administrator (Full Access)</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="btn-submit">
                                        Create Account
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="success-state">
                                <div className="success-icon">
                                    <Check size={32} />
                                </div>
                                <h3 className="modal-title">User Created Successfully!</h3>
                                <p className="modal-text">Share this temporary password with <b>{createdUser.name}</b>. They will be required to change it on their first login.</p>

                                <div className="temp-password-box">
                                    <code>{createdUser.temporaryPassword}</code>
                                    <button
                                        onClick={() => copyToClipboard(createdUser.temporaryPassword)}
                                        className="btn-copy"
                                    >
                                        {copied ? <Check size={20} /> : <Copy size={20} />}
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-submit btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
