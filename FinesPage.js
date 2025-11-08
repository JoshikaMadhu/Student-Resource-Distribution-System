import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function FinesPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [fines, setFines] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => { fetchFines(); }, []);

const fetchFines = async () => {
setLoading(true);
try {
const res = await api.getFines(user.student_id);
if (res.success) setFines(res.fines || []);
} catch (e) { console.error(e); }
finally { setLoading(false); }
};

const totalPending = fines.filter(f => f.status === 'Pending').reduce((s,f) => s + parseFloat(f.amount), 0);

return (
<Layout currentPage={currentPage} onNavigate={onNavigate}>
<div className="page">
<div className="row between">
<h1>Fines</h1>
<div className="pill red">Total Pending: ₹{totalPending.toFixed(2)}</div>
</div>
<div className="card">
{fines.length === 0 ? <p className="muted">No fines found</p> : (
<table className="table">
<thead><tr><th>Fine ID</th><th>Resource</th><th>Amount</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
<tbody>
{fines.map(f => (
<tr key={f.fine_id}><td>#{f.fine_id}</td><td>{f.resource_name}</td><td>₹{f.amount}</td><td>{f.reason}</td><td><span className={f.status === 'Paid' ? 'pill green' : 'pill red'}>{f.status}</span></td><td>{f.status === 'Pending' && <button className="btn small">Pay Now</button>}</td></tr>
))}
</tbody>
</table>
)}
</div>
</div>
</Layout>
);
}
