import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children, currentPage, onNavigate }) {
const { user, logout } = useAuth();
const [mobileOpen, setMobileOpen] = useState(false);

const nav = [
{ name: 'Dashboard', path: 'dashboard' },
{ name: 'Resources', path: 'resources' },
{ name: 'My Requests', path: 'requests' },
{ name: 'Transactions', path: 'transactions' },
{ name: 'Fines', path: 'fines' },
{ name: 'Notifications', path: 'notifications' }
];

return (
	<div className="app-root">
		<header className="topbar">
			<div className="brand" onClick={() => onNavigate('dashboard')}>
				<svg className="brand-mark" width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
					<rect x="2" y="3" width="8" height="14" rx="2" fill="#0f766e" />
					<rect x="14" y="3" width="8" height="10" rx="2" fill="#06b6d4" />
					<path d="M2 19a2 2 0 0 1 2-2h16v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="#072f2e" />
				</svg>
				<span className="brand-title">Anna University Resource System</span>
			</div>

			<nav className="desktop-nav">
				{nav.map(i => (
					<button key={i.path} className={"nav-btn" + (currentPage === i.path ? ' active' : '')} onClick={() => onNavigate(i.path)}>{i.name}</button>
				))}
			</nav>

			<div className="actions">
				<div className="user">{user?.name || 'Guest'}</div>
				<button className="btn link" onClick={logout}>Logout</button>
				<button className="mobile-toggle" onClick={() => setMobileOpen(s => !s)} aria-label="Toggle menu">{mobileOpen ? '✖' : '☰'}</button>
			</div>
		</header>

		{mobileOpen && (
			<div className="mobile-nav">
				{nav.map(i => (
					<button key={i.path} className={"mobile-nav-btn" + (currentPage === i.path ? ' active' : '')} onClick={() => { onNavigate(i.path); setMobileOpen(false); }}>{i.name}</button>
				))}
			</div>
		)}

		<main className="container">{children}</main>
	</div>
);
}
