import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [notifications, setNotifications] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => { fetchNotifs(); }, []);

const fetchNotifs = async () => {
setLoading(true);
try {
const res = await api.getNotifications(user.student_id);
if (res.success) setNotifications(res.notifications || []);
} catch (e) { console.error(e); }
finally { setLoading(false); }
};

const markRead = async (id) => {
try { const res = await api.markNotificationRead(id); if (res.success) fetchNotifs(); }
catch (e) { console.error(e); }
};

if (loading) return <Layout currentPage={currentPage} onNavigate={onNavigate}><div className="loading">Loading...</div></Layout>;

const unread = notifications.filter(n=>!n.is_read).length;

return (
<Layout currentPage={currentPage} onNavigate={onNavigate}>
<div className="page">
<div className="row between"><h1>Notifications</h1>{unread>0 && <div className="pill blue">{unread} unread</div>}</div>
<div className="list-card">
{notifications.length===0 ? <div className="muted card">No notifications</div> : (
notifications.map(n => (
<div key={n.notification_id} className={"notif card" + (n.is_read ? '' : ' unread')}>
<div className="notif-body"><div className="notif-message">{n.message}</div><div className="muted small">{n.created_at}</div></div>
{!n.is_read && <button className="link" onClick={()=>markRead(n.notification_id)}>Mark as read</button>}
</div>
))
)}
</div>
</div>
</Layout>
);
}
