import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './ParentPanel.css';
import MessagesSection from '../components/Messages';

const Modal = ({ isOpen, onClose, title, children, size = "medium" }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: "modal-small",
    medium: "modal-medium", 
    large: "modal-large",
    xlarge: "modal-xlarge"
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sizeClasses[size]}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

const ChildSelector = ({ children, selectedChild, onSelectChild }) => {
  return (
    <div className="child-selector">
      <label>👨‍👩‍👧‍👦 Viewing for:</label>
      <select 
        value={selectedChild?._id || ''} 
        onChange={(e) => {
          const child = children.find(c => c._id === e.target.value);
          onSelectChild(child);
        }}
        className="child-dropdown"
      >
        <option value="">Select Child</option>
        {children.map(child => (
          <option key={child._id} value={child._id}>
            {child.name} - {child.classroom?.name || 'No Class'}
          </option>
        ))}
      </select>
    </div>
  );
};


const ParentDashboard = ({ dashboardData, selectedChild, showToast }) => {
  if (!dashboardData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const { parent, children, summary, recentGrades, recentMessages } = dashboardData;

  return (
    <div className="dashboard-content">

      <div className="welcome-section">
        <h2>👨‍👩‍👧‍👦 Welcome, {parent?.name}!</h2>
        <p>Monitoring your children's academic progress</p>
      </div>

      <div className="children-overview">
        <h3>👶 My Children</h3>
        <div className="children-grid">
          {children?.map(child => (
            <div key={child._id} className="child-card">
              <div className="child-avatar">
                {child.name?.charAt(0) || 'C'}
              </div>
              <div className="child-info">
                <h4>{child.name}</h4>
                <p>{child.classroom?.name || 'No Class Assigned'}</p>
                <div className="child-stats">
                  <span className="stat">📊 Class: {child.classroom?.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>Overall Average</h3>
              <div className="stat-number">{summary?.overallAverage || 'N/A'}</div>
              <div className="stat-desc">All Children</div>
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-content">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>Attendance Rate</h3>
              <div className="stat-number">{summary?.attendanceRate || 'N/A'}</div>
              <div className="stat-desc">This Month</div>
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-content">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <h3>Pending Homework</h3>
              <div className="stat-number">{summary?.pendingHomework || 0}</div>
              <div className="stat-desc">Assignments</div>
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-content">
            <div className="stat-icon">💬</div>
            <div className="stat-info">
              <h3>Unread Messages</h3>
              <div className="stat-number">{summary?.unreadMessages || 0}</div>
              <div className="stat-desc">From Teachers</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-grid">

        <div className="overview-card">
          <div className="card-header">
            <h3>📈 Recent Grades</h3>
          </div>
          <div className="card-content">
            {!recentGrades || recentGrades.length === 0 ? (
              <div className="empty-state">No recent grades</div>
            ) : (
              recentGrades.map((grade, index) => (
                <div key={index} className="grade-item">
                  <div className="grade-subject">
                    <strong>{grade.childName}</strong>
                    <span>{grade.subject} - {grade.examTitle}</span>
                  </div>
                  <div className={`grade-score ${grade.percentage >= 80 ? 'success' : grade.percentage >= 60 ? 'warning' : 'danger'}`}>
                    {grade.percentage}%
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>💬 Recent Messages</h3>
          </div>
          <div className="card-content">
            {!recentMessages || recentMessages.length === 0 ? (
              <div className="empty-state">No recent messages</div>
            ) : (
              recentMessages.map((message, index) => (
                <div key={index} className="message-item">
                  <div className="message-header">
                    <strong>{message.teacherName}</strong>
                    <span className="message-time">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="message-preview">{message.content}</p>
                  <small>Regarding: {message.childName}</small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ParentAttendanceSection = ({ attendanceData, selectedChild, showToast }) => {
  if (!attendanceData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  const { child, attendanceRecords } = attendanceData;

  const calculateSummary = () => {
    const present = attendanceRecords?.filter(a => a.status === 'present').length || 0;
    const absent = attendanceRecords?.filter(a => a.status === 'absent').length || 0;
    const total = attendanceRecords?.length || 0;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, total, percentage };
  };

  const summary = calculateSummary();

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📊 Attendance - {child || 'Child'}</h2>
        <div className="header-actions">
          <button className="btn btn-secondary">
            📅 This Month
          </button>
        </div>
      </div>

      <div className="attendance-content">

        <div className="attendance-hero">
          <div className="attendance-overview">
            <h3>Overall Attendance</h3>
            <div className="attendance-stats-grid">
              <div className="attendance-stat-card present">
                <div className="stat-icon-large">✅</div>
                <div className="stat-value-large">{summary.present}</div>
                <div className="stat-label-large">Present</div>
              </div>
              <div className="attendance-stat-card absent">
                <div className="stat-icon-large">❌</div>
                <div className="stat-value-large">{summary.absent}</div>
                <div className="stat-label-large">Absent</div>
              </div>
              <div className="attendance-stat-card total">
                <div className="stat-icon-large">📊</div>
                <div className="stat-value-large">{summary.total}</div>
                <div className="stat-label-large">Total</div>
              </div>
            </div>
          </div>

          <div className="attendance-progress">
            <h3>Attendance Rate</h3>
            <div className="progress-chart">
              <div className="progress-item">
                <span className="progress-label">Present</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar present" 
                    style={{ width: `${summary.percentage}%` }}
                  ></div>
                </div>
                <span className="progress-value">{summary.percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="attendance-records">
          <h3>Recent Attendance Records</h3>
          <div className="records-table-enhanced">
            <div className="record-header">
              <span>Date</span>
              <span>Subject</span>
              <span>Status</span>
              <span>Teacher</span>
            </div>
            {attendanceRecords?.map((record, index) => (
              <div key={index} className="record-item-enhanced">
                <span className="record-date">
                  {new Date(record.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span className="record-subject">{record.subject}</span>
                <span className={`record-status-badge ${record.status}`}>
                  {record.status === 'present' ? '✅' : '❌'}
                  {record.status}
                </span>
                <span className="record-teacher">{record.teacher?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


const ParentGradesSection = ({ gradesData, selectedChild, showToast }) => {
  if (!gradesData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading grades data...</p>
      </div>
    );
  }

  const { child, grades } = gradesData;

  const calculateSubjectAverages = () => {
    const subjectMap = {};
    
    grades?.forEach(grade => {
      if (!subjectMap[grade.subject]) {
        subjectMap[grade.subject] = {
          subject: grade.subject,
          totalPercentage: 0,
          count: 0,
          highestScore: 0,
          lowestScore: 100
        };
      }
      
      subjectMap[grade.subject].totalPercentage += grade.percentage;
      subjectMap[grade.subject].count++;
      
      if (grade.percentage > subjectMap[grade.subject].highestScore) {
        subjectMap[grade.subject].highestScore = grade.percentage;
      }
      if (grade.percentage < subjectMap[grade.subject].lowestScore) {
        subjectMap[grade.subject].lowestScore = grade.percentage;
      }
    });

    return Object.values(subjectMap).map(subject => ({
      ...subject,
      averagePercentage: subject.totalPercentage / subject.count
    }));
  };

  const subjectAverages = calculateSubjectAverages();
  const overallAverage = subjectAverages.length > 0 
    ? (subjectAverages.reduce((sum, subject) => sum + subject.averagePercentage, 0) / subjectAverages.length).toFixed(1)
    : 0;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>🎯 Academic Performance - {child || 'Child'}</h2>
        <div className="header-actions">
          <span className="academic-info">
            Overall Average: {overallAverage}%
          </span>
        </div>
      </div>

      <div className="grades-content">

        <div className="grades-hero">
          <div className="overall-performance">
            <div className="performance-score">
              <div 
                className="score-circle" 
                style={{ 
                  background: `conic-gradient(var(--primary) ${parseFloat(overallAverage) * 3.6}deg, #e2e8f0 0deg)` 
                }}
              >
                <span className="score-value">{overallAverage}%</span>
              </div>
              <h3>Overall Average</h3>
              <p>Based on {grades?.length || 0} exams across {subjectAverages.length} subjects</p>
            </div>
          </div>


          <div className="subjects-performance-section">
            <h3>📚 Subject-wise Analysis</h3>
            <div className="subjects-performance-grid">
              {subjectAverages.map((subject, index) => (
                <div key={index} className="subject-performance-card">
                  <div className="subject-header">
                    <div className="subject-title">
                      <h4>{subject.subject}</h4>
                      <span className="total-exams">{subject.count} exam(s)</span>
                    </div>
                    <span className={`performance-indicator ${
                      subject.averagePercentage >= 90 ? 'excellent' :
                      subject.averagePercentage >= 80 ? 'good' :
                      subject.averagePercentage >= 70 ? 'average' : 'poor'
                    }`}>
                      {subject.averagePercentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="subject-stats-grid">
                    <div className="subject-stat">
                      <span className="value">{subject.highestScore}%</span>
                      <span className="label">Highest</span>
                    </div>
                    <div className="subject-stat">
                      <span className="value">{subject.lowestScore}%</span>
                      <span className="label">Lowest</span>
                    </div>
                    <div className="subject-stat">
                      <span className="value">{subject.count}</span>
                      <span className="label">Exams</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grades-table-enhanced">
          <div className="table-header-section">
            <h3>📋 Detailed Grade History</h3>
            <div className="table-actions">
              <span className="total-records">
                Showing {grades?.length || 0} grade records
              </span>
            </div>
          </div>
          
          <div className="grades-table-container">
            <div className="grades-header">
              <span>Subject</span>
              <span>Exam</span>
              <span>Type</span>
              <span>Marks</span>
              <span>Percentage</span>
              <span>Grade</span>
              <span>Date</span>
            </div>
            
            {grades?.map((grade, index) => (
              <div key={grade._id || index} className="grade-row-enhanced">
                <span className="grade-subject">
                  <span className="subject-icon">📘</span>
                  {grade.subject}
                </span>
                <span className="grade-exam">{grade.examTitle}</span>
                <span className="grade-type">
                  <span className={`type-badge ${grade.examType}`}>
                    {grade.examType}
                  </span>
                </span>
                <span className="grade-marks">
                  {grade.marksObtained}/{grade.totalMarks}
                </span>
                <span className="grade-percentage">
                  <div className="percentage-bar">
                    <div 
                      className="percentage-fill"
                      style={{ width: `${grade.percentage}%` }}
                    ></div>
                    <span>{grade.percentage}%</span>
                  </div>
                </span>
                <span className={`grade-badge ${grade.grade}`}>
                  {grade.grade}
                </span>
                <span className="grade-date">
                  {new Date(grade.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


const ParentHomeworkSection = ({ homeworkData, selectedChild, showToast }) => {
  if (!homeworkData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading homework data...</p>
      </div>
    );
  }

  const { child, homework } = homeworkData;

  const getHomeworkStatus = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff < 0) return { status: 'overdue', label: 'Overdue', color: 'danger' };
    if (daysDiff <= 1) return { status: 'urgent', label: 'Due Soon', color: 'warning' };
    if (daysDiff <= 3) return { status: 'upcoming', label: 'Upcoming', color: 'info' };
    return { status: 'active', label: 'Active', color: 'success' };
  };

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📚 Homework - {child || 'Child'}</h2>
        <div className="header-actions">
          <button className="btn btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="homework-content">
        <div className="homework-summary">
          <div className="summary-stats">
            <span>Total: {homework?.length || 0}</span>
            <span>Upcoming: {homework?.filter(hw => getHomeworkStatus(hw.dueDate).status !== 'overdue').length || 0}</span>
            <span>Overdue: {homework?.filter(hw => getHomeworkStatus(hw.dueDate).status === 'overdue').length || 0}</span>
          </div>
        </div>

        <div className="homework-grid">
          {homework?.map(hw => {
            const status = getHomeworkStatus(hw.dueDate);
            
            return (
              <div key={hw._id} className="homework-card">
                <div className="homework-header">
                  <div className="homework-title-section">
                    <h3>{hw.title}</h3>
                    <span className={`status-badge ${status.status}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="homework-points">
                    <span className="points-badge">{hw.totalPoints} pts</span>
                  </div>
                </div>

                <div className="homework-meta">
                  <div className="meta-item">
                    <span className="meta-icon">📚</span>
                    <span>{hw.subject}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">👨‍🏫</span>
                    <span>{hw.teacher?.name}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">⏰</span>
                    <span className={status.status === 'urgent' || status.status === 'overdue' ? 'text-warning' : ''}>
                      Due: {new Date(hw.dueDate).toLocaleString()}
                    </span>
                  </div>
                </div>

                {hw.description && (
                  <div className="homework-description">
                    <p>{hw.description}</p>
                  </div>
                )}

                <div className="homework-actions">
                  <button 
                    className="btn btn-info btn-sm"
                    onClick={() => showToast(`Homework details: ${hw.title}`, 'info')}
                  >
                    👁️ View Details
                  </button>
                  <span className="submission-status">
                    {hw.isSubmitted ? '✅ Submitted' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {(!homework || homework.length === 0) && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No Homework</h3>
            <p>No homework assigned for this child.</p>
          </div>
        )}
      </div>
    </div>
  );
};


const ParentPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

   const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const BASE_URL = `${API}/api/parent`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchChildren = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/children`, getAuthHeaders());
      setChildren(response.data.children || []);
      if (response.data.children && response.data.children.length > 0) {
        setSelectedChild(response.data.children[0]);
      }
      return response.data.children || [];
    } catch (error) {
      showToast('Failed to load children data', 'error');
      return [];
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/dashboard`, getAuthHeaders());
      setDashboardData(response.data);
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedChild) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/attendance/${selectedChild._id}`,
        getAuthHeaders()
      );
      setAttendanceData(response.data);
    } catch (error) {
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    if (!selectedChild) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/grades/${selectedChild._id}`,
        getAuthHeaders()
      );
      setGradesData(response.data);
    } catch (error) {
      showToast('Failed to load grades data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomework = async () => {
    if (!selectedChild) return;
    
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/homework/${selectedChild._id}`,
        getAuthHeaders()
      );
      setHomeworkData(response.data);
    } catch (error) {
      showToast('Failed to load homework data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    if (!token || !userId) {
      showToast('Please login again', 'error');
      return;
    }

    const socket = io(API);
    socket.emit('join-user', userId);
    window.socket = socket;

    socket.on('new-chat-message', (data) => {
      showToast(`New message from ${data.from.name}`, 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  useEffect(() => {
    const initializeData = async () => {
      const childrenList = await fetchChildren();
      if (childrenList.length > 0) {
        await fetchDashboardData();
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    if (!selectedChild) return;

    switch (activeTab) {
      case 'dashboard':
        fetchDashboardData();
        break;
      case 'attendance':
        fetchAttendance();
        break;
      case 'grades':
        fetchGrades();
        break;
      case 'homework':
        fetchHomework();
        break;
    }
  }, [activeTab, selectedChild]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (children.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">👶</div>
          <h3>No Children Linked</h3>
          <p>Please contact your school administrator to link your children's accounts.</p>
        </div>
      );
    }

    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Selecting child...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <ParentDashboard dashboardData={dashboardData} selectedChild={selectedChild} showToast={showToast} />;
      
      case 'attendance':
        return <ParentAttendanceSection attendanceData={attendanceData} selectedChild={selectedChild} showToast={showToast} />;
      
      case 'grades':
        return <ParentGradesSection gradesData={gradesData} selectedChild={selectedChild} showToast={showToast} />;
      
      case 'homework':
        return <ParentHomeworkSection homeworkData={homeworkData} selectedChild={selectedChild} showToast={showToast} />;
      
      case 'messages':
        return (
        <div style={{ 
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          
        }}>
         <MessagesSection 
  showToast={showToast}
  userRole="parent"
/>
        </div>
      );
      
      default:
        return <ParentDashboard dashboardData={dashboardData} selectedChild={selectedChild} showToast={showToast} />;
    }
  };

  return (
    <div className="parent-panel">

      <header className="parent-header">
        <div className="header-left">
          <h1>👨‍👩‍👧‍👦 EduManage - Parent Portal</h1>
          <p>Monitor your children's academic journey</p>
        </div>
        <div className="header-actions">
          <button className="logout-btn" onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}>
             Logout
          </button>
        </div>
      </header>

      <div className="parent-layout">

        <nav className="parent-sidebar">
          <div className="sidebar-content">
            <div className="sidebar-header">
              <div className="parent-profile">
                <div className="profile-avatar">
                  {dashboardData?.parent?.name?.charAt(0) || 'P'}
                </div>
                <div className="profile-info">
                  <h3>{dashboardData?.parent?.name || 'Parent'}</h3>
                  <p>Parent Account</p>
                </div>
              </div>
            </div>

            {children.length > 0 && (
              <div className="child-selector-sidebar">
                <ChildSelector
                  children={children}
                  selectedChild={selectedChild}
                  onSelectChild={setSelectedChild}
                />
              </div>
            )}

            <div className="sidebar-nav">
              <button 
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">Dashboard</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                onClick={() => setActiveTab('attendance')}
              >
                <span className="nav-icon">✅</span>
                <span className="nav-text">Attendance</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'grades' ? 'active' : ''}`}
                onClick={() => setActiveTab('grades')}
              >
                <span className="nav-icon">🎯</span>
                <span className="nav-text">Grades</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'homework' ? 'active' : ''}`}
                onClick={() => setActiveTab('homework')}
              >
                <span className="nav-icon">📚</span>
                <span className="nav-text">Homework</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <span className="nav-icon">💬</span>
                <span className="nav-text">Messages</span>
              </button>
            </div>
          </div>
        </nav>

        <main className="parent-main">
          <div className="main-content">
            {renderContent()}
          </div>
        </main>
      </div>

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ParentPanel;