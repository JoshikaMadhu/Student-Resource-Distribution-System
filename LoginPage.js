import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigate }) {
const { login } = useAuth();
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const submit = async (e) => {
e.preventDefault();
setError('');
setLoading(true);
try {
const res = await api.login(email, password);
if (res.success) {
login(res.user);
onNavigate('dashboard');
} else setError(res.message || 'Login failed');
} catch (err) {
setError('Network error');
} finally { setLoading(false); }
};

return (
<div className="auth-page">
<form className="card small" onSubmit={submit}>
<h2>Sign in</h2>
{error && <div className="alert error">{error}</div>}
<label>Email<input value={email} onChange={e => setEmail(e.target.value)} required /></label>
<label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
<button className="btn primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
<div className="muted">Don't have an account? <button type="button" className="link" onClick={() => onNavigate('register')}>Register</button></div>
</form>
</div>
);
}

