import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function DashboardPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [loading, setLoading] = useState(true);
const [stats, setStats] = useState({ totalResources: 0, activeRequests: 0, issuedItems: 0, pendingFines: 0 });
const [notifications, setNotifications] = useState([]);
const [dbStatus, setDbStatus] = useState({ ok: false, message: 'Unknown' });
// topResources removed per request — dashboard will focus on DB stats and notifications

useEffect(() => { fetchDash(); }, []);

const fetchDash = async () => {
setLoading(true);
try {
		if (!user || !user.student_id) {
			// no logged-in user, stop and show empty dashboard (user will be redirected by auth flows)
			setLoading(false);
			return;
		}

		const res = await api.getDashboard(user.student_id);
		if (res.success) {
			const s = res.stats || {};
			// coerce numeric values (pg may return numeric/decimal as strings)
			setStats({
				totalResources: Number(s.totalresources ?? s.totalResources ?? 0),
				activeRequests: Number(s.activerequests ?? s.activeRequests ?? 0),
				issuedItems: Number(s.issueditems ?? s.issuedItems ?? 0),
				pendingFines: Number(s.pendingfines ?? s.pendingFines ?? 0)
			});
			setNotifications(res.notifications || []);
		}
		// health check
		try {
			const h = await api.health();
			if (h && h.success && h.db) setDbStatus({ ok: true, message: 'Connected to DB' });
			else setDbStatus({ ok: false, message: 'DB unreachable' });
		} catch (e) { setDbStatus({ ok: false, message: 'Health check failed' }); }
} catch (e) { console.error(e); }
finally { setLoading(false); }
};

// removed fetchTopResources (not shown on dashboard anymore)

if (loading) return <Layout currentPage={currentPage} onNavigate={onNavigate}><div className="loading">Loading dashboard...</div></Layout>;

return (
<Layout currentPage={currentPage} onNavigate={onNavigate}>
		<div className="page">
			<div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
				<div>
					<h1 style={{ margin: 0 }}>Dashboard</h1>
					<div className="muted small">Welcome back{user?.name ? `, ${user.name}` : ''} — quick overview of your DB-backed resources.</div>
				</div>
				<div style={{ textAlign: 'right' }}>
					<div style={{ fontSize: 12, color: '#6b7280' }}>DB Status</div>
					<div style={{ marginTop: 6 }}>
						<span className={dbStatus.ok ? 'pill green' : 'pill red'} style={{ padding: '8px 12px', fontWeight: 700 }}>{dbStatus.message}</span>
					</div>
				</div>
			</div>

			<div className="grid stats" style={{ marginTop: 18 }}>
				<div onClick={() => onNavigate('resources')} title="View resources" className="card clickable"> <div className="stat-title">Total Resources</div> <div className="stat-value">{stats.totalResources}</div></div>
				<div onClick={() => onNavigate('requests')} title="Your requests" className="card clickable"> <div className="stat-title">Active Requests</div> <div className="stat-value">{stats.activeRequests}</div></div>
				<div onClick={() => onNavigate('transactions')} title="Issued items" className="card clickable"> <div className="stat-title">Issued Items</div> <div className="stat-value">{stats.issuedItems}</div></div>
				<div onClick={() => onNavigate('fines')} title="Pending fines" className="card clickable"> <div className="stat-title">Pending Fines</div> <div className="stat-value">₹{Number(stats.pendingFines).toFixed(2)}</div></div>
			</div>

					<div className="card" style={{ marginTop: 18 }}>
				<h3>Recent Notifications</h3>
				{notifications.length === 0 ? <p className="muted">No notifications</p> : (
					<ul className="list">
						{notifications.slice(0,5).map(n => <li key={n.notification_id}><strong>{n.message}</strong><div className="muted small">{n.created_at}</div></li>)}
					</ul>
				)}
			</div>
      
					{/* Popular resources removed per request — dashboard focuses on stats and notifications */}
		</div>
</Layout>
);
}

