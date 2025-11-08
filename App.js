import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResourcesPage from "./pages/ResourcesPage";
import RequestsPage from "./pages/RequestsPage";
import TransactionsPage from "./pages/TransactionsPage";
import FinesPage from "./pages/FinesPage";
import NotificationsPage from "./pages/NotificationsPage";


function AppShell() {
const { user, loading } = useAuth();
const [page, setPage] = useState('login');

useEffect(() => {
const h = window.location.hash.slice(1);
if (h) setPage(h);
else if (user) setPage('dashboard');
else setPage('login');
}, [user]);

useEffect(() => {
const onHash = () => { const h = window.location.hash.slice(1); if (h) setPage(h); };
window.addEventListener('hashchange', onHash);
return () => window.removeEventListener('hashchange', onHash);
}, []);

const navigate = (p) => { setPage(p); window.location.hash = p; };

if (loading) return <div className="centered">Loading...</div>;
if (!user && page !== 'register') return <LoginPage onNavigate={navigate} />;
if (!user && page === 'register') return <RegisterPage onNavigate={navigate} />;

const props = { onNavigate: navigate, currentPage: page };

switch (page) {
case 'dashboard': return <DashboardPage {...props} />;
case 'resources': return <ResourcesPage {...props} />;
case 'requests': return <RequestsPage {...props} />;
case 'transactions': return <TransactionsPage {...props} />;
case 'fines': return <FinesPage {...props} />;
case 'notifications': return <NotificationsPage {...props} />;
default: return <DashboardPage {...props} />;
}
}

export default function Root() {
return (
<AuthProvider>
<AppShell />
</AuthProvider>
);
}
