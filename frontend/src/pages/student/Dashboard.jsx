import React, { useState, useEffect ,useRef} from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './StudentPanel.css';
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

const HomeworkSubmissionModal = ({ isOpen, onClose, homework, onSubmitHomework, showToast }) => {
  const [submissionData, setSubmissionData] = useState({
    submissionText: '',
    files: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSubmissionData({ submissionText: '', files: [] });
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSubmissionData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index) => {
    setSubmissionData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionData.submissionText.trim() && submissionData.files.length === 0) {
      showToast('Please add submission text or upload files', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('homeworkId', homework._id);
      formData.append('submissionText', submissionData.submissionText);
      
      submissionData.files.forEach(file => {
        formData.append('attachments', file);
      });

      await onSubmitHomework(formData);
      onClose();
      showToast('Homework submitted successfully!');
    } catch (error) {
      showToast('Failed to submit homework', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submit Homework - ${homework?.title}`} size="large">
      <form onSubmit={handleSubmit} className="homework-submission-form">
        <div className="form-section">
          <h4>📝 Submission Details</h4>
          <div className="form-group">
            <label>Your Submission Text</label>
            <textarea
              value={submissionData.submissionText}
              onChange={(e) => setSubmissionData(prev => ({ ...prev, submissionText: e.target.value }))}
              placeholder="Describe your submission, add notes, or paste your work here..."
              rows="6"
              maxLength={5000}
            />
            <small className="char-count">{submissionData.submissionText.length}/5000 characters</small>
          </div>
        </div>

        <div className="form-section">
          <h4>📎 Attach Files</h4>
          <div className="form-group">
            <label>Upload Files (Max 5 files, 10MB each)</label>
            <div className="file-upload-area">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt,.zip"
                disabled={submissionData.files.length >= 5}
              />
              <div className="upload-hint">
                <span>📁 Click to upload or drag and drop</span>
                <small>Supported: PDF, Word, Excel, PowerPoint, Images, Text files, ZIP</small>
              </div>
            </div>
            
            {submissionData.files.length > 0 && (
              <div className="file-previews">
                <h5>Selected Files ({submissionData.files.length}/5):</h5>
                {submissionData.files.map((file, index) => (
                  <div key={index} className="file-preview-item">
                    <span className="file-icon">
                      {file.type.includes('pdf') ? '📕' : 
                       file.type.includes('word') ? '📘' :
                       file.type.includes('excel') ? '📗' :
                       file.type.includes('image') ? '🖼️' : '📄'}
                    </span>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
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

        {homework && (
          <div className="homework-instructions-preview">
            <h4>📋 Homework Instructions</h4>
            <p>{homework.instructions || 'No specific instructions provided.'}</p>
            <div className="homework-meta">
              <span><strong>Due Date:</strong> {new Date(homework.dueDate).toLocaleString()}</span>
              <span><strong>Points:</strong> {homework.totalPoints}</span>
              <span><strong>Subject:</strong> {homework.subject}</span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || (!submissionData.submissionText.trim() && submissionData.files.length === 0)}
          >
            {loading ? 'Submitting...' : '📤 Submit Homework'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
const AIChatSection = ({ showToast }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const BASE_URL = `${API}/api/student/ai`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);

  useEffect(() => {
    const newSocket = io(API, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      const userData = getValidatedUserData();
      if (userData) {
        newSocket.emit('join-user', userData.userId);
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error(error);
      setIsConnected(false);
    });

    newSocket.on('learning-response', (data) => {
      setThinking(false);
      
      if (data.success) {
        setMessages(prev => {
          const newMessages = prev.filter(msg => !msg.isThinking);
          return [...newMessages, {
            id: Date.now() + 1,
            question: data.question,
            answer: data.answer,
            timestamp: new Date(data.timestamp),
            isUser: false,
            gradeLevel: data.gradeLevel
          }];
        });
        showToast('AI response received!', 'success');
      }
    });

    newSocket.on('ai-thinking', (data) => {
      setThinking(data.thinking);
    });
newSocket.on('new-conversation-added', (data) => {
  setMessages(prev => [...prev, {
    id: data.id,
    question: data.question,
    answer: data.answer,
    timestamp: new Date(data.timestamp),
    isUser: false,
    messageType: data.type
  }]);
});
    newSocket.on('ai-error', (data) => {
      console.error( data);
      setThinking(false);
      showToast(data.error, 'error');
      setMessages(prev => prev.filter(msg => !msg.isThinking));
    });

    newSocket.on('learning-history', (data) => {
      setLoading(false);
      if (data.success && data.sessions) {
        const formattedMessages = data.sessions.map(session => ({
          id: session.id,
          question: session.question,
          answer: session.answer,
          timestamp: new Date(session.timestamp),
          isUser: false,
          messageType: session.type
        }));
        setMessages(formattedMessages);
        showToast('Conversation history loaded!', 'success');
      } else {
        showToast('No conversation history found', 'info');
      }
    });

    loadConversationHistory(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

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
      return null;
    }
  };

 const loadConversationHistory = (sock = socket) => {
  const userData = getValidatedUserData();
  if (userData && sock) {
    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      showToast('History loading timeout', 'error');
    }, 10000);

    const handleHistoryResponse = (data) => {
      clearTimeout(timeoutId);
      setLoading(false);
      
      if (data.success && data.sessions) {
        const formattedMessages = data.sessions.map(session => ({
          id: session.id,
          question: session.question,
          answer: session.answer,
          timestamp: new Date(session.timestamp),
          isUser: false,
          messageType: session.type
        }));
        setMessages(formattedMessages);
        showToast(`Loaded ${formattedMessages.length} conversations`, 'success');
      } else {
        showToast(data.error || 'Failed to load history', 'error');
      }
    };

    sock.once('learning-history', handleHistoryResponse);

    sock.emit('get-learning-history', userData.userId);
  } else {
    setLoading(false);
    showToast('Not connected to server', 'error');
  }
};

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || thinking || !socket || !isConnected) {
      return;
    }

    const userData = getValidatedUserData();
    if (!userData) {
      showToast('Please login again', 'error');
      return;
    }

    const userMessage = {
      id: Date.now(),
      question: inputMessage,
      answer: '',
      timestamp: new Date(),
      isUser: true,
      isThinking: true 
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setThinking(true);

    socket.emit('ask-ai-tutor', {
      message: inputMessage.trim(),
      userId: userData.userId
    });
  };

  const clearHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE_URL}/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
      showToast('Conversation history cleared', 'success');
    } catch (error) {
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
    <div className="tab-content">
      <div className="tab-header">
        <h2>🤖 AI Learning Assistant</h2>
        <div className="header-actions">
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢' : '🔴'}
            </span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={clearHistory}
            disabled={messages.length === 0 || thinking}
          >
            🗑️ Clear History
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => loadConversationHistory()}
            disabled={thinking}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="ai-chat-section">
        <div className="ai-chat-container">
          <div className="ai-info-header">
            <div className="ai-avatar">
              <span>🤖</span>
            </div>
            <div className="ai-info-content">
              <h3>Professor Aria - AI Tutor</h3>
              
            </div>
          </div>

          <div className="ai-chat-messages-area">
            {loading ? (
              <div className="loading-ai">
                <div className="spinner"></div>
                <p>Loading your learning conversations...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-ai-chat">
                <div className="empty-ai-icon">🎓</div>
                <h4>Welcome to AI Learning!</h4>
                <p>Start a conversation with your AI tutor:</p>
                <div className="ai-suggestions">
                  <div className="suggestion-item" onClick={() => setInputMessage("Can you explain photosynthesis in a fun way?")}>
                    <span className="suggestion-icon">🌱</span>
                    <span>Explain photosynthesis</span>
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage("Help me solve quadratic equations")}>
                    <span className="suggestion-icon">🧮</span>
                    <span>Math problems</span>
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage("What's the water cycle?")}>
                    <span className="suggestion-icon">🔬</span>
                    <span>Science concepts</span>
                  </div>
                  <div className="suggestion-item" onClick={() => setInputMessage("How can I study more effectively?")}>
                    <span className="suggestion-icon">💡</span>
                    <span>Study tips</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ai-messages-container">
  {messages.map((message, index) => (
   
    <div key={message.id || index}>
      <div className="ai-message-row user-message">
        <div className="ai-message-bubble user-bubble">
          
          <div className="message-content">
            <p>{message.question}</p>
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      <div className="ai-message-row ai-message">
        <div className="ai-message-bubble ai-bubble">
          
          <div className="message-content">
            <p>{message.answer}</p>
            
            <span className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  ))}

  {thinking && (
    <div className="ai-message-row ai-message">
      <div className="ai-message-bubble ai-bubble thinking">
        <div className="message-avatar">
          <span>🤖</span>
        </div>
        <div className="message-content">
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>Professor Aria is thinking...</p>
        </div>
      </div>
    </div>
  )}
  <div ref={messagesEndRef} />
</div>
            )}
          </div>

          <form onSubmit={sendMessage} className="ai-input-area">
            <div className="input-container">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Professor Aria anything about your studies..."
                disabled={thinking || !isConnected}
                maxLength={1000}
                className="ai-input-field"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || thinking || !isConnected}
                className="ai-send-button"
                title={!isConnected ? "Not connected to server" : "Send message"}
              >
                {thinking ? (
                  <div className="sending-indicator">
                    <span>⏳</span>
                  </div>
                ) : !isConnected ? (
                  <span>🔴</span>
                ) : (
                  <span>📤</span>
                )}
              </button>
            </div>
            
          </form>
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

const Dashboard = ({ dashboardData, showToast }) => {
  if (!dashboardData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const { profile, summary, recentGrades, upcomingHomework, upcomingExams } = dashboardData;

  return (
    <div className="dashboard-content">
      <div className="welcome-section">
        <h2>👨‍🎓 Welcome back, {profile?.name}!</h2>
        <p>Class: {profile?.classroom?.name} • Stay updated with your academic progress</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-content">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <h3>Overall Average</h3>
              <div className="stat-number">{summary?.overallAverage || '0%'}</div>
              <div className="stat-desc">Recent Performance</div>
            </div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-content">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>Attendance</h3>
              <div className="stat-number">{summary?.recentAttendance || '0%'}</div>
              <div className="stat-desc">Last 30 days</div>
            </div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-content">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <h3>Upcoming Homework</h3>
              <div className="stat-number">{summary?.upcomingHomework || 0}</div>
              <div className="stat-desc">Assignments due</div>
            </div>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-content">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <h3>Recent Exams</h3>
              <div className="stat-number">{summary?.totalExams || 0}</div>
              <div className="stat-desc">This period</div>
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
                    <strong>{grade.subject}</strong>
                    <span>{grade.examTitle}</span>
                  </div>
                  <div className={`grade-score ${grade.percentage >= 80 ? 'success' : grade.percentage >= 60 ? 'warning' : 'danger'}`}>
                    {grade.percentage}% ({grade.grade})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>📚 Upcoming Homework</h3>
          </div>
          <div className="card-content">
            {!upcomingHomework || upcomingHomework.length === 0 ? (
              <div className="empty-state">No upcoming homework</div>
            ) : (
              upcomingHomework.map((hw, index) => (
                <div key={index} className="homework-item">
                  <div className="homework-title">
                    <strong>{hw.title}</strong>
                    <span className="subject-badge">{hw.subject}</span>
                  </div>
                  <div className="homework-due">
                    Due: {new Date(hw.dueDate).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>📝 Upcoming Exams</h3>
          </div>
          <div className="card-content">
            {!upcomingExams || upcomingExams.length === 0 ? (
              <div className="empty-state">No upcoming exams</div>
            ) : (
              upcomingExams.map((exam, index) => (
                <div key={index} className="exam-item">
                  <div className="exam-title">
                    <strong>{exam.title}</strong>
                    <span className="exam-type">{exam.examType}</span>
                  </div>
                  <div className="exam-details">
                    <span>{exam.subject}</span>
                    <span>{new Date(exam.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const HomeworkList = ({ homework, onViewDetails, onSubmitHomework, showToast }) => {
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
    <div className="homework-grid">
      {homework.map(hw => {
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
                onClick={() => onViewDetails(hw)}
              >
                👁️ View Details
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => onSubmitHomework(hw)}
                disabled={status.status === 'overdue'}
              >
                📤 Submit
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AttendanceSection = ({ attendanceData, showToast }) => {
  if (!attendanceData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading attendance data...</p>
      </div>
    );
  }

  const { summary, attendanceRecords } = attendanceData;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>📊 Attendance Overview</h2>
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
                <div className="stat-value-large">{summary?.presentClasses || 0}</div>
                <div className="stat-label-large">Present</div>
              </div>
              <div className="attendance-stat-card absent">
                <div className="stat-icon-large">❌</div>
                <div className="stat-value-large">{summary?.absentClasses || 0}</div>
                <div className="stat-label-large">Absent</div>
              </div>
              <div className="attendance-stat-card late">
                <div className="stat-icon-large">⏰</div>
                <div className="stat-value-large">{summary?.lateClasses || 0}</div>
                <div className="stat-label-large">Late</div>
              </div>
              <div className="attendance-stat-card total">
                <div className="stat-icon-large">📊</div>
                <div className="stat-value-large">{summary?.totalClasses || 0}</div>
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
                    style={{ width: `${summary?.attendancePercentage || 0}%` }}
                  ></div>
                </div>
                <span className="progress-value">{summary?.attendancePercentage || 0}%</span>
              </div>
              <div className="progress-item">
                <span className="progress-label">Absent</span>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar absent" 
                    style={{ width: `${100 - (summary?.attendancePercentage || 0)}%` }}
                  ></div>
                </div>
                <span className="progress-value">{100 - (summary?.attendancePercentage || 0)}%</span>
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
                  {record.status === 'present' ? '✅' : record.status === 'absent' ? '❌' : '⏰'}
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

const GradesSection = ({ gradesData, showToast }) => {
  if (!gradesData) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading grades data...</p>
      </div>
    );
  }

  const { overallAverage, grades, totalExams } = gradesData;

  const calculateSubjectAverages = () => {
    const subjectMap = {};
    
    grades?.forEach(grade => {
      if (!subjectMap[grade.subject]) {
        subjectMap[grade.subject] = {
          subject: grade.subject,
          totalPercentage: 0,
          count: 0,
          grades: [],
          highestScore: 0,
          lowestScore: 100
        };
      }
      
      subjectMap[grade.subject].totalPercentage += grade.percentage;
      subjectMap[grade.subject].count++;
      subjectMap[grade.subject].grades.push(grade);
      
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

  const getRecentGrades = () => {
    return grades?.slice(-3).reverse() || [];
  };

  const recentGrades = getRecentGrades();

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>🎯 Academic Performance</h2>
        <div className="header-actions">
          <span className="academic-info">
            📅 {gradesData.academicYear} • Semester {grades?.[0]?.semester || '1'}
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
                <span className="score-value">{overallAverage}</span>
              </div>
              <h3>Overall Average</h3>
              <p>Based on {totalExams} exams across {subjectAverages.length} subjects</p>
            </div>
            
            <div className="performance-metrics">
              <div className="metric-card">
                <div className="metric-value">{totalExams}</div>
                <div className="metric-label">Total Exams</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{subjectAverages.length}</div>
                <div className="metric-label">Subjects</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {Math.max(...subjectAverages.map(s => s.averagePercentage), 0).toFixed(1)}%
                </div>
                <div className="metric-label">Best Subject</div>
              </div>
            </div>
          </div>

          <div className="recent-performance">
            <h3>📈 Recent Performance</h3>
            <div className="recent-grades-list">
              {recentGrades.map((grade, index) => (
                <div key={index} className="recent-grade-item">
                  <div className="grade-subject-badge">
                    <span className="subject-abbr">
                      {grade.subject.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="grade-details">
                    <div className="grade-header">
                      <strong>{grade.subject}</strong>
                      <span className="grade-percent">{grade.percentage}%</span>
                    </div>
                    <div className="grade-meta">
                      <span>{grade.examTitle}</span>
                      <span className="exam-type">{grade.examType}</span>
                    </div>
                    <div className="grade-progress">
                      <div 
                        className="grade-progress-fill"
                        style={{ width: `${grade.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`grade-badge-large ${grade.grade}`}>
                    {grade.grade}
                  </div>
                </div>
              ))}
            </div>
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
                    {subject.averagePercentage >= 90 ? '🏆 Excellent' :
                     subject.averagePercentage >= 80 ? '👍 Good' :
                     subject.averagePercentage >= 70 ? '📊 Average' : '📈 Needs Focus'}
                  </span>
                </div>

                <div className="subject-progress">
                  <div className="progress-info">
                    <span className="progress-percentage">
                      {subject.averagePercentage.toFixed(1)}%
                    </span>
                    <span className="progress-label">Subject Average</span>
                  </div>
                  <div className="mini-progress-bar">
                    <div 
                      className="mini-progress-fill"
                      style={{ width: `${subject.averagePercentage}%` }}
                    ></div>
                  </div>
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

                <div className="subject-grades-preview">
                  <div className="grades-list-mini">
                    {subject.grades.slice(0, 3).map((grade, gradeIndex) => (
                      <div key={gradeIndex} className="mini-grade-item">
                        <span className="mini-grade-title">
                          {grade.examTitle.length > 15 
                            ? grade.examTitle.substring(0, 15) + '...' 
                            : grade.examTitle
                          }
                        </span>
                        <span className={`mini-grade-badge ${grade.grade}`}>
                          {grade.percentage}%
                        </span>
                      </div>
                    ))}
                    {subject.grades.length > 3 && (
                      <div className="more-grades">
                        +{subject.grades.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
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

        <div className="performance-summary">
          <h3>📊 Performance Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <h4>Strongest Subject</h4>
                <p>
                  {subjectAverages.length > 0 
                    ? subjectAverages.reduce((prev, current) => 
                        prev.averagePercentage > current.averagePercentage ? prev : current
                      ).subject
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-icon">📈</div>
              <div className="insight-content">
                <h4>Overall Trend</h4>
                <p>
                  {recentGrades.length >= 2 
                    ? recentGrades[0].percentage >= recentGrades[1].percentage 
                      ? 'Improving' : 'Needs Attention'
                    : 'Establishing'
                  }
                </p>
              </div>
            </div>
            <div className="insight-card">
              <div className="insight-icon">⭐</div>
              <div className="insight-content">
                <h4>Grade Distribution</h4>
                <p>
                  {grades?.filter(g => g.grade === 'A' || g.grade === 'A+').length || 0} A grades
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentPanel = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [gradesData, setGradesData] = useState(null);
  const [homeworkData, setHomeworkData] = useState(null);
  const [examSchedule, setExamSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [homeworkSubmissionModal, setHomeworkSubmissionModal] = useState({ isOpen: false, homework: null });
  const [aiChatModal, setAiChatModal] = useState(false);

   const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const BASE_URL = `${API}/api/student`;

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

  const getValidatedUserData = () => {
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const schoolId = localStorage.getItem('schoolId');

      if (!token || !userId || !schoolId) {
        return null;
      }

      return { token, userId, schoolId };
    } catch (error) {
      return null;
    }
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/dashboard`, getAuthHeaders());
      setDashboardData(response.data);
    } catch (error) {
      console.error(error);
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/attendance`, getAuthHeaders());
      setAttendanceData(response.data);
    } catch (error) {
      console.error( error);
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/grades`, getAuthHeaders());
      setGradesData(response.data);
    } catch (error) {
      console.error( error);
      showToast('Failed to load grades data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/homework`, getAuthHeaders());
      setHomeworkData(response.data);
    } catch (error) {
      console.error( error);
      showToast('Failed to load homework data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamSchedule = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/exam-schedule`, getAuthHeaders());
      setExamSchedule(response.data);
    } catch (error) {
      console.error( error);
      showToast('Failed to load exam schedule', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitHomework = async (formData) => {
    try {
      await axios.post(`${BASE_URL}/homework/submit`, formData, getAuthHeadersFormData());
      fetchHomework();
      return true;
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit homework', 'error');
      throw error;
    }
  };

  useEffect(() => {
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
      case 'exams':
        fetchExamSchedule();
        break;
    }
  }, [activeTab]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard dashboardData={dashboardData} showToast={showToast} />;
      
      case 'attendance':
       
        return <AttendanceSection attendanceData={attendanceData}/>;
        
      
      case 'grades':
  
         return <GradesSection gradesData={gradesData}/>;
        
      
      case 'homework':
        return (
          <div className="tab-content">
            <div className="tab-header">
              <h2>📚 My Homework</h2>
              <button className="btn btn-secondary" onClick={fetchHomework}>
                🔄 Refresh
              </button>
            </div>
            
            {homeworkData && (
              <div className="homework-content">
                <div className="homework-summary">
                  <div className="summary-stats">
                    <span>Total: {homeworkData.summary?.total || 0}</span>
                    <span>Upcoming: {homeworkData.summary?.upcoming || 0}</span>
                    <span>Past Due: {homeworkData.summary?.pastDue || 0}</span>
                  </div>
                </div>

                <div className="homework-sections">
                  <div className="homework-section">
                    <h3>📅 Upcoming Homework</h3>
                    <HomeworkList 
                      homework={homeworkData.upcomingHomework || []}
                      onViewDetails={(hw) => {
                        showToast(`Viewing details for: ${hw.title}`, 'info');
                      }}
                      onSubmitHomework={(hw) => {
                        setHomeworkSubmissionModal({ isOpen: true, homework: hw });
                      }}
                      showToast={showToast}
                    />
                  </div>

                  <div className="homework-section">
                    <h3>⏰ Past Due Homework</h3>
                    <HomeworkList 
                      homework={homeworkData.pastDueHomework || []}
                      onViewDetails={(hw) => {
                        showToast(`Viewing details for: ${hw.title}`, 'info');
                      }}
                      onSubmitHomework={(hw) => {
                        setHomeworkSubmissionModal({ isOpen: true, homework: hw });
                      }}
                      showToast={showToast}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'exams':
        return (
          <div className="tab-content">
            <h2>📝 Exam Schedule</h2>
            {examSchedule && (
              <div className="exams-content">
                <div className="exams-summary">
                  <h3>Exam Overview</h3>
                  <div className="summary-cards">
                    <div className="summary-card">
                      <span className="card-value">{examSchedule.summary?.totalExams || 0}</span>
                      <span className="card-label">Total Exams</span>
                    </div>
                    <div className="summary-card">
                      <span className="card-value">{examSchedule.summary?.upcoming || 0}</span>
                      <span className="card-label">Upcoming</span>
                    </div>
                    <div className="summary-card">
                      <span className="card-value">{examSchedule.summary?.completed || 0}</span>
                      <span className="card-label">Completed</span>
                    </div>
                  </div>
                </div>

                <div className="exams-list">
                  <h3>Exam Schedule</h3>
                  <div className="exams-grid">
                    {examSchedule.exams?.map((exam, index) => (
                      <div key={index} className={`exam-card ${exam.isUpcoming ? 'upcoming' : 'completed'}`}>
                        <div className="exam-header">
                          <h4>{exam.title}</h4>
                          <span className={`exam-status ${exam.isUpcoming ? 'upcoming' : 'completed'}`}>
                            {exam.isUpcoming ? 'Upcoming' : 'Completed'}
                          </span>
                        </div>
                        <div className="exam-details">
                          <div className="detail-item">
                            <span>📚 Subject:</span>
                            <span>{exam.subject}</span>
                          </div>
                          <div className="detail-item">
                            <span>📝 Type:</span>
                            <span>{exam.examType}</span>
                          </div>
                          <div className="detail-item">
                            <span>📅 Date:</span>
                            <span>{new Date(exam.date).toLocaleDateString()}</span>
                          </div>
                          <div className="detail-item">
                            <span>⏰ Time:</span>
                            <span>{exam.startTime} - {exam.endTime}</span>
                          </div>
                          <div className="detail-item">
                            <span>🏫 Room:</span>
                            <span>{exam.room || 'TBA'}</span>
                          </div>
                          {exam.isUpcoming && exam.daysRemaining > 0 && (
                            <div className="days-remaining">
                              {exam.daysRemaining} days remaining
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
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
   userRole="student"
 />
         </div>
       );
         case 'ai':
      return <AIChatSection showToast={showToast} />;
      
      default:
        return <Dashboard dashboardData={dashboardData} showToast={showToast} />;
    }
  };

  return (
    <div className="student-panel">
      <header className="student-header">
        <div className="header-left">
          <h1>🎓 EduManage - Student Portal</h1>
          <p>Welcome back! Track your academic progress</p>
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

      <div className="student-layout">
        <nav className="student-sidebar">
          <div className="sidebar-content">
            <div className="sidebar-header">
              <div className="student-profile">
                <div className="profile-avatar">
                  {dashboardData?.profile?.name?.charAt(0) || 'S'}
                </div>
                <div className="profile-info">
                  <h3>{dashboardData?.profile?.name || 'Student'}</h3>
                  <p>{dashboardData?.profile?.classroom?.name || 'Class'}</p>
                </div>
              </div>
            </div>

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
                <span className="nav-icon">📊</span>
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
                className={`nav-item ${activeTab === 'exams' ? 'active' : ''}`}
                onClick={() => setActiveTab('exams')}
              >
                <span className="nav-icon">📝</span>
                <span className="nav-text">Exams</span>
              </button>
              
              <button 
                className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                <span className="nav-icon">💬</span>
                <span className="nav-text">Messages</span>
              </button>

              <button 
                className={`nav-item ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                <span className="nav-icon"> 🤖</span>
                <span className="nav-text">AI Tutor</span>
              </button>
            </div>

           
          </div>
        </nav>

        <main className="student-main">
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