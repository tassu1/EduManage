import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  School,
  PlusCircle,
  UserPlus,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Users,
  GraduationCap,
  UserCog,
  Briefcase,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import BarChart from '../../components/BarChart';
import '../../styles/layout.css';
import './SuperAdmin.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schools', label: 'Schools', icon: School },
  { id: 'create-school', label: 'Create School', icon: PlusCircle },
  { id: 'create-admin', label: 'Create Admin', icon: UserPlus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const EMPTY_FEES = { tuition: '', transportation: '', library: '', sports: '', other: '' };

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolAnalytics, setSchoolAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    code: '',
    address: '',
    feesStructure: { ...EMPTY_FEES },
  });

  const [editSchoolForm, setEditSchoolForm] = useState({
    name: '',
    newcode: '',
    address: '',
    feesStructure: { ...EMPTY_FEES },
  });

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    schoolCode: '',
  });

  // ---- Data fetching — same endpoints, same payloads as before, now via the shared `api` client ----

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/super/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/api/super/schools');
      setSchools(response.data.schools || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch schools'));
    }
  };

  const fetchSchoolAnalytics = async (schoolId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/super/school/${schoolId}/analytics`);
      setSchoolAnalytics(response.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch school analytics'));
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
      Object.keys(schoolForm.feesStructure).forEach((key) => {
        feesStructure[key] = parseFloat(schoolForm.feesStructure[key]) || 0;
      });

      const schoolData = { ...schoolForm, feesStructure };

      await api.post('/api/super/school', schoolData);
      setSuccess('School created successfully!');
      setSchoolForm({ name: '', code: '', address: '', feesStructure: { ...EMPTY_FEES } });
      fetchSchools();
      setActiveTab('schools');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create school'));
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
        feesStructure: school.feesStructure || { ...EMPTY_FEES },
      });
      setSelectedSchool(school);
      setActiveTab('edit-school');
    } catch {
      setError('Failed to load school data for editing');
    }
  };

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const feesStructure = {};
      Object.keys(editSchoolForm.feesStructure).forEach((key) => {
        feesStructure[key] = parseFloat(editSchoolForm.feesStructure[key]) || 0;
      });

      const updateData = { ...editSchoolForm, feesStructure };

      await api.put(`/api/super/school/${selectedSchool.code}`, updateData);
      setSuccess('School updated successfully!');
      fetchSchools();
      setActiveTab('schools');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update school'));
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
      await api.delete(`/api/super/school/${school.code}`);
      setSuccess('School deleted successfully!');
      fetchSchools();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete school'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.post('/api/super/create-admin', adminForm);
      setSuccess('School admin created successfully!');
      setAdminForm({ name: '', email: '', password: '', schoolCode: '' });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create admin'));
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

  const goTo = (tab) => {
    setActiveTab(tab);
    clearMessages();
  };

  const totalFees = (fees) =>
    Object.values(fees || {}).reduce((sum, fee) => sum + (parseFloat(fee) || 0), 0);

 const feeFields = [
  { key: "tuitionPerYear", label: "Tuition (₹)" },
  { key: "transportPerYear", label: "Transport (₹)" },
];

  return (
    <div className="em-app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab === 'edit-school' ? 'schools' : activeTab}
        onSelect={goTo}
        roleLabel="Super Admin"
        onLogout={() => {
          localStorage.clear();
          window.location.reload();
        }}
      />

      <Toast type="error" message={error} onDismiss={() => setError('')} />
      <Toast type="success" message={success} onDismiss={() => setSuccess('')} />

      <main className="em-main">
        <div className="em-content">
          {activeTab === 'dashboard' && (
            <>
              <TopBar title="Dashboard" subtitle="Platform-wide overview across all your schools" />
              {loading ? (
                <div className="em-loading">Loading dashboard data…</div>
              ) : dashboardData ? (
                <>
                  <div className="em-stats-grid">
                    <StatCard icon={Building2} label="Total Schools" value={dashboardData.totalSchools} />
                    <StatCard icon={UserCog} label="School Admins" value={dashboardData.totalAdmins} tone="info" />
                    <StatCard icon={Users} label="Teachers" value={dashboardData.totalTeachers} tone="success" />
                    <StatCard icon={GraduationCap} label="Students" value={dashboardData.totalStudents} />
                  </div>

                  <Card title="Quick Actions">
                    <div className="em-quick-actions">
                      <Button variant="primary" icon={PlusCircle} onClick={() => goTo('create-school')}>
                        Add New School
                      </Button>
                      <Button icon={UserPlus} onClick={() => goTo('create-admin')}>
                        Create School Admin
                      </Button>
                      <Button icon={School} onClick={() => goTo('schools')}>
                        Manage Schools
                      </Button>
                      <Button icon={BarChart3} onClick={() => goTo('analytics')}>
                        View Analytics
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <EmptyState title="No dashboard data available" />
              )}
            </>
          )}

          {activeTab === 'schools' && (
            <>
              <TopBar
                title="School Management"
                actions={
                  <>
                    <Button icon={RefreshCw} onClick={fetchSchools}>
                      Refresh
                    </Button>
                    <Button variant="primary" icon={PlusCircle} onClick={() => goTo('create-school')}>
                      Add School
                    </Button>
                  </>
                }
              />

              {schools.length === 0 ? (
                <EmptyState
                  icon={School}
                  title="No schools registered yet"
                  description="Create your first school to get started."
                  action={
                    <Button variant="primary" icon={PlusCircle} onClick={() => goTo('create-school')}>
                      Add School
                    </Button>
                  }
                />
              ) : (
                <div className="em-entity-list">
                  {schools.map((school) => (
                    <Card
                      key={school._id}
                      title={school.name}
                      actions={
                        <>
                          <Button icon={BarChart3} onClick={() => handleSchoolClick(school)}>
                            Analytics
                          </Button>
                          <Button icon={Pencil} onClick={() => handleEditSchool(school)}>
                            Edit
                          </Button>
                          <Button variant="danger" icon={Trash2} onClick={() => handleDeleteSchool(school)}>
                            Delete
                          </Button>
                        </>
                      }
                    >
                      <div className="em-detail-row">
                        <span>Code</span>
                        <strong>{school.code}</strong>
                      </div>
                      <div className="em-detail-row">
                        <span>Address</span>
                        <strong>{school.address}</strong>
                      </div>
                      <div className="em-detail-row">
                        <span>Admin</span>
                        <strong>{school.admin?.name || 'Not assigned'}</strong>
                      </div>
                      <div className="em-detail-row">
                        <span>Total Fees</span>
                        <strong>₹{totalFees(school.feesStructure)}</strong>
                      </div>
                      <div className="em-detail-row">
                        <span>Created</span>
                        <strong>{new Date(school.createdAt).toLocaleDateString()}</strong>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'create-school' && (
            <>
              <TopBar
                title="Create New School"
                actions={
                  <Button icon={ArrowLeft} onClick={() => goTo('schools')}>
                    Back to Schools
                  </Button>
                }
              />
              <Card>
                <form onSubmit={handleCreateSchool}>
                  <FormField label="School Name">
                    <input
                      className="em-input"
                      type="text"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                      required
                      placeholder="Enter school name"
                    />
                  </FormField>
                  <FormField label="School Code">
                    <input
                      className="em-input"
                      type="text"
                      value={schoolForm.code}
                      onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                      required
                      placeholder="Enter unique school code"
                    />
                  </FormField>
                  <FormField label="Address">
                    <textarea
                      className="em-textarea"
                      value={schoolForm.address}
                      onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                      required
                      placeholder="Enter school address"
                      rows="3"
                    />
                  </FormField>

                  <p className="em-section-title">Fee Structure</p>
                  <div className="em-form-grid">
                    {feeFields.map(({ key, label }) => (
                      <FormField label={label} key={key}>
                        <input
                          className="em-input"
                          type="number"
                          value={schoolForm.feesStructure[key]}
                          onChange={(e) =>
                            setSchoolForm({
                              ...schoolForm,
                              feesStructure: { ...schoolForm.feesStructure, [key]: e.target.value },
                            })
                          }
                          placeholder={`Enter ${label.toLowerCase()}`}
                        />
                      </FormField>
                    ))}
                  </div>

                  <Button type="submit" variant="primary" loading={loading}>
                    Create School
                  </Button>
                </form>
              </Card>
            </>
          )}

          {activeTab === 'edit-school' && selectedSchool && (
            <>
              <TopBar
                title={`Edit School — ${selectedSchool.name}`}
                actions={
                  <Button icon={ArrowLeft} onClick={() => goTo('schools')}>
                    Back to Schools
                  </Button>
                }
              />
              <Card>
                <form onSubmit={handleUpdateSchool}>
                  <FormField label="School Name">
                    <input
                      className="em-input"
                      type="text"
                      value={editSchoolForm.name}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, name: e.target.value })}
                      required
                      placeholder="Enter school name"
                    />
                  </FormField>
                  <FormField label={`School Code (current: ${selectedSchool.code})`}>
                    <input
                      className="em-input"
                      type="text"
                      value={editSchoolForm.newcode}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, newcode: e.target.value })}
                      placeholder="Enter new school code (leave empty to keep current)"
                    />
                  </FormField>
                  <FormField label="Address">
                    <textarea
                      className="em-textarea"
                      value={editSchoolForm.address}
                      onChange={(e) => setEditSchoolForm({ ...editSchoolForm, address: e.target.value })}
                      required
                      placeholder="Enter school address"
                      rows="3"
                    />
                  </FormField>

                  <p className="em-section-title">Fee Structure</p>
                  <div className="em-form-grid">
                    {feeFields.map(({ key, label }) => (
                      <FormField label={label} key={key}>
                        <input
                          className="em-input"
                          type="number"
                          value={editSchoolForm.feesStructure[key]}
                          onChange={(e) =>
                            setEditSchoolForm({
                              ...editSchoolForm,
                              feesStructure: { ...editSchoolForm.feesStructure, [key]: e.target.value },
                            })
                          }
                          placeholder={`Enter ${label.toLowerCase()}`}
                        />
                      </FormField>
                    ))}
                  </div>

                  <Button type="submit" variant="primary" loading={loading}>
                    Update School
                  </Button>
                </form>
              </Card>
            </>
          )}

          {activeTab === 'create-admin' && (
            <>
              <TopBar title="Create School Admin" />
              <Card>
                <form onSubmit={handleCreateAdmin}>
                  <FormField label="Admin Name">
                    <input
                      className="em-input"
                      type="text"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      required
                      placeholder="Enter admin full name"
                    />
                  </FormField>
                  <FormField label="Email Address">
                    <input
                      className="em-input"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      required
                      placeholder="Enter admin email"
                    />
                  </FormField>
                  <FormField label="Password">
                    <input
                      className="em-input"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      required
                      placeholder="Set admin password"
                    />
                  </FormField>
                  <FormField label="School Code">
                    <input
                      className="em-input"
                      type="text"
                      value={adminForm.schoolCode}
                      onChange={(e) => setAdminForm({ ...adminForm, schoolCode: e.target.value })}
                      required
                      placeholder="Enter school code for assignment"
                    />
                  </FormField>
                  <Button type="submit" variant="primary" loading={loading}>
                    Create Admin
                  </Button>
                </form>
              </Card>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              <TopBar
                title={selectedSchool ? `${selectedSchool.name} Analytics` : 'School Analytics'}
                actions={
                  <Button icon={ArrowLeft} onClick={() => goTo('schools')}>
                    Back to Schools
                  </Button>
                }
              />

              {!selectedSchool ? (
                <EmptyState
                  icon={BarChart3}
                  title="No school selected"
                  description="Choose a school from the Schools tab to view its analytics."
                />
              ) : loading ? (
                <div className="em-loading">Loading analytics for {selectedSchool.name}…</div>
              ) : !schoolAnalytics ? (
                <EmptyState title="No analytics data available for this school" />
              ) : (
                <>
                  <div className="em-analytics-section">
                    <p className="em-section-title">School Overview</p>
                    <div className="em-stats-grid">
                      <StatCard icon={Users} label="Teachers" value={schoolAnalytics.overview?.teachers || 0} />
                      <StatCard icon={GraduationCap} label="Students" value={schoolAnalytics.overview?.students || 0} tone="success" />
                      <StatCard icon={Users} label="Parents" value={schoolAnalytics.overview?.parents || 0} tone="info" />
                      <StatCard icon={Briefcase} label="Staff" value={schoolAnalytics.overview?.staff || 0} />
                    </div>
                  </div>

                  <div className="em-analytics-section">
                    <p className="em-section-title">Performance</p>
                    <div className="em-stats-grid">
                      <StatCard label="Attendance" value={`${schoolAnalytics.performance?.attendance || 0}%`} tone="success" />
                      <StatCard label="Academic Performance" value={`${schoolAnalytics.performance?.grades || 0}%`} tone="info" />
                    </div>
                    <p className="em-metric-note">
                      Single current snapshot — the backend doesn't yet track this over time, so no trend is shown.
                    </p>
                  </div>

                  <Card title="Fee Structure" className="em-analytics-section">
                    <BarChart
                      data={feeFields.map(({ key, label }) => ({
                        label: label.replace(/ \(₹\)$/, ''),
                        value: schoolAnalytics.feesStructure?.[key] || 0,
                      }))}
                      unit="₹"
                      emptyLabel="No fee structure defined"
                    />
                    {totalFees(schoolAnalytics.feesStructure) > 0 && (
                      <p className="em-metric-note">Total: ₹{totalFees(schoolAnalytics.feesStructure)}</p>
                    )}
                  </Card>

                  <Card title="Recent Activity" className="em-analytics-section">
                    {schoolAnalytics.recentActivity?.length ? (
                      <div className="em-entity-list">
                        {schoolAnalytics.recentActivity.map((activity, index) => (
                          <div className="em-detail-row" key={index}>
                            <span>{activity.message}</span>
                            <strong>{activity.date}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="No recent activity recorded" />
                    )}
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
