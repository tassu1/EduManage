
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './message.css';

const MessagesSection = ({ showToast, userRole }) => {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [activeView, setActiveView] = useState('conversations');
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const BASE_URL = `${API}/api/${userRole}/messaging`;

  const getValidatedUserData = () => {
    try {
      const userId = localStorage.getItem('userId');
      const schoolId = localStorage.getItem('schoolId');
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('userRole') || userRole;

      if (!userId || !schoolId || !token) {
        return null;
      }

      return { userId, schoolId, token, role };
    } catch (error) {
      console.error( error);
      return null;
    }
  };

  useEffect(() => {
    if (activeView === 'conversations' || activeView === 'contacts') {
      fetchConversations();
      fetchContacts();
    }
  }, [activeView]);

  useEffect(() => {
    if (currentChat && activeView === 'chat') {
      fetchMessages();
    }
  }, [currentChat, activeView]);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const userData = getValidatedUserData();
        if (!userData) return;

        if (!window.socket) {
          const token = userData.token;
          window.socket = io(API, {
            auth: { token }
          });
 
        }

        window.socket.emit('join-user', userData.userId);

      } catch (error) {
        console.error( error);
      }
    };

    initializeSocket();

    const handleNewMessage = (data) => {
      if (currentChat && data.from._id === currentChat.userId) {
        setMessages(prev => [...prev, {
          _id: data.id,
          from: data.from,
          content: data.content,
          createdAt: new Date(data.timestamp)
        }]);
      }

      if (activeView === 'conversations') {
        fetchConversations();
      }
    };

    const handleMessageSent = (data) => {
      setMessages(prev => prev.map(msg => 
        msg.isOptimistic && msg.content === data.message?.content 
          ? {
              _id: data.id,
              from: { _id: getValidatedUserData()?.userId, name: 'You' },
              content: data.message.content,
              createdAt: new Date(data.message.createdAt)
            }
          : msg
      ));
    };

    if (window.socket) {
      window.socket.on('new-chat-message', handleNewMessage);
      window.socket.on('message-sent', handleMessageSent);
      window.socket.on('message-error', (error) => {
        console.error( error);
        showToast(error.error || 'Failed to send message', 'error');
        setMessages(prev => prev.filter(msg => !msg.isOptimistic));
      });
    }

    return () => {

      if (window.socket) {
        window.socket.off('new-chat-message', handleNewMessage);
        window.socket.off('message-sent', handleMessageSent);
        window.socket.off('message-error');
      }
    };
  }, [currentChat, activeView, userRole]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const userData = getValidatedUserData();
      if (!userData) return;

      const response = await axios.get(
        `${BASE_URL}/conversations`,
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );

      setConversations(response.data.conversations || []);
    } catch (error) {
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const userData = getValidatedUserData();
      if (!userData) return;

      const response = await axios.get(
        `${BASE_URL}/contacts`,
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setContacts(response.data.contacts || []);
    } catch (error) {
      showToast('Failed to load contacts', 'error');
    }
  };

  const fetchMessages = async () => {
    if (!currentChat) return;
    
    try {
      setLoading(true);
      const userData = getValidatedUserData();
      if (!userData) return;

      const response = await axios.get(
        `${BASE_URL}/conversation/${currentChat.userId}`,
        { headers: { Authorization: `Bearer ${userData.token}` } }
      );
      setMessages(response.data.messages || []);
    } catch (error) {
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChat) return;

    const userData = getValidatedUserData();
    if (!userData) {
      showToast('User authentication failed', 'error');
      return;
    }

    const messageData = {
      from: userData.userId,
      to: currentChat.userId,
      content: newMessage.trim(),
      schoolId: userData.schoolId,
      timestamp: new Date().toISOString()
    };

    try {

      const tempMessage = {
        _id: `temp-${Date.now()}`,
        from: { _id: userData.userId, name: 'You' },
        content: newMessage.trim(),
        createdAt: new Date(),
        isOptimistic: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      if (window.socket) {
        window.socket.emit('send-chat-message', messageData);
      } else {
        throw new Error('Socket not connected');
      }
      
    } catch (error) {
      showToast('Failed to send message', 'error');
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
    }
  };

  const handleStartChat = (contact) => {
    setCurrentChat({
      userId: contact._id,
      userName: contact.name,
      userRole: contact.role,
      userAvatar: contact.avatar,
      userEmail: contact.email,
      ...(userRole === 'teacher' && {
        studentName: contact.studentName,
        classroom: contact.classroom
      }),
      ...(userRole === 'student' && {
        classroom: contact.classroom,
        subject: contact.subject
      })
    });
    setActiveView('chat');
  };

  const handleOpenConversation = (conversation) => {
    setCurrentChat({
      userId: conversation.userId,
      userName: conversation.userName,
      userRole: conversation.userRole,
      userAvatar: conversation.userAvatar,
      userEmail: conversation.userEmail,
      ...(userRole === 'teacher' && {
        studentName: conversation.student?.name
      }),
      ...(userRole === 'student' && {
        classroom: conversation.classroom,
        subject: conversation.subject
      })
    });
    setActiveView('chat');
  };

  const handleBackToConversations = () => {
    setActiveView('conversations');
    setCurrentChat(null);
    setMessages([]);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userRole === 'teacher' && contact.studentName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (userRole === 'student' && (
      contact.classroom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  const getAvatar = (role, customAvatar) => {
    if (customAvatar) return customAvatar;
    return role === 'student' ? '👨‍🎓' : 
           role === 'teacher' ? '👨‍🏫' : 
           role === 'parent' ? '👨‍💼' : '👤';
  };

  return (
    <div className="messages-section">
      <div className="messages-header">
        <h2>💬 Messages</h2>
        <div className="messages-actions">
          <button 
            className={`view-btn ${activeView === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveView('conversations')}
          >
            📨 Conversations
          </button>
          <button 
            className={`view-btn ${activeView === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveView('contacts')}
          >
            👥 Contacts
          </button>
        </div>
      </div>

      <div className="messages-content">

        {(activeView === 'conversations' || activeView === 'contacts') && (
          <div className="messages-search">
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        )}

        {activeView === 'conversations' && (
          <div className="conversations-view">
            {loading ? (
              <div className="loading-conversations">
                <div className="spinner"></div>
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3>No Conversations</h3>
                <p>
                  {userRole === 'student' 
                    ? "Your conversations with teachers will appear here!" 
                    : "Start a conversation with a student or parent!"
                  }
                </p>
              </div>
            ) : (
              <div className="conversations-list">
                {filteredConversations.map(conversation => (
                  <div
                    key={conversation.userId}
                    className="conversation-item"
                    onClick={() => handleOpenConversation(conversation)}
                  >
                    <div className="conversation-avatar">
                      {getAvatar(conversation.userRole, conversation.userAvatar)}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <h4>{conversation.userName}</h4>
                        <span className="conversation-time">
                          {new Date(conversation.lastMessageTime).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <p className="last-message">{conversation.lastMessage}</p>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'contacts' && (
          <div className="contacts-view">
            {loading ? (
              <div className="loading-contacts">
                <div className="spinner"></div>
                <p>Loading contacts...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No Contacts</h3>
                <p>No contacts available to message.</p>
              </div>
            ) : (
              <div className="contacts-list">
                {filteredContacts.map(contact => (
                  <div
                    key={contact._id}
                    className="contact-item"
                    onClick={() => handleStartChat(contact)}
                  >
                    <div className="contact-avatar">
                      {getAvatar(contact.role, contact.avatar)}
                    </div>
                    <div className="contact-info">
                      <h4>{contact.name}</h4>
                      
                    </div>
                    <div className="contact-action">
                      <button className="btn btn-primary btn-sm">Message</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'chat' && currentChat && (
          <div className="chat-view">
            <div className="chat-header">
              <button className="back-btn" onClick={handleBackToConversations}>
                ← Back
              </button>
              <div className="chat-user-info">
                <div className="chat-user-avatar">
                  {getAvatar(currentChat.userRole, currentChat.userAvatar)}
                </div>
                <div className="chat-user-details">
                  <h4>{currentChat.userName}</h4>
                  <div className="chat-user-meta">
                  
                    {userRole === 'teacher' && currentChat.studentName && (
                      <span className="student-info">• {currentChat.studentName}</span>
                    )}
                    
                    
                  </div>
                </div>
              </div>
            </div>

            <div className="chat-middle-section">
              <div className="chat-messages">
                {loading ? (
                  <div className="loading-messages">
                    <div className="spinner"></div>
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-chat">
                    <div className="empty-icon">💬</div>
                    <h4>No messages yet</h4>
                    <p>Start the conversation by sending a message!</p>
                  </div>
                ) : (
                  <div className="messages-container">
                    {messages.map(message => (
                      <div
                        key={message._id}
                        className={`message ${message.from._id === getValidatedUserData()?.userId ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <p>{message.content}</p>
                          
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={sendMessage} className="message-input-form">
              <div className="input-group">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="message-input"
                  maxLength={1000}
                />
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesSection;