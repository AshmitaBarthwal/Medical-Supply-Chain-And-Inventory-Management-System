import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './Security.css';

const ChangePassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/auth/change-password',
                { newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Password updated successfully! Please login with your new password.');
            logout();
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="security-container">
            <div className="security-card">
                <div className="security-header">
                    <div className="security-icon-wrapper">
                        <ShieldCheck size={32} />
                    </div>
                    <h1>Security Requirement</h1>
                    <p>Please set a new permanent password for your account to continue.</p>
                </div>

                {error && (
                    <div className="security-error">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="security-form">
                    <div className="security-input-group">
                        <label>New Password</label>
                        <div className="input-with-icon">
                            <Lock className="left-icon" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="password-toggle"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="security-input-group">
                        <label>Confirm New Password</label>
                        <div className="input-with-icon">
                            <Lock className="left-icon" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <ul className="password-requirements">
                        <li className="requirement-item">
                            <div className={`requirement-dot ${newPassword.length >= 6 ? 'valid' : ''}`} />
                            At least 6 characters
                        </li>
                        <li className="requirement-item">
                            <div className={`requirement-dot ${newPassword && newPassword === confirmPassword ? 'valid' : ''}`} />
                            Passwords must match
                        </li>
                    </ul>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-security-submit"
                    >
                        {loading ? 'Updating...' : 'Update Password & Access Medico'}
                    </button>
                </form>

                <div className="security-footer">
                    <button
                        onClick={() => logout()}
                        className="btn-cancel-logout"
                    >
                        Cancel and logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
