import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './TeacherPanel.css';
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

const AttendanceModal = ({ isOpen, onClose, classroom, onMarkAttendance }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classroom && classroom.students) {
      const initialAttendance = classroom.students.map(student => ({
        studentId: student._id,
        name: student.name,
        email: student.email,
        status: 'present'
      }));
      setAttendanceList(initialAttendance);
      setSubject(classroom.subject || '');
    }
  }, [isOpen, classroom]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceList(prev => 
      prev.map(student => 
        student.studentId === studentId ? { ...student, status } : student
      )
    );
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Mark Attendance - ${classroom?.name}`} size="large">
      <form onSubmit={handleSubmit} className="attendance-form">
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              required
            />
            {classroom?.subject && (
              <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Classroom subject: {classroom.subject}
              </small>
            )}
          </div>
        </div>

        <div className="attendance-list">
          <h4>Student Attendance</h4>
          <div className="attendance-header">
            <span>Student Name</span>
            <span>Status</span>
          </div>
          {attendanceList.map((student) => (
            <div key={student.studentId} className="attendance-item">
              <div className="student-info">
                <strong>{student.name}</strong>
                <span>{student.email}</span>
              </div>
              <div className="status-buttons">
                <button
                  type="button"
                  className={`status-btn ${student.status === 'present' ? 'active present' : ''}`}
                  onClick={() => handleStatusChange(student.studentId, 'present')}
                >
                  Present
                </button>
                <button
                  type="button"
                  className={`status-btn ${student.status === 'absent' ? 'active absent' : ''}`}
                  onClick={() => handleStatusChange(student.studentId, 'absent')}
                >
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Marking...' : 'Mark Attendance'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const GradeUploadModal = ({ isOpen, onClose, classroom, onUploadGrades }) => {
  const [examData, setExamData] = useState({
    examType: 'quiz',
    examTitle: '',
    semester: '1',
    academicYear: '2024-2025'
  });
  const [studentGrades, setStudentGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && classroom && classroom.students) {
      const initialGrades = classroom.students.map(student => ({
        studentId: student._id,
        name: student.name,
        grades: [{
          subject: classroom.subject || 'General',
          marksObtained: '',
          totalMarks: 100
        }]
      }));
      setStudentGrades(initialGrades);
    }
  }, [isOpen, classroom]);

  const handleGradeChange = (studentIndex, subjectIndex, field, value) => {
    const updatedGrades = [...studentGrades];
    updatedGrades[studentIndex].grades[subjectIndex][field] = value;
    setStudentGrades(updatedGrades);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!examData.examTitle.trim()) {
      setError('Please enter exam title');
      return;
    }

    for (const student of studentGrades) {
      for (const grade of student.grades) {
        if (!grade.marksObtained || grade.marksObtained === '') {
          setError(`Please enter marks for ${student.name}`);
          return;
        }
        if (parseFloat(grade.marksObtained) > parseFloat(grade.totalMarks)) {
          setError(`Marks obtained cannot exceed total marks for ${student.name}`);
          return;
        }
      }
    }

    setLoading(true);
    setError('');

    try {
      const formattedData = {
        classroomId: classroom._id,
        examData,
        studentGrades: studentGrades.map(student => ({
          studentId: student.studentId,
          grades: student.grades.map(grade => ({
            subject: grade.subject,
            marksObtained: parseFloat(grade.marksObtained),
            totalMarks: parseFloat(grade.totalMarks)
          }))
        }))
      };

      await onUploadGrades(formattedData);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upload Grades - ${classroom?.name}`} size="xlarge">
      <form onSubmit={handleSubmit} className="grade-upload-form">
        <div className="exam-info">
          <h4>Exam Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Exam Type</label>
              <select
                value={examData.examType}
                onChange={(e) => setExamData(prev => ({ ...prev, examType: e.target.value }))}
                required
              >
                <option value="quiz">Quiz</option>
                <option value="mid-term">Mid-Term</option>
                <option value="final">Final</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="practical">Practical</option>
              </select>
            </div>
            <div className="form-group">
              <label>Exam Title</label>
              <input
                type="text"
                value={examData.examTitle}
                onChange={(e) => setExamData(prev => ({ ...prev, examTitle: e.target.value }))}
                placeholder="e.g., First Term Mathematics Exam"
                required
              />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <select
                value={examData.semester}
                onChange={(e) => setExamData(prev => ({ ...prev, semester: e.target.value }))}
                required
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
            <div className="form-group">
              <label>Academic Year</label>
              <input
                type="text"
                value={examData.academicYear}
                onChange={(e) => setExamData(prev => ({ ...prev, academicYear: e.target.value }))}
                required
              />
            </div>
          </div>
        </div>

        <div className="grades-section">
          <h4>Student Grades - {classroom?.subject}</h4>
          <div className="grades-table-container">
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th colSpan="2">{classroom?.subject || 'Subject'}</th>
                </tr>
                <tr>
                  <th></th>
                  <th>Marks Obtained</th>
                  <th>Total Marks</th>
                </tr>
              </thead>
              <tbody>
                {studentGrades.map((student, studentIndex) => (
                  <tr key={student.studentId}>
                    <td className="student-name">
                      <strong>{student.name}</strong>
                    </td>
                    {student.grades.map((grade, gradeIndex) => (
                      <React.Fragment key={gradeIndex}>
                        <td>
                          <input
                            type="number"
                            value={grade.marksObtained}
                            onChange={(e) => handleGradeChange(studentIndex, gradeIndex, 'marksObtained', e.target.value)}
                            min="0"
                            max={grade.totalMarks}
                            step="0.01"
                            placeholder="Marks"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={grade.totalMarks}
                            onChange={(e) => handleGradeChange(studentIndex, gradeIndex, 'totalMarks', e.target.value)}
                            min="1"
                            step="1"
                            placeholder="Total"
                            required
                          />
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Grades'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const HomeworkModal = ({ isOpen, onClose, classroom, onCreateHomework }) => {
  const [homeworkData, setHomeworkData] = useState({
    title: '',
    description: '',
    subject: '',
    dueDate: '',
    dueTime: '23:59',
    instructions: '',
    totalPoints: 100,
    attachments: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filePreviews, setFilePreviews] = useState([]);

  useEffect(() => {
    if (isOpen && classroom) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      
      setHomeworkData(prev => ({
        ...prev,
        subject: classroom.subject || '',
        dueDate: tomorrow.toISOString().split('T')[0],
        dueTime: '23:59'
      }));
      setFilePreviews([]);
      setError('');
    }
  }, [isOpen, classroom]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('File size should not exceed 10MB');
      return;
    }

    if (files.length + homeworkData.attachments.length > 5) {
      setError('Maximum 5 files allowed');
      return;
    }

    const newPreviews = files.map(file => ({
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2),
      type: file.type.split('/')[0],
      extension: file.name.split('.').pop()
    }));

    setHomeworkData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
    setFilePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setHomeworkData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType, extension) => {
    const icons = {
      pdf: '📕',
      doc: '📘',
      docx: '📘',
      xls: '📗',
      xlsx: '📗',
      ppt: '📙',
      pptx: '📙',
      image: '🖼️',
      video: '🎬',
      audio: '🎵'
    };
    
    if (icons[extension]) return icons[extension];
    if (icons[fileType]) return icons[fileType];
    return '📄';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!homeworkData.title.trim()) {
      setError('Please enter homework title');
      return;
    }

    if (!homeworkData.dueDate) {
      setError('Please select due date');
      return;
    }

    const dueDateTime = new Date(`${homeworkData.dueDate}T${homeworkData.dueTime}`);
    if (dueDateTime < new Date()) {
      setError('Due date and time cannot be in the past');
      return;
    }

    if (homeworkData.totalPoints < 1 || homeworkData.totalPoints > 1000) {
      setError('Total points must be between 1 and 1000');
      return;
    }

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

      homeworkData.attachments.forEach(file => {
        formData.append('attachments', file);
      });

      await onCreateHomework(formData);
      
      setHomeworkData({
        title: '',
        description: '',
        subject: '',
        dueDate: '',
        dueTime: '23:59',
        instructions: '',
        totalPoints: 100,
        attachments: []
      });
      setFilePreviews([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Create Homework - ${classroom?.name}`} size="large">
      <form onSubmit={handleSubmit} className="homework-form">
        <div className="form-section">
          <h4>📝 Basic Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Homework Title *</label>
              <input
                type="text"
                value={homeworkData.title}
                onChange={(e) => setHomeworkData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Chapter 5 Exercises, Project Report..."
                required
                maxLength={100}
              />
              <small className="char-count">{homeworkData.title.length}/100 characters</small>
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                value={homeworkData.subject}
                onChange={(e) => setHomeworkData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={classroom?.subject || "Enter subject"}
                required
              />
              {classroom?.subject && (
                <small className="field-hint">Classroom subject: {classroom.subject}</small>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={homeworkData.description}
              onChange={(e) => setHomeworkData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Provide detailed description of the homework..."
              rows="3"
              maxLength={500}
            />
            <small className="char-count">{homeworkData.description.length}/500 characters</small>
          </div>
        </div>

        <div className="form-section">
          <h4>📅 Due Date & Points</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={homeworkData.dueDate}
                onChange={(e) => setHomeworkData(prev => ({ ...prev, dueDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="form-group">
              <label>Due Time *</label>
              <input
                type="time"
                value={homeworkData.dueTime}
                onChange={(e) => setHomeworkData(prev => ({ ...prev, dueTime: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Total Points *</label>
              <input
                type="number"
                value={homeworkData.totalPoints}
                onChange={(e) => setHomeworkData(prev => ({ ...prev, totalPoints: parseInt(e.target.value) || 100 }))}
                min="1"
                max="1000"
                step="1"
                required
              />
              <small className="field-hint">Max 1000 points</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>📋 Instructions</h4>
          <div className="form-group">
            <textarea
              value={homeworkData.instructions}
              onChange={(e) => setHomeworkData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Provide specific instructions for students..."
              rows="4"
              maxLength={1000}
            />
            <small className="char-count">{homeworkData.instructions.length}/1000 characters</small>
          </div>
        </div>

        <div className="form-section">
          <h4>📎 Attachments</h4>
          <div className="form-group">
            <label>Upload Files (Max 5 files, 10MB each)</label>
            <div className="file-upload-area">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                disabled={homeworkData.attachments.length >= 5}
              />
              <div className="upload-hint">
                <span>📁 Click to upload or drag and drop</span>
                <small>Supported: PDF, Word, Excel, PowerPoint, Images, Text files</small>
              </div>
            </div>
            
            {filePreviews.length > 0 && (
              <div className="file-previews">
                <h5>Selected Files ({filePreviews.length}/5):</h5>
                {filePreviews.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    <span className="file-icon">
                      {getFileIcon(file.type, file.extension)}
                    </span>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{file.size} MB</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeFile(index)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || !homeworkData.title.trim() || !homeworkData.dueDate}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Homework...
              </>
            ) : (
              '📚 Create Homework'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const StudentProgressModal = ({ isOpen, onClose, student, classroom, onGetStudentProgress,  showToast }) => {
  const [progressData, setProgressData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && student && classroom) {
      fetchStudentProgress();
    }
  }, [isOpen, student, classroom, activeTab]);

  const fetchStudentProgress = async () => {
    try {
      setLoading(true);
      const data = await onGetStudentProgress(student._id, classroom._id);
      setProgressData(data);
    } catch (error) {
      showToast('Failed to load student progress', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  const getPerformanceLevel = (percentage) => {
    if (percentage >= 80) return { level: 'Excellent', color: 'success', icon: '⭐' };
    if (percentage >= 70) return { level: 'Good', color: 'info', icon: '👍' };
    if (percentage >= 60) return { level: 'Average', color: 'warning', icon: '➖' };
    return { level: 'Needs Improvement', color: 'danger', icon: '📉' };
  };

  const getAttendanceStatus = (rate) => {
    if (rate >= 90) return { status: 'Excellent', color: 'success', icon: '✅' };
    if (rate >= 80) return { status: 'Good', color: 'info', icon: '👍' };
    if (rate >= 70) return { status: 'Fair', color: 'warning', icon: '⚠️' };
    return { status: 'Poor', color: 'danger', icon: '❌' };
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student Progress - ${student?.name}`} size="xlarge">
      <div className="student-progress-modal">
        {progressData && (
          <div className="student-header">
            <div className="student-basic-info">
              <div className="student-avatar-large">
                {progressData.student.avatar || '👨‍🎓'}
              </div>
              <div className="student-details">
                <h3>{progressData.student.name}</h3>
                <div className="student-meta">
                  <span>Roll No: {progressData.student.rollNumber}</span>
                  <span>Email: {progressData.student.email}</span>
                  <span>Class: {progressData.classroom.name}</span>
                </div>
              </div>
            </div>
            <div className="overall-stats">
              <div className="overall-stat">
                <div className="stat-value">{progressData.performance.overallAverage.toFixed(1)}%</div>
                <div className="stat-label">Overall Average</div>
                <div className={`stat-badge ${getPerformanceLevel(progressData.performance.overallAverage).color}`}>
                  {getPerformanceLevel(progressData.performance.overallAverage).icon}
                  {getPerformanceLevel(progressData.performance.overallAverage).level}
                </div>
              </div>
              <div className="overall-stat">
                <div className="stat-value">{progressData.attendance.rate}%</div>
                <div className="stat-label">Attendance</div>
                <div className={`stat-badge ${getAttendanceStatus(progressData.attendance.rate).color}`}>
                  {getAttendanceStatus(progressData.attendance.rate).icon}
                  {getAttendanceStatus(progressData.attendance.rate).status}
                </div>
              </div>
              <div className="overall-stat">
                <div className="stat-value">{progressData.homework.submitted}</div>
                <div className="stat-label">Homework Submitted</div>
                <div className="stat-badge info">
                  📚 {progressData.homework.graded} graded
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="progress-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={activeTab === 'academic' ? 'active' : ''}
            onClick={() => setActiveTab('academic')}
          >
            📝 Academic Performance
          </button>
          <button 
            className={activeTab === 'attendance' ? 'active' : ''}
            onClick={() => setActiveTab('attendance')}
          >
            ✅ Attendance
          </button>
          <button 
            className={activeTab === 'homework' ? 'active' : ''}
            onClick={() => setActiveTab('homework')}
          >
            📚 Homework
          </button>
          <button 
            className={activeTab === 'recommendations' ? 'active' : ''}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Recommendations
          </button>
        </div>

        <div className="tab-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading student data...</p>
            </div>
          ) : progressData ? (
            <>

              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <div className="overview-grid">
   
                    <div className="subjects-section">
                      <h4>Subject-wise Performance</h4>
                      <div className="subjects-grid">
                        {progressData.performance.subjectPerformance.map((subject, index) => (
                          <div key={index} className="subject-card">
                            <div className="subject-header">
                              <h5>{subject.subject}</h5>
                              <span className={`performance-badge ${getPerformanceLevel(subject.averagePercentage).color}`}>
                                {subject.averagePercentage}%
                              </span>
                            </div>
                            <div className="subject-stats">
                              <div className="stat">
                                <span>Exams: {subject.totalExams}</span>
                              </div>
                              <div className="stat">
                                <span>Highest: {subject.highestScore}%</span>
                              </div>
                              <div className="stat">
                                <span>Lowest: {subject.lowestScore}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="academic-tab">
                  <div className="grades-table-container">
                    <h4>Detailed Grade History</h4>
                    <table className="grades-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Subject</th>
                          <th>Exam Type</th>
                          <th>Exam Title</th>
                          <th>Marks</th>
                          <th>Percentage</th>
                          <th>Performance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressData.performance.gradeTrend.map((grade, index) => (
                          
                          <tr key={index}>
                            <td>{new Date(grade.date).toLocaleDateString()}</td>
                            <td>{grade.subject}</td>
                            <td>{grade.examType}</td>
                            <td>{grade.examTitle}</td>
                            <td>{grade.marksObtained}/{grade.totalMarks}</td>
                            <td>{grade.percentage}%</td>
                            <td>
                              <span className={`performance-indicator ${getPerformanceLevel(grade.percentage).color}`}>
                                {getPerformanceLevel(grade.percentage).icon}
                                {getPerformanceLevel(grade.percentage).level}
                              </span>
                            </td>
                          </tr>
                          
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="attendance-tab">
                  <div className="attendance-summary">
                    <div className="attendance-stats">
                      <div className="attendance-stat present">
                        <div className="stat-value">{progressData.attendance.presentClasses}</div>
                        <div className="stat-label">Present</div>
                      </div>
                      <div className="attendance-stat absent">
                        <div className="stat-value">{progressData.attendance.absentClasses}</div>
                        <div className="stat-label">Absent</div>
                      </div>
                      <div className="attendance-stat total">
                        <div className="stat-value">{progressData.attendance.totalClasses}</div>
                        <div className="stat-label">Total Classes</div>
                      </div>
                      <div className="attendance-stat rate">
                        <div className="stat-value">{progressData.attendance.rate}%</div>
                        <div className="stat-label">Attendance Rate</div>
                      </div>
                    </div>
                    
                    
                  </div>
                </div>
              )}

              {activeTab === 'homework' && (
                <div className="homework-tab">
                  <div className="homework-stats-overview">
                    <div className="homework-stat">
                      <div className="stat-value">{progressData.homework.submitted}</div>
                      <div className="stat-label">Submitted</div>
                    </div>
                    <div className="homework-stat">
                      <div className="stat-value">{progressData.homework.graded}</div>
                      <div className="stat-label">Graded</div>
                    </div>
                    <div className="homework-stat">
                      <div className="stat-value">{progressData.homework.averageScore}</div>
                      <div className="stat-label">Average Score</div>
                    </div>
                    <div className="homework-stat">
                      <div className="stat-value">{progressData.homework.submissionRate.toFixed(1)}%</div>
                      <div className="stat-label">Submission Rate</div>
                    </div>
                  </div>

                  <div className="homework-details">
                    <h5>Homework Performance</h5>

                    <div className="homework-placeholder">
                      📚 Detailed homework assignments and scores
                    </div>
                  </div>
                </div>
              )}


              {activeTab === 'recommendations' && (
                <div className="recommendations-tab">
                  <h4>Personalized Recommendations</h4>
                  <div className="recommendations-list">
                    {progressData.recommendations.map((rec, index) => (
                      <div key={index} className={`recommendation-card ${rec.priority}`}>
                        <div className="recommendation-header">
                          <span className={`priority-badge ${rec.priority}`}>
                            {rec.priority === 'high' ? '🔴 High' : '🟡 Medium'}
                          </span>
                          <span className="rec-type">{rec.type}</span>
                        </div>
                        <div className="recommendation-message">
                          {rec.message}
                        </div>
                        <div className="recommendation-suggestion">
                          <strong>Suggestion:</strong> {rec.suggestion}
                        </div>
                      </div>
                    ))}
                    {progressData.recommendations.length === 0 && (
                      <div className="no-recommendations">
                        <div className="success-icon">✅</div>
                        <h5>Great Job!</h5>
                        <p>Student is performing well across all areas. No specific recommendations at this time.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-data">No progress data available</div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-info" onClick={fetchStudentProgress}>
            🔄 Refresh
          </button>
  
          
        </div>
      </div>
    </Modal>
  );
};


const StudentsListModal = ({ isOpen, onClose, classroom, onViewStudentProgress,  showToast }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && classroom) {
      fetchStudents();
    }
  }, [isOpen, classroom]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      if (classroom.students) {
        setStudents(classroom.students);
      }
    } catch (error) {
      showToast('Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Students - ${classroom?.name}`} size="large">
      <div className="students-list-modal">

        <div className="search-section">
          <input
            type="text"
            placeholder="🔍 Search students by name, email, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="student-count">
            {filteredStudents.length} of {students.length} students
          </span>
        </div>

        <div className="students-list">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="empty-state">
              <p>No students found</p>
            </div>
          ) : (
            <div className="students-grid">
              {filteredStudents.map((student) => (
                <div key={student._id} className="student-card">
                  <div className="student-avatar">
                    {student.avatar || '👨‍🎓'}
                  </div>
                  <div className="student-info">
                    <h4>{student.name}</h4>
                    <div className="student-details">
                      <span>Roll No: {student.rollNumber || 'N/A'}</span>
                      <span>Email: {student.email}</span>
                    </div>
                  </div>
                  <div className="student-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onViewStudentProgress(student, classroom)}
                    >
                      📊 View Progress
                    </button>
      
                  </div>
                </div>
              ))}
            </div>
          )}
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

const HomeworkList = ({ homework, onEdit, onDelete, onViewSubmissions }) => {
  const getStatus = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (timeDiff < 0) return { status: 'expired', label: 'Expired', color: 'danger' };
    if (daysDiff <= 1) return { status: 'urgent', label: 'Due Soon', color: 'warning' };
    if (daysDiff <= 3) return { status: 'upcoming', label: 'Upcoming', color: 'info' };
    return { status: 'active', label: 'Active', color: 'success' };
  };

  const formatDueDate = (dueDate) => {
    const date = new Date(dueDate);
    const now = new Date();
    const timeDiff = date - now;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (daysDiff === 1) return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (daysDiff < 7) return `${daysDiff} days left`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="homework-grid">
      {homework.map(hw => {
        const status = getStatus(hw.dueDate);
        
        return (
          <div key={hw._id} className="homework-card">
            <div className="homework-header">
              <div className="homework-title-section">
                <h3>{hw.title}</h3>
                <span className={`status-badge status-${status.status}`}>
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
                <span className="meta-icon">🏫</span>
                <span>{hw.classroom?.name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">⏰</span>
                <span className={status.status === 'urgent' ? 'text-warning' : ''}>
                  {formatDueDate(hw.dueDate)}
                </span>
              </div>
            </div>

            {hw.description && (
              <div className="homework-description">
                <p>{hw.description}</p>
              </div>
            )}

            {hw.instructions && (
              <div className="homework-instructions">
                <strong>📋 Instructions:</strong>
                <p>{hw.instructions}</p>
              </div>
            )}

            {hw.attachments && hw.attachments.length > 0 && (
              <div className="homework-attachments">
                <strong>📎 Attachments ({hw.attachments.length}):</strong>
                <div className="attachments-list">
                  {hw.attachments.map((attachment, index) => (
                    <div key={index} className="attachment-item">
                      <span className="attachment-icon">
                        {attachment.mimeType?.includes('pdf') ? '📕' : 
                         attachment.mimeType?.includes('word') ? '📘' :
                         attachment.mimeType?.includes('excel') ? '📗' :
                         attachment.mimeType?.includes('image') ? '🖼️' : '📄'}
                      </span>
                      <span className="attachment-name">{attachment.originalName}</span>
                      <span className="attachment-size">
                        ({(attachment.fileSize / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="homework-actions">
              <button 
                className="btn btn-info btn-sm"
                onClick={() => onViewSubmissions(hw)}
              >
                👁️ Submissions
              </button>
              <button 
                className="btn btn-warning btn-sm"
                onClick={() => onEdit(hw)}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(hw)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
        if (userData.role && !localStorage.getItem('userRole')) {
          localStorage.setItem('userRole', userData.role);
        }
      } catch (parseError) {
        console.error( parseError);
      }
    }


    if (!userId || !schoolId || !token) {
      const missing = [];
      if (!userId) missing.push('userId');
      if (!schoolId) missing.push('schoolId'); 
      if (!token) missing.push('token');
      return null;
    }

    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(userId) || !objectIdRegex.test(schoolId)) {
      return null;
    }

    return { userId, schoolId, token };
  } catch (error) {
    console.error(error);
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

   
    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const BASE_URL = `${API}/api/teacher`;

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
    if (isOpen && homework) {
      fetchSubmissions();
    }
  }, [isOpen, homework]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/homework/${homework._id}/submissions`, getAuthHeaders());
      setSubmissions(response.data.submissions);
      setHomeworkData(response.data.homework);
    } catch (error) {
      showToast('Failed to fetch submissions', 'error');
      console.error( error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (submissionId, field, value) => {
    setSubmissions(prev => prev.map(sub => 
      sub._id === submissionId ? { ...sub, [field]: value } : sub
    ));
  };

  const handleSingleGrade = async (submissionId) => {
    if (grading[submissionId]) return;

    const submission = submissions.find(s => s._id === submissionId);
    if (!submission || submission.isPlaceholder) return;

    setGrading(prev => ({ ...prev, [submissionId]: true }));

    try {
      await onGradeSubmission(submissionId, {
        marksObtained: parseFloat(submission.marksObtained) || 0,
        feedback: submission.feedback || '',
        comments: submission.comments || ''
      });
      
      showToast('Submission graded successfully!');
      fetchSubmissions(); 
    } catch (error) {
      showToast('Failed to grade submission', 'error');
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const handleBulkGrade = async () => {
    const submissionsToGrade = submissions.filter(sub => 
      selectedSubmissions.has(sub._id) && !sub.isPlaceholder
    );

    if (submissionsToGrade.length === 0) {
      showToast('No submissions selected for grading', 'warning');
      return;
    }

    try {
      for (const submission of submissionsToGrade) {
        await onGradeSubmission(submission._id, {
          marksObtained: parseFloat(submission.marksObtained) || 0,
          feedback: submission.feedback || '',
          comments: submission.comments || ''
        });
      }
      
      showToast(`${submissionsToGrade.length} submissions graded successfully!`);
      setBulkMode(false);
      setSelectedSubmissions(new Set());
      fetchSubmissions();
    } catch (error) {
      showToast('Error grading some submissions', 'error');
    }
  };

  const toggleSelection = (submissionId) => {
    const newSelection = new Set(selectedSubmissions);
    if (newSelection.has(submissionId)) {
      newSelection.delete(submissionId);
    } else {
      newSelection.add(submissionId);
    }
    setSelectedSubmissions(newSelection);
  };

  const selectAll = () => {
    const gradableSubmissions = submissions.filter(sub => !sub.isPlaceholder);
    if (selectedSubmissions.size === gradableSubmissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(gradableSubmissions.map(sub => sub._id)));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded': return 'success';
      case 'submitted': return 'warning';
      case 'missing': return 'danger';
      default: return 'secondary';
    }
  };

  const downloadFile = async (homeworkId, filename, originalName) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/homework/${homeworkId}/files/${filename}`,
        { 
          ...getAuthHeaders(),
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('File downloaded successfully!');
    } catch (error) {
      showToast('Failed to download file', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Homework Submissions" size="xlarge">
      <div className="submissions-modal">
        {homeworkData && (
          <div className="homework-info-header">
            <div className="homework-main-info">
              <h3>{homeworkData.title}</h3>
              <p>Class: {homeworkData.classroom} • Due: {new Date(homeworkData.dueDate).toLocaleDateString()}</p>
            </div>
            <div className="homework-stats">
              <div className="stat">
                <span className="stat-value">{homeworkData.totalStudents}</span>
                <span className="stat-label">Students</span>
              </div>
              <div className="stat">
                <span className="stat-value">{submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length}</span>
                <span className="stat-label">Submitted</span>
              </div>
              <div className="stat">
                <span className="stat-value">{submissions.filter(s => s.status === 'graded').length}</span>
                <span className="stat-label">Graded</span>
              </div>
            </div>
          </div>
        )}

        <div className="bulk-actions-bar">
          <div className="bulk-controls">
            <button 
              className={`btn btn-sm ${bulkMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setBulkMode(!bulkMode)}
            >
              {bulkMode ? '✖ Cancel Bulk' : '📝 Bulk Grade'}
            </button>
            
            {bulkMode && (
              <>
                <button className="btn btn-sm btn-outline-secondary" onClick={selectAll}>
                  {selectedSubmissions.size === submissions.filter(s => !s.isPlaceholder).length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  className="btn btn-sm btn-success"
                  onClick={handleBulkGrade}
                  disabled={selectedSubmissions.size === 0}
                >
                  💾 Save {selectedSubmissions.size} Grades
                </button>
                <span className="selected-count">
                  {selectedSubmissions.size} selected
                </span>
              </>
            )}
          </div>
          
          <div className="action-buttons">
            <button className="btn btn-sm btn-info" onClick={fetchSubmissions}>
              🔄 Refresh
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={() => {
                showToast('Download feature coming soon!', 'info');
              }}
            >
              📥 Download All
            </button>
          </div>
        </div>

        <div className="submissions-list-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading submissions...</p>
            </div>
          ) : (
            <div className="submissions-table">
              <div className="table-header">
                {bulkMode && <div className="col-checkbox">Select</div>}
                <div className="col-student">Student</div>
                <div className="col-status">Status</div>
                <div className="col-submission">Submission</div>
                <div className="col-grade">Grade</div>
                <div className="col-feedback">Feedback</div>
                <div className="col-actions">Actions</div>
              </div>

              <div className="table-body">
                {submissions.map((submission) => (
                  <div key={submission._id} className={`submission-row ${submission.status} ${submission.isLate ? 'late' : ''}`}>
                    {bulkMode && !submission.isPlaceholder && (
                      <div className="col-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.has(submission._id)}
                          onChange={() => toggleSelection(submission._id)}
                        />
                      </div>
                    )}

                    <div className="col-student">
                      <div className="student-avatar">
                        {submission.student.avatar || '👨‍🎓'}
                      </div>
                      <div className="student-details">
                        <strong>{submission.student.name}</strong>
                        <span>{submission.student.rollNumber}</span>
                        <small>{submission.student.email}</small>
                      </div>
                    </div>

                    <div className="col-status">
                      <span className={`status-badge ${getStatusColor(submission.status)}`}>
                        {submission.status}
                        {submission.isLate && ' ⏰'}
                      </span>
                      {submission.submittedAt && (
                        <small>{new Date(submission.submittedAt).toLocaleDateString()}</small>
                      )}
                    </div>

                    <div className="col-submission">
                      {submission.status === 'missing' ? (
                        <span className="text-muted">Not submitted</span>
                      ) : (
                        <div className="submission-content">
                          {submission.submissionText && (
                            <div className="submission-text">
                              <strong>Note:</strong> {submission.submissionText}
                            </div>
                          )}
                          {submission.submittedFiles.map((file, index) => (
                            <div key={index} className="submission-file">
                              <span className="file-icon">📎</span>
                              <span className="file-name">{file.originalName}</span>
                              <button
                                className="btn-download"
                                onClick={() => downloadFile(homework._id, file.filename, file.originalName)}
                              >
                                📥
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="col-grade">
                      {submission.isPlaceholder ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <div className="grade-input-group">
                          <input
                            type="number"
                            min="0"
                            max={homeworkData?.totalPoints || 100}
                            value={submission.marksObtained || ''}
                            onChange={(e) => handleGradeChange(submission._id, 'marksObtained', e.target.value)}
                            placeholder="0"
                            className="grade-input"
                          />
                          <span className="grade-separator">/</span>
                          <span className="grade-total">{homeworkData?.totalPoints || 100}</span>
                        </div>
                      )}
                    </div>

                    <div className="col-feedback">
                      {submission.isPlaceholder ? (
                        <span className="text-muted">-</span>
                      ) : (
                        <textarea
                          value={submission.feedback || ''}
                          onChange={(e) => handleGradeChange(submission._id, 'feedback', e.target.value)}
                          placeholder="Add feedback..."
                          className="feedback-input"
                          rows="2"
                        />
                      )}
                    </div>

                    <div className="col-actions">
                      {!submission.isPlaceholder && (
                        <button
                          className={`btn btn-sm ${submission.status === 'graded' ? 'btn-success' : 'btn-primary'}`}
                          onClick={() => handleSingleGrade(submission._id)}
                          disabled={grading[submission._id]}
                        >
                          {grading[submission._id] ? '...' : submission.status === 'graded' ? 'Update' : 'Grade'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};


const HomeworkSection = ({ homework, classrooms, onRefresh, showToast, setHomeworkModal,  setSubmissionsModal  }) => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const filteredHomework = homework.filter(hw => {
    if (filter === 'active' && new Date(hw.dueDate) < new Date()) return false;
    if (filter === 'expired' && new Date(hw.dueDate) >= new Date()) return false;
    
    if (searchTerm && !hw.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !hw.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (selectedSubject && hw.subject !== selectedSubject) return false;
    
    return true;
  });

  const subjects = [...new Set(homework.map(hw => hw.subject).filter(Boolean))];

  return (
    <div className="form-tab">
      <div className="tab-header">
        <h2>📚 Homework & Assignments</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onRefresh}>
            🔄 Refresh
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              if (classrooms.length > 0) {
                setHomeworkModal({ isOpen: true, classroom: classrooms[0] });
              } else {
                showToast('No classrooms available', 'error');
              }
            }}
          >
            ➕ Create Homework
          </button>
        </div>
      </div>

      <div className="homework-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Search homework..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Homework</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {subjects.length > 0 && (
          <div className="filter-group">
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="filter-select"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        )}

        <div className="homework-stats">
          <span className="stat-item">Total: {homework.length}</span>
          <span className="stat-item">Active: {homework.filter(h => new Date(h.dueDate) > new Date()).length}</span>
          <span className="stat-item">Showing: {filteredHomework.length}</span>
        </div>
      </div>

      <div className="homework-content">
        {filteredHomework.length === 0 ? (
          <div className="no-data">
            {homework.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No Homework Created Yet</h3>
                <p>Create your first homework assignment to get started!</p>
              </div>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h3>No Homework Found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        ) : (
          <HomeworkList 
            homework={filteredHomework}
            onEdit={(hw) => {
              showToast('Edit feature coming soon!', 'info');
            }}
            onDelete={(hw) => {
              if (window.confirm(`Are you sure you want to delete "${hw.title}"?`)) {
                showToast('Delete feature coming soon!', 'info');
              }
            }}
            onViewSubmissions={(hw) => {
  setSubmissionsModal({ isOpen: true, homework: hw });
}}
          />
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ showToast }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

   const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
   const BASE_URL = `${API}/api/teacher`;

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
    fetchDashboardData();
  }, []);

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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your teaching dashboard...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <p>Failed to load dashboard data</p>
        <button className="btn btn-primary" onClick={fetchDashboardData}>
          Retry
        </button>
      </div>
    );
  }

  const { stats, summary, upcomingDeadlines, recentSubmissions, classrooms: classList } = dashboardData;

  return (
    <div className="dashboard-content">
      <div className="welcome-section">
        <h2>👨‍🏫 Welcome to Teacher Panel</h2>
        <p>Manage your classrooms, track student progress, and create engaging learning materials.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-content">
            <div className="stat-icon">🏫</div>
            <div className="stat-info">
              <h3>My Classrooms</h3>
              <div className="stat-number">{stats.totalClassrooms}</div>
              <div className="stat-desc">{stats.uniqueStudents} unique students</div>
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-content">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <h3>Active Homework</h3>
              <div className="stat-number">{stats.activeHomework}</div>
              <div className="stat-desc">{stats.totalHomework} total assigned</div>
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-content">
            <div className="stat-icon">👨‍🎓</div>
            <div className="stat-info">
              <h3>Total Students</h3>
              <div className="stat-number">{stats.uniqueStudents}</div>
              <div className="stat-desc">Across all classrooms</div>
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>Subjects</h3>
              <div className="stat-number">{stats.totalSubjects}</div>
              <div className="stat-desc">Different subjects</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="content-column">
          <div className="content-section">
            <div className="section-header">
              <h3>⏰ Upcoming Deadlines</h3>
              <span className="section-badge">{upcomingDeadlines.length}</span>
            </div>
            <div className="section-content">
              {upcomingDeadlines.length === 0 ? (
                <div className="empty-state">
                  <p>No upcoming deadlines</p>
                </div>
              ) : (
                <div className="deadlines-list">
                  {upcomingDeadlines.map(hw => (
                    <div key={hw._id} className="deadline-item">
                      <div className="deadline-main">
                        <strong>{hw.title}</strong>
                        <span className="classroom-badge">{hw.classroom?.name}</span>
                      </div>
                      <div className="deadline-details">
                        <span className="due-date">
                          Due: {new Date(hw.dueDate).toLocaleDateString()}
                        </span>
                        <span className="points">{hw.totalPoints} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h3>📥 Recent Submissions</h3>
              <span className="section-badge">{recentSubmissions.length}</span>
            </div>
            <div className="section-content">
              {recentSubmissions.length === 0 ? (
                <div className="empty-state">
                  <p>No recent submissions</p>
                </div>
              ) : (
                <div className="submissions-list">
                  {recentSubmissions.map(submission => (
                    <div key={submission._id} className="submission-item">
                      <div className="submission-student">
                        <strong>{submission.student?.name}</strong>
                        <span>{submission.homework?.title}</span>
                      </div>
                      <div className="submission-status">
                        <span className={`status-badge ${submission.status}`}>
                          {submission.status}
                        </span>
                        <small>{new Date(submission.submittedAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="content-column">
          <div className="content-section">
            <div className="section-header">
              <h3>🏫 My Classrooms</h3>
              <span className="section-badge">{classList.length}</span>
            </div>
            <div className="section-content">
              {classList.length === 0 ? (
                <div className="empty-state">
                  <p>No classrooms assigned</p>
                </div>
              ) : (
                <div className="classrooms-overview">
                  {classList.map(classroom => (
                    <div key={classroom._id} className="classroom-summary">
                      <div className="classroom-header">
                        <h4>{classroom.name}</h4>
                        <span className="student-count">{classroom.studentCount} students</span>
                      </div>
                      <div className="classroom-details">
                        <span>Grade: {classroom.grade}-{classroom.section}</span>
                        <span>Subject: {classroom.subject}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="content-section">
            <div className="section-header">
              <h3>📈 Performance Overview</h3>
            </div>
            <div className="section-content">
              <div className="performance-stats">
                <div className="performance-item">
                  <div className="performance-label">Submission Rate</div>
                  <div className="performance-value">{summary.submissionRate}%</div>
                  <div className="performance-desc">
                    {stats.submittedCount} of {stats.uniqueStudents} students
                  </div>
                </div>
                
                <div className="performance-item">
                  <div className="performance-label">Attendance Rate</div>
                  <div className="performance-value">{summary.attendanceRate}%</div>
                  <div className="performance-desc">
                    {stats.presentCount} present • {stats.absentCount} absent
                  </div>
                </div>

                <div className="performance-item">
                  <div className="performance-label">Graded Work</div>
                  <div className="performance-value">{stats.gradedCount}</div>
                  <div className="performance-desc">
                    {stats.gradedCount} of {stats.submittedCount} submissions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="dashboard-footer">
        <button className="btn btn-secondary" onClick={fetchDashboardData}>
          🔄 Refresh Dashboard
        </button>
      </div>
    </div>
  );
};

const TeacherPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [classrooms, setClassrooms] = useState([]);
  const [homework, setHomework] = useState([]);
  const [attendanceReports, setAttendanceReports] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [attendanceModal, setAttendanceModal] = useState({ isOpen: false, classroom: null });
  const [gradeModal, setGradeModal] = useState({ isOpen: false, classroom: null });
  const [homeworkModal, setHomeworkModal] = useState({ isOpen: false, classroom: null });
  const [progressModal, setProgressModal] = useState({ isOpen: false, student: null, classroom: null });
  const [submissionsModal, setSubmissionsModal] = useState({ isOpen: false, homework: null });
  const [studentsModal, setStudentsModal] = useState({ isOpen: false, classroom: null });
  
   const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const BASE_URL = `${API}/api/teacher`;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const getAuthHeadersFormData = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
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

useEffect(() => {
    const userData = getValidatedUserData();
    if (!userData) {
      showToast('Please login again', 'error');
      return;
    }

    const socket = io(API);
    socket.emit('join-user', userData.userId);
    window.socket = socket;

socket.on('new-chat-message', (data) => {

  showToast(`New message from ${data.from.name}`, 'info');
});
    socket.on('message-error', (data) => {
      showToast(data.error, 'error');
    });

    socket.on('message-sent', (data) => {
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleGradeSubmission = async (submissionId, gradeData) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/submissions/${submissionId}/grade`,
      gradeData,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to grade submission', 'error');
    throw error;
  }
};


  const fetchMyClassrooms = async () => {
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

  const handleMarkAttendance = async (classroomId, date, subject, attendanceList) => {
    try {
      const response = await axios.post(`${BASE_URL}/attendance/class`, 
        { classroomId, date, subject, attendanceList },
        getAuthHeaders()
      );
      showToast('Attendance marked successfully!');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to mark attendance', 'error');
      throw error;
    }
  };

  const handleUploadGrades = async (gradeData) => {
    try {
      const response = await axios.post(`${BASE_URL}/grades/class`, 
        gradeData,
        getAuthHeaders()
      );
      showToast('Grades uploaded successfully!');
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to upload grades', 'error');
      throw error;
    }
  };

  const handleCreateHomework = async (formData) => {
    try {
      const response = await axios.post(`${BASE_URL}/homework`, 
        formData,
        getAuthHeadersFormData()
      );
      showToast('Homework created successfully!');
      fetchMyHomework();
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create homework', 'error');
      throw error;
    }
  };

  const fetchMyHomework = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/homework`, getAuthHeaders());
      setHomework(response.data.homework || []);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch homework', 'error');
    }
  };

const handleGetStudentProgress = async (studentId, classroomId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/student/${studentId}/report/${classroomId}`, 
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to fetch student progress', 'error');
    throw error;
  }
};

  const fetchClassPerformance = async (classroomId, subject) => {
    try {
      const response = await axios.get(`${BASE_URL}/grades/class-performance?classroomId=${classroomId}${subject ? `&subject=${subject}` : ''}`, 
        getAuthHeaders()
      );
      setPerformanceData(prev => ({
        ...prev,
        [classroomId]: response.data
      }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch class performance', 'error');
    }
  };

  const fetchAttendanceReport = async (classroomId) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const response = await axios.get(
        `${BASE_URL}/attendance/class/${classroomId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        getAuthHeaders()
      );
      setAttendanceReports(prev => ({
        ...prev,
        [classroomId]: response.data
      }));
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch attendance report', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'classrooms') {
      fetchMyClassrooms();
    } else if (activeTab === 'homework') {
      fetchMyHomework();
    }
  }, [activeTab]);

  const renderDashboard = () => (
    <Dashboard showToast={showToast} />
  );

  const renderClassrooms = () => (
    <div className="form-tab">
      <div className="tab-header">
        <h2>🏫 My Classrooms</h2>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={fetchMyClassrooms}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="schools-list">
        {loading ? (
          <div className="loading">Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <div className="no-data">No classrooms assigned yet</div>
        ) : (
          classrooms.map(classroom => (
            <div key={classroom._id} className="school-card">
              <div className="school-info">
                <h3>{classroom.name}</h3>
                <div className="school-details">
                  <div className="detail-item">
                    🎯 <strong>Grade:</strong> {classroom.grade} - {classroom.section}
                  </div>
                  <div className="detail-item">
                    👨‍🎓 <strong>Students:</strong> {classroom.students?.length || 0}
                  </div>
                  <div className="detail-item">
                    📚 <strong>Subject:</strong> {classroom.subject || 'Not assigned'}
                  </div>
                  <div className="detail-item">
                    👨‍🏫 <strong>Class Teacher:</strong> {classroom.classTeacher?.name || 'You'}
                  </div>
                </div>
              </div>
              <div className="school-actions">
                <button 
                  className="btn btn-info"
                  onClick={() => setAttendanceModal({ isOpen: true, classroom })}
                >
                  📝 Attendance
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => setGradeModal({ isOpen: true, classroom })}
                >
                  📊 Upload Grades
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setHomeworkModal({ isOpen: true, classroom })}
                >
                  📚 Homework
                </button>
                
                <button 
    className="btn btn-success"
    onClick={() => setStudentsModal({ isOpen: true, classroom })}
  >
    👨‍🎓 View Students
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
    case 'classrooms':
      return renderClassrooms();
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
    case 'attendance':
      return renderClassrooms();
    case 'grades':
      return renderClassrooms();
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
  userRole="teacher"
/>
        </div>
      );
    default:
      return renderDashboard();
  }
};

  return (
    <div className="teacher-panel">

<header className="super-header">
   <h1>🎓 EduManage - Teacher Portal</h1>
  <div className="user-info">
    <span>Welcome back, Teacher</span>
    <div className="header-actions">
     
      <button className="logout-btn" onClick={() => {
        localStorage.clear();
        window.location.reload();
      }}>
         Logout
      </button>
    </div>
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
    className={activeTab === 'classrooms' ? 'active' : ''}
    onClick={() => setActiveTab('classrooms')}
  >
    🏫 My Classrooms
  </button>
  <button 
    className={activeTab === 'homework' ? 'active' : ''}
    onClick={() => setActiveTab('homework')}
  >
    📚 Homework
  </button>
  <button 
    className={activeTab === 'attendance' ? 'active' : ''}
    onClick={() => setActiveTab('attendance')}
  >
    📝 Attendance
  </button>
  <button 
    className={activeTab === 'grades' ? 'active' : ''}
    onClick={() => setActiveTab('grades')}
  >
    📊 Grades
  </button>
  <button 
    className={activeTab === 'messages' ? 'active' : ''}
    onClick={() => setActiveTab('messages')}
  >
    💬 Messages

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
 
  showToast={showToast}
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