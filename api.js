export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const toJson = async (res) => {
	// parse JSON safely
	let data;
	try {
		data = await res.json();
	} catch (e) {
		return { success: false, message: 'Invalid JSON response' };
	}

	// global auth handling: if backend returns 401/403, remove stored credentials
	if (res.status === 401 || res.status === 403) {
		// clear local auth state and force client to login
		try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) { /* ignore */ }
		// navigate to login route (app uses hash routing internally)
		try { window.location.hash = 'login'; } catch (e) { /* ignore */ }
		return { success: false, message: data.message || 'Authentication required' };
	}

	return data;
};

const authHeaders = () => ({
'Content-Type': 'application/json',
...(getToken() && { 'Authorization': `Bearer ${getToken()}` })
});

export const api = {
login: (email, password) => fetch(`${API_BASE}/auth/login`, {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email, password })
}).then(toJson).then(res => {
if (res.success && res.token) localStorage.setItem('token', res.token);
return res;
}),

register: (data) => fetch(`${API_BASE}/auth/register`, {
method: 'POST', headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(data)
}).then(toJson).then(res => {
if (res.success && res.token) localStorage.setItem('token', res.token);
return res;
}),

getCategories: async () => {
  try {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'GET', 
      headers: authHeaders()
    });
    const data = await toJson(response);
    console.log('Categories API response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, categories: [] };
  }
},

addResource: (resourceData) => fetch(`${API_BASE}/resources`, {
method: 'POST', headers: authHeaders(),
body: JSON.stringify(resourceData)
}).then(toJson).catch(error => {
  console.error('Error submitting resource:', error);
  return { success: false, message: 'Failed to submit resource. Please try again.' };
}),

logout: (studentId) => fetch(`${API_BASE}/auth/logout`, {
method: 'POST', headers: authHeaders(),
body: JSON.stringify({ student_id: studentId })
}).then(toJson).then(res => {
if (res.success) localStorage.removeItem('token');
return res;
}),

getDashboard: (studentId) => fetch(`${API_BASE}/dashboard/${studentId}`, {
headers: authHeaders()
}).then(toJson),
getResources: () => fetch(`${API_BASE}/resources`, {
headers: authHeaders()
}).then(toJson),
requestResource: (studentId, resourceId) => fetch(`${API_BASE}/requests`, {
method: 'POST', headers: authHeaders(),
body: JSON.stringify({ student_id: studentId, resource_id: resourceId })
}).then(toJson),
getRequests: (studentId) => fetch(`${API_BASE}/requests/${studentId}`, {
headers: authHeaders()
}).then(toJson),
getTransactions: (studentId) => fetch(`${API_BASE}/transactions/${studentId}`, {
headers: authHeaders()
}).then(toJson),
returnResource: (transactionId) => fetch(`${API_BASE}/transactions/${transactionId}/return`, {
method: 'PUT', headers: authHeaders()
}).then(toJson),
getFines: (studentId) => fetch(`${API_BASE}/fines/${studentId}`, {
headers: authHeaders()
}).then(toJson),
submitFeedback: (studentId, data) => fetch(`${API_BASE}/feedback`, {
method: 'POST', headers: authHeaders(),
body: JSON.stringify({ student_id: studentId, ...data })
}).then(toJson),
getNotifications: (studentId) => fetch(`${API_BASE}/notifications/${studentId}`, {
headers: authHeaders()
}).then(toJson),
markNotificationRead: (notificationId) => fetch(`${API_BASE}/notifications/${notificationId}/read`, {
method: 'PUT', headers: authHeaders()
}).then(toJson)
,
	health: () => fetch(`${API_BASE.replace(/\/api$/, '')}/api/health`).then(toJson)
};
