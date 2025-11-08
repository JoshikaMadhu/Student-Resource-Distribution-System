import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RequestsPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [requests, setRequests] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => { fetchRequests(); }, []);

const fetchRequests = async () => {
setLoading(true);
setError('');
try {
const res = await api.getRequests(user.student_id);
if (res && res.success) setRequests(res.requests || []);
else setError(res?.message || 'Failed to load requests');
} catch (e) { console.error(e); }
finally { setLoading(false); }
};

const statusClass = (s) => {
if (s === 'Approved') return 'pill green';
if (s === 'Pending') return 'pill yellow';
if (s === 'Rejected') return 'pill red';
return 'pill';
};

if (loading) return <Layout currentPage={currentPage} onNavigate={onNavigate}><div className="loading">Loading requests...</div></Layout>;

return (
	<Layout currentPage={currentPage} onNavigate={onNavigate}>
		<div className="page">
			<h1>My Requests</h1>
			{error && <div className="alert error">{error}</div>}
			<div className="card">
				{requests.length === 0 ? <p className="muted">No requests found</p> : (
					<table className="table">
						<thead><tr><th>Request ID</th><th>Resource</th><th>Request Date</th><th>Status</th></tr></thead>
						<tbody>
							{requests.map(r => (
								<tr key={r.request_id}><td>#{r.request_id}</td><td>{r.resource_name}</td><td>{r.request_date}</td><td><span className={statusClass(r.status)}>{r.status}</span></td></tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	</Layout>
);
}
