import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ onNavigate }) {
const { login } = useAuth();
const [form, setForm] = useState({ name: '', roll_no: '', year: '', email: '', password: '' });
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

const submit = async (e) => {
e.preventDefault();
setLoading(true); setError('');
try {
const res = await api.register(form);
if (res.success) { login(res.user); onNavigate('dashboard'); }
else setError(res.message || 'Registration failed');
} catch (err) { setError('Network error'); }
finally { setLoading(false); }
};

return (
<div className="auth-page">
<form className="card small" onSubmit={submit}>
<h2>Create account</h2>
{error && <div className="alert error">{error}</div>}
<label>Full name<input name="name" value={form.name} onChange={change} required /></label>
<label>Roll number<input name="roll_no" value={form.roll_no} onChange={change} required /></label>
<label>Year
<select name="year" value={form.year} onChange={change} required>
<option value="">Select year</option>
<option value="1">1</option>
<option value="2">2</option>
<option value="3">3</option>
<option value="4">4</option>
</select>
</label>
<label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
<label>Password<input name="password" type="password" value={form.password} onChange={change} required /></label>
<button className="btn primary" disabled={loading}>{loading ? 'Creating...' : 'Register'}</button>
<div className="muted">Already registered? <button type="button" className="link" onClick={() => onNavigate('login')}>Sign in</button></div>
</form>
</div>
);
}
