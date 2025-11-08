import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ResourcesPage({ onNavigate, currentPage }) {
const { user } = useAuth();
const [resources, setResources] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [requesting, setRequesting] = useState(null);
const [showAddForm, setShowAddForm] = useState(false);
const [newResource, setNewResource] = useState({
  name: '',
  description: '',
  category_id: '',
  quantity: 1
});
const [categories, setCategories] = useState([]);
const [submitting, setSubmitting] = useState(false);
const [categoriesLoading, setCategoriesLoading] = useState(true);

useEffect(() => {
  fetchResources();
  fetchCategories();
}, []);

// Debug categories state changes
useEffect(() => {
  console.log('Categories state updated:', categories);
  console.log('Categories length:', categories?.length);
  console.log('Categories loading:', categoriesLoading);
}, [categories, categoriesLoading]);

const fetchResources = async () => {
	setLoading(true);
	setError('');
	try {
		const res = await api.getResources();
		if (res && res.success) setResources(res.resources || []);
		else setError(res?.message || 'Failed to load resources');
	} catch (e) { console.error(e); setError('Network error'); }
	finally { setLoading(false); }
};

const fetchCategories = async () => {
  setCategoriesLoading(true);
  try {
    console.log('Fetching categories...');
    const res = await api.getCategories();
    console.log('Categories response:', res);
    console.log('Response success:', res?.success);
    console.log('Response categories:', res?.categories);
    if (res && res.success && res.categories) {
      console.log('Setting categories:', res.categories);
      setCategories(res.categories);
    } else {
      console.error('Failed to load categories:', res?.message);
      setCategories([]);
    }
  } catch (e) {
    console.error('Failed to load categories:', e);
    setCategories([]);
  } finally {
    setCategoriesLoading(false);
  }
};

const handleAddResource = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const resourceData = {
      ...newResource,
      student_id: user.student_id
    };
    
    const res = await api.addResource(resourceData);
    if (res && res.success) {
      alert('Resource added successfully!');
      setShowAddForm(false);
      setNewResource({
        name: '',
        description: '',
        category_id: 1,
        quantity: 1
      });
      fetchResources();
    } else {
      alert(res?.message || 'Failed to add resource');
    }
  } catch (e) {
    console.error(e);
    alert('Network error');
  } finally {
    setSubmitting(false);
  }
};

const handleRequest = async (rid) => {
setRequesting(rid);
try {
const res = await api.requestResource(user.student_id, rid);
if (res.success) { alert('Requested successfully'); fetchResources(); }
else alert(res.message || 'Request failed');
} catch (e) { alert('Network error'); }
finally { setRequesting(null); }
};

if (loading) return <Layout currentPage={currentPage} onNavigate={onNavigate}><div className="loading">Loading resources...</div></Layout>;

return (
	<Layout currentPage={currentPage} onNavigate={onNavigate}>
		<div className="page">
			<h1>Available Resources</h1>
			{error && <div className="alert error">{error}</div>}
			
			<div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<button className="btn" onClick={() => setShowAddForm(!showAddForm)}>
					{showAddForm ? 'Cancel' : 'Add Your Own Resource'}
				</button>
			</div>
			
			{showAddForm && (
				<div className="card" style={{ 
					marginBottom: '30px', 
					padding: '25px',
					maxWidth: '600px',
					margin: '0 auto 30px auto',
					boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
				}}>
					<h2 style={{ 
						marginBottom: '20px', 
						color: '#2c3e50',
						textAlign: 'center'
					}}>Add New Resource</h2>
					<form onSubmit={handleAddResource}>
						<div className="form-group" style={{ marginBottom: '20px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '8px',
								color: '#34495e',
								fontWeight: '500'
							}}>Resource Name</label>
							<input 
								type="text" 
								required
								value={newResource.name}
								onChange={(e) => setNewResource({...newResource, name: e.target.value})}
								style={{
									width: '100%',
									padding: '10px',
									borderRadius: '4px',
									border: '1px solid #ddd',
									fontSize: '16px'
								}}
								placeholder="Enter resource name"
							/>
						</div>
						<div className="form-group" style={{ marginBottom: '20px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '8px',
								color: '#34495e',
								fontWeight: '500'
							}}>Description</label>
							<textarea
								required
								value={newResource.description}
								onChange={(e) => setNewResource({...newResource, description: e.target.value})}
								style={{
									width: '100%',
									padding: '10px',
									borderRadius: '4px',
									border: '1px solid #ddd',
									fontSize: '16px',
									minHeight: '100px',
									resize: 'vertical'
								}}
								placeholder="Enter resource description"
							/>
						</div>
						<div style={{ 
							display: 'grid', 
							gridTemplateColumns: '1fr 1fr', 
							gap: '20px',
							marginBottom: '20px'
						}}>
							<div className="form-group">
								<label style={{ 
									display: 'block', 
									marginBottom: '8px',
									color: '#34495e',
									fontWeight: '500'
								}}>Category</label>
								<select
									value={newResource.category_id}
									onChange={(e) => setNewResource({...newResource, category_id: Number(e.target.value)})}
									required
									disabled={categoriesLoading}
									style={{
										width: '100%',
										padding: '10px',
										borderRadius: '4px',
										border: '1px solid #ddd',
										fontSize: '16px',
										backgroundColor: categoriesLoading ? '#f5f5f5' : '#fff'
									}}
								>
									<option value="">
										{categoriesLoading ? 'Loading categories...' : 'Select a category'}
									</option>
									{categories && categories.length > 0 ? (
										categories.map(cat => (
											<option key={cat.category_id} value={cat.category_id}>
												{cat.category_name}
											</option>
										))
									) : null}
								</select>
							</div>
							<div className="form-group">
								<label style={{ 
									display: 'block', 
									marginBottom: '8px',
									color: '#34495e',
									fontWeight: '500'
								}}>Quantity</label>
								<input
									type="number"
									min="1"
									required
									value={newResource.quantity}
									onChange={(e) => setNewResource({...newResource, quantity: Number(e.target.value)})}
									style={{
										width: '100%',
										padding: '10px',
										borderRadius: '4px',
										border: '1px solid #ddd',
										fontSize: '16px'
									}}
								/>
							</div>
						</div>
						<div style={{ textAlign: 'center' }}>
							<button 
								type="submit" 
								className="btn" 
								disabled={submitting}
								style={{
									padding: '12px 30px',
									fontSize: '16px',
									backgroundColor: '#3498db',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									transition: 'background-color 0.2s'
								}}
							>
								{submitting ? 'Adding...' : 'Add Resource'}
							</button>
						</div>
					</form>
				</div>
			)}
			
			<div className="grid resources">
				{resources.length === 0 && !error ? <div className="card">No resources available</div> : resources.map(r => (
					<div className="card resource" key={r.resource_id}>
						<div className="resource-head">
							<div className="resource-title">{r.name}</div>
							<div className="resource-cat">{r.category}</div>
						</div>
						<div className="resource-desc">{r.description}</div>
						<div className="resource-stats">
							<div>Available: <strong>{r.available_quantity}</strong></div>
							<div>Total: <strong>{r.total_quantity}</strong></div>
						</div>
						{r.contributor_name && (
							<div className="resource-contributor">
								Contributed by: {r.contributor_name}
							</div>
						)}
						<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
							<button 
								className="btn" 
								disabled={r.available_quantity === 0 || requesting === r.resource_id} 
								onClick={() => handleRequest(r.resource_id)}
							>
								{requesting === r.resource_id ? 'Requesting...' : 'Request Resource'}
							</button>
							<div className="muted">ID: #{r.resource_id}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	</Layout>
);
}
