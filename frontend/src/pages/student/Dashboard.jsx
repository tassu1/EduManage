import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  CalendarClock,
  MessageSquare,
  Bot,
  RefreshCw,
  Eye,
  Send,
  Trash2,
  Paperclip,
  Sprout,
  Calculator,
  FlaskConical,
  Lightbulb,
} from 'lucide-react';
import api, { API_BASE_URL, getErrorMessage } from '../../services/api';
import { useToasts } from '../../hooks/useToasts';
import Sidebar from '../../components/Sidebar';
import TopBar from '../../components/TopBar';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import EmptyState from '../../components/EmptyState';
import ToastStack from '../../components/ToastStack';
import BarChart from '../../components/BarChart';
import Modal from '../../components/Modal';
import MessagesSection from '../components/Messages';
import '../../styles/layout.css';
import './Studentpanel.css';

const getValidatedUserData = () => {
  try {
    let userId = localStorage.getItem('userId');
    let schoolId = localStorage.getItem('schoolId');
    const token = localStorage.getItem('token');
    if ((!userId || !schoolId) && localStorage.getItem('user')) {
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData._id && !userId) {
          userId = userData._id;
          localStorage.setItem('userId', userId);
        }
        if (userData.school && !schoolId) {
          schoolId = userData.school;
          localStorage.setItem('schoolId', schoolId);
        }
        if (userData.role && !localStorage.getItem('userRole')) localStorage.setItem('userRole', userData.role);
      } catch {
        /* ignore malformed stored user JSON, matches original */
      }
    }
    if (!userId || !schoolId || !token) return null;
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(userId) || !objectIdRegex.test(schoolId)) return null;
    return { userId, schoolId, token };
  } catch {
    return null;
  }
};

const HomeworkSubmissionModal = ({ isOpen, onClose, homework, onSubmitHomework, showToast }) => {
  const [submissionText, setSubmissionText] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmissionText('');
      setFiles([]);
    }
  }, [isOpen]);

  const handleFileChange = (e) => setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionText.trim() && files.length === 0) {
      showToast('Please add submission text or upload files', 'error');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('homeworkId', homework._id);
      formData.append('submissionText', submissionText);
      files.forEach((file) => formData.append('attachments', file));
      await onSubmitHomework(formData);
      onClose();
      showToast('Homework submitted successfully!');
    } catch {
      showToast('Failed to submit homework', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Homework — ${homework?.title}`} size="large">
      <form onSubmit={handleSubmit}>
        <FormField label={`Your Submission Text (${submissionText.length}/5000)`}>
          <textarea className="em-textarea" rows="6" maxLength={5000} value={submissionText}
            placeholder="Describe your submission, add notes, or paste your work here…" onChange={(e) => setSubmissionText(e.target.value)} />
        </FormField>

        <FormField label="Attach Files (max 5, 10MB each)">
          <input type="file" multiple disabled={files.length >= 5} onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.zip" />
          {files.length > 0 && (
            <div className="em-entity-list" style={{ marginTop: 'var(--space-3)' }}>
              {files.map((file, index) => (
                <div className="em-detail-row" key={index}>
                  <span><Paperclip size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <Button variant="ghost" onClick={() => removeFile(index)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </FormField>

        {homework && (
          <Card title="Homework Instructions">
            <p>{homework.instructions || 'No specific instructions provided.'}</p>
            <div className="em-detail-row"><span>Due Date</span><strong>{new Date(homework.dueDate).toLocaleString()}</strong></div>
            <div className="em-detail-row"><span>Points</span><strong>{homework.totalPoints}</strong></div>
            <div className="em-detail-row"><span>Subject</span><strong>{homework.subject}</strong></div>
          </Card>
        )}

        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!submissionText.trim() && files.length === 0}>
            Submit Homework
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AI_SUGGESTIONS = [
  { icon: Sprout, text: 'Can you explain photosynthesis in a fun way?' },
  { icon: Calculator, text: 'Help me solve quadratic equations' },
  { icon: FlaskConical, text: "What's the water cycle?" },
  { icon: Lightbulb, text: 'How can I study more effectively?' },
];

const AIChatSection = ({ showToast }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      const userData = getValidatedUserData();
      if (userData) newSocket.emit('join-user', userData.userId);
    });
    newSocket.on('disconnect', () => setIsConnected(false));
    newSocket.on('connect_error', () => setIsConnected(false));

    newSocket.on('learning-response', (data) => {
      setThinking(false);
      if (data.success) {
        setMessages((prev) => [
          ...prev.filter((m) => !m.isThinking),
          { id: Date.now() + 1, question: data.question, answer: data.answer, timestamp: new Date(data.timestamp), isUser: false, gradeLevel: data.gradeLevel },
        ]);
        showToast('AI response received!');
      }
    });
    newSocket.on('ai-thinking', (data) => setThinking(data.thinking));
    newSocket.on('new-conversation-added', (data) => {
      setMessages((prev) => [...prev, { id: data.id, question: data.question, answer: data.answer, timestamp: new Date(data.timestamp), isUser: false, messageType: data.type }]);
    });
    newSocket.on('ai-error', (data) => {
      setThinking(false);
      showToast(data.error, 'error');
      setMessages((prev) => prev.filter((m) => !m.isThinking));
    });
    newSocket.on('learning-history', (data) => {
      setLoading(false);
      if (data.success && data.sessions) {
        setMessages(data.sessions.map((s) => ({ id: s.id, question: s.question, answer: s.answer, timestamp: new Date(s.timestamp), isUser: false, messageType: s.type })));
        showToast('Conversation history loaded!');
      } else {
        showToast('No conversation history found', 'info');
      }
    });

    loadConversationHistory(newSocket);
    return () => newSocket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversationHistory = (sock = socket) => {
    const userData = getValidatedUserData();
    if (!(userData && sock)) {
      setLoading(false);
      showToast('Not connected to server', 'error');
      return;
    }
    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      showToast('History loading timeout', 'error');
    }, 10000);

    sock.once('learning-history', (data) => {
      clearTimeout(timeoutId);
      setLoading(false);
      if (data.success && data.sessions) {
        setMessages(data.sessions.map((s) => ({ id: s.id, question: s.question, answer: s.answer, timestamp: new Date(s.timestamp), isUser: false, messageType: s.type })));
        showToast(`Loaded ${data.sessions.length} conversations`);
      } else {
        showToast(data.error || 'Failed to load history', 'error');
      }
    });
    sock.emit('get-learning-history', userData.userId);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || thinking || !socket || !isConnected) return;
    const userData = getValidatedUserData();
    if (!userData) {
      showToast('Please login again', 'error');
      return;
    }
    setMessages((prev) => [...prev, { id: Date.now(), question: inputMessage, answer: '', timestamp: new Date(), isUser: true, isThinking: true }]);
    setInputMessage('');
    setThinking(true);
    socket.emit('ask-ai-tutor', { message: inputMessage.trim(), userId: userData.userId });
  };

  const clearHistory = async () => {
    try {
      await api.delete('/api/student/ai/clear');
      setMessages([]);
      showToast('Conversation history cleared');
    } catch {
      showToast('Failed to clear history', 'error');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <>
      <TopBar
        title="AI Learning Assistant"
        subtitle={
          <span className={`em-badge em-badge--${isConnected ? 'success' : 'danger'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        }
        actions={
          <>
            <Button icon={Trash2} disabled={messages.length === 0 || thinking} onClick={clearHistory}>Clear History</Button>
            <Button icon={RefreshCw} disabled={thinking} onClick={() => loadConversationHistory()}>Refresh</Button>
          </>
        }
      />

      <Card>
        <div className="em-detail-row" style={{ marginBottom: 'var(--space-4)' }}>
          <span><Bot size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /><strong style={{ color: 'var(--ink)' }}>Professor Aria — AI Tutor</strong></span>
        </div>

        <div className="em-chat-messages">
          {loading ? (
            <div className="em-loading">Loading your learning conversations…</div>
          ) : messages.length === 0 ? (
            <EmptyState icon={Bot} title="Welcome to AI Learning!" description="Start a conversation with your AI tutor:"
              action={
                <div className="em-quick-actions">
                  {AI_SUGGESTIONS.map((s, i) => (
                    <Button key={i} icon={s.icon} onClick={() => setInputMessage(s.text)}>{s.text}</Button>
                  ))}
                </div>
              }
            />
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={message.id || index}>
                  <div className="em-chat-bubble em-chat-bubble--user">
                    <p>{message.question}</p>
                    <span className="em-chat-bubble__time">{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="em-chat-bubble em-chat-bubble--ai">
                    <p>{message.answer}</p>
                    <span className="em-chat-bubble__time">{new Date(message.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="em-chat-bubble em-chat-bubble--ai em-chat-bubble--thinking">
                  <span className="em-chat-typing"><span /><span /><span /></span>
                  Professor Aria is thinking…
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <form onSubmit={sendMessage} className="em-chat-input-row">
          <input
            className="em-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Professor Aria anything about your studies…"
            disabled={thinking || !isConnected}
            maxLength={1000}
          />
          <Button type="submit" variant="primary" icon={Send} disabled={!inputMessage.trim() || thinking || !isConnected}
            title={!isConnected ? 'Not connected to server' : 'Send message'}>
            Send
          </Button>
        </form>
      </Card>
    </>
  );
};

const OverviewDashboard = ({ dashboardData }) => {
  if (!dashboardData) return <div className="em-loading">Loading dashboard…</div>;
  const { profile, summary, recentGrades, upcomingHomework, upcomingExams } = dashboardData;

  return (
    <>
      <TopBar title={`Welcome back, ${profile?.name}!`} subtitle={`Class: ${profile?.classroom?.name} · Stay updated with your academic progress`} />

      <div className="em-stats-grid">
        <StatCard icon={BarChart3} label="Overall Average" value={summary?.overallAverage || '0%'} />
        <StatCard icon={ClipboardCheck} label="Attendance (30 days)" value={summary?.recentAttendance || '0%'} tone="success" />
        <StatCard icon={BookOpen} label="Upcoming Homework" value={summary?.upcomingHomework || 0} tone="info" />
        <StatCard icon={CalendarClock} label="Recent Exams" value={summary?.totalExams || 0} />
      </div>

      <div className="em-form-grid" style={{ alignItems: 'start' }}>
        <Card title="Recent Grades">
          {!recentGrades?.length ? (
            <EmptyState title="No recent grades" />
          ) : (
            recentGrades.map((grade, index) => (
              <div className="em-detail-row" key={index}>
                <span>{grade.subject} · {grade.examTitle}</span>
                <strong>{grade.percentage}% ({grade.grade})</strong>
              </div>
            ))
          )}
        </Card>

        <Card title="Upcoming Homework">
          {!upcomingHomework?.length ? (
            <EmptyState title="No upcoming homework" />
          ) : (
            upcomingHomework.map((hw, index) => (
              <div className="em-detail-row" key={index}>
                <span>{hw.title} · {hw.subject}</span>
                <strong>Due {new Date(hw.dueDate).toLocaleDateString()}</strong>
              </div>
            ))
          )}
        </Card>

        <Card title="Upcoming Exams">
          {!upcomingExams?.length ? (
            <EmptyState title="No upcoming exams" />
          ) : (
            upcomingExams.map((exam, index) => (
              <div className="em-detail-row" key={index}>
                <span>{exam.title} · {exam.subject}</span>
                <strong>{new Date(exam.date).toLocaleDateString()}</strong>
              </div>
            ))
          )}
        </Card>
      </div>
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

const HomeworkList = ({ homework, onViewDetails, onSubmitHomework }) => (
  <div className="em-entity-list">
    {homework.map((hw) => {
      const status = getHomeworkStatus(hw.dueDate);
      return (
        <Card
          key={hw._id}
          title={hw.title}
          actions={
            <>
              <Button icon={Eye} onClick={() => onViewDetails(hw)}>View Details</Button>
              <Button variant="primary" icon={Send} disabled={status.label === 'Overdue'} onClick={() => onSubmitHomework(hw)}>Submit</Button>
            </>
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
);

const AttendanceSection = ({ attendanceData }) => {
  if (!attendanceData) return <div className="em-loading">Loading attendance data…</div>;
  const { summary, attendanceRecords } = attendanceData;
  const statusTone = { present: 'success', absent: 'danger', late: 'default' };

  return (
    <>
      <TopBar title="Attendance Overview" />

      <div className="em-stats-grid">
        <StatCard icon={ClipboardCheck} label="Present" value={summary?.presentClasses || 0} tone="success" />
        <StatCard label="Absent" value={summary?.absentClasses || 0} tone="danger" />
        <StatCard label="Late" value={summary?.lateClasses || 0} tone="info" />
        <StatCard label="Total Classes" value={summary?.totalClasses || 0} />
      </div>

      <Card title="Attendance Rate" className="em-analytics-section">
        <BarChart
          data={[
            { label: 'Present', value: summary?.attendancePercentage || 0 },
            { label: 'Absent', value: 100 - parseFloat(summary?.attendancePercentage || 0) },
          ]}
          unit="%"
        />
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
    if (!map[g.subject]) map[g.subject] = { subject: g.subject, total: 0, count: 0, highest: 0, lowest: 100, grades: [] };
    const s = map[g.subject];
    s.total += g.percentage;
    s.count += 1;
    s.grades.push(g);
    s.highest = Math.max(s.highest, g.percentage);
    s.lowest = Math.min(s.lowest, g.percentage);
  });
  return Object.values(map).map((s) => ({ ...s, average: s.total / s.count }));
};

const GradesSection = ({ gradesData }) => {
  if (!gradesData) return <div className="em-loading">Loading grades data…</div>;
  const { overallAverage, grades, totalExams, academicYear } = gradesData;
  const subjectAverages = gradeSubjectAverages(grades);
  const recentGrades = (grades || []).slice(-3).reverse();
  const strongestSubject = subjectAverages.length
    ? subjectAverages.reduce((a, b) => (a.average > b.average ? a : b)).subject
    : 'N/A';
  const trend = recentGrades.length >= 2 ? (recentGrades[0].percentage >= recentGrades[1].percentage ? 'Improving' : 'Needs Attention') : 'Establishing';
  const aGrades = (grades || []).filter((g) => g.grade === 'A' || g.grade === 'A+').length;

  return (
    <>
      <TopBar title="Academic Performance" subtitle={`${academicYear} · Semester ${grades?.[0]?.semester || '1'}`} />

      <div className="em-stats-grid">
        <StatCard icon={BarChart3} label="Overall Average" value={overallAverage} />
        <StatCard label="Total Exams" value={totalExams} tone="info" />
        <StatCard label="Subjects" value={subjectAverages.length} />
        <StatCard label="Best Subject Avg" value={`${Math.max(...subjectAverages.map((s) => s.average), 0).toFixed(1)}%`} tone="success" />
      </div>

      <Card title="Subject-wise Averages" className="em-analytics-section">
        <BarChart data={subjectAverages.map((s) => ({ label: s.subject, value: Math.round(s.average * 10) / 10 }))} unit="%" />
      </Card>

      <div className="em-form-grid" style={{ alignItems: 'start' }}>
        <Card title="Recent Performance">
          {recentGrades.map((grade, index) => (
            <div className="em-detail-row" key={index}>
              <span>{grade.subject} · {grade.examTitle}</span>
              <strong>{grade.percentage}% ({grade.grade})</strong>
            </div>
          ))}
        </Card>

        <Card title="Performance Insights">
          <div className="em-detail-row"><span>Strongest Subject</span><strong>{strongestSubject}</strong></div>
          <div className="em-detail-row"><span>Overall Trend</span><strong>{trend}</strong></div>
          <div className="em-detail-row"><span>Grade Distribution</span><strong>{aGrades} A grades</strong></div>
        </Card>
      </div>

      <Card title={`Detailed Grade History (${grades?.length || 0} records)`} className="em-analytics-section">
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

/* =========================================================================
   Main component
   ========================================================================= */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'grades', label: 'Grades', icon: BarChart3 },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'exams', label: 'Exams', icon: CalendarClock },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'ai', label: 'AI Tutor', icon: Bot },
];

const StudentPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [examSchedule, setExamSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToasts();

  const [homeworkSubmissionModal, setHomeworkSubmissionModal] = useState({ isOpen: false, homework: null });

  useEffect(() => {
    const userData = getValidatedUserData();
    if (!userData) {
      showToast('Please login again', 'error');
      return;
    }
    const socket = io(API_BASE_URL);
    socket.emit('join-user', userData.userId);
    window.socket = socket;
    socket.on('new-chat-message', (data) => showToast(`New message from ${data.from.name}`, 'info'));
    socket.on('message-error', (data) => showToast(data.error, 'error'));
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load dashboard data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/attendance');
      setAttendanceData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load attendance data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/grades');
      setGradesData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load grades data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/homework');
      setHomeworkData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load homework data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamSchedule = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/student/exam-schedule');
      setExamSchedule(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load exam schedule'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitHomework = async (formData) => {
    try {
      await api.post('/api/student/homework/submit', formData);
      fetchHomework();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to submit homework'), 'error');
      throw err;
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (activeTab === 'attendance') fetchAttendance();
    else if (activeTab === 'grades') fetchGrades();
    else if (activeTab === 'homework') fetchHomework();
    else if (activeTab === 'exams') fetchExamSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const goTo = (tab) => setActiveTab(tab);

  const renderContent = () => {
    if (loading && !['messages', 'ai'].includes(activeTab)) {
      return <div className="em-loading">Loading…</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard dashboardData={dashboardData} />;

      case 'attendance':
        return <AttendanceSection attendanceData={attendanceData} />;

      case 'grades':
        return <GradesSection gradesData={gradesData} />;

      case 'homework':
        return (
          <>
            <TopBar title="My Homework" actions={<Button icon={RefreshCw} onClick={fetchHomework}>Refresh</Button>} />
            {homeworkData && (
              <>
                <p className="em-field__hint" style={{ marginBottom: 'var(--space-4)' }}>
                  Total: {homeworkData.summary?.total || 0} · Upcoming: {homeworkData.summary?.upcoming || 0} · Past Due: {homeworkData.summary?.pastDue || 0}
                </p>
                <p className="em-section-title">Upcoming Homework</p>
                {!homeworkData.upcomingHomework?.length ? (
                  <EmptyState title="No upcoming homework" />
                ) : (
                  <HomeworkList
                    homework={homeworkData.upcomingHomework}
                    onViewDetails={(hw) => showToast(`Viewing details for: ${hw.title}`, 'info')}
                    onSubmitHomework={(hw) => setHomeworkSubmissionModal({ isOpen: true, homework: hw })}
                  />
                )}
                <p className="em-section-title" style={{ marginTop: 'var(--space-5)' }}>Past Due Homework</p>
                {!homeworkData.pastDueHomework?.length ? (
                  <EmptyState title="No past due homework" />
                ) : (
                  <HomeworkList
                    homework={homeworkData.pastDueHomework}
                    onViewDetails={(hw) => showToast(`Viewing details for: ${hw.title}`, 'info')}
                    onSubmitHomework={(hw) => setHomeworkSubmissionModal({ isOpen: true, homework: hw })}
                  />
                )}
              </>
            )}
          </>
        );

      case 'exams':
        return (
          <>
            <TopBar title="Exam Schedule" />
            {examSchedule && (
              <>
                <div className="em-stats-grid">
                  <StatCard label="Total Exams" value={examSchedule.summary?.totalExams || 0} />
                  <StatCard label="Upcoming" value={examSchedule.summary?.upcoming || 0} tone="info" />
                  <StatCard label="Completed" value={examSchedule.summary?.completed || 0} tone="success" />
                </div>
                {!examSchedule.exams?.length ? (
                  <EmptyState title="No exams scheduled" />
                ) : (
                  <div className="em-entity-list">
                    {examSchedule.exams.map((exam, index) => (
                      <Card key={index} title={exam.title}
                        actions={<span className={`em-badge em-badge--${exam.isUpcoming ? 'info' : 'success'}`}>{exam.isUpcoming ? 'Upcoming' : 'Completed'}</span>}
                      >
                        <div className="em-detail-row"><span>Subject</span><strong>{exam.subject}</strong></div>
                        <div className="em-detail-row"><span>Type</span><strong>{exam.examType}</strong></div>
                        <div className="em-detail-row"><span>Date</span><strong>{new Date(exam.date).toLocaleDateString()}</strong></div>
                        <div className="em-detail-row"><span>Time</span><strong>{exam.startTime} – {exam.endTime}</strong></div>
                        <div className="em-detail-row"><span>Room</span><strong>{exam.room || 'TBA'}</strong></div>
                        {exam.isUpcoming && exam.daysRemaining > 0 && (
                          <div className="em-detail-row"><span>Remaining</span><strong>{exam.daysRemaining} days</strong></div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        );

      case 'messages':
        // Not yet redesigned — Messaging is its own phase. Renders as-is for now.
        return <MessagesSection showToast={showToast} userRole="student" />;

      case 'ai':
        return <AIChatSection showToast={showToast} />;

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
        roleLabel={dashboardData?.profile?.name || 'Student'}
        onLogout={() => {
          localStorage.clear();
          window.location.reload();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={removeToast} />

      <main className="em-main">
        <div className={activeTab === 'messages' ? '' : 'em-content'}>
          {renderContent()}
        </div>
      </main>

      <HomeworkSubmissionModal
        isOpen={homeworkSubmissionModal.isOpen}
        onClose={() => setHomeworkSubmissionModal({ isOpen: false, homework: null })}
        homework={homeworkSubmissionModal.homework}
        onSubmitHomework={handleSubmitHomework}
        showToast={showToast}
      />
    </div>
  );
};

export default StudentPanel;
