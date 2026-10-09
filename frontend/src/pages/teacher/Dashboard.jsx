import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  LayoutDashboard,
  School,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Users,
  Search,
  Paperclip,
  Download,
  Star,
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
import Modal from '../../components/Modal';
import MessagesSection from '../components/Messages';
import '../../styles/layout.css';
import './TeacherPanel.css';

/* =========================================================================
   Modals — same fields/validation/onSubmit contracts as the original.
   ========================================================================= */

const AttendanceModal = ({ isOpen, onClose, classroom, onMarkAttendance }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classroom?.students) {
      setAttendanceList(
        classroom.students.map((student) => ({
          studentId: student._id,
          name: student.name,
          email: student.email,
          status: 'present',
        }))
      );
      setSubject(classroom.subject || '');
    }
  }, [isOpen, classroom]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceList((prev) => prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please select a subject');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onMarkAttendance(classroom._id, date, subject, attendanceList);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mark Attendance — ${classroom?.name}`} size="large">
      <form onSubmit={handleSubmit}>
        <div className="em-form-grid">
          <FormField label="Date">
            <input className="em-input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Subject">
            <input className="em-input" type="text" required value={subject} placeholder="Enter subject"
              onChange={(e) => setSubject(e.target.value)} />
            {classroom?.subject && <small className="em-field__hint">Classroom subject: {classroom.subject}</small>}
          </FormField>
        </div>

        <p className="em-section-title">Student Attendance</p>
        <div className="em-table-wrap">
          <table className="em-table">
            <thead><tr><th>Student</th><th>Status</th></tr></thead>
            <tbody>
              {attendanceList.map((student) => (
                <tr key={student.studentId}>
                  <td>
                    <strong style={{ color: 'var(--ink)' }}>{student.name}</strong><br />
                    <small>{student.email}</small>
                  </td>
                  <td>
                    <div className="em-quick-actions">
                      <Button
                        type="button"
                        variant={student.status === 'present' ? 'primary' : 'secondary'}
                        onClick={() => handleStatusChange(student.studentId, 'present')}
                      >
                        Present
                      </Button>
                      <Button
                        type="button"
                        variant={student.status === 'absent' ? 'danger' : 'secondary'}
                        onClick={() => handleStatusChange(student.studentId, 'absent')}
                      >
                        Absent
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="em-field__error">{error}</p>}
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Mark Attendance</Button>
        </div>
      </form>
    </Modal>
  );
};

const GradeUploadModal = ({ isOpen, onClose, classroom, onUploadGrades }) => {
  const [examData, setExamData] = useState({ examType: 'quiz', examTitle: '', semester: '1', academicYear: '2024-2025' });
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classroom?.students) {
      setStudentGrades(
        classroom.students.map((student) => ({
          studentId: student._id,
          name: student.name,
          grades: [{ subject: classroom.subject || 'General', marksObtained: '', totalMarks: 100 }],
        }))
      );
    }
  }, [isOpen, classroom]);

  const handleGradeChange = (studentIndex, gradeIndex, field, value) => {
    const updated = [...studentGrades];
    updated[studentIndex].grades[gradeIndex][field] = value;
    setStudentGrades(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examData.examTitle.trim()) return setError('Please enter exam title');
    for (const student of studentGrades) {
      for (const grade of student.grades) {
        if (!grade.marksObtained) return setError(`Please enter marks for ${student.name}`);
        if (parseFloat(grade.marksObtained) > parseFloat(grade.totalMarks)) {
          return setError(`Marks obtained cannot exceed total marks for ${student.name}`);
        }
      }
    }
    setLoading(true);
    setError('');
    try {
      await onUploadGrades({
        classroomId: classroom._id,
        examData,
        studentGrades: studentGrades.map((s) => ({
          studentId: s.studentId,
          grades: s.grades.map((g) => ({ subject: g.subject, marksObtained: parseFloat(g.marksObtained), totalMarks: parseFloat(g.totalMarks) })),
        })),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upload Grades — ${classroom?.name}`} size="xlarge">
      <form onSubmit={handleSubmit}>
        <p className="em-section-title">Exam Information</p>
        <div className="em-form-grid">
          <FormField label="Exam Type">
            <select className="em-select" required value={examData.examType}
              onChange={(e) => setExamData((p) => ({ ...p, examType: e.target.value }))}>
              {['quiz', 'mid-term', 'final', 'assignment', 'project', 'practical'].map((t) => (
                <option key={t} value={t}>{t.replace('-', ' ')}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Exam Title">
            <input className="em-input" type="text" required value={examData.examTitle} placeholder="e.g., First Term Mathematics Exam"
              onChange={(e) => setExamData((p) => ({ ...p, examTitle: e.target.value }))} />
          </FormField>
          <FormField label="Semester">
            <select className="em-select" required value={examData.semester}
              onChange={(e) => setExamData((p) => ({ ...p, semester: e.target.value }))}>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </FormField>
          <FormField label="Academic Year">
            <input className="em-input" type="text" required value={examData.academicYear}
              onChange={(e) => setExamData((p) => ({ ...p, academicYear: e.target.value }))} />
          </FormField>
        </div>

        <p className="em-section-title">Student Grades — {classroom?.subject}</p>
        <div className="em-table-wrap">
          <table className="em-table">
            <thead><tr><th>Student</th><th>Marks Obtained</th><th>Total Marks</th></tr></thead>
            <tbody>
              {studentGrades.map((student, studentIndex) => (
                <tr key={student.studentId}>
                  <td><strong style={{ color: 'var(--ink)' }}>{student.name}</strong></td>
                  {student.grades.map((grade, gradeIndex) => (
                    <React.Fragment key={gradeIndex}>
                      <td>
                        <input type="number" min="0" max={grade.totalMarks} step="0.01" required value={grade.marksObtained}
                          placeholder="Marks" onChange={(e) => handleGradeChange(studentIndex, gradeIndex, 'marksObtained', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="1" step="1" required value={grade.totalMarks}
                          placeholder="Total" onChange={(e) => handleGradeChange(studentIndex, gradeIndex, 'totalMarks', e.target.value)} />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="em-field__error">{error}</p>}
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>Upload Grades</Button>
        </div>
      </form>
    </Modal>
  );
};

const HomeworkModal = ({ isOpen, onClose, classroom, onCreateHomework }) => {
  const [homeworkData, setHomeworkData] = useState({
    title: '', description: '', subject: '', dueDate: '', dueTime: '23:59', instructions: '', totalPoints: 100, attachments: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filePreviews, setFilePreviews] = useState([]);

  useEffect(() => {
    if (isOpen && classroom) {
      const weekOut = new Date();
      weekOut.setDate(weekOut.getDate() + 7);
      setHomeworkData((prev) => ({ ...prev, subject: classroom.subject || '', dueDate: weekOut.toISOString().split('T')[0], dueTime: '23:59' }));
      setFilePreviews([]);
      setError('');
    }
  }, [isOpen, classroom]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.some((f) => f.size > 10 * 1024 * 1024)) return setError('File size should not exceed 10MB');
    if (files.length + homeworkData.attachments.length > 5) return setError('Maximum 5 files allowed');

    setFilePreviews((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: (f.size / 1024 / 1024).toFixed(2), type: f.type.split('/')[0], extension: f.name.split('.').pop() })),
    ]);
    setHomeworkData((prev) => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeFile = (index) => {
    setHomeworkData((prev) => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!homeworkData.title.trim()) return setError('Please enter homework title');
    if (!homeworkData.dueDate) return setError('Please select due date');
    const dueDateTime = new Date(`${homeworkData.dueDate}T${homeworkData.dueTime}`);
    if (dueDateTime < new Date()) return setError('Due date and time cannot be in the past');
    if (homeworkData.totalPoints < 1 || homeworkData.totalPoints > 1000) return setError('Total points must be between 1 and 1000');

    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', homeworkData.title.trim());
      formData.append('description', homeworkData.description.trim());
      formData.append('classroomId', classroom._id);
      formData.append('subject', homeworkData.subject || classroom.subject);
      formData.append('dueDate', dueDateTime.toISOString());
      formData.append('instructions', homeworkData.instructions.trim());
      formData.append('totalPoints', homeworkData.totalPoints);
      homeworkData.attachments.forEach((file) => formData.append('attachments', file));

      await onCreateHomework(formData);
      setHomeworkData({ title: '', description: '', subject: '', dueDate: '', dueTime: '23:59', instructions: '', totalPoints: 100, attachments: [] });
      setFilePreviews([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Homework — ${classroom?.name}`} size="large">
      <form onSubmit={handleSubmit}>
        <p className="em-section-title">Basic Information</p>
        <div className="em-form-grid">
          <FormField label={`Homework Title (${homeworkData.title.length}/100)`}>
            <input className="em-input" type="text" required maxLength={100} value={homeworkData.title}
              placeholder="e.g., Chapter 5 Exercises" onChange={(e) => setHomeworkData((p) => ({ ...p, title: e.target.value }))} />
          </FormField>
          <FormField label="Subject">
            <input className="em-input" type="text" required value={homeworkData.subject} placeholder={classroom?.subject || 'Enter subject'}
              onChange={(e) => setHomeworkData((p) => ({ ...p, subject: e.target.value }))} />
            {classroom?.subject && <small className="em-field__hint">Classroom subject: {classroom.subject}</small>}
          </FormField>
        </div>
        <FormField label={`Description (${homeworkData.description.length}/500)`}>
          <textarea className="em-textarea" rows="3" maxLength={500} value={homeworkData.description}
            placeholder="Provide detailed description…" onChange={(e) => setHomeworkData((p) => ({ ...p, description: e.target.value }))} />
        </FormField>

        <p className="em-section-title">Due Date &amp; Points</p>
        <div className="em-form-grid">
          <FormField label="Due Date">
            <input className="em-input" type="date" required min={new Date().toISOString().split('T')[0]} value={homeworkData.dueDate}
              onChange={(e) => setHomeworkData((p) => ({ ...p, dueDate: e.target.value }))} />
          </FormField>
          <FormField label="Due Time">
            <input className="em-input" type="time" required value={homeworkData.dueTime}
              onChange={(e) => setHomeworkData((p) => ({ ...p, dueTime: e.target.value }))} />
          </FormField>
          <FormField label="Total Points (max 1000)">
            <input className="em-input" type="number" required min="1" max="1000" step="1" value={homeworkData.totalPoints}
              onChange={(e) => setHomeworkData((p) => ({ ...p, totalPoints: parseInt(e.target.value) || 100 }))} />
          </FormField>
        </div>

        <FormField label={`Instructions (${homeworkData.instructions.length}/1000)`}>
          <textarea className="em-textarea" rows="4" maxLength={1000} value={homeworkData.instructions}
            placeholder="Specific instructions for students…" onChange={(e) => setHomeworkData((p) => ({ ...p, instructions: e.target.value }))} />
        </FormField>

        <FormField label="Attachments (max 5 files, 10MB each)">
          <input type="file" multiple disabled={homeworkData.attachments.length >= 5} onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt" />
          {filePreviews.length > 0 && (
            <div className="em-entity-list" style={{ marginTop: 'var(--space-3)' }}>
              {filePreviews.map((file, index) => (
                <div className="em-detail-row" key={index}>
                  <span><Paperclip size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{file.name} ({file.size} MB)</span>
                  <Button variant="ghost" onClick={() => removeFile(index)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </FormField>

        {error && <p className="em-field__error">{error}</p>}
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!homeworkData.title.trim() || !homeworkData.dueDate}>
            Create Homework
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const getPerformanceTone = (percentage) => {
  if (percentage >= 80) return { label: 'Excellent', tone: 'success' };
  if (percentage >= 70) return { label: 'Good', tone: 'info' };
  if (percentage >= 60) return { label: 'Average', tone: 'default' };
  return { label: 'Needs Improvement', tone: 'danger' };
};

const getAttendanceTone = (rate) => {
  if (rate >= 90) return { label: 'Excellent', tone: 'success' };
  if (rate >= 80) return { label: 'Good', tone: 'info' };
  if (rate >= 70) return { label: 'Fair', tone: 'default' };
  return { label: 'Poor', tone: 'danger' };
};

const PROGRESS_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'academic', label: 'Academic Performance' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'homework', label: 'Homework' },
  { id: 'recommendations', label: 'Recommendations' },
];

const StudentProgressModal = ({ isOpen, onClose, student, classroom, onGetStudentProgress, showToast }) => {
  const [progressData, setProgressData] = useState(null);
  const [innerTab, setInnerTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const fetchStudentProgress = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await onGetStudentProgress(student._id, classroom._id);
      setProgressData(data);
    } catch {
      showToast('Failed to load student progress', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, classroom]);

  useEffect(() => {
    if (isOpen && student && classroom) fetchStudentProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student, classroom]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student Progress — ${student?.name}`} size="xlarge">
      {progressData && (
        <>
          <div className="em-detail-row"><span>Roll No</span><strong>{progressData.student.rollNumber}</strong></div>
          <div className="em-detail-row"><span>Email</span><strong>{progressData.student.email}</strong></div>
          <div className="em-detail-row"><span>Class</span><strong>{progressData.classroom.name}</strong></div>

          <div className="em-stats-grid" style={{ marginTop: 'var(--space-4)' }}>
            <StatCard
              label="Overall Average"
              value={`${progressData.performance.overallAverage.toFixed(1)}%`}
              tone={getPerformanceTone(progressData.performance.overallAverage).tone}
            />
            <StatCard
              label="Attendance"
              value={`${progressData.attendance.rate}%`}
              tone={getAttendanceTone(progressData.attendance.rate).tone}
            />
            <StatCard label="Homework Submitted" value={progressData.homework.submitted} tone="info" />
          </div>
        </>
      )}

      <div className="em-tab-strip">
        {PROGRESS_TABS.map((t) => (
          <button key={t.id} type="button" className={`em-tab-strip__item ${innerTab === t.id ? 'is-active' : ''}`} onClick={() => setInnerTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="em-loading">Loading student data…</div>
      ) : !progressData ? (
        <EmptyState title="No progress data available" />
      ) : (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {innerTab === 'overview' && (
            <div className="em-entity-list">
              {progressData.performance.subjectPerformance.map((subject, index) => (
                <Card key={index} title={subject.subject}>
                  <div className="em-detail-row"><span>Average</span><strong>{subject.averagePercentage}%</strong></div>
                  <div className="em-detail-row"><span>Exams</span><strong>{subject.totalExams}</strong></div>
                  <div className="em-detail-row"><span>Highest</span><strong>{subject.highestScore}%</strong></div>
                  <div className="em-detail-row"><span>Lowest</span><strong>{subject.lowestScore}%</strong></div>
                </Card>
              ))}
            </div>
          )}

          {innerTab === 'academic' && (
            <div className="em-table-wrap">
              <table className="em-table">
                <thead>
                  <tr><th>Date</th><th>Subject</th><th>Exam Type</th><th>Exam Title</th><th>Marks</th><th>%</th><th>Performance</th></tr>
                </thead>
                <tbody>
                  {progressData.performance.gradeTrend.map((grade, index) => {
                    const perf = getPerformanceTone(grade.percentage);
                    return (
                      <tr key={index}>
                        <td>{new Date(grade.date).toLocaleDateString()}</td>
                        <td>{grade.subject}</td>
                        <td>{grade.examType}</td>
                        <td>{grade.examTitle}</td>
                        <td>{grade.marksObtained}/{grade.totalMarks}</td>
                        <td>{grade.percentage}%</td>
                        <td><span className={`em-badge em-badge--${perf.tone}`}>{perf.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {innerTab === 'attendance' && (
            <div className="em-stats-grid">
              <StatCard label="Attendance Rate" value={`${progressData.attendance.rate}%`} tone={getAttendanceTone(progressData.attendance.rate).tone} />
            </div>
          )}

          {innerTab === 'homework' && (
            <div className="em-stats-grid">
              <StatCard label="Submitted" value={progressData.homework.submitted} />
              <StatCard label="Graded" value={progressData.homework.graded} tone="success" />
              <StatCard label="Average Score" value={progressData.homework.averageScore} tone="info" />
              <StatCard label="Submission Rate" value={`${progressData.homework.submissionRate.toFixed(1)}%`} />
            </div>
          )}

          {innerTab === 'recommendations' && (
            <div className="em-entity-list">
              {progressData.recommendations.length === 0 ? (
                <EmptyState icon={Star} title="Great job!" description="Student is performing well across all areas. No specific recommendations at this time." />
              ) : (
                progressData.recommendations.map((rec, index) => (
                  <Card key={index} title={rec.type}>
                    <span className={`em-badge em-badge--${rec.priority === 'high' ? 'danger' : 'default'}`} style={{ marginBottom: 'var(--space-2)', display: 'inline-block' }}>
                      {rec.priority === 'high' ? 'High priority' : 'Medium priority'}
                    </span>
                    <p>{rec.message}</p>
                    <p><strong>Suggestion:</strong> {rec.suggestion}</p>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="em-modal-actions">
        <Button onClick={onClose}>Close</Button>
        <Button icon={RefreshCw} onClick={fetchStudentProgress}>Refresh</Button>
      </div>
    </Modal>
  );
};

const StudentsListModal = ({ isOpen, onClose, classroom, onViewStudentProgress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const students = classroom?.students || [];

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Students — ${classroom?.name}`} size="large">
      <FormField label={`${filtered.length} of ${students.length} students`}>
        <input className="em-input" type="text" placeholder="Search by name, email, or roll number…"
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </FormField>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No students found" />
      ) : (
        <div className="em-entity-list">
          {filtered.map((student) => (
            <Card
              key={student._id}
              title={student.name}
              actions={<Button variant="primary" icon={BarChart3} onClick={() => onViewStudentProgress(student, classroom)}>View Progress</Button>}
            >
              <div className="em-detail-row"><span>Roll No</span><strong>{student.rollNumber || 'N/A'}</strong></div>
              <div className="em-detail-row"><span>Email</span><strong>{student.email}</strong></div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
};

const getHomeworkStatus = (dueDate) => {
  const daysDiff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 0) return { label: 'Expired', tone: 'danger' };
  if (daysDiff <= 1) return { label: 'Due Soon', tone: 'default' };
  if (daysDiff <= 3) return { label: 'Upcoming', tone: 'info' };
  return { label: 'Active', tone: 'success' };
};

const formatDueDate = (dueDate) => {
  const date = new Date(dueDate);
  const daysDiff = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
  if (daysDiff === 0) return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (daysDiff === 1) return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  if (daysDiff < 7) return `${daysDiff} days left`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const HomeworkList = ({ homework, onEdit, onDelete, onViewSubmissions }) => (
  <div className="em-entity-list">
    {homework.map((hw) => {
      const status = getHomeworkStatus(hw.dueDate);
      return (
        <Card
          key={hw._id}
          title={hw.title}
          actions={
            <>
              <Button icon={Eye} onClick={() => onViewSubmissions(hw)}>Submissions</Button>
              <Button icon={Pencil} onClick={() => onEdit(hw)}>Edit</Button>
              <Button variant="danger" icon={Trash2} onClick={() => onDelete(hw)}>Delete</Button>
            </>
          }
        >
          <div className="em-detail-row">
            <span>Status</span>
            <strong><span className={`em-badge em-badge--${status.tone}`}>{status.label}</span> · {hw.totalPoints} pts</strong>
          </div>
          <div className="em-detail-row"><span>Subject</span><strong>{hw.subject}</strong></div>
          <div className="em-detail-row"><span>Classroom</span><strong>{hw.classroom?.name}</strong></div>
          <div className="em-detail-row"><span>Due</span><strong>{formatDueDate(hw.dueDate)}</strong></div>
          {hw.description && <div className="em-detail-row"><span>Description</span><strong>{hw.description}</strong></div>}
          {hw.instructions && <div className="em-detail-row"><span>Instructions</span><strong>{hw.instructions}</strong></div>}
          {hw.attachments?.length > 0 && (
            <div className="em-detail-row">
              <span>Attachments</span>
              <strong>{hw.attachments.map((a) => a.originalName).join(', ')}</strong>
            </div>
          )}
        </Card>
      );
    })}
  </div>
);

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
        /* ignore malformed stored user JSON, matches original behavior */
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

const HomeworkSubmissionsModal = ({ isOpen, onClose, homework, onGradeSubmission, showToast }) => {
  const [submissions, setSubmissions] = useState([]);
  const [homeworkData, setHomeworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState(new Set());

  const fetchSubmissions = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/teacher/homework/${homework._id}/submissions`);
      setSubmissions(response.data.submissions);
      setHomeworkData(response.data.homework);
    } catch {
      showToast('Failed to fetch submissions', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homework]);

  useEffect(() => {
    if (isOpen && homework) fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, homework]);

  const handleGradeChange = (submissionId, field, value) => {
    setSubmissions((prev) => prev.map((s) => (s._id === submissionId ? { ...s, [field]: value } : s)));
  };

  const handleSingleGrade = async (submissionId) => {
    if (grading[submissionId]) return;
    const submission = submissions.find((s) => s._id === submissionId);
    if (!submission || submission.isPlaceholder) return;
    setGrading((prev) => ({ ...prev, [submissionId]: true }));
    try {
      await onGradeSubmission(submissionId, {
        marksObtained: parseFloat(submission.marksObtained) || 0,
        feedback: submission.feedback || '',
        comments: submission.comments || '',
      });
      showToast('Submission graded successfully!');
      fetchSubmissions();
    } catch {
      showToast('Failed to grade submission', 'error');
    } finally {
      setGrading((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleBulkGrade = async () => {
    const toGrade = submissions.filter((s) => selectedSubmissions.has(s._id) && !s.isPlaceholder);
    if (toGrade.length === 0) return showToast('No submissions selected for grading', 'info');
    try {
      for (const submission of toGrade) {
        await onGradeSubmission(submission._id, {
          marksObtained: parseFloat(submission.marksObtained) || 0,
          feedback: submission.feedback || '',
          comments: submission.comments || '',
        });
      }
      showToast(`${toGrade.length} submissions graded successfully!`);
      setBulkMode(false);
      setSelectedSubmissions(new Set());
      fetchSubmissions();
    } catch {
      showToast('Error grading some submissions', 'error');
    }
  };

  const toggleSelection = (id) => {
    setSelectedSubmissions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const gradable = submissions.filter((s) => !s.isPlaceholder);

  const statusTone = { graded: 'success', submitted: 'default', missing: 'danger' };

  const downloadFile = async (homeworkId, filename, originalName) => {
    try {
      const response = await api.get(`/api/teacher/homework/${homeworkId}/files/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('File downloaded successfully!');
    } catch {
      showToast('Failed to download file', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Homework Submissions" size="xlarge">
      {homeworkData && (
        <>
          <div className="em-detail-row"><span>{homeworkData.title}</span><strong>Due {new Date(homeworkData.dueDate).toLocaleDateString()}</strong></div>
          <div className="em-stats-grid" style={{ marginTop: 'var(--space-3)' }}>
            <StatCard label="Students" value={homeworkData.totalStudents} />
            <StatCard label="Submitted" value={submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length} tone="info" />
            <StatCard label="Graded" value={submissions.filter((s) => s.status === 'graded').length} tone="success" />
          </div>
        </>
      )}

      <div className="em-quick-actions" style={{ justifyContent: 'space-between', margin: 'var(--space-4) 0' }}>
        <div className="em-quick-actions">
          <Button variant={bulkMode ? 'primary' : 'secondary'} onClick={() => setBulkMode(!bulkMode)}>
            {bulkMode ? 'Cancel Bulk' : 'Bulk Grade'}
          </Button>
          {bulkMode && (
            <>
              <Button onClick={() => setSelectedSubmissions(selectedSubmissions.size === gradable.length ? new Set() : new Set(gradable.map((s) => s._id)))}>
                {selectedSubmissions.size === gradable.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button variant="primary" disabled={selectedSubmissions.size === 0} onClick={handleBulkGrade}>
                Save {selectedSubmissions.size} Grades
              </Button>
            </>
          )}
        </div>
        <div className="em-quick-actions">
          <Button icon={RefreshCw} onClick={fetchSubmissions}>Refresh</Button>
          <Button icon={Download} onClick={() => showToast('Download feature coming soon!', 'info')}>Download All</Button>
        </div>
      </div>

      {loading ? (
        <div className="em-loading">Loading submissions…</div>
      ) : (
        <div className="em-table-wrap">
          <table className="em-table">
            <thead>
              <tr>
                {bulkMode && <th></th>}
                <th>Student</th><th>Status</th><th>Submission</th><th>Grade</th><th>Feedback</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission._id}>
                  {bulkMode && (
                    <td>
                      {!submission.isPlaceholder && (
                        <input type="checkbox" checked={selectedSubmissions.has(submission._id)} onChange={() => toggleSelection(submission._id)} />
                      )}
                    </td>
                  )}
                  <td>
                    <strong style={{ color: 'var(--ink)' }}>{submission.student.name}</strong><br />
                    <small>{submission.student.rollNumber} · {submission.student.email}</small>
                  </td>
                  <td>
                    <span className={`em-badge em-badge--${statusTone[submission.status] || 'default'}`}>
                      {submission.status}{submission.isLate ? ' · late' : ''}
                    </span>
                    {submission.submittedAt && <><br /><small>{new Date(submission.submittedAt).toLocaleDateString()}</small></>}
                  </td>
                  <td>
                    {submission.status === 'missing' ? (
                      <span className="em-field__hint">Not submitted</span>
                    ) : (
                      <>
                        {submission.submissionText && <div>{submission.submissionText}</div>}
                        {submission.submittedFiles.map((file, index) => (
                          <div key={index}>
                            <button type="button" className="em-btn em-btn--ghost" style={{ padding: '2px 6px' }}
                              onClick={() => downloadFile(homework._id, file.filename, file.originalName)}>
                              <Paperclip size={12} /> {file.originalName}
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </td>
                  <td>
                    {submission.isPlaceholder ? '—' : (
                      <>
                        <input type="number" min="0" max={homeworkData?.totalPoints || 100} value={submission.marksObtained || ''}
                          placeholder="0" onChange={(e) => handleGradeChange(submission._id, 'marksObtained', e.target.value)} />
                        <small>/ {homeworkData?.totalPoints || 100}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {submission.isPlaceholder ? '—' : (
                      <textarea rows="2" value={submission.feedback || ''} placeholder="Add feedback…"
                        onChange={(e) => handleGradeChange(submission._id, 'feedback', e.target.value)} />
                    )}
                  </td>
                  <td>
                    {!submission.isPlaceholder && (
                      <Button variant={submission.status === 'graded' ? 'primary' : 'secondary'} loading={grading[submission._id]}
                        onClick={() => handleSingleGrade(submission._id)}>
                        {submission.status === 'graded' ? 'Update' : 'Grade'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};


/* =========================================================================
   Homework section (rendered inside the 'homework' tab)
   ========================================================================= */

const HomeworkSection = ({ homework, classrooms, onRefresh, showToast, setHomeworkModal, setSubmissionsModal }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const filtered = homework.filter((hw) => {
    if (filter === 'active' && new Date(hw.dueDate) < new Date()) return false;
    if (filter === 'expired' && new Date(hw.dueDate) >= new Date()) return false;
    if (searchTerm && !hw.title.toLowerCase().includes(searchTerm.toLowerCase()) && !hw.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedSubject && hw.subject !== selectedSubject) return false;
    return true;
  });

  const subjects = [...new Set(homework.map((hw) => hw.subject).filter(Boolean))];

  return (
    <>
      <TopBar
        title="Homework & Assignments"
        actions={
          <>
            <Button icon={RefreshCw} onClick={onRefresh}>Refresh</Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                if (classrooms.length > 0) setHomeworkModal({ isOpen: true, classroom: classrooms[0] });
                else showToast('No classrooms available', 'error');
              }}
            >
              Create Homework
            </Button>
          </>
        }
      />

      <div className="em-form-grid" style={{ marginBottom: 'var(--space-4)' }}>
        <FormField label="Search">
          <input className="em-input" type="text" placeholder="Search homework…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </FormField>
        <FormField label="Filter">
          <select className="em-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Homework</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </FormField>
        {subjects.length > 0 && (
          <FormField label="Subject">
            <select className="em-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        )}
      </div>

      <p className="em-field__hint" style={{ marginBottom: 'var(--space-4)' }}>
        Total: {homework.length} · Active: {homework.filter((h) => new Date(h.dueDate) > new Date()).length} · Showing: {filtered.length}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={homework.length === 0 ? 'No homework created yet' : 'No homework found'}
          description={homework.length === 0 ? 'Create your first homework assignment to get started.' : 'Try adjusting your search or filters.'}
        />
      ) : (
        <HomeworkList
          homework={filtered}
          onEdit={() => showToast('Edit feature coming soon!', 'info')}
          onDelete={(hw) => {
            if (window.confirm(`Are you sure you want to delete "${hw.title}"?`)) showToast('Delete feature coming soon!', 'info');
          }}
          onViewSubmissions={(hw) => setSubmissionsModal({ isOpen: true, homework: hw })}
        />
      )}
    </>
  );
};

/* =========================================================================
   Overview / dashboard section
   ========================================================================= */

const Dashboard = ({ showToast }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/teacher/dashboard');
      setDashboardData(response.data);
    } catch {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="em-loading">Loading your teaching dashboard…</div>;
  if (!dashboardData) {
    return <EmptyState title="Failed to load dashboard data" action={<Button variant="primary" onClick={fetchDashboardData}>Retry</Button>} />;
  }

  const { stats, summary, upcomingDeadlines, recentSubmissions, classrooms: classList } = dashboardData;

  return (
    <>
      <div className="em-stats-grid">
        <StatCard icon={School} label="My Classrooms" value={stats.totalClassrooms} />
        <StatCard icon={BookOpen} label="Active Homework" value={stats.activeHomework} tone="success" />
        <StatCard icon={Users} label="Total Students" value={stats.uniqueStudents} tone="info" />
        <StatCard icon={BarChart3} label="Subjects" value={stats.totalSubjects} />
      </div>

      <div className="em-form-grid" style={{ alignItems: 'start' }}>
        <Card title={`Upcoming Deadlines (${upcomingDeadlines.length})`}>
          {upcomingDeadlines.length === 0 ? (
            <EmptyState title="No upcoming deadlines" />
          ) : (
            upcomingDeadlines.map((hw) => (
              <div className="em-detail-row" key={hw._id}>
                <span>{hw.title} · {hw.classroom?.name}</span>
                <strong>Due {new Date(hw.dueDate).toLocaleDateString()} · {hw.totalPoints}pts</strong>
              </div>
            ))
          )}
        </Card>

        <Card title={`Recent Submissions (${recentSubmissions.length})`}>
          {recentSubmissions.length === 0 ? (
            <EmptyState title="No recent submissions" />
          ) : (
            recentSubmissions.map((s) => (
              <div className="em-detail-row" key={s._id}>
                <span>{s.student?.name} · {s.homework?.title}</span>
                <strong>{s.status} · {new Date(s.submittedAt).toLocaleDateString()}</strong>
              </div>
            ))
          )}
        </Card>
      </div>

      <div className="em-form-grid" style={{ alignItems: 'start', marginTop: 'var(--space-4)' }}>
        <Card title={`My Classrooms (${classList.length})`}>
          {classList.length === 0 ? (
            <EmptyState title="No classrooms assigned" />
          ) : (
            classList.map((c) => (
              <div className="em-detail-row" key={c._id}>
                <span>{c.name} · Grade {c.grade}-{c.section}</span>
                <strong>{c.studentCount} students · {c.subject}</strong>
              </div>
            ))
          )}
        </Card>

        <Card title="Performance Overview">
          <div className="em-detail-row"><span>Submission Rate</span><strong>{summary.submissionRate}% ({stats.submittedCount}/{stats.uniqueStudents})</strong></div>
          <div className="em-detail-row"><span>Attendance Rate</span><strong>{summary.attendanceRate}% ({stats.presentCount} present, {stats.absentCount} absent)</strong></div>
          <div className="em-detail-row"><span>Graded Work</span><strong>{stats.gradedCount} of {stats.submittedCount} submissions</strong></div>
        </Card>
      </div>
    </>
  );
};

/* =========================================================================
   Main component
   ========================================================================= */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classrooms', label: 'My Classrooms', icon: School },
  { id: 'homework', label: 'Homework', icon: BookOpen },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'grades', label: 'Grades', icon: BarChart3 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

const TeacherPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classrooms, setClassrooms] = useState([]);
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToasts();

  const [attendanceModal, setAttendanceModal] = useState({ isOpen: false, classroom: null });
  const [gradeModal, setGradeModal] = useState({ isOpen: false, classroom: null });
  const [homeworkModal, setHomeworkModal] = useState({ isOpen: false, classroom: null });
  const [progressModal, setProgressModal] = useState({ isOpen: false, student: null, classroom: null });
  const [submissionsModal, setSubmissionsModal] = useState({ isOpen: false, homework: null });
  const [studentsModal, setStudentsModal] = useState({ isOpen: false, classroom: null });

  // Global socket connection for cross-app message notifications — separate
  // from the connection MessagesSection itself opens when the Messages tab
  // is active. Preserved exactly from the original (same events, same
  // 'join-user' emit), not something to consolidate without checking with
  // the person who owns the Socket.IO event contract first.
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

  const handleGradeSubmission = async (submissionId, gradeData) => {
    try {
      const response = await api.put(`/api/teacher/submissions/${submissionId}/grade`, gradeData);
      return response.data;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to grade submission'), 'error');
      throw err;
    }
  };

  const fetchMyClassrooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/teacher/classrooms');
      setClassrooms(response.data.classrooms || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch classrooms'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (classroomId, date, subject, attendanceList) => {
    try {
      await api.post('/api/teacher/attendance/class', { classroomId, date, subject, attendanceList });
      showToast('Attendance marked successfully!');
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to mark attendance'), 'error');
      throw err;
    }
  };

  const handleUploadGrades = async (gradeData) => {
    try {
      await api.post('/api/teacher/grades/class', gradeData);
      showToast('Grades uploaded successfully!');
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to upload grades'), 'error');
      throw err;
    }
  };

  const fetchMyHomework = async () => {
    try {
      const response = await api.get('/api/teacher/homework');
      setHomework(response.data.homework || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch homework'), 'error');
    }
  };

  const handleCreateHomework = async (formData) => {
    try {
      // FormData bodies get their multipart boundary set automatically by
      // the browser regardless of any Content-Type header — same as the
      // original's manual header, which the browser was overriding anyway.
      await api.post('/api/teacher/homework', formData);
      showToast('Homework created successfully!');
      fetchMyHomework();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create homework'), 'error');
      throw err;
    }
  };

  const handleGetStudentProgress = async (studentId, classroomId) => {
    try {
      const response = await api.get(`/api/teacher/student/${studentId}/report/${classroomId}`);
      return response.data;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch student progress'), 'error');
      throw err;
    }
  };

  useEffect(() => {
    if (activeTab === 'classrooms' || activeTab === 'attendance' || activeTab === 'grades') fetchMyClassrooms();
    else if (activeTab === 'homework') fetchMyHomework();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const goTo = (tab) => setActiveTab(tab);

  // 'attendance' and 'grades' render the exact same classroom list as
  // 'classrooms' in the original app — not a redesign choice, a preserved
  // pre-existing quirk. Flagged in the handoff notes; not changed here.
  const renderClassroomsList = () => (
    <>
      <TopBar title={activeTab === 'classrooms' ? 'My Classrooms' : activeTab === 'attendance' ? 'Attendance' : 'Grades'}
        actions={<Button icon={RefreshCw} onClick={fetchMyClassrooms}>Refresh</Button>} />
      {loading ? (
        <div className="em-loading">Loading classrooms…</div>
      ) : classrooms.length === 0 ? (
        <EmptyState icon={School} title="No classrooms assigned yet" />
      ) : (
        <div className="em-entity-list">
          {classrooms.map((classroom) => (
            <Card
              key={classroom._id}
              title={classroom.name}
              actions={
                <>
                  <Button icon={ClipboardCheck} onClick={() => setAttendanceModal({ isOpen: true, classroom })}>Attendance</Button>
                  <Button icon={BarChart3} onClick={() => setGradeModal({ isOpen: true, classroom })}>Upload Grades</Button>
                  <Button icon={BookOpen} onClick={() => setHomeworkModal({ isOpen: true, classroom })}>Homework</Button>
                  <Button icon={Users} onClick={() => setStudentsModal({ isOpen: true, classroom })}>View Students</Button>
                </>
              }
            >
              <div className="em-detail-row"><span>Grade</span><strong>{classroom.grade} - {classroom.section}</strong></div>
              <div className="em-detail-row"><span>Students</span><strong>{classroom.students?.length || 0}</strong></div>
              <div className="em-detail-row"><span>Subject</span><strong>{classroom.subject || 'Not assigned'}</strong></div>
              <div className="em-detail-row"><span>Class Teacher</span><strong>{classroom.classTeacher?.name || 'You'}</strong></div>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <TopBar title="Dashboard" subtitle="Manage your classrooms, track student progress, and create learning materials." />
            <Dashboard showToast={showToast} />
          </>
        );
      case 'classrooms':
      case 'attendance':
      case 'grades':
        return renderClassroomsList();
      case 'homework':
        return (
          <HomeworkSection
            homework={homework}
            classrooms={classrooms}
            onRefresh={fetchMyHomework}
            showToast={showToast}
            setHomeworkModal={setHomeworkModal}
            setSubmissionsModal={setSubmissionsModal}
          />
        );
      case 'messages':
        // Not yet redesigned — Messaging is its own phase, coming after
        // all four dashboards. Renders as-is for now.
        return <MessagesSection showToast={showToast} userRole="teacher" />;
      default:
        return null;
    }
  };

  return (
    <div className="em-app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeTab}
        onSelect={goTo}
        roleLabel="Teacher"
        onLogout={() => {
          localStorage.clear();
          window.location.reload();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={removeToast} />

      <main className="em-main">
        <div className={activeTab === 'messages' ? '' : 'em-content'}>{renderContent()}</div>
      </main>

      <AttendanceModal
        isOpen={attendanceModal.isOpen}
        onClose={() => setAttendanceModal({ isOpen: false, classroom: null })}
        classroom={attendanceModal.classroom}
        onMarkAttendance={handleMarkAttendance}
      />
      <GradeUploadModal
        isOpen={gradeModal.isOpen}
        onClose={() => setGradeModal({ isOpen: false, classroom: null })}
        classroom={gradeModal.classroom}
        onUploadGrades={handleUploadGrades}
      />
      <HomeworkModal
        isOpen={homeworkModal.isOpen}
        onClose={() => setHomeworkModal({ isOpen: false, classroom: null })}
        classroom={homeworkModal.classroom}
        onCreateHomework={handleCreateHomework}
      />
      <StudentProgressModal
        isOpen={progressModal.isOpen}
        onClose={() => setProgressModal({ isOpen: false, student: null, classroom: null })}
        student={progressModal.student}
        classroom={progressModal.classroom}
        onGetStudentProgress={handleGetStudentProgress}
        showToast={showToast}
      />
      <StudentsListModal
        isOpen={studentsModal.isOpen}
        onClose={() => setStudentsModal({ isOpen: false, classroom: null })}
        classroom={studentsModal.classroom}
        onViewStudentProgress={(student, classroom) => {
          setStudentsModal({ isOpen: false, classroom: null });
          setProgressModal({ isOpen: true, student, classroom });
        }}
      />
      <HomeworkSubmissionsModal
        isOpen={submissionsModal.isOpen}
        onClose={() => setSubmissionsModal({ isOpen: false, homework: null })}
        homework={submissionsModal.homework}
        onGradeSubmission={handleGradeSubmission}
        showToast={showToast}
      />
    </div>
  );
};

export default TeacherPanel;
