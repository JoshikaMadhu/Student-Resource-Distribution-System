import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function TransactionsPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [transactions, setTransactions] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [returning, setReturning] = useState(null);

useEffect(() => { fetchTransactions(); }, []);

const fetchTransactions = async () => {
setLoading(true);
setError('');
try {
const res = await api.getTransactions(user.student_id);
if (res && res.success) setTransactions(res.transactions || []);
else setError(res?.message || 'Failed to load transactions');
} catch (e) { console.error(e); }
finally { setLoading(false); }
};

const handleReturn = async (tid) => {
setReturning(tid);
try {
const res = await api.returnResource(tid);
if (res.success) { alert('Returned'); fetchTransactions(); }
else alert(res.message || 'Failed');
} catch (e) { alert('Network error'); }
finally { setReturning(null); }
};

if (loading) return <Layout currentPage={currentPage} onNavigate={onNavigate}><div className="loading">Loading transactions...</div></Layout>;

return (
	<Layout currentPage={currentPage} onNavigate={onNavigate}>
		<div className="page">
			<h1>My Transactions</h1>
			{error && <div className="alert error">{error}</div>}
			<div className="card">
				{transactions.length === 0 ? <p className="muted">No transactions</p> : (
					<table className="table">
						<thead><tr><th>Transaction ID</th><th>Resource</th><th>Issue Date</th><th>Return Date</th><th>Status</th><th>Action</th></tr></thead>
						<tbody>
							{transactions.map(t => (
								<tr key={t.transaction_id}>
									<td>#{t.transaction_id}</td>
									<td>{t.resource_name}</td>
									<td>{t.issue_date}</td>
									<td>{t.return_date || 'Not returned'}</td>
									<td><span className={t.status === 'Returned' ? 'pill green' : 'pill blue'}>{t.status}</span></td>
									<td>{t.status === 'Issued' && <button className="link" onClick={() => handleReturn(t.transaction_id)} disabled={returning === t.transaction_id}>{returning === t.transaction_id ? 'Returning...' : 'Return'}</button>}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	</Layout>
);
}

