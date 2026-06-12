
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../superadmin/SuperAdmin.css';

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
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label>Student Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter student email address"
            required
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Student'}
          </button>
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

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = `${API}/api/school-admin`;
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  useEffect(() => {
    if (isOpen && classroom) {
      fetchUnassignedStudents();
    }
  }, [isOpen, classroom]);

  const fetchUnassignedStudents = async () => {
    try {
      setFetching(true);
      const response = await axios.get(
        `${BASE_URL}/classroom/${classroom._id}/unassigned-students`, 
        getAuthHeaders()
      );
      setStudents(response.data.students || []);
    } catch (err) {
      setError('');
      console.error( err);
    } finally {
      setFetching(false);
    }
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student._id));
    }
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Students to ${classroom?.name}`} size="xlarge">
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <div className="selection-header">
            <label>Select Students to Add</label>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleSelectAll}
            >
              {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {fetching ? (
            <div className="loading">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="no-data">No unassigned students found</div>
          ) : (
            <div className="students-list">
              {students.map(student => (
                <div key={student._id} className="student-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => handleStudentSelect(student._id)}
                    />
                    <div className="student-info">
                      <span className="student-name">{student.name}</span>
                      <span className="student-email">{student.email}</span>
                      {student.grade && (
                        <span className="student-grade">Grade: {student.grade}</span>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
          
          {selectedStudents.length > 0 && (
            <div className="selection-count">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || selectedStudents.length === 0}
          >
            {loading ? 'Adding...' : `Add ${selectedStudents.length} Student${selectedStudents.length !== 1 ? 's' : ''}`}
          </button>
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
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label>Teacher Email</label>
          <input
            type="email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            placeholder="Enter teacher email address"
            required
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Teacher must already exist in the system
          </small>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Assigning...' : 'Assign Teacher'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const EditUserModal = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    parentEmail: '',
    subjects: '',
    classroom: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        parentEmail: user.parentEmail || '',
        subjects: Array.isArray(user.subjects) ? user.subjects.join(', ') : '',
        classroom: user.classroom || ''
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user._id) {
      return;
    }
    
    const processedData = {
      name: formData.name,
      email: formData.email,
      department: formData.department,
      parentEmail: formData.parentEmail,
      subjects: formData.subjects ? formData.subjects.split(',').map(s => s.trim()).filter(s => s) : [],
      classroom: formData.classroom
    };
    
    try {
      await onUpdateUser(user._id, processedData);
      onClose();
    } catch (error) {
      console.error( error);
    }
  };

  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
        <div className="loading">Loading user data...</div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${user?.name}`} size="large">
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Enter full name"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="Enter email address"
          />
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Enter department"
          />
        </div>

        {user.role === 'student' && (
          <div className="form-group">
            <label>Parent Email</label>
            <input
              type="email"
              value={formData.parentEmail}
              onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
              placeholder="Enter parent email address"
            />
          </div>
        )}

        {(user.role === 'teacher' || user.role === 'student') && (
          <div className="form-group">
            <label>Subjects (comma separated)</label>
            <input
              type="text"
              value={formData.subjects}
              onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
              placeholder="e.g., Math, Science, English"
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Separate multiple subjects with commas
            </small>
          </div>
        )}

        <div className="form-group">
          <label>Classroom ID</label>
          <input
            type="text"
            value={formData.classroom}
            onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
            placeholder="Enter classroom ID"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Update User
          </button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteConfirmationModal = ({ isOpen, onClose, item, onConfirm, type = "user" }) => {
  const getMessage = () => {
    switch (type) {
      case 'user':
        return `Are you sure you want to delete ${item?.name}? This action cannot be undone.`;
      case 'classroom':
        return `Are you sure you want to delete ${item?.name}? This will remove all associated data.`;
      default:
        return 'Are you sure you want to delete this item?';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" size="small">
      <div className="confirmation-content">
        <div className="warning-icon">⚠️</div>
        <p>{getMessage()}</p>
        
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={() => {
              onConfirm(item);
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
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

const TimetableUploadModal = ({ isOpen, onClose, classroom, onUploadTimetable }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);
 const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
 const BASE_URL = `${API}/api/school-admin`;

useEffect(() => {
  if (isOpen && classroom) {
    fetchAvailableTeachers();
  }
}, [isOpen, classroom]);

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };


const fetchAvailableTeachers = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/users/teachers`, 
      getAuthHeaders()
    );
    setTeachers(response.data.users || []);
  } catch (err) {
    console.error( err);
  }
};

  const availableDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (isOpen) {
      setSchedule([]);
    }
  }, [isOpen]);

  const addDay = (dayValue) => {
    const dayExists = schedule.find(day => day.day === dayValue);
    if (dayExists) return;

    const dayLabel = availableDays.find(d => d.value === dayValue)?.label || dayValue;
    
    setSchedule(prev => [...prev, {
      day: dayValue,
      dayLabel: dayLabel,
      periods: []
    }]);
  };

  const removeDay = (dayValue) => {
    setSchedule(prev => prev.filter(day => day.day !== dayValue));
  };

  const addPeriod = (dayIndex) => {
    const updatedSchedule = [...schedule];
    const day = updatedSchedule[dayIndex];
    const periodNumber = day.periods.length + 1;
    
    day.periods.push({
      periodNumber: periodNumber,
      periodName: `Period ${periodNumber}`,
      startTime: '',
      endTime: '',
      subject: '',
      teacher: '',
      room: ''
    });
    
    setSchedule(updatedSchedule);
  };

  const removePeriod = (dayIndex, periodIndex) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].periods.splice(periodIndex, 1);

    updatedSchedule[dayIndex].periods.forEach((period, index) => {
      period.periodNumber = index + 1;
      period.periodName = `Period ${index + 1}`;
    });
    
    setSchedule(updatedSchedule);
  };

  const handlePeriodChange = (dayIndex, periodIndex, field, value) => {
    const updatedSchedule = [...schedule];
    updatedSchedule[dayIndex].periods[periodIndex][field] = value;
    setSchedule(updatedSchedule);
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

  const getAvailableDaysToAdd = () => {
    const usedDays = schedule.map(day => day.day);
    return availableDays.filter(day => !usedDays.includes(day.value));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Timetable - ${classroom?.name}`} size="xlarge">
      <form onSubmit={handleSubmit} className="timetable-form">
        {classroom && (
          <div className="classroom-info">
            <h4>🏫 Classroom Details</h4>
            <div className="classroom-details">
              <div className="classroom-detail">
                <strong>Name:</strong>
                <span>{classroom.name}</span>
              </div>
              <div className="classroom-detail">
                <strong>Grade & Section:</strong>
                <span>{classroom.grade} - {classroom.section}</span>
              </div>
              <div className="classroom-detail">
                <strong>Subject:</strong>
                <span>{classroom.subject}</span>
              </div>
            </div>
          </div>
        )}

        <div className="configuration-section">
          <h4>📅 Add Days to Timetable</h4>
          <p className="section-description">
            Add only the days that have classes. You can add 1 day, 2 days, or the whole week.
          </p>
          
          <div className="days-selection-container">
            <div className="available-days">
              <label>Available Days:</label>
              <div className="days-buttons">
                {getAvailableDaysToAdd().map(day => (
                  <button
                    key={day.value}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => addDay(day.value)}
                  >
                    + {day.label}
                  </button>
                ))}
              </div>
            </div>
            
            {schedule.length > 0 && (
              <div className="selected-days-count">
                {schedule.length} day{schedule.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        <div className="timetable-section">
          <h4>📚 Build Your Timetable</h4>
          <p className="section-description">
            For each day, add as many periods as needed. You can have 0 periods (day off) or many periods.
          </p>
          
          {schedule.length === 0 ? (
            <div className="no-days-selected">
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h5>No days added yet</h5>
                <p>Start by adding days from the section above</p>
              </div>
            </div>
          ) : (
            <div className="timetable-builder">
              {schedule.map((day, dayIndex) => (
                <div key={day.day} className="timetable-day-card">
                  <div className="day-header">
                    <h5>{day.dayLabel}</h5>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeDay(day.day)}
                    >
                      Remove Day
                    </button>
                  </div>
                  
                  <div className="periods-section">
                    <div className="periods-header">
                      <span>Periods: {day.periods.length}</span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => addPeriod(dayIndex)}
                      >
                        + Add Period
                      </button>
                    </div>
                    
                    {day.periods.length === 0 ? (
                      <div className="no-periods">
                        <p>No periods added for this day</p>
                        <small>Click "Add Period" to schedule classes</small>
                      </div>
                    ) : (
                      <div className="periods-list">
                        {day.periods.map((period, periodIndex) => (
                          <div key={periodIndex} className="period-row">
                            <div className="period-header">
                              <span className="period-number">{period.periodName}</span>
                              <button
                                type="button"
                                className="btn btn-danger btn-xs"
                                onClick={() => removePeriod(dayIndex, periodIndex)}
                              >
                                Remove
                              </button>
                            </div>
                            
                            <div className="period-fields">
                              <div className="time-group">
                                <label>Start Time</label>
                                <input
                                  type="time"
                                  value={period.startTime}
                                  onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'startTime', e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="time-group">
                                <label>End Time</label>
                                <input
                                  type="time"
                                  value={period.endTime}
                                  onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'endTime', e.target.value)}
                                  required
                                />
                              </div>
                              
                              <div className="field-group">
                                <label>Subject *</label>
                                <input
                                  type="text"
                                  value={period.subject}
                                  onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'subject', e.target.value)}
                                  placeholder="e.g., Mathematics"
                                  required
                                />
                              </div>
                              
                              <div className="field-group">
  <label>Teacher</label>
  <select
    value={period.teacher}
    onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'teacher', e.target.value)}
  >
    <option value="">Select Teacher</option>
    {teachers.map(teacher => (
      <option key={teacher._id} value={teacher.name}>
        {teacher.name} - {teacher.email}
      </option>
    ))}
  </select>
</div>
                              
                              <div className="field-group">
                                <label>Room</label>
                                <input
                                  type="text"
                                  value={period.room}
                                  onChange={(e) => handlePeriodChange(dayIndex, periodIndex, 'room', e.target.value)}
                                  placeholder="Room number"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !classroom || schedule.length === 0}
          >
            {loading ? 'Uploading...' : `Create Timetable (${schedule.length} days)`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const TimetableModal = ({ isOpen, onClose, timetable }) => {
  if (!timetable) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Timetable - ${timetable.classroom?.name}`} size="xlarge">
      <div className="timetable-view">
        <div className="timetable-header">
          <h4>Academic Year: {timetable.academicYear}</h4>
          <p>Last updated: {new Date(timetable.updatedAt).toLocaleDateString()}</p>
        </div>
        
        <div className="timetable-grid">
          {timetable.schedule.map((day) => (
            <div key={day.day} className="timetable-day-view">
              <h5 className="day-title">{day.day.charAt(0).toUpperCase() + day.day.slice(1)}</h5>
              <div className="periods-list">
                {day.periods.map((period, index) => (
                  <div key={index} className={`period-card ${period.subject ? 'has-subject' : 'empty'}`}>
                    <div className="period-time">
                      {period.startTime} - {period.endTime}
                    </div>
                    <div className="period-details">
                      <strong>{period.subject || 'Free Period'}</strong>
                      
                      <div>Teacher: {period.teacher || 'No teacher assigned'}</div>
                      {period.room && <div>Room: {period.room}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const CreateExamModal = ({ isOpen, onClose, classrooms, onCreateExam }) => {
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    examType: 'unit-test',
    academicYear: '2024-2025',
    schedules: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSchedule = () => {
    setExamData(prev => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        {
          classroom: '',
          subject: '',
          date: '',
          startTime: '',
          endTime: '',
          duration: '',
          totalMarks: 100,
          room: '',
          supervisor: null
        }
      ]
    }));
  };

  const updateSchedule = (index, field, value) => {
    const updatedSchedules = [...examData.schedules];
    
    if (field === 'supervisor') {
      updatedSchedules[index][field] = value === '' ? null : value;
    } else {
      updatedSchedules[index][field] = value;
    }
    
    setExamData(prev => ({ ...prev, schedules: updatedSchedules }));
  };

  const removeSchedule = (index) => {
    setExamData(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== index)
    }));
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
      const schedule = examData.schedules[i];
      if (!schedule.classroom) {
        setError(`Please select a classroom for schedule ${i + 1}`);
        return;
      }
      if (!schedule.subject?.trim()) {
        setError(`Please enter a subject for schedule ${i + 1}`);
        return;
      }
      if (!schedule.date) {
        setError(`Please select a date for schedule ${i + 1}`);
        return;
      }
      if (!schedule.startTime) {
        setError(`Please select start time for schedule ${i + 1}`);
        return;
      }
      if (!schedule.endTime) {
        setError(`Please select end time for schedule ${i + 1}`);
        return;
      }

      const selectedDate = new Date(schedule.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        setError(`Date cannot be in the past for schedule ${i + 1}`);
        return;
      }

      if (schedule.startTime >= schedule.endTime) {
        setError(`End time must be after start time for schedule ${i + 1}`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
     
      const formattedData = {
        title: examData.title.trim(),
        description: examData.description.trim(),
        examType: examData.examType,
        academicYear: examData.academicYear,
        schedules: examData.schedules.map(schedule => {
          const cleanSchedule = {
            classroom: schedule.classroom,
            subject: schedule.subject.trim(),
            date: new Date(schedule.date).toISOString().split('T')[0], 
            startTime: schedule.startTime,
            endTime: schedule.endTime
          };

          if (schedule.duration) cleanSchedule.duration = schedule.duration;
          if (schedule.totalMarks) cleanSchedule.totalMarks = parseInt(schedule.totalMarks);
          if (schedule.room?.trim()) cleanSchedule.room = schedule.room.trim();
          
          
          if (schedule.supervisor && schedule.supervisor.trim() && schedule.supervisor.length === 24) {
            cleanSchedule.supervisor = schedule.supervisor.trim();
          }
         
          return cleanSchedule;
        })
      };

     
      await onCreateExam(formattedData);
      
   
      setExamData({
        title: '',
        description: '',
        examType: 'unit-test',
        academicYear: '2024-2025',
        schedules: []
      });
      onClose();
    } catch (err) {
      console.error( err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    
    return Math.max(0, endTotal - startTotal).toString();
  };

  const handleTimeChange = (index, field, value) => {
    updateSchedule(index, field, value);

    if (field === 'startTime' || field === 'endTime') {
      const schedule = examData.schedules[index];
      if (schedule.startTime && schedule.endTime) {
        const duration = calculateDuration(schedule.startTime, schedule.endTime);
        updateSchedule(index, 'duration', duration);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Exam Schedule" size="xlarge">
      <form onSubmit={handleSubmit} className="exam-form">
        <div className="form-row">
          <div className="form-group">
            <label>Exam Title *</label>
            <input
              type="text"
              value={examData.title}
              onChange={(e) => setExamData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., First Term Examination"
            />
          </div>
          <div className="form-group">
            <label>Exam Type *</label>
            <select
              value={examData.examType}
              onChange={(e) => setExamData(prev => ({ ...prev, examType: e.target.value }))}
              required
            >
              <option value="unit-test">Unit Test</option>
              <option value="mid-term">Mid-Term</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
              <option value="practical">Practical</option>
            </select>
          </div>
          <div className="form-group">
            <label>Academic Year *</label>
            <select
              value={examData.academicYear}
              onChange={(e) => setExamData(prev => ({ ...prev, academicYear: e.target.value }))}
              required
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={examData.description}
            onChange={(e) => setExamData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Exam description and instructions..."
            rows="3"
          />
        </div>

        <div className="schedules-section">
          <div className="section-header">
            <h4>Exam Schedules</h4>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addSchedule}>
              + Add Schedule
            </button>
          </div>

          {examData.schedules.map((schedule, index) => {
            const selectedClassroom = classrooms.find(cls => cls._id === schedule.classroom);
            
            return (
              <div key={index} className="schedule-card">
                <div className="schedule-header">
                  <h5>Schedule {index + 1}</h5>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    onClick={() => removeSchedule(index)}
                  >
                    Remove
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                   
                    <label>Classroom *</label>
                    <select
                      value={schedule.classroom}
                      onChange={(e) => updateSchedule(index, 'classroom', e.target.value)}
                      required
                    >
                      <option value="">Select Classroom</option>
                      {classrooms && classrooms.map(classroom => (
                        <option key={classroom._id} value={classroom._id}>
                          {classroom.name} - {classroom.grade} {classroom.section}
                        </option>
                      ))}
                    </select>
                    {selectedClassroom && (
                      <small style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
                        Subject: {selectedClassroom.subject} • Students: {selectedClassroom.students?.length || 0}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Subject *</label>
                    <input
                      type="text"
                      value={schedule.subject}
                      onChange={(e) => updateSchedule(index, 'subject', e.target.value)}
                      required
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={schedule.date}
                      onChange={(e) => updateSchedule(index, 'date', e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Start Time *</label>
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>End Time *</label>
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      value={schedule.duration}
                      onChange={(e) => updateSchedule(index, 'duration', e.target.value)}
                      placeholder="Auto-calculated"
                      min="0"
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label>Room</label>
                    <input
                      type="text"
                      value={schedule.room}
                      onChange={(e) => updateSchedule(index, 'room', e.target.value)}
                      placeholder="e.g., Room 101"
                    />
                  </div>

                  <div className="form-group">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      value={schedule.totalMarks}
                      onChange={(e) => updateSchedule(index, 'totalMarks', e.target.value)}
                      min="0"
                      max="200"
                      step="1"
                    />
                  </div>
                </div>

                
                {false && ( 
                  <div className="form-group">
                    <label>Supervisor (Teacher ID)</label>
                    <input
                      type="text"
                      value={schedule.supervisor || ''}
                      onChange={(e) => updateSchedule(index, 'supervisor', e.target.value)}
                      placeholder="Enter valid teacher ObjectId (24 characters)"
                      pattern="[a-fA-F0-9]{24}"
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Must be a valid 24-character MongoDB ObjectId
                    </small>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || examData.schedules.length === 0 || !examData.title.trim()}
          >
            {loading ? 'Creating...' : `Create ${examData.schedules.length} Schedule${examData.schedules.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const CreateUserForm = ({ onSubmit, loading, onBack }) => {
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher',
    department: '',
    parentEmail: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(userForm);
    if (success) {
      setUserForm({ name: '', email: '', password: '', role: 'teacher', department: '', parentEmail: '' });
    }
  };

  return (
    <div className="form-tab">
      <div className="tab-header">
        <h2>👥 Create User</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <form className="super-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={userForm.name}
            onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            required
            placeholder="Enter full name"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            required
            placeholder="Enter email address"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required
            placeholder="Enter temporary password"
          />
        </div>

        <div className="form-group">
          <label>Role</label>
          <select
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            required
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            value={userForm.department}
            onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
            placeholder="Enter department (optional)"
          />
        </div>

        {userForm.role === 'student' && (
          <div className="form-group">
            <label>Parent Email</label>
            <input
              type="email"
              value={userForm.parentEmail}
              onChange={(e) => setUserForm({ ...userForm, parentEmail: e.target.value })}
              placeholder="Enter parent email address"
            />
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '🔄 Creating...' : '👥 Create User'}
        </button>
      </form>
    </div>
  );
};

const CreateClassroomForm = ({ onSubmit, loading, onBack }) => {
  const [classroomForm, setClassroomForm] = useState({
    name: '',
    grade: '',
    section: '',
    subject: '',
    classTeacherEmail: '' 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(classroomForm);
    if (success) {
      setClassroomForm({ name: '', grade: '', section: '', subject: '', classTeacherEmail: '' });
    }
  };

  return (
    <div className="form-tab">
      <div className="tab-header">
        <h2>🏫 Create Classroom</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back to Classrooms
          </button>
        </div>
      </div>

      <form className="super-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Classroom Name</label>
          <input
            type="text"
            value={classroomForm.name}
            onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
            required
            placeholder="Enter classroom name"
          />
        </div>

        <div className="form-group">
          <label>Grade</label>
          <input
            type="text"
            value={classroomForm.grade}
            onChange={(e) => setClassroomForm({ ...classroomForm, grade: e.target.value })}
            required
            placeholder="Enter grade (e.g., 10th)"
          />
        </div>

        <div className="form-group">
          <label>Section</label>
          <input
            type="text"
            value={classroomForm.section}
            onChange={(e) => setClassroomForm({ ...classroomForm, section: e.target.value })}
            required
            placeholder="Enter section (e.g., A, B, C)"
          />
        </div>

        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={classroomForm.subject}
            onChange={(e) => setClassroomForm({ ...classroomForm, subject: e.target.value })}
            required
            placeholder="Enter subject"
          />
        </div>

        <div className="form-group">
          <label>Class Teacher Email</label>
          <input
            type="email"
            value={classroomForm.classTeacherEmail}
            onChange={(e) => setClassroomForm({ ...classroomForm, classTeacherEmail: e.target.value })}
            placeholder="Enter class teacher email (optional)"
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Teacher must already exist in the system
          </small>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '🔄 Creating...' : '🏫 Create Classroom'}
        </button>
      </form>
    </div>
  );
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
  const [toasts, setToasts] = useState([]);
  
  const [addStudentModal, setAddStudentModal] = useState({ isOpen: false, classroom: null });
  const [addMultipleStudentsModal, setAddMultipleStudentsModal] = useState({ isOpen: false, classroom: null });
  const [assignTeacherModal, setAssignTeacherModal] = useState({ isOpen: false, classroom: null });
  const [editUserModal, setEditUserModal] = useState({ isOpen: false, user: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null, type: 'user' });
  const [timetableModal, setTimetableModal] = useState({ isOpen: false, timetable: null });
  const [timetableUploadModal, setTimetableUploadModal] = useState({ isOpen: false, classroom: null });
  const [createExamModal, setCreateExamModal] = useState({ isOpen: false });

   const API = import.meta.env.VITE_API_URL|| 'http://localhost:5000';
const BASE_URL = `${API}/api/school-admin`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  

  const handleUploadTimetable = async (classroomId, schedule) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/timetable`,
        { classroomId, schedule },
        getAuthHeaders()
      );
      showToast('Timetable uploaded successfully!');
      fetchTimetables();
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to upload timetable', 'error');
      throw error;
    }
  };

  const handleCreateExamSchedule = async (examData) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/exam-schedule`,
        examData,
        getAuthHeaders()
      );
      showToast('Exam schedule created successfully!');
      fetchExamSchedules();
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create exam schedule';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  const handleDeleteExamSchedule = async (examId) => {
    try {
      await axios.delete(
        `${BASE_URL}/exam-schedule/${examId}`,
        getAuthHeaders()
      );
      showToast('Exam schedule deleted successfully!');
      fetchExamSchedules();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete exam schedule', 'error');
    }
  };

  const getCurrentApiRole = () => {
    const roleMap = {
      'manage-teachers': 'teachers',
      'manage-students': 'students',
      'manage-parents': 'parents',
      'manage-staff': 'staff'
    };
    return roleMap[activeTab] || 'teachers';
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/dashboard`, getAuthHeaders());
      setDashboardData(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByRole = async (role) => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/users/${role}`, getAuthHeaders());
      setUsers(response.data.users || []);
    } catch (error) {
      showToast(error.response?.data?.message || `Failed to fetch ${role}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/classrooms`, getAuthHeaders());
      setClassrooms(response.data.classrooms || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch classrooms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassAttendance = async (classroomId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${BASE_URL}/classroom/attendance/${classroomId}`, 
        getAuthHeaders()
      );
      setAttendanceData(response.data.attendance || []);
      if (response.data.attendance.length === 0) {
        showToast('No attendance records found for this classroom', 'info');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch attendance data';
      showToast(errorMessage, 'error');
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/analytics`, getAuthHeaders());
      setAnalytics(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetables = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/timetables`, getAuthHeaders());
      setTimetables(response.data.timetables || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch timetables', 'error');
    }
  };

  const fetchExamSchedules = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/exam-schedules`, getAuthHeaders());
      setExamSchedules(response.data.examSchedules || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch exam schedules', 'error');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      setLoading(true);
      await axios.post(`${BASE_URL}/user`, userData, getAuthHeaders());
      showToast(`${userData.role} created successfully!`);
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create user', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassroom = async (classroomData) => {
  try {
    setLoading(true);

    const payload = {
      name: classroomData.name,
      grade: classroomData.grade,
      section: classroomData.section,
      subject: classroomData.subject, 
      classTeacherEmail: classroomData.classTeacherEmail
    };
    
    
    await axios.post(`${BASE_URL}/classroom`, payload, getAuthHeaders());
    showToast('Classroom created successfully!');
    fetchClassrooms();
    return true;
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to create classroom', 'error');
    return false;
  } finally {
    setLoading(false);
  }
};

  const handleAddStudentToClass = async (classroomId, studentEmail) => {
    try {
      const response = await axios.post(`${BASE_URL}/classroom/add-student`, 
        { classroomId, studentEmail }, 
        getAuthHeaders()
      );
      showToast(response.data.message);
      fetchClassrooms();
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add student to classroom', 'error');
      throw error;
    }
  };

  const handleAddMultipleStudents = async (classroomId, studentIds) => {
    try {
      const response = await axios.post(`${BASE_URL}/classroom/add-students-by-ids`, 
        { classroomId, studentIds }, 
        getAuthHeaders()
      );
      showToast(response.data.message);
      fetchClassrooms();
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add students to classroom', 'error');
      throw error;
    }
  };

  const handleAssignTeacher = async (classroomId, teacherEmail) => {
    try {
      const response = await axios.put(`${BASE_URL}/classroom/${classroomId}/assign-teacher`, 
        { teacherEmail }, 
        getAuthHeaders()
      );
      showToast(response.data.message);
      fetchClassrooms(); 
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to assign teacher to classroom', 'error');
      throw error;
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      const response = await axios.put(`${BASE_URL}/user/${userId}`, updates, getAuthHeaders());
      showToast('User updated successfully!');
      fetchUsersByRole(getCurrentApiRole());
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await axios.delete(`${BASE_URL}/user/${user._id}`, getAuthHeaders());
      showToast(`${user.role} deleted successfully!`);
      fetchUsersByRole(getCurrentApiRole());
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete user', 'error');
    }
  };

  const handleDeleteClassroom = async (classroom) => {
    try {
      await axios.delete(`${BASE_URL}/classroom/${classroom._id}`, getAuthHeaders());
      showToast('Classroom deleted successfully!');
      fetchClassrooms();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete classroom', 'error');
    }
  };

 

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'classrooms') {
      fetchClassrooms();
    } else if (activeTab.startsWith('manage-')) {
      fetchUsersByRole(getCurrentApiRole());
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'timetables') {
      fetchTimetables();
    } else if (activeTab === 'exams') {
      fetchExamSchedules();
      fetchClassrooms();
    }
  }, [activeTab]);

  
  const renderDashboard = () => (
    <div className="dashboard-content">
      {loading ? (
        <div className="loading">Loading dashboard data...</div>
      ) : dashboardData ? (
        <>
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-content">
                <div className="stat-icon">👨‍🏫</div>
                <div className="stat-info">
                  <h3>Teachers</h3>
                  <div className="stat-number">{dashboardData.totalTeachers}</div>
                </div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-content">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-info">
                  <h3>Students</h3>
                  <div className="stat-number">{dashboardData.totalStudents}</div>
                </div>
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-content">
                <div className="stat-icon">👨‍👩‍👧‍👦</div>
                <div className="stat-info">
                  <h3>Parents</h3>
                  <div className="stat-number">{dashboardData.totalParents}</div>
                </div>
              </div>
            </div>
            <div className="stat-card info">
              <div className="stat-content">
                <div className="stat-icon">👨‍💼</div>
                <div className="stat-info">
                  <h3>Staff</h3>
                  <div className="stat-number">{dashboardData.totalStaff}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>📋 Quick Actions</h3>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => setActiveTab('create-user')}>
                👥 Create User
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('manage-teachers')}>
                📊 Manage Teachers
              </button>
              <button className="btn btn-info" onClick={() => setActiveTab('classrooms')}>
                🏫 Manage Classrooms
              </button>
              <button className="btn btn-warning" onClick={() => setActiveTab('attendance')}>
                📝 Attendance Reports
              </button>
              <button className="btn btn-primary" onClick={() => setActiveTab('timetables')}>
                📅 Timetables
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveTab('exams')}>
                📚 Exam Schedules
              </button>
              <button className="btn btn-info" onClick={() => setActiveTab('analytics')}>
                📈 Analytics
              </button>
            </div>
          </div>

          <div className="analytics-section">
            <h3>📈 School Overview</h3>
            <div className="school-details">
              <div className="detail-item">
                <strong>School:</strong> {dashboardData.schoolName}
              </div>
              <div className="detail-item">
                <strong>Code:</strong> {dashboardData.schoolCode}
              </div>
              <div className="detail-item">
                <strong>Established:</strong> {dashboardData.recentActivity}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data">No dashboard data available</div>
      )}
    </div>
  );

  const renderManageUsers = (role, roleName, icon) => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>{icon} Manage {roleName}</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => fetchUsersByRole(getCurrentApiRole())}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('create-user')}>
            ➕ Add {roleName}
          </button>
        </div>
      </div>

      <div className="schools-list">
        {loading ? (
          <div className="loading">Loading {roleName.toLowerCase()}...</div>
        ) : users.length === 0 ? (
          <div className="no-data">No {roleName.toLowerCase()} found</div>
        ) : (
          users.map(user => (
            <div key={user._id} className="school-card">
              <div className="school-info">
                <h3>{user.name}</h3>
                <div className="school-details">
                  <div className="detail-item">
                    📧 <strong>Email:</strong> {user.email}
                  </div>
                  {user.department && (
                    <div className="detail-item">
                      🏢 <strong>Department:</strong> {user.department}
                    </div>
                  )}
                  {user.parentEmail && (
                    <div className="detail-item">
                      👨‍👩‍👧‍👦 <strong>Parent Email:</strong> {user.parentEmail}
                    </div>
                  )}
                  {user.subjects && user.subjects.length > 0 && (
                    <div className="detail-item">
                      📚 <strong>Subjects:</strong> {user.subjects.join(', ')}
                    </div>
                  )}
                  {user.classroom && (
                    <div className="detail-item">
                      🏫 <strong>Classroom:</strong> {user.classroom}
                    </div>
                  )}
                  <div className="detail-item">
                    📅 <strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="school-actions">
                <button 
                  className="btn btn-warning"
                  onClick={() => setEditUserModal({ isOpen: true, user })}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => setDeleteModal({ isOpen: true, item: user, type: 'user' })}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderClassrooms = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>🏫 Manage Classrooms</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchClassrooms}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab('create-classroom')}>
            ➕ Create Classroom
          </button>
        </div>
      </div>

      <div className="schools-list">
        {classrooms.length === 0 ? (
          <div className="no-data">No classrooms created yet</div>
        ) : (
          classrooms.map(classroom => (
            <div key={classroom._id} className="school-card">
              <div className="school-info">
                <h3>{classroom.name}</h3>
                <div className="school-details">
                  <div className="detail-item">
                    📚 <strong>Subject:</strong> {classroom.subject}
                  </div>
                  <div className="detail-item">
                    🎯 <strong>Grade:</strong> {classroom.grade} - {classroom.section}
                  </div>
                  <div className="detail-item">
                    👨‍🏫 <strong>Teacher:</strong> {classroom.classTeacher?.name || 'Not assigned'}
                  </div>
                  <div className="detail-item">
                    👨‍🎓 <strong>Students:</strong> {classroom.students?.length || 0}
                  </div>
                </div>
              </div>
              <div className="school-actions">
                <button 
                  className="btn btn-info"
                  onClick={() => {
                    fetchClassAttendance(classroom._id);
                    setActiveTab('attendance-details');
                  }}
                >
                  📊 Attendance
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => setAddStudentModal({ isOpen: true, classroom })}
                >
                  ➕ Add Student
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setAddMultipleStudentsModal({ isOpen: true, classroom })}
                >
                  👥 Add Multiple
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setTimetableUploadModal({ isOpen: true, classroom })}
                >
                  📅 Add Timetable
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setAssignTeacherModal({ isOpen: true, classroom })}
                >
                  👨‍🏫 Assign Teacher
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => setDeleteModal({ isOpen: true, item: classroom, type: 'classroom' })}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAttendance = () => {
    const getAttendanceRate = (classroomId) => {
      const classAttendance = attendanceData.filter(record => 
        record.classroom?._id === classroomId
      );
      
      if (classAttendance.length === 0) return 'No data';
      
      const presentCount = classAttendance.filter(record => 
        record.status === 'present'
      ).length;
      
      const attendanceRate = ((presentCount / classAttendance.length) * 100).toFixed(1);
      return `${attendanceRate}%`;
    };

    return (
      <div className="form-tab">
        <div className="tab-header">
          <h2>📊 Attendance Reports</h2>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setActiveTab('classrooms')}>
              ← Back to Classrooms
            </button>
          </div>
        </div>

        <div className="analytics-section">
          <h3>📅 Classroom Attendance Overview</h3>
          {classrooms.length === 0 ? (
            <div className="no-data">No classrooms available</div>
          ) : (
            <div className="schools-list">
              {classrooms.map(classroom => (
                <div key={classroom._id} className="school-card">
                  <div className="school-info">
                    <h3>{classroom.name}</h3>
                    <div className="school-details">
                      <div className="detail-item">
                        📚 <strong>Subject:</strong> {classroom.subject}
                      </div>
                      <div className="detail-item">
                        👨‍🎓 <strong>Students:</strong> {classroom.students?.length || 0}
                      </div>
                      <div className="detail-item">
                        📊 <strong>Attendance Rate:</strong> {getAttendanceRate(classroom._id)}
                      </div>
                    </div>
                  </div>
                  <div className="school-actions">
                    <button 
                      className="btn btn-info"
                      onClick={() => {
                        fetchClassAttendance(classroom._id);
                        setActiveTab('attendance-details');
                      }}
                    >
                      📈 View Details
                    </button>
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAttendanceDetails = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>📊 Attendance Details</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setActiveTab('attendance')}>
            ← Back to Reports
          </button>
        </div>
      </div>

      <div className="analytics-section">
        <h3>📅 Detailed Attendance Records</h3>
        {loading ? (
          <div className="loading">Loading attendance data...</div>
        ) : attendanceData.length > 0 ? (
          <div className="schools-list">
            {attendanceData.map(record => (
              <div key={record._id} className="school-card">
                <div className="school-info">
                  <h3>{record.student?.name || 'Unknown Student'}</h3>
                  <div className="school-details">
                    <div className="detail-item">
                      📅 <strong>Date:</strong> {new Date(record.date).toLocaleDateString()}
                    </div>
                    <div className="detail-item">
                      ✅ <strong>Status:</strong> 
                      <span style={{ 
                        color: record.status === 'present' ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 'bold',
                        marginLeft: '0.5rem'
                      }}>
                        {record.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      📚 <strong>Subject:</strong> {record.subject}
                    </div>
                    <div className="detail-item">
                      👨‍🏫 <strong>Teacher:</strong> {record.teacher?.name || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">No attendance records found</div>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>📈 School Analytics</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchAnalytics}>
            🔄 Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : analytics ? (
        <div className="analytics-content">
          <div className="analytics-section">
            <h3>🏫 School Overview</h3>
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-content">
                  <div className="stat-icon">👨‍🏫</div>
                  <div className="stat-info">
                    <h3>Teachers</h3>
                    <div className="stat-number">{analytics.schoolOverview.totalTeachers}</div>
                  </div>
                </div>
              </div>
              <div className="stat-card success">
                <div className="stat-content">
                  <div className="stat-icon">👨‍🎓</div>
                  <div className="stat-info">
                    <h3>Students</h3>
                    <div className="stat-number">{analytics.schoolOverview.totalStudents}</div>
                  </div>
                </div>
              </div>
              <div className="stat-card warning">
                <div className="stat-content">
                  <div className="stat-icon">📊</div>
                  <div className="stat-info">
                    <h3>Attendance Rate</h3>
                    <div className="stat-number">{analytics.attendance.overallRate}%</div>
                  </div>
                </div>
              </div>
              <div className="stat-card info">
                <div className="stat-content">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>Avg Performance</h3>
                    <div className="stat-number">{analytics.academicPerformance.averagePercentage}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-section">
            <h3>🏆 Top Performing Students</h3>
            <div className="schools-list">
              {analytics.topStudents.map((student, index) => (
                <div key={index} className="school-card">
                  <div className="school-info">
                    <h3>#{index + 1} {student.name}</h3>
                    <div className="school-details">
                      <div className="detail-item">
                        📧 <strong>Email:</strong> {student.email}
                      </div>
                      <div className="detail-item">
                        📊 <strong>Average:</strong> {student.averagePercentage}%
                      </div>
                      <div className="detail-item">
                        📝 <strong>Exams:</strong> {student.totalExams}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">
          No analytics data available
        </div>
      )}
    </div>
  );

  const renderTimetables = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>📅 Manage Timetables</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchTimetables}>
            🔄 Refresh
          </button>
        </div>
        
      </div>

      <div className="schools-list">
        {timetables.length === 0 ? (
          <div className="no-data">
            {classrooms.length === 0 
              ? 'Create classrooms first to upload timetables' 
              : 'No timetables uploaded yet. Click "Add Timetable" in classroom actions to get started.'
            }
          </div>
        ) : (
          timetables.map(timetable => (
            <div key={timetable._id} className="school-card">
              <div className="school-info">
                <h3>{timetable.classroom?.name}</h3>
                <div className="school-details">
                  <div className="detail-item">
                
                    🎯 <strong>Grade:</strong> {timetable.classroom?.grade} - {timetable.classroom?.section}
                  </div>
                  <div className="detail-item">
                    👨‍🏫 <strong>Class Teacher:</strong> {timetable.classroom?.classTeacher?.name || 'Not assigned'}
                  </div>
                  <div className="detail-item">
                    📅 <strong>Last Updated:</strong> {new Date(timetable.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="detail-item">
                    📚 <strong>Periods Configured:</strong> {timetable.schedule?.reduce((total, day) => total + day.periods.length, 0) || 0}
                  </div>
                </div>
              </div>
              <div className="school-actions">
                <button 
                  className="btn btn-info"
                  onClick={() => setTimetableModal({ isOpen: true, timetable })}
                >
                  👁️ View
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => setTimetableUploadModal({ isOpen: true, classroom: timetable.classroom })}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this timetable?')) {
                      showToast('Timetable deletion feature coming soon!', 'info');
                    }
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderExams = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>📚 Exam Schedules</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchExamSchedules}>
            🔄 Refresh
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setCreateExamModal({ isOpen: true })}
          >
            ➕ Create Schedule
          </button>
        </div>
      </div>

      <div className="schools-list">
        {examSchedules.length === 0 ? (
          <div className="no-data">No exam schedules created yet</div>
        ) : (
          examSchedules.map(exam => (
            <div key={exam._id} className="school-card">
              <div className="school-info">
                <h3>{exam.title}</h3>
                <div className="school-details">
                  <div className="detail-item">
                    📝 <strong>Type:</strong> {exam.examType}
                  </div>
                  <div className="detail-item">
                    📅 <strong>Created:</strong> {new Date(exam.createdAt).toLocaleDateString()}
                  </div>
                  <div className="detail-item">
                    🏫 <strong>Schedules:</strong> {exam.schedules?.length || 0} exams scheduled
                  </div>
                  {exam.description && (
                    <div className="detail-item">
                      📋 <strong>Description:</strong> {exam.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="school-actions">
                <button className="btn btn-info">
                  👁️ View
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteExamSchedule(exam._id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'create-user':
        return (
          <CreateUserForm
            onSubmit={handleCreateUser}
            loading={loading}
            onBack={() => setActiveTab('dashboard')}
          />
        );
      case 'create-classroom':
        return (
          <CreateClassroomForm
            onSubmit={handleCreateClassroom}
            loading={loading}
            onBack={() => setActiveTab('classrooms')}
          />
        );
      case 'manage-teachers':
        return renderManageUsers('teachers', 'Teachers', '👨‍🏫');
      case 'manage-students':
        return renderManageUsers('students', 'Students', '👨‍🎓');
      case 'manage-parents':
        return renderManageUsers('parents', 'Parents', '👨‍👩‍👧‍👦');
      case 'manage-staff':
        return renderManageUsers('staff', 'Staff', '👨‍💼');
      case 'classrooms':
        return renderClassrooms();
      case 'attendance':
        return renderAttendance();
      case 'attendance-details':
        return renderAttendanceDetails();
      case 'timetables':
        return renderTimetables();
      case 'exams':
        return renderExams();
      case 'analytics':
        return renderAnalytics();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="super-admin">
      <header className="super-header">
        <h1>🎓 EduManage School  Admin</h1>
        <div className="user-info">
          <span>Welcome back, School Admin</span>
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
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'create-user' ? 'active' : ''}
          onClick={() => setActiveTab('create-user')}
        >
          👥 Create User
        </button>
        <button 
          className={activeTab === 'manage-teachers' ? 'active' : ''}
          onClick={() => setActiveTab('manage-teachers')}
        >
          👨‍🏫 Teachers
        </button>
        <button 
          className={activeTab === 'manage-students' ? 'active' : ''}
          onClick={() => setActiveTab('manage-students')}
        >
          👨‍🎓 Students
        </button>
        <button 
          className={activeTab === 'manage-parents' ? 'active' : ''}
          onClick={() => setActiveTab('manage-parents')}
        >
          👨‍👩‍👧‍👦 Parents
        </button>
        <button 
          className={activeTab === 'manage-staff' ? 'active' : ''}
          onClick={() => setActiveTab('manage-staff')}
        >
          👨‍💼 Staff
        </button>
        <button 
          className={activeTab === 'classrooms' ? 'active' : ''}
          onClick={() => setActiveTab('classrooms')}
        >
          🏫 Classrooms
        </button>
        <button 
          className={activeTab === 'attendance' ? 'active' : ''}
          onClick={() => setActiveTab('attendance')}
        >
          📝 Attendance
        </button>
        <button 
          className={activeTab === 'timetables' ? 'active' : ''}
          onClick={() => setActiveTab('timetables')}
        >
          📅 Timetables
        </button>
        <button 
          className={activeTab === 'exams' ? 'active' : ''}
          onClick={() => setActiveTab('exams')}
        >
          📚 Exams
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </nav>

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

      <main className="super-main">
        {renderContent()}
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