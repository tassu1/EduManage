import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  MessageSquare,
  Users,
  Baby,
} from 'lucide-react';
import api, { API_BASE_URL, getErrorMessage } from '../../services/api';
import { useToasts } from '../../hooks/useToasts';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import ToastStack from '../../components/ToastStack';
import BarChart from '../../components/BarChart';
import MessagesSection from '../components/Messages';
import '../../styles/layout.css';
import './ParentPanel.css';

const ChildSelector = ({ children: childList, selectedChild, onSelectChild }) => (
  <div className="em-child-selector">
    <label className="em-field__label" htmlFor="child-select"><Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Viewing for</label>
    <select
      id="child-select"
      className="em-select"
      value={selectedChild?._id || ''}
      onChange={(e) => onSelectChild(childList.find((c) => c._id === e.target.value))}
    >
      <option value="">Select Child</option>
      {childList.map((child) => (
        <option key={child._id} value={child._id}>{child.name} - {child.classroom?.name || 'No Class'}</option>
      ))}
    </select>
  </div>
);

const OverviewDashboard = ({ dashboardData }) => {
  if (!dashboardData) return <div className="em-loading">Loading dashboard…</div>;
  const { parent, children: childList, summary, recentGrades, recentMessages } = dashboardData;

  return (
    <>
      <TopBar title={`Welcome, ${parent?.name}!`} subtitle="Monitoring your children's academic progress" />

      <Card title="My Children" className="em-analytics-section">
        {!childList?.length ? (
          <EmptyState icon={Baby} title="No children linked yet" />
        ) : (
          <div className="em-entity-list">
            {childList.map((child) => (
              <div className="em-detail-row" key={child._id}>
                <span>{child.name}</span>
                <strong>{child.classroom?.name || 'No Class Assigned'}</strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="em-stats-grid">
        <StatCard icon={BarChart3} label="Overall Average" value={summary?.overallAverage || 'N/A'} />
        <StatCard icon={ClipboardCheck} label="Attendance Rate" value={summary?.attendanceRate || 'N/A'} tone="success" />
        <StatCard icon={BookOpen} label="Pending Homework" value={summary?.pendingHomework || 0} tone="info" />
        <StatCard icon={MessageSquare} label="Unread Messages" value={summary?.unreadMessages || 0} />
      </div>

      <div className="em-form-grid" style={{ alignItems: 'start' }}>
        <Card title="Recent Grades">
          {!recentGrades?.length ? (
            <EmptyState title="No recent grades" />
          ) : (
            recentGrades.map((grade, index) => (
              <div className="em-detail-row" key={index}>
                <span>{grade.childName} · {grade.subject} - {grade.examTitle}</span>
                <strong>{grade.percentage}%</strong>
              </div>
            ))
          )}
        </Card>

        <Card title="Recent Messages">
          {!recentMessages?.length ? (
            <EmptyState title="No recent messages" />
          ) : (
            recentMessages.map((message, index) => (
              <div className="em-detail-row" key={index}>
                <span>{message.teacherName} · re: {message.childName} — {message.content}</span>
                <strong>{new Date(message.timestamp).toLocaleDateString()}</strong>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
};

const AttendanceSection = ({ attendanceData }) => {
  if (!attendanceData) return <div className="em-loading">Loading attendance data…</div>;
  const { child, attendanceRecords } = attendanceData;
  const present = attendanceRecords?.filter((a) => a.status === 'present').length || 0;
  const absent = attendanceRecords?.filter((a) => a.status === 'absent').length || 0;
  const total = attendanceRecords?.length || 0;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const statusTone = { present: 'success', absent: 'danger' };

  return (
    <>
      <TopBar title={`Attendance — ${child || 'Child'}`} />

      <div className="em-stats-grid">
        <StatCard icon={ClipboardCheck} label="Present" value={present} tone="success" />
        <StatCard label="Absent" value={absent} tone="danger" />
        <StatCard label="Total" value={total} />
      </div>

      <Card title="Attendance Rate" className="em-analytics-section">
        <BarChart data={[{ label: 'Present', value: percentage }, { label: 'Absent', value: 100 - percentage }]} unit="%" />
      </Card>

      <Card title="Recent Attendance Records">
        {!attendanceRecords?.length ? (
          <EmptyState title="No attendance records yet" />
        ) : (
          <div className="em-table-wrap">
            <table className="em-table">
              <thead><tr><th>Date</th><th>Subject</th><th>Status</th><th>Teacher</th></tr></thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>{record.subject}</td>
                    <td><span className={`em-badge em-badge--${statusTone[record.status] || 'default'}`}>{record.status}</span></td>
                    <td>{record.teacher?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
};

const gradeSubjectAverages = (grades) => {
  const map = {};
  (grades || []).forEach((g) => {
    if (!map[g.subject]) map[g.subject] = { subject: g.subject, total: 0, count: 0, highest: 0, lowest: 100 };
    const s = map[g.subject];
    s.total += g.percentage;
    s.count += 1;
    s.highest = Math.max(s.highest, g.percentage);
    s.lowest = Math.min(s.lowest, g.percentage);
  });
  return Object.values(map).map((s) => ({ ...s, average: s.total / s.count }));
};

const GradesSection = ({ gradesData }) => {
  if (!gradesData) return <div className="em-loading">Loading grades data…</div>;
  const { child, grades } = gradesData;
  const subjectAverages = gradeSubjectAverages(grades);
  const overallAverage = subjectAverages.length
    ? (subjectAverages.reduce((sum, s) => sum + s.average, 0) / subjectAverages.length).toFixed(1)
    : 0;

  return (
    <>
      <TopBar title={`Academic Performance — ${child || 'Child'}`} subtitle={`Overall Average: ${overallAverage}%`} />

      <div className="em-stats-grid">
        <StatCard icon={BarChart3} label="Overall Average" value={`${overallAverage}%`} />
        <StatCard label="Total Exams" value={grades?.length || 0} tone="info" />
        <StatCard label="Subjects" value={subjectAverages.length} />
      </div>

      <Card title="Subject-wise Averages" className="em-analytics-section">
        <BarChart data={subjectAverages.map((s) => ({ label: s.subject, value: Math.round(s.average * 10) / 10 }))} unit="%" />
      </Card>

      <div className="em-entity-list" style={{ marginBottom: 'var(--space-5)' }}>
        {subjectAverages.map((subject, index) => (
          <Card key={index} title={subject.subject}>
            <div className="em-detail-row"><span>Average</span><strong>{subject.average.toFixed(1)}%</strong></div>
            <div className="em-detail-row"><span>Highest</span><strong>{subject.highest}%</strong></div>
            <div className="em-detail-row"><span>Lowest</span><strong>{subject.lowest}%</strong></div>
            <div className="em-detail-row"><span>Exams</span><strong>{subject.count}</strong></div>
          </Card>
        ))}
      </div>

      <Card title={`Detailed Grade History (${grades?.length || 0} records)`}>
        <div className="em-table-wrap">
          <table className="em-table">
            <thead><tr><th>Subject</th><th>Exam</th><th>Type</th><th>Marks</th><th>%</th><th>Grade</th><th>Date</th></tr></thead>
            <tbody>
              {(grades || []).map((grade, index) => (
                <tr key={grade._id || index}>
                  <td>{grade.subject}</td>
                  <td>{grade.examTitle}</td>
                  <td>{grade.examType}</td>
                  <td>{grade.marksObtained}/{grade.totalMarks}</td>
                  <td>{grade.percentage}%</td>
                  <td>{grade.grade}</td>
                  <td>{new Date(grade.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

const getHomeworkStatus = (dueDate) => {
  const daysDiff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 0) return { label: 'Overdue', tone: 'danger' };
  if (daysDiff <= 1) return { label: 'Due Soon', tone: 'default' };
  if (daysDiff <= 3) return { label: 'Upcoming', tone: 'info' };
  return { label: 'Active', tone: 'success' };
};

const HomeworkSection = ({ homeworkData }) => {
  if (!homeworkData) return <div className="em-loading">Loading homework data…</div>;
  const { child, homework } = homeworkData;
  const upcoming = homework?.filter((hw) => getHomeworkStatus(hw.dueDate).label !== 'Overdue').length || 0;
  const overdue = homework?.filter((hw) => getHomeworkStatus(hw.dueDate).label === 'Overdue').length || 0;

  return (
    <>
      <TopBar title={`Homework — ${child || 'Child'}`} />
      <p className="em-field__hint" style={{ marginBottom: 'var(--space-4)' }}>
        Total: {homework?.length || 0} · Upcoming: {upcoming} · Overdue: {overdue}
      </p>

      {!homework?.length ? (
        <EmptyState icon={BookOpen} title="No Homework" description="No homework assigned for this child." />
      ) : (
        <div className="em-entity-list">
          {homework.map((hw) => {
            const status = getHomeworkStatus(hw.dueDate);
            return (
              <Card
                key={hw._id}
                title={hw.title}
                actions={
                  <span className={`em-badge em-badge--${hw.isSubmitted ? 'success' : 'default'}`}>
                    {hw.isSubmitted ? 'Submitted' : 'Pending'}
                  </span>
                }
              >
                <div className="em-detail-row">
                  <span>Status</span>
                  <strong><span className={`em-badge em-badge--${status.tone}`}>{status.label}</span> · {hw.totalPoints} pts</strong>
                </div>
                <div className="em-detail-row"><span>Subject</span><strong>{hw.subject}</strong></div>
                <div className="em-detail-row"><span>Teacher</span><strong>{hw.teacher?.name}</strong></div>
                <div className="em-detail-row"><span>Due</span><strong>{new Date(hw.dueDate).toLocaleString()}</strong></div>
                {hw.description && <div className="em-detail-row"><span>Description</span><strong>{hw.description}</strong></div>}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

/* =========================================================================
   Main component
   ========================================================================= */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'grades', label: 'Grades', icon: BarChart3 },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

const ParentPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToasts();

  const fetchChildren = async () => {
    try {
      const response = await api.get('/api/parent/children');
      const list = response.data.children || [];
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0]);
      return list;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load children data'), 'error');
      return [];
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/parent/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load dashboard data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/parent/attendance/${selectedChild._id}`);
      setAttendanceData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load attendance data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/parent/grades/${selectedChild._id}`);
      setGradesData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load grades data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomework = async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/parent/homework/${selectedChild._id}`);
      setHomeworkData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load homework data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Preserved exactly: only listens for 'new-chat-message', unlike the
  // other three roles which also handle 'message-error' — a genuine
  // difference in the original, not an oversight introduced here.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      showToast('Please login again', 'error');
      return;
    }
    const socket = io(API_BASE_URL);
    socket.emit('join-user', userId);
    window.socket = socket;
    socket.on('new-chat-message', (data) => showToast(`New message from ${data.from.name}`, 'info'));
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      const childrenList = await fetchChildren();
      if (childrenList.length > 0) await fetchDashboardData();
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (activeTab === 'attendance') fetchAttendance();
    else if (activeTab === 'grades') fetchGrades();
    else if (activeTab === 'homework') fetchHomework();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedChild]);

  const goTo = (tab) => setActiveTab(tab);

  const renderContent = () => {
    if (loading) return <div className="em-loading">Loading…</div>;

    if (children.length === 0) {
      return <EmptyState icon={Baby} title="No Children Linked" description="Please contact your school administrator to link your children's accounts." />;
    }

    // Preserved exactly from the original: setting state during render to
    // auto-select the first child. Not converted to a useEffect, since
    // that would change the render timing of this fallback state.
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
      return <div className="em-loading">Selecting child…</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard dashboardData={dashboardData} />;
      case 'attendance':
        return <AttendanceSection attendanceData={attendanceData} />;
      case 'grades':
        return <GradesSection gradesData={gradesData} />;
      case 'homework':
        return <HomeworkSection homeworkData={homeworkData} showToast={showToast} />;
      case 'messages':
        // Not yet redesigned — Messaging is its own phase. Renders as-is for now.
        return <MessagesSection showToast={showToast} userRole="parent" />;
      default:
        return <OverviewDashboard dashboardData={dashboardData} />;
    }
  };

  return (
    <div className="em-app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab}
        onSelect={goTo}
        roleLabel={dashboardData?.parent?.name || 'Parent'}
        onLogout={() => {
          localStorage.clear();
          window.location.reload();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={removeToast} />

      <main className="em-main">
        <div className={activeTab === 'messages' ? '' : 'em-content'}>
          {children.length > 0 && (
            <ChildSelector children={children} selectedChild={selectedChild} onSelectChild={setSelectedChild} />
          )}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default ParentPanel;
