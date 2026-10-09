import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  GraduationCap,
  UserRound,
  Briefcase,
  School,
  ClipboardCheck,
  CalendarDays,
  BookOpen,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Pencil,
  Trash2,
  Eye,
  Plus,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
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
import '../../styles/layout.css';
import './SchoolAdmin.css';

/* =========================================================================
   Modals — same fields, validation, and onSubmit contracts as the original
   file's local components, rebuilt on the shared Modal/FormField/Button.
   ========================================================================= */

const AddStudentModal = ({ isOpen, onClose, classroom, onAddStudent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter student email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAddStudent(classroom._id, email);
      setEmail('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Student to ${classroom?.name}`}>
      <form onSubmit={handleSubmit}>
        <FormField label="Student Email" error={error}>
          <input
            className="em-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter student email address"
            required
          />
        </FormField>
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>
            Add Student
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AddMultipleStudentsModal = ({ isOpen, onClose, classroom, onAddMultipleStudents }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classroom) {
      fetchUnassignedStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, classroom]);

  const fetchUnassignedStudents = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/api/school-admin/classroom/${classroom._id}/unassigned-students`);
      setStudents(response.data.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s) => s._id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAddMultipleStudents(classroom._id, selectedStudents);
      setSelectedStudents([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Students to ${classroom?.name}`} size="large">
      <form onSubmit={handleSubmit}>
        <div className="em-selection-header">
          <span className="em-field__label">Select Students to Add</span>
          <Button type="button" onClick={handleSelectAll}>
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {fetching ? (
          <div className="em-loading">Loading students…</div>
        ) : students.length === 0 ? (
          <EmptyState title="No unassigned students found" />
        ) : (
          <div className="em-checkbox-list">
            {students.map((student) => (
              <label className="em-checkbox-row" key={student._id}>
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleStudentSelect(student._id)}
                />
                <div>
                  <div className="em-checkbox-row__name">{student.name}</div>
                  <div className="em-checkbox-row__meta">
                    {student.email}
                    {student.grade ? ` · Grade ${student.grade}` : ''}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {selectedStudents.length > 0 && (
          <p className="em-metric-note">{selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected</p>
        )}
        {error && <p className="em-field__error">{error}</p>}

        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={selectedStudents.length === 0}>
            {`Add ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const AssignTeacherModal = ({ isOpen, onClose, classroom, onAssignTeacher }) => {
  const [teacherEmail, setTeacherEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherEmail.trim()) {
      setError('Please enter teacher email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAssignTeacher(classroom._id, teacherEmail);
      setTeacherEmail('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Teacher to ${classroom?.name}`}>
      <form onSubmit={handleSubmit}>
        <FormField label="Teacher Email" error={error}>
          <input
            className="em-input"
            type="email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            placeholder="Enter teacher email address"
            required
          />
          <small className="em-field__hint">Teacher must already exist in the system</small>
        </FormField>
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading}>
            Assign Teacher
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditUserModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', department: '', parentEmail: '', subjects: '', classroom: '',
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        parentEmail: user.parentEmail || '',
        subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '',
        classroom: user.classroom || '',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?._id) return;
    const processedData = {
      name: formData.name,
      email: formData.email,
      department: formData.department,
      parentEmail: formData.parentEmail,
      subjects: formData.subjects ? formData.subjects.split(',').map((s) => s.trim()).filter(Boolean) : [],
      classroom: formData.classroom,
    };
    try {
      await onUpdateUser(user._id, processedData);
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
        <div className="em-loading">Loading user data…</div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${user?.name}`} size="large">
      <form onSubmit={handleSubmit}>
        <FormField label="Full Name">
          <input className="em-input" type="text" value={formData.name} required
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter full name" />
        </FormField>
        <FormField label="Email">
          <input className="em-input" type="email" value={formData.email} required
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" />
        </FormField>
        <FormField label="Department">
          <input className="em-input" type="text" value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Enter department" />
        </FormField>
        {user.role === 'student' && (
          <FormField label="Parent Email">
            <input className="em-input" type="email" value={formData.parentEmail}
              onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })} placeholder="Enter parent email address" />
          </FormField>
        )}
        {(user.role === 'teacher' || user.role === 'student') && (
          <FormField label="Subjects (comma separated)">
            <input className="em-input" type="text" value={formData.subjects}
              onChange={(e) => setFormData({ ...formData, subjects: e.target.value })} placeholder="e.g., Math, Science, English" />
            <small className="em-field__hint">Separate multiple subjects with commas</small>
          </FormField>
        )}
        <FormField label="Classroom ID">
          <input className="em-input" type="text" value={formData.classroom}
            onChange={(e) => setFormData({ ...formData, classroom: e.target.value })} placeholder="Enter classroom ID" />
        </FormField>
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Update User</Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteConfirmationModal = ({ isOpen, onClose, item, onConfirm, type = 'user' }) => {
  const message =
    type === 'user'
      ? `Are you sure you want to delete ${item?.name}? This action cannot be undone.`
      : type === 'classroom'
      ? `Are you sure you want to delete ${item?.name}? This will remove all associated data.`
      : 'Are you sure you want to delete this item?';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" size="small">
      <p>{message}</p>
      <div className="em-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm(item);
            onClose();
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
};

const AVAILABLE_DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const TimetableUploadModal = ({ isOpen, onClose, classroom, onUploadTimetable }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    if (isOpen && classroom) {
      api
        .get('/api/school-admin/users/teachers')
        .then((res) => setTeachers(res.data.users || []))
        .catch((err) => console.error(err));
    }
  }, [isOpen, classroom]);

  useEffect(() => {
    if (isOpen) setSchedule([]);
  }, [isOpen]);

  const addDay = (dayValue) => {
    if (schedule.find((d) => d.day === dayValue)) return;
    const dayLabel = AVAILABLE_DAYS.find((d) => d.value === dayValue)?.label || dayValue;
    setSchedule((prev) => [...prev, { day: dayValue, dayLabel, periods: [] }]);
  };

  const removeDay = (dayValue) => setSchedule((prev) => prev.filter((d) => d.day !== dayValue));

  const addPeriod = (dayIndex) => {
    const updated = [...schedule];
    const day = updated[dayIndex];
    const periodNumber = day.periods.length + 1;
    day.periods.push({ periodNumber, periodName: `Period ${periodNumber}`, startTime: '', endTime: '', subject: '', teacher: '', room: '' });
    setSchedule(updated);
  };

  const removePeriod = (dayIndex, periodIndex) => {
    const updated = [...schedule];
    updated[dayIndex].periods.splice(periodIndex, 1);
    updated[dayIndex].periods.forEach((p, i) => {
      p.periodNumber = i + 1;
      p.periodName = `Period ${i + 1}`;
    });
    setSchedule(updated);
  };

  const handlePeriodChange = (dayIndex, periodIndex, field, value) => {
    const updated = [...schedule];
    updated[dayIndex].periods[periodIndex][field] = value;
    setSchedule(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classroom) {
      setError('No classroom selected');
      return;
    }
    if (schedule.length === 0) {
      setError('Please add at least one day to the timetable');
      return;
    }
    for (const day of schedule) {
      for (const period of day.periods) {
        if (!period.startTime || !period.endTime || !period.subject) {
          setError(`Please fill all required fields for ${day.dayLabel} - ${period.periodName}`);
          return;
        }
        if (period.startTime >= period.endTime) {
          setError(`End time must be after start time for ${day.dayLabel} - ${period.periodName}`);
          return;
        }
      }
    }
    setLoading(true);
    setError('');
    try {
      await onUploadTimetable(classroom._id, schedule);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableDaysToAdd = AVAILABLE_DAYS.filter((d) => !schedule.some((s) => s.day === d.value));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Timetable — ${classroom?.name}`} size="xlarge">
      <form onSubmit={handleSubmit}>
        {classroom && (
          <div className="em-detail-row">
            <span>Classroom</span>
            <strong>{classroom.name} · {classroom.grade} {classroom.section} · {classroom.subject}</strong>
          </div>
        )}

        <p className="em-section-title" style={{ marginTop: 'var(--space-4)' }}>Add Days to Timetable</p>
        <p className="em-field__hint">Add only the days that have classes.</p>
        <div className="em-quick-actions" style={{ margin: 'var(--space-3) 0' }}>
          {availableDaysToAdd.map((day) => (
            <Button key={day.value} type="button" icon={Plus} onClick={() => addDay(day.value)}>
              {day.label}
            </Button>
          ))}
        </div>

        {schedule.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No days added yet" description="Start by adding days above." />
        ) : (
          schedule.map((day, dayIndex) => (
            <Card key={day.day} className="em-nested-card"
              title={day.dayLabel}
              actions={<Button variant="danger" onClick={() => removeDay(day.day)}>Remove Day</Button>}
            >
              <div className="em-quick-actions" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="em-field__hint">Periods: {day.periods.length}</span>
                <Button type="button" icon={Plus} onClick={() => addPeriod(dayIndex)}>Add Period</Button>
              </div>
              {day.periods.length === 0 ? (
                <p className="em-field__hint">No periods added for this day.</p>
              ) : (
                day.periods.map((period, periodIndex) => (
                  <div className="em-period-row" key={periodIndex}>
                    <div className="em-quick-actions" style={{ justifyContent: 'space-between' }}>
                      <strong>{period.periodName}</strong>
                      <Button variant="ghost" onClick={() => removePeriod(dayIndex, periodIndex)}>Remove</Button>
                    </div>
                    <div className="em-form-grid">
                      <FormField label="Start Time">
                        <input className="em-input" type="time" required value={period.startTime}
                          onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'startTime', e.target.value)} />
                      </FormField>
                      <FormField label="End Time">
                        <input className="em-input" type="time" required value={period.endTime}
                          onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'endTime', e.target.value)} />
                      </FormField>
                      <FormField label="Subject">
                        <input className="em-input" type="text" required value={period.subject} placeholder="e.g., Mathematics"
                          onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'subject', e.target.value)} />
                      </FormField>
                      <FormField label="Teacher">
                        <select className="em-select" value={period.teacher}
                          onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'teacher', e.target.value)}>
                          <option value="">Select Teacher</option>
                          {teachers.map((t) => (
                            <option key={t._id} value={t.name}>{t.name} - {t.email}</option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Room">
                        <input className="em-input" type="text" value={period.room} placeholder="Room number"
                          onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'room', e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                ))
              )}
            </Card>
          ))
        )}

        {error && <p className="em-field__error">{error}</p>}
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={!classroom || schedule.length === 0}>
            {`Create Timetable (${schedule.length} days)`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const TimetableModal = ({ isOpen, onClose, timetable }) => {
  if (!timetable) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Timetable — ${timetable.classroom?.name}`} size="xlarge">
      <p className="em-field__hint">
        Academic Year: {timetable.academicYear} · Last updated {new Date(timetable.updatedAt).toLocaleDateString()}
      </p>
      {timetable.schedule.map((day) => (
        <Card key={day.day} className="em-nested-card" title={day.day.charAt(0).toUpperCase() + day.day.slice(1)}>
          {day.periods.length === 0 ? (
            <p className="em-field__hint">No periods scheduled.</p>
          ) : (
            day.periods.map((period, index) => (
              <div className="em-detail-row" key={index}>
                <span>{period.startTime} – {period.endTime} · {period.subject || 'Free Period'}</span>
                <strong>{period.teacher || 'No teacher'}{period.room ? ` · Room ${period.room}` : ''}</strong>
              </div>
            ))
          )}
        </Card>
      ))}
    </Modal>
  );
};

const EXAM_TYPES = ['unit-test', 'mid-term', 'final', 'quiz', 'practical'];
const ACADEMIC_YEARS = ['2024-2025', '2023-2024', '2025-2026'];

const CreateExamModal = ({ isOpen, onClose, classrooms, onCreateExam }) => {
  const [examData, setExamData] = useState({
    title: '', description: '', examType: 'unit-test', academicYear: '2024-2025', schedules: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSchedule = () => {
    setExamData((prev) => ({
      ...prev,
      schedules: [...prev.schedules, { classroom: '', subject: '', date: '', startTime: '', endTime: '', duration: '', totalMarks: 100, room: '' }],
    }));
  };

  const updateSchedule = (index, field, value) => {
    const updated = [...examData.schedules];
    updated[index][field] = value;
    setExamData((prev) => ({ ...prev, schedules: updated }));
  };

  const removeSchedule = (index) => {
    setExamData((prev) => ({ ...prev, schedules: prev.schedules.filter((_, i) => i !== index) }));
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return Math.max(0, eh * 60 + em - (sh * 60 + sm)).toString();
  };

  const handleTimeChange = (index, field, value) => {
    updateSchedule(index, field, value);
    if (field === 'startTime' || field === 'endTime') {
      const s = examData.schedules[index];
      if (s.startTime && s.endTime) {
        updateSchedule(index, 'duration', calculateDuration(s.startTime, s.endTime));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examData.title.trim()) {
      setError('Please enter exam title');
      return;
    }
    if (examData.schedules.length === 0) {
      setError('Please add at least one exam schedule');
      return;
    }
    for (let i = 0; i < examData.schedules.length; i++) {
      const s = examData.schedules[i];
      if (!s.classroom) return setError(`Please select a classroom for schedule ${i + 1}`);
      if (!s.subject?.trim()) return setError(`Please enter a subject for schedule ${i + 1}`);
      if (!s.date) return setError(`Please select a date for schedule ${i + 1}`);
      if (!s.startTime) return setError(`Please select start time for schedule ${i + 1}`);
      if (!s.endTime) return setError(`Please select end time for schedule ${i + 1}`);
      const selectedDate = new Date(s.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) return setError(`Date cannot be in the past for schedule ${i + 1}`);
      if (s.startTime >= s.endTime) return setError(`End time must be after start time for schedule ${i + 1}`);
    }

    setLoading(true);
    setError('');
    try {
      const formattedData = {
        title: examData.title.trim(),
        description: examData.description.trim(),
        examType: examData.examType,
        academicYear: examData.academicYear,
        schedules: examData.schedules.map((s) => {
          const clean = {
            classroom: s.classroom,
            subject: s.subject.trim(),
            date: new Date(s.date).toISOString().split('T')[0],
            startTime: s.startTime,
            endTime: s.endTime,
          };
          if (s.duration) clean.duration = s.duration;
          if (s.totalMarks) clean.totalMarks = parseInt(s.totalMarks);
          if (s.room?.trim()) clean.room = s.room.trim();
          return clean;
        }),
      };
      await onCreateExam(formattedData);
      setExamData({ title: '', description: '', examType: 'unit-test', academicYear: '2024-2025', schedules: [] });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Exam Schedule" size="xlarge">
      <form onSubmit={handleSubmit}>
        <div className="em-form-grid">
          <FormField label="Exam Title">
            <input className="em-input" type="text" required value={examData.title} placeholder="e.g., First Term Examination"
              onChange={(e) => setExamData((p) => ({ ...p, title: e.target.value }))} />
          </FormField>
          <FormField label="Exam Type">
            <select className="em-select" required value={examData.examType}
              onChange={(e) => setExamData((p) => ({ ...p, examType: e.target.value }))}>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
            </select>
          </FormField>
          <FormField label="Academic Year">
            <select className="em-select" required value={examData.academicYear}
              onChange={(e) => setExamData((p) => ({ ...p, academicYear: e.target.value }))}>
              {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Description">
          <textarea className="em-textarea" rows="3" value={examData.description} placeholder="Exam description and instructions…"
            onChange={(e) => setExamData((p) => ({ ...p, description: e.target.value }))} />
        </FormField>

        <div className="em-quick-actions" style={{ justifyContent: 'space-between', margin: 'var(--space-2) 0' }}>
          <p className="em-section-title" style={{ margin: 0 }}>Exam Schedules</p>
          <Button type="button" icon={Plus} onClick={addSchedule}>Add Schedule</Button>
        </div>

        {examData.schedules.map((schedule, index) => {
          const selectedClassroom = classrooms.find((c) => c._id === schedule.classroom);
          return (
            <Card key={index} className="em-nested-card"
              title={`Schedule ${index + 1}`}
              actions={<Button variant="danger" onClick={() => removeSchedule(index)}>Remove</Button>}
            >
              <div className="em-form-grid">
                <FormField label="Classroom">
                  <select className="em-select" required value={schedule.classroom}
                    onChange={(e) => updateSchedule(index, 'classroom', e.target.value)}>
                    <option value="">Select Classroom</option>
                    {classrooms?.map((c) => (
                      <option key={c._id} value={c._id}>{c.name} - {c.grade} {c.section}</option>
                    ))}
                  </select>
                  {selectedClassroom && (
                    <small className="em-field__hint">Subject: {selectedClassroom.subject} · Students: {selectedClassroom.students?.length || 0}</small>
                  )}
                </FormField>
                <FormField label="Subject">
                  <input className="em-input" type="text" required value={schedule.subject} placeholder="e.g., Mathematics"
                    onChange={(e) => updateSchedule(index, 'subject', e.target.value)} />
                </FormField>
                <FormField label="Date">
                  <input className="em-input" type="date" required value={schedule.date} min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => updateSchedule(index, 'date', e.target.value)} />
                </FormField>
                <FormField label="Start Time">
                  <input className="em-input" type="time" required value={schedule.startTime}
                    onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)} />
                </FormField>
                <FormField label="End Time">
                  <input className="em-input" type="time" required value={schedule.endTime}
                    onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)} />
                </FormField>
                <FormField label="Duration (minutes, auto-calculated)">
                  <input className="em-input" type="number" readOnly value={schedule.duration} placeholder="Auto-calculated" />
                </FormField>
                <FormField label="Room">
                  <input className="em-input" type="text" value={schedule.room} placeholder="e.g., Room 101"
                    onChange={(e) => updateSchedule(index, 'room', e.target.value)} />
                </FormField>
                <FormField label="Total Marks">
                  <input className="em-input" type="number" min="0" max="200" value={schedule.totalMarks}
                    onChange={(e) => updateSchedule(index, 'totalMarks', e.target.value)} />
                </FormField>
              </div>
            </Card>
          );
        })}

        {error && <p className="em-field__error">{error}</p>}
        <div className="em-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={loading} disabled={examData.schedules.length === 0 || !examData.title.trim()}>
            {`Create ${examData.schedules.length} Schedule${examData.schedules.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

/* =========================================================================
   Inline forms (rendered as tabs, not modals — matches original)
   ========================================================================= */

const CreateUserForm = ({ onSubmit, loading, onBack }) => {
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'teacher', department: '', parentEmail: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(userForm);
    if (success) setUserForm({ name: '', email: '', password: '', role: 'teacher', department: '', parentEmail: '' });
  };

  return (
    <>
      <TopBar title="Create User" actions={<Button icon={ArrowLeft} onClick={onBack}>Back to Dashboard</Button>} />
      <Card>
        <form onSubmit={handleSubmit}>
          <FormField label="Full Name">
            <input className="em-input" type="text" required value={userForm.name} placeholder="Enter full name"
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          </FormField>
          <FormField label="Email">
            <input className="em-input" type="email" required value={userForm.email} placeholder="Enter email address"
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          </FormField>
          <FormField label="Password">
            <input className="em-input" type="password" required value={userForm.password} placeholder="Enter temporary password"
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <select className="em-select" required value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="staff">Staff</option>
            </select>
          </FormField>
          <FormField label="Department">
            <input className="em-input" type="text" value={userForm.department} placeholder="Enter department (optional)"
              onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} />
          </FormField>
          {userForm.role === 'student' && (
            <FormField label="Parent Email">
              <input className="em-input" type="email" value={userForm.parentEmail} placeholder="Enter parent email address"
                onChange={(e) => setUserForm({ ...userForm, parentEmail: e.target.value })} />
            </FormField>
          )}
          <Button type="submit" variant="primary" loading={loading}>Create User</Button>
        </form>
      </Card>
    </>
  );
};

const CreateClassroomForm = ({ onSubmit, loading, onBack }) => {
  const [classroomForm, setClassroomForm] = useState({ name: '', grade: '', section: '', subject: '', classTeacherEmail: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(classroomForm);
    if (success) setClassroomForm({ name: '', grade: '', section: '', subject: '', classTeacherEmail: '' });
  };

  return (
    <>
      <TopBar title="Create Classroom" actions={<Button icon={ArrowLeft} onClick={onBack}>Back to Classrooms</Button>} />
      <Card>
        <form onSubmit={handleSubmit}>
          <FormField label="Classroom Name">
            <input className="em-input" type="text" required value={classroomForm.name} placeholder="Enter classroom name"
              onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })} />
          </FormField>
          <FormField label="Grade">
            <input className="em-input" type="text" required value={classroomForm.grade} placeholder="Enter grade (e.g., 10th)"
              onChange={(e) => setClassroomForm({ ...classroomForm, grade: e.target.value })} />
          </FormField>
          <FormField label="Section">
            <input className="em-input" type="text" required value={classroomForm.section} placeholder="Enter section (e.g., A, B, C)"
              onChange={(e) => setClassroomForm({ ...classroomForm, section: e.target.value })} />
          </FormField>
          <FormField label="Subject">
            <input className="em-input" type="text" required value={classroomForm.subject} placeholder="Enter subject"
              onChange={(e) => setClassroomForm({ ...classroomForm, subject: e.target.value })} />
          </FormField>
          <FormField label="Class Teacher Email">
            <input className="em-input" type="email" value={classroomForm.classTeacherEmail} placeholder="Enter class teacher email (optional)"
              onChange={(e) => setClassroomForm({ ...classroomForm, classTeacherEmail: e.target.value })} />
            <small className="em-field__hint">Teacher must already exist in the system</small>
          </FormField>
          <Button type="submit" variant="primary" loading={loading}>Create Classroom</Button>
        </form>
      </Card>
    </>
  );
};

/* =========================================================================
   Main component
   ========================================================================= */

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create-user', label: 'Create User', icon: UserPlus },
  { id: 'manage-teachers', label: 'Teachers', icon: Users },
  { id: 'manage-students', label: 'Students', icon: GraduationCap },
  { id: 'manage-parents', label: 'Parents', icon: UserRound },
  { id: 'manage-staff', label: 'Staff', icon: Briefcase },
  { id: 'classrooms', label: 'Classrooms', icon: School },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { id: 'timetables', label: 'Timetables', icon: CalendarDays },
  { id: 'exams', label: 'Exams', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// Non-nav tabs fall back to their parent nav item for the sidebar's active state,
// same pattern as Super Admin's edit-school.
const NAV_FALLBACK = { 'create-classroom': 'classrooms', 'attendance-details': 'attendance' };

const ROLE_TABS = {
  'manage-teachers': { role: 'teachers', label: 'Teachers', icon: Users },
  'manage-students': { role: 'students', label: 'Students', icon: GraduationCap },
  'manage-parents': { role: 'parents', label: 'Parents', icon: UserRound },
  'manage-staff': { role: 'staff', label: 'Staff', icon: Briefcase },
};

const SchoolAdmin = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [timetables, setTimetables] = useState([]);
  const [examSchedules, setExamSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toasts, showToast, removeToast } = useToasts();

  const [addStudentModal, setAddStudentModal] = useState({ isOpen: false, classroom: null });
  const [addMultipleStudentsModal, setAddMultipleStudentsModal] = useState({ isOpen: false, classroom: null });
  const [assignTeacherModal, setAssignTeacherModal] = useState({ isOpen: false, classroom: null });
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, type: 'user' });
  const [timetableModal, setTimetableModal] = useState({ isOpen: false, timetable: null });
  const [timetableUploadModal, setTimetableUploadModal] = useState({ isOpen: false, classroom: null });
  const [createExamModal, setCreateExamModal] = useState({ isOpen: false });

  const getCurrentApiRole = () => ROLE_TABS[activeTab]?.role || 'teachers';

  // ---- Data fetching — same endpoints/payloads, now via the shared `api` client ----

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/school-admin/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch dashboard data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByRole = async (role) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/school-admin/users/${role}`);
      setUsers(response.data.users || []);
    } catch (err) {
      showToast(getErrorMessage(err, `Failed to fetch ${role}`), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/school-admin/classrooms');
      setClassrooms(response.data.classrooms || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch classrooms'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassAttendance = async (classroomId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/school-admin/classroom/attendance/${classroomId}`);
      setAttendanceData(response.data.attendance || []);
      if (response.data.attendance.length === 0) {
        showToast('No attendance records found for this classroom', 'info');
      }
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch attendance data'), 'error');
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/school-admin/analytics');
      setAnalytics(response.data);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch analytics'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetables = async () => {
    try {
      const response = await api.get('/api/school-admin/timetables');
      setTimetables(response.data.timetables || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch timetables'), 'error');
    }
  };

  const fetchExamSchedules = async () => {
    try {
      const response = await api.get('/api/school-admin/exam-schedules');
      setExamSchedules(response.data.examSchedules || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to fetch exam schedules'), 'error');
    }
  };

  const handleUploadTimetable = async (classroomId, schedule) => {
    try {
      await api.post('/api/school-admin/timetable', { classroomId, schedule });
      showToast('Timetable uploaded successfully!');
      fetchTimetables();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to upload timetable'), 'error');
      throw err;
    }
  };

  const handleCreateExamSchedule = async (examData) => {
    try {
      await api.post('/api/school-admin/exam-schedule', examData);
      showToast('Exam schedule created successfully!');
      fetchExamSchedules();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create exam schedule'), 'error');
      throw err;
    }
  };

  const handleDeleteExamSchedule = async (examId) => {
    try {
      await api.delete(`/api/school-admin/exam-schedule/${examId}`);
      showToast('Exam schedule deleted successfully!');
      fetchExamSchedules();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete exam schedule'), 'error');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      setLoading(true);
      await api.post('/api/school-admin/user', userData);
      showToast(`${userData.role} created successfully!`);
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create user'), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (classroomData) => {
    try {
      setLoading(true);
      await api.post('/api/school-admin/classroom', {
        name: classroomData.name,
        grade: classroomData.grade,
        section: classroomData.section,
        subject: classroomData.subject,
        classTeacherEmail: classroomData.classTeacherEmail,
      });
      showToast('Classroom created successfully!');
      fetchClassrooms();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create classroom'), 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudentToClass = async (classroomId, studentEmail) => {
    try {
      const response = await api.post('/api/school-admin/classroom/add-student', { classroomId, studentEmail });
      showToast(response.data.message);
      fetchClassrooms();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to add student to classroom'), 'error');
      throw err;
    }
  };

  const handleAddMultipleStudents = async (classroomId, studentIds) => {
    try {
      const response = await api.post('/api/school-admin/classroom/add-students-by-ids', { classroomId, studentIds });
      showToast(response.data.message);
      fetchClassrooms();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to add students to classroom'), 'error');
      throw err;
    }
  };

  const handleAssignTeacher = async (classroomId, teacherEmail) => {
    try {
      const response = await api.put(`/api/school-admin/classroom/${classroomId}/assign-teacher`, { teacherEmail });
      showToast(response.data.message);
      fetchClassrooms();
      return true;
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to assign teacher to classroom'), 'error');
      throw err;
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await api.put(`/api/school-admin/user/${userId}`, updates);
      showToast('User updated successfully!');
      fetchUsersByRole(getCurrentApiRole());
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to update user'), 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await api.delete(`/api/school-admin/user/${user._id}`);
      showToast(`${user.role} deleted successfully!`);
      fetchUsersByRole(getCurrentApiRole());
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete user'), 'error');
    }
  };

  const handleDeleteClassroom = async (classroom) => {
    try {
      await api.delete(`/api/school-admin/classroom/${classroom._id}`);
      showToast('Classroom deleted successfully!');
      fetchClassrooms();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete classroom'), 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (activeTab === 'classrooms') fetchClassrooms();
    else if (activeTab.startsWith('manage-')) fetchUsersByRole(getCurrentApiRole());
    else if (activeTab === 'analytics') fetchAnalytics();
    else if (activeTab === 'timetables') fetchTimetables();
    else if (activeTab === 'exams') {
      fetchExamSchedules();
      fetchClassrooms();
    } else if (activeTab === 'attendance') fetchClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const getAttendanceRate = (classroomId) => {
    const records = attendanceData.filter((r) => r.classroom?._id === classroomId);
    if (records.length === 0) return 'No data';
    const present = records.filter((r) => r.status === 'present').length;
    return `${((present / records.length) * 100).toFixed(1)}%`;
  };

  const goTo = (tab) => setActiveTab(tab);

  return (
    <div className="em-app-shell">
      <Sidebar
        items={NAV_ITEMS}
        activeId={NAV_FALLBACK[activeTab] || activeTab}
        onSelect={goTo}
        roleLabel="School Admin"
        onLogout={() => {
          localStorage.clear();
          window.location.reload();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={removeToast} />

      <main className="em-main">
        <div className="em-content">
          {activeTab === 'dashboard' && (
            <>
              <TopBar title="Dashboard" subtitle="Your school at a glance" />
              {loading ? (
                <div className="em-loading">Loading dashboard data…</div>
              ) : dashboardData ? (
                <>
                  <div className="em-stats-grid">
                    <StatCard icon={Users} label="Teachers" value={dashboardData.totalTeachers} />
                    <StatCard icon={GraduationCap} label="Students" value={dashboardData.totalStudents} tone="success" />
                    <StatCard icon={UserRound} label="Parents" value={dashboardData.totalParents} tone="info" />
                    <StatCard icon={Briefcase} label="Staff" value={dashboardData.totalStaff} />
                  </div>

                  <Card title="Quick Actions">
                    <div className="em-quick-actions">
                      <Button variant="primary" icon={UserPlus} onClick={() => goTo('create-user')}>Create User</Button>
                      <Button icon={Users} onClick={() => goTo('manage-teachers')}>Manage Teachers</Button>
                      <Button icon={School} onClick={() => goTo('classrooms')}>Manage Classrooms</Button>
                      <Button icon={ClipboardCheck} onClick={() => goTo('attendance')}>Attendance Reports</Button>
                      <Button icon={CalendarDays} onClick={() => goTo('timetables')}>Timetables</Button>
                      <Button icon={BookOpen} onClick={() => goTo('exams')}>Exam Schedules</Button>
                      <Button icon={BarChart3} onClick={() => goTo('analytics')}>Analytics</Button>
                    </div>
                  </Card>

                  <Card title="School Overview" className="em-analytics-section">
                    <div className="em-detail-row"><span>School</span><strong>{dashboardData.schoolName}</strong></div>
                    <div className="em-detail-row"><span>Code</span><strong>{dashboardData.schoolCode}</strong></div>
                    <div className="em-detail-row"><span>Established</span><strong>{dashboardData.recentActivity}</strong></div>
                  </Card>
                </>
              ) : (
                <EmptyState title="No dashboard data available" />
              )}
            </>
          )}

          {activeTab === 'create-user' && (
            <CreateUserForm onSubmit={handleCreateUser} loading={loading} onBack={() => goTo('dashboard')} />
          )}

          {activeTab === 'create-classroom' && (
            <CreateClassroomForm onSubmit={handleCreateClassroom} loading={loading} onBack={() => goTo('classrooms')} />
          )}

          {['manage-teachers', 'manage-students', 'manage-parents', 'manage-staff'].includes(activeTab) && (
            <>
              <TopBar
                title={ROLE_TABS[activeTab].label}
                actions={
                  <>
                    <Button icon={RefreshCw} onClick={() => fetchUsersByRole(getCurrentApiRole())}>Refresh</Button>
                    <Button variant="primary" icon={UserPlus} onClick={() => goTo('create-user')}>
                      Add {ROLE_TABS[activeTab].label.replace(/s$/, '')}
                    </Button>
                  </>
                }
              />
              {loading ? (
                <div className="em-loading">Loading {ROLE_TABS[activeTab].label.toLowerCase()}…</div>
              ) : users.length === 0 ? (
                <EmptyState title={`No ${ROLE_TABS[activeTab].label.toLowerCase()} found`} />
              ) : (
                <div className="em-entity-list">
                  {users.map((user) => (
                    <Card
                      key={user._id}
                      title={user.name}
                      actions={
                        <>
                          <Button icon={Pencil} onClick={() => setEditUserModal({ isOpen: true, user })}>Edit</Button>
                          <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal({ isOpen: true, item: user, type: 'user' })}>Delete</Button>
                        </>
                      }
                    >
                      <div className="em-detail-row"><span>Email</span><strong>{user.email}</strong></div>
                      {user.department && <div className="em-detail-row"><span>Department</span><strong>{user.department}</strong></div>}
                      {user.parentEmail && <div className="em-detail-row"><span>Parent Email</span><strong>{user.parentEmail}</strong></div>}
                      {user.subjects?.length > 0 && <div className="em-detail-row"><span>Subjects</span><strong>{user.subjects.join(', ')}</strong></div>}
                      {user.classroom && <div className="em-detail-row"><span>Classroom</span><strong>{user.classroom}</strong></div>}
                      <div className="em-detail-row"><span>Joined</span><strong>{new Date(user.createdAt).toLocaleDateString()}</strong></div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'classrooms' && (
            <>
              <TopBar
                title="Classrooms"
                actions={
                  <>
                    <Button icon={RefreshCw} onClick={fetchClassrooms}>Refresh</Button>
                    <Button variant="primary" icon={Plus} onClick={() => goTo('create-classroom')}>Create Classroom</Button>
                  </>
                }
              />
              {classrooms.length === 0 ? (
                <EmptyState icon={School} title="No classrooms created yet" />
              ) : (
                <div className="em-entity-list">
                  {classrooms.map((classroom) => (
                    <Card
                      key={classroom._id}
                      title={classroom.name}
                      actions={
                        <>
                          <Button icon={ClipboardCheck} onClick={() => { fetchClassAttendance(classroom._id); goTo('attendance-details'); }}>Attendance</Button>
                          <Button icon={UserPlus} onClick={() => setAddStudentModal({ isOpen: true, classroom })}>Add Student</Button>
                          <Button icon={Users} onClick={() => setAddMultipleStudentsModal({ isOpen: true, classroom })}>Add Multiple</Button>
                          <Button icon={CalendarDays} onClick={() => setTimetableUploadModal({ isOpen: true, classroom })}>Add Timetable</Button>
                          <Button icon={UserRound} onClick={() => setAssignTeacherModal({ isOpen: true, classroom })}>Assign Teacher</Button>
                          <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal({ isOpen: true, item: classroom, type: 'classroom' })}>Delete</Button>
                        </>
                      }
                    >
                      <div className="em-detail-row"><span>Subject</span><strong>{classroom.subject}</strong></div>
                      <div className="em-detail-row"><span>Grade</span><strong>{classroom.grade} - {classroom.section}</strong></div>
                      <div className="em-detail-row"><span>Teacher</span><strong>{classroom.classTeacher?.name || 'Not assigned'}</strong></div>
                      <div className="em-detail-row"><span>Students</span><strong>{classroom.students?.length || 0}</strong></div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'attendance' && (
            <>
              <TopBar title="Attendance Reports" actions={<Button icon={ArrowLeft} onClick={() => goTo('classrooms')}>Back to Classrooms</Button>} />
              <p className="em-section-title">Classroom Attendance Overview</p>
              {classrooms.length === 0 ? (
                <EmptyState title="No classrooms available" />
              ) : (
                <div className="em-entity-list">
                  {classrooms.map((classroom) => (
                    <Card
                      key={classroom._id}
                      title={classroom.name}
                      actions={
                        <Button icon={Eye} onClick={() => { fetchClassAttendance(classroom._id); goTo('attendance-details'); }}>
                          View Details
                        </Button>
                      }
                    >
                      <div className="em-detail-row"><span>Subject</span><strong>{classroom.subject}</strong></div>
                      <div className="em-detail-row"><span>Students</span><strong>{classroom.students?.length || 0}</strong></div>
                      <div className="em-detail-row"><span>Attendance Rate</span><strong>{getAttendanceRate(classroom._id)}</strong></div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'attendance-details' && (
            <>
              <TopBar title="Attendance Details" actions={<Button icon={ArrowLeft} onClick={() => goTo('attendance')}>Back to Reports</Button>} />
              <p className="em-section-title">Detailed Attendance Records</p>
              {loading ? (
                <div className="em-loading">Loading attendance data…</div>
              ) : attendanceData.length > 0 ? (
                <div className="em-entity-list">
                  {attendanceData.map((record) => (
                    <Card key={record._id} title={record.student?.name || 'Unknown Student'}>
                      <div className="em-detail-row"><span>Date</span><strong>{new Date(record.date).toLocaleDateString()}</strong></div>
                      <div className="em-detail-row">
                        <span>Status</span>
                        <strong style={{ color: record.status === 'present' ? 'var(--success)' : 'var(--danger)' }}>
                          {record.status?.toUpperCase()}
                        </strong>
                      </div>
                      <div className="em-detail-row"><span>Subject</span><strong>{record.subject}</strong></div>
                      <div className="em-detail-row"><span>Teacher</span><strong>{record.teacher?.name || 'N/A'}</strong></div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState title="No attendance records found" />
              )}
            </>
          )}

          {activeTab === 'timetables' && (
            <>
              <TopBar title="Manage Timetables" actions={<Button icon={RefreshCw} onClick={fetchTimetables}>Refresh</Button>} />
              {timetables.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title={classrooms.length === 0 ? 'Create classrooms first to upload timetables' : 'No timetables uploaded yet'}
                  description={classrooms.length > 0 ? 'Click "Add Timetable" in a classroom\'s actions to get started.' : undefined}
                />
              ) : (
                <div className="em-entity-list">
                  {timetables.map((timetable) => (
                    <Card
                      key={timetable._id}
                      title={timetable.classroom?.name}
                      actions={
                        <>
                          <Button icon={Eye} onClick={() => setTimetableModal({ isOpen: true, timetable })}>View</Button>
                          <Button icon={Pencil} onClick={() => setTimetableUploadModal({ isOpen: true, classroom: timetable.classroom })}>Edit</Button>
                          <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this timetable?')) {
                                showToast('Timetable deletion feature coming soon!', 'info');
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      }
                    >
                      <div className="em-detail-row"><span>Grade</span><strong>{timetable.classroom?.grade} - {timetable.classroom?.section}</strong></div>
                      <div className="em-detail-row"><span>Class Teacher</span><strong>{timetable.classroom?.classTeacher?.name || 'Not assigned'}</strong></div>
                      <div className="em-detail-row"><span>Last Updated</span><strong>{new Date(timetable.updatedAt).toLocaleDateString()}</strong></div>
                      <div className="em-detail-row"><span>Periods Configured</span><strong>{timetable.schedule?.reduce((t, d) => t + d.periods.length, 0) || 0}</strong></div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'exams' && (
            <>
              <TopBar
                title="Exam Schedules"
                actions={
                  <>
                    <Button icon={RefreshCw} onClick={fetchExamSchedules}>Refresh</Button>
                    <Button variant="primary" icon={Plus} onClick={() => setCreateExamModal({ isOpen: true })}>Create Schedule</Button>
                  </>
                }
              />
              {examSchedules.length === 0 ? (
                <EmptyState title="No exam schedules created yet" />
              ) : (
                <div className="em-entity-list">
                  {examSchedules.map((exam) => (
                    <Card
                      key={exam._id}
                      title={exam.title}
                      actions={
                        <>
                          {/* Preserved as-is from the original: no view handler exists yet */}
                          <Button icon={Eye}>View</Button>
                          <Button variant="danger" icon={Trash2} onClick={() => handleDeleteExamSchedule(exam._id)}>Delete</Button>
                        </>
                      }
                    >
                      <div className="em-detail-row"><span>Type</span><strong>{exam.examType}</strong></div>
                      <div className="em-detail-row"><span>Created</span><strong>{new Date(exam.createdAt).toLocaleDateString()}</strong></div>
                      <div className="em-detail-row"><span>Schedules</span><strong>{exam.schedules?.length || 0} exams scheduled</strong></div>
                      {exam.description && <div className="em-detail-row"><span>Description</span><strong>{exam.description}</strong></div>}
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              <TopBar title="School Analytics" actions={<Button icon={RefreshCw} onClick={fetchAnalytics}>Refresh</Button>} />
              {loading ? (
                <div className="em-loading">Loading analytics…</div>
              ) : analytics ? (
                <>
                  <div className="em-analytics-section">
                    <p className="em-section-title">School Overview</p>
                    <div className="em-stats-grid">
                      <StatCard icon={Users} label="Teachers" value={analytics.schoolOverview.totalTeachers} />
                      <StatCard icon={GraduationCap} label="Students" value={analytics.schoolOverview.totalStudents} tone="success" />
                      <StatCard icon={ClipboardCheck} label="Attendance Rate" value={`${analytics.attendance.overallRate}%`} tone="info" />
                      <StatCard icon={BarChart3} label="Avg Performance" value={`${analytics.academicPerformance.averagePercentage}%`} />
                    </div>
                  </div>

                  <Card title="Top Performing Students" className="em-analytics-section">
                    <BarChart
                      data={analytics.topStudents.map((s) => ({ label: s.name, value: s.averagePercentage }))}
                      unit="%"
                      emptyLabel="No student performance data yet"
                    />
                    <div className="em-entity-list" style={{ marginTop: 'var(--space-4)' }}>
                      {analytics.topStudents.map((student, index) => (
                        <div className="em-detail-row" key={index}>
                          <span>#{index + 1} {student.name} · {student.email}</span>
                          <strong>{student.averagePercentage}% · {student.totalExams} exams</strong>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : (
                <EmptyState title="No analytics data available" />
              )}
            </>
          )}
        </div>
      </main>

      <AddStudentModal
        isOpen={addStudentModal.isOpen}
        onClose={() => setAddStudentModal({ isOpen: false, classroom: null })}
        classroom={addStudentModal.classroom}
        onAddStudent={handleAddStudentToClass}
      />
      <AddMultipleStudentsModal
        isOpen={addMultipleStudentsModal.isOpen}
        onClose={() => setAddMultipleStudentsModal({ isOpen: false, classroom: null })}
        classroom={addMultipleStudentsModal.classroom}
        onAddMultipleStudents={handleAddMultipleStudents}
      />
      <AssignTeacherModal
        isOpen={assignTeacherModal.isOpen}
        onClose={() => setAssignTeacherModal({ isOpen: false, classroom: null })}
        classroom={assignTeacherModal.classroom}
        onAssignTeacher={handleAssignTeacher}
      />
      <EditUserModal
        key={editUserModal.user?._id || 'modal'}
        isOpen={editUserModal.isOpen}
        onClose={() => setEditUserModal({ isOpen: false, user: null })}
        user={editUserModal.user}
        onUpdateUser={handleUpdateUser}
      />
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, type: 'user' })}
        item={deleteModal.item}
        type={deleteModal.type}
        onConfirm={deleteModal.type === 'classroom' ? handleDeleteClassroom : handleDeleteUser}
      />
      <TimetableUploadModal
        isOpen={timetableUploadModal.isOpen}
        onClose={() => setTimetableUploadModal({ isOpen: false, classroom: null })}
        classroom={timetableUploadModal.classroom}
        onUploadTimetable={handleUploadTimetable}
      />
      <TimetableModal
        isOpen={timetableModal.isOpen}
        onClose={() => setTimetableModal({ isOpen: false, timetable: null })}
        timetable={timetableModal.timetable}
      />
      <CreateExamModal
        isOpen={createExamModal.isOpen}
        onClose={() => setCreateExamModal({ isOpen: false })}
        classrooms={classrooms}
        onCreateExam={handleCreateExamSchedule}
      />
    </div>
  );
};

export default SchoolAdmin;


