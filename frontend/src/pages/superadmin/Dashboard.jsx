import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SuperAdmin.css';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolAnalytics, setSchoolAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    code: '',
    address: '',
    feesStructure: {
      tuition: '',
      transportation: '',
      library: '',
      sports: '',
      other: ''
    }
  });

  const [editSchoolForm, setEditSchoolForm] = useState({
    name: '',
    newcode: '',
    address: '',
    feesStructure: {
      tuition: '',
      transportation: '',
      library: '',
      sports: '',
      other: ''
    }
  });

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    schoolCode: ''
  });

  
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/super/dashboard`, getAuthHeaders());
      setDashboardData(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API}/api/super/schools`, getAuthHeaders());
      setSchools(response.data.schools || []);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch schools');
    }
  };

  const fetchSchoolAnalytics = async (schoolId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/super/school/${schoolId}/analytics`, getAuthHeaders());
      setSchoolAnalytics(response.data);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch school analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
   
      const feesStructure = {};
      Object.keys(schoolForm.feesStructure).forEach(key => {
        feesStructure[key] = parseFloat(schoolForm.feesStructure[key]) || 0;
      });

      const schoolData = {
        ...schoolForm,
        feesStructure
      };

      await axios.post(`${API}/api/super/school`, schoolData, getAuthHeaders());
      setSuccess('🏫 School created successfully!');
      setSchoolForm({
        name: '',
        code: '',
        address: '',
        feesStructure: {
          tuition: '',
          transportation: '',
          library: '',
          sports: '',
          other: ''
        }
      });
      fetchSchools();
      setActiveTab('schools');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchool = async (school) => {
    try {
      setEditSchoolForm({
        name: school.name,
        newcode: school.code,
        address: school.address,
        feesStructure: school.feesStructure || {
          tuition: '',
          transportation: '',
          library: '',
          sports: '',
          other: ''
        }
      });
      setSelectedSchool(school);
      setActiveTab('edit-school');
    } catch (error) {
      setError('Failed to load school data for editing');
    }
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
     
      const feesStructure = {};
      Object.keys(editSchoolForm.feesStructure).forEach(key => {
        feesStructure[key] = parseFloat(editSchoolForm.feesStructure[key]) || 0;
      });

      const updateData = {
        ...editSchoolForm,
        feesStructure
      };

      await axios.put(`${API}/api/super/school/${selectedSchool.code}`, updateData, getAuthHeaders());
      setSuccess('🏫 School updated successfully!');
      fetchSchools();
      setActiveTab('schools');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update school');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (school) => {
    if (!window.confirm(`Are you sure you want to delete ${school.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API}/api/super/school/${school.code}`, getAuthHeaders());
      setSuccess('🗑️ School deleted successfully!');
      fetchSchools();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete school');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await axios.post(`${API}/api/super/create-admin`, adminForm, getAuthHeaders());
      setSuccess('👨‍💼 School admin created successfully!');
      setAdminForm({ name: '', email: '', password: '', schoolCode: '' });
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSchoolClick = (school) => {
    setSelectedSchool(school);
    fetchSchoolAnalytics(school._id);
    setActiveTab('analytics');
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'schools') {
      fetchSchools();
    }
  }, [activeTab]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="super-admin">
      <header className="super-header">
        <h1>🎓 EduManage Super Admin</h1>
        <div className="user-info">
          <span>Welcome back, Administrator</span>
          <button className="logout-btn" onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}>
          Logout
          </button>
        </div>
      </header>

      <nav className="super-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => { setActiveTab('dashboard'); clearMessages(); }}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'schools' ? 'active' : ''}
          onClick={() => { setActiveTab('schools'); clearMessages(); }}
        >
          🏫 Schools
        </button>
        <button 
          className={activeTab === 'create-school' ? 'active' : ''}
          onClick={() => { setActiveTab('create-school'); clearMessages(); }}
        >
          ➕ Create School
        </button>
        <button 
          className={activeTab === 'create-admin' ? 'active' : ''}
          onClick={() => { setActiveTab('create-admin'); clearMessages(); }}
        >
          👨‍💼 Create Admin
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => { setActiveTab('analytics'); clearMessages(); }}
        >
          📈 Analytics
        </button>
      </nav>

      
      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

     
      <main className="super-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            {loading ? (
              <div className="loading">Loading dashboard data...</div>
            ) : dashboardData ? (
              <div className="dashboard-content">
                <div className="stats-grid">
                  <div className="stat-card primary">
                    <div className="stat-icon">🏫</div>
                    <div className="stat-info">
                      <h3>Total Schools</h3>
                      <p className="stat-number">{dashboardData.totalSchools}</p>
                    </div>
                  </div>
                  <div className="stat-card success">
                    <div className="stat-icon">👨‍💼</div>
                    <div className="stat-info">
                      <h3>School Admins</h3>
                      <p className="stat-number">{dashboardData.totalAdmins}</p>
                    </div>
                  </div>
                  <div className="stat-card warning">
                    <div className="stat-icon">👨‍🏫</div>
                    <div className="stat-info">
                      <h3>Teachers</h3>
                      <p className="stat-number">{dashboardData.totalTeachers}</p>
                    </div>
                  </div>
                  <div className="stat-card info">
                    <div className="stat-icon">🎓</div>
                    <div className="stat-info">
                      <h3>Students</h3>
                      <p className="stat-number">{dashboardData.totalStudents}</p>
                    </div>
                  </div>
                </div>

                
                <div className="quick-actions">
                  <h3>Quick Actions</h3>
                  <div className="action-buttons">
                    <button onClick={() => setActiveTab('create-school')} className="btn-primary">
                      🏫 Add New School
                    </button>
                    <button onClick={() => setActiveTab('create-admin')} className="btn-secondary">
                      👨‍💼 Create School Admin
                    </button>
                    <button onClick={() => setActiveTab('schools')} className="btn-warning">
                      📋 Manage Schools
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className="btn-info">
                      📈 View Analytics
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">No dashboard data available</div>
            )}
          </div>
        )}

        {activeTab === 'schools' && (
          <div className="schools-tab">
            <div className="tab-header">
              <h2>🏫 School Management</h2>
              <div className="header-actions">
                <button className="btn-secondary" onClick={fetchSchools}>
                  🔄 Refresh
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setActiveTab('create-school')}
                >
                  ➕ Add School
                </button>
              </div>
            </div>

            <div className="schools-list">
              {schools.length === 0 ? (
                <div className="no-data">No schools registered yet</div>
              ) : (
                schools.map(school => (
                  <div key={school._id} className="school-card">
                    <div className="school-info">
                      <h3>{school.name}</h3>
                      <div className="school-details">
                        <div className="detail-item">
                          🏷️ <strong>Code:</strong> {school.code}
                        </div>
                        <div className="detail-item">
                          📍 <strong>Address:</strong> {school.address}
                        </div>
                        <div className="detail-item">
                          👨‍💼 <strong>Admin:</strong> {school.admin?.name || 'Not assigned'}
                        </div>
                        <div className="detail-item">
                          💰 <strong>Total Fees:</strong> ₹{Object.values(school.feesStructure || {}).reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0)}
                        </div>
                        <div className="detail-item">
                          📅 <strong>Created:</strong> {new Date(school.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="school-actions">
                      <button 
                        className="btn-info"
                        onClick={() => handleSchoolClick(school)}
                      >
                        📈 Analytics
                      </button>
                      <button 
                        className="btn-warning"
                        onClick={() => handleEditSchool(school)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDeleteSchool(school)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'create-school' && (
          <div className="form-tab">
            <div className="tab-header">
              <h2>🏫 Create New School</h2>
              <button onClick={() => setActiveTab('schools')} className="btn-secondary">
                ← Back to Schools
              </button>
            </div>
            
            <form onSubmit={handleCreateSchool} className="super-form">
              <div className="form-group">
                <label>School Name</label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                  required
                  placeholder="Enter school name"
                />
              </div>
              <div className="form-group">
                <label>School Code</label>
                <input
                  type="text"
                  value={schoolForm.code}
                  onChange={(e) => setSchoolForm({...schoolForm, code: e.target.value})}
                  required
                  placeholder="Enter unique school code"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({...schoolForm, address: e.target.value})}
                  required
                  placeholder="Enter school address"
                  rows="3"
                />
              </div>

              <div className="form-section">
                <h3>💰 Fee Structure</h3>
                <div className="fee-grid">
                  <div className="form-group">
                    <label>Tuition Fee (₹)</label>
                    <input
                      type="number"
                      value={schoolForm.feesStructure.tuition}
                      onChange={(e) => setSchoolForm({
                        ...schoolForm, 
                        feesStructure: {...schoolForm.feesStructure, tuition: e.target.value}
                      })}
                      placeholder="Enter tuition fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Transportation Fee (₹)</label>
                    <input
                      type="number"
                      value={schoolForm.feesStructure.transportation}
                      onChange={(e) => setSchoolForm({
                        ...schoolForm, 
                        feesStructure: {...schoolForm.feesStructure, transportation: e.target.value}
                      })}
                      placeholder="Enter transportation fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Library Fee (₹)</label>
                    <input
                      type="number"
                      value={schoolForm.feesStructure.library}
                      onChange={(e) => setSchoolForm({
                        ...schoolForm, 
                        feesStructure: {...schoolForm.feesStructure, library: e.target.value}
                      })}
                      placeholder="Enter library fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Sports Fee (₹)</label>
                    <input
                      type="number"
                      value={schoolForm.feesStructure.sports}
                      onChange={(e) => setSchoolForm({
                        ...schoolForm, 
                        feesStructure: {...schoolForm.feesStructure, sports: e.target.value}
                      })}
                      placeholder="Enter sports fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Other Charges (₹)</label>
                    <input
                      type="number"
                      value={schoolForm.feesStructure.other}
                      onChange={(e) => setSchoolForm({
                        ...schoolForm, 
                        feesStructure: {...schoolForm.feesStructure, other: e.target.value}
                      })}
                      placeholder="Enter other charges"
                    />
                  </div>
                </div>
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '🔄 Creating...' : '🏫 Create School'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'edit-school' && selectedSchool && (
          <div className="form-tab">
            <div className="tab-header">
              <h2>✏️ Edit School - {selectedSchool.name}</h2>
              <button onClick={() => setActiveTab('schools')} className="btn-secondary">
                ← Back to Schools
              </button>
            </div>
            
            <form onSubmit={handleUpdateSchool} className="super-form">
              <div className="form-group">
                <label>School Name</label>
                <input
                  type="text"
                  value={editSchoolForm.name}
                  onChange={(e) => setEditSchoolForm({...editSchoolForm, name: e.target.value})}
                  required
                  placeholder="Enter school name"
                />
              </div>
              <div className="form-group">
                <label>School Code (New Code)</label>
                <input
                  type="text"
                  value={editSchoolForm.newcode}
                  onChange={(e) => setEditSchoolForm({...editSchoolForm, newcode: e.target.value})}
                  placeholder="Enter new school code (leave empty to keep current)"
                />
                <small>Current code: {selectedSchool.code}</small>
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={editSchoolForm.address}
                  onChange={(e) => setEditSchoolForm({...editSchoolForm, address: e.target.value})}
                  required
                  placeholder="Enter school address"
                  rows="3"
                />
              </div>

              <div className="form-section">
                <h3>💰 Fee Structure</h3>
                <div className="fee-grid">
                  <div className="form-group">
                    <label>Tuition Fee (₹)</label>
                    <input
                      type="number"
                      value={editSchoolForm.feesStructure.tuition}
                      onChange={(e) => setEditSchoolForm({
                        ...editSchoolForm, 
                        feesStructure: {...editSchoolForm.feesStructure, tuition: e.target.value}
                      })}
                      placeholder="Enter tuition fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Transportation Fee (₹)</label>
                    <input
                      type="number"
                      value={editSchoolForm.feesStructure.transportation}
                      onChange={(e) => setEditSchoolForm({
                        ...editSchoolForm, 
                        feesStructure: {...editSchoolForm.feesStructure, transportation: e.target.value}
                      })}
                      placeholder="Enter transportation fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Library Fee (₹)</label>
                    <input
                      type="number"
                      value={editSchoolForm.feesStructure.library}
                      onChange={(e) => setEditSchoolForm({
                        ...editSchoolForm, 
                        feesStructure: {...editSchoolForm.feesStructure, library: e.target.value}
                      })}
                      placeholder="Enter library fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Sports Fee (₹)</label>
                    <input
                      type="number"
                      value={editSchoolForm.feesStructure.sports}
                      onChange={(e) => setEditSchoolForm({
                        ...editSchoolForm, 
                        feesStructure: {...editSchoolForm.feesStructure, sports: e.target.value}
                      })}
                      placeholder="Enter sports fee"
                    />
                  </div>
                  <div className="form-group">
                    <label>Other Charges (₹)</label>
                    <input
                      type="number"
                      value={editSchoolForm.feesStructure.other}
                      onChange={(e) => setEditSchoolForm({
                        ...editSchoolForm, 
                        feesStructure: {...editSchoolForm.feesStructure, other: e.target.value}
                      })}
                      placeholder="Enter other charges"
                    />
                  </div>
                </div>
              </div>
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '🔄 Updating...' : '💾 Update School'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'create-admin' && (
          <div className="form-tab">
            <h2>👨‍💼 Create School Admin</h2>
            <form onSubmit={handleCreateAdmin} className="super-form">
              <div className="form-group">
                <label>Admin Name</label>
                <input
                  type="text"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                  required
                  placeholder="Enter admin full name"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  required
                  placeholder="Enter admin email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  required
                  placeholder="Set admin password"
                />
              </div>
              <div className="form-group">
                <label>School Code</label>
                <input
                  type="text"
                  value={adminForm.schoolCode}
                  onChange={(e) => setAdminForm({...adminForm, schoolCode: e.target.value})}
                  required
                  placeholder="Enter school code for assignment"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '🔄 Creating...' : '👨‍💼 Create Admin'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <div className="tab-header">
              <h2>
                {selectedSchool ? `📈 ${selectedSchool.name} Analytics` : '📈 School Analytics'}
              </h2>
              <button onClick={() => setActiveTab('schools')} className="btn-secondary">
                ← Back to Schools
              </button>
            </div>

            {selectedSchool ? (
              loading ? (
                <div className="loading">Loading analytics for {selectedSchool.name}...</div>
              ) : schoolAnalytics ? (
                <div className="analytics-content">
                  <div className="analytics-section">
                    <h3>🏫 School Overview</h3>
                    <div className="stats-grid">
                      <div className="stat-card primary">
                        <div className="stat-icon">👨‍🏫</div>
                        <div className="stat-info">
                          <h3>Teachers</h3>
                          <p className="stat-number">{schoolAnalytics.overview?.teachers || 0}</p>
                        </div>
                      </div>
                      <div className="stat-card success">
                        <div className="stat-icon">🎓</div>
                        <div className="stat-info">
                          <h3>Students</h3>
                          <p className="stat-number">{schoolAnalytics.overview?.students || 0}</p>
                        </div>
                      </div>
                      <div className="stat-card warning">
                        <div className="stat-icon">👨‍👩‍👧‍👦</div>
                        <div className="stat-info">
                          <h3>Parents</h3>
                          <p className="stat-number">{schoolAnalytics.overview?.parents || 0}</p>
                        </div>
                      </div>
                      <div className="stat-card info">
                        <div className="stat-icon">💼</div>
                        <div className="stat-info">
                          <h3>Staff</h3>
                          <p className="stat-number">{schoolAnalytics.overview?.staff || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-section">
                    <h3>📊 Performance Metrics</h3>
                    <div className="performance-grid">
                      <div className="metric-card">
                        <div className="metric-header">
                          <h4>📅 Attendance</h4>
                          <span className="trend-indicator up">↗️</span>
                        </div>
                        <div className="metric-value">
                          {schoolAnalytics.performance?.attendance || 0}%
                        </div>
                        <div className="metric-progress">
                          <div 
                            className="progress-bar" 
                            style={{width: `${schoolAnalytics.performance?.attendance || 0}%`}}
                          ></div>
                        </div>
                        <div className="metric-details">
                          Based on real attendance data
                        </div>
                      </div>

                      <div className="metric-card">
                        <div className="metric-header">
                          <h4>📚 Academic Performance</h4>
                          <span className="trend-indicator stable">➡️</span>
                        </div>
                        <div className="metric-value">
                          {schoolAnalytics.performance?.grades || 0}%
                        </div>
                        <div className="metric-progress">
                          <div 
                            className="progress-bar" 
                            style={{width: `${schoolAnalytics.performance?.grades || 0}%`}}
                          ></div>
                        </div>
                        <div className="metric-details">
                          Average grade across all subjects
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-section">
                    <h3>💰 Fee Structure</h3>
                    {schoolAnalytics.feesStructure && Object.keys(schoolAnalytics.feesStructure).some(key => schoolAnalytics.feesStructure[key] > 0) ? (
                      <div className="fee-structure-preview">
                        {Object.entries(schoolAnalytics.feesStructure).map(([category, amount]) => (
                          amount > 0 && (
                            <div key={category} className="fee-item">
                              <span className="fee-category">{category}</span>
                              <span className="fee-amount">₹{amount}</span>
                            </div>
                          )
                        ))}
                        <div className="fee-total">
                          <strong>Total: ₹{Object.values(schoolAnalytics.feesStructure).reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="no-data">No fee structure defined</div>
                    )}
                  </div>

                  <div className="analytics-section">
                    <h3>📋 Recent Activity</h3>
                    <div className="activity-list">
                      {schoolAnalytics.recentActivity?.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <span className="activity-icon">
                            {activity.type === 'teachers' ? '👨‍🏫' : 
                             activity.type === 'students' ? '🎓' : '📊'}
                          </span>
                          <div className="activity-details">
                            <p>{activity.message}</p>
                            <small>{activity.date}</small>
                          </div>
                        </div>
                      )) || (
                        <div className="no-data">No recent activity recorded</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-data">No analytics data available for this school</div>
              )
            ) : (
              <div className="no-data">
                Please select a school from the Schools tab to view detailed analytics
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;