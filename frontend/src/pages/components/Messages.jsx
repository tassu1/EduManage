import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { MessageCircle, Users, Search, ArrowLeft, Send } from 'lucide-react';
import axios from 'axios';
import TopBar from '../../components/TopBar';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import EmptyState from '../../components/EmptyState';
import '../../styles/layout.css';
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
      if (!userId || !schoolId || !token) return null;
      return { userId, schoolId, token, role };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (activeView === 'conversations' || activeView === 'contacts') {
      fetchConversations();
      fetchContacts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  useEffect(() => {
    if (currentChat && activeView === 'chat') fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat, activeView]);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const userData = getValidatedUserData();
        if (!userData) return;
        // Reuses the dashboard's existing global socket (window.socket) if
        // one is already open, same as the original — only opens a new
        // connection if none exists yet. Previously called `io(...)`
        // without importing it, which only avoided crashing because
        // window.socket is always already set by the parent dashboard by
        // the time this runs; fixed properly with a real import now.
        if (!window.socket) {
          window.socket = io(API, { auth: { token: userData.token } });
        }
        window.socket.emit('join-user', userData.userId);
      } catch (err) {
        console.error(err);
      }
    };

    initializeSocket();

    const handleNewMessage = (data) => {
      if (currentChat && data.from._id === currentChat.userId) {
        setMessages((prev) => [...prev, { _id: data.id, from: data.from, content: data.content, createdAt: new Date(data.timestamp) }]);
      }
      if (activeView === 'conversations') fetchConversations();
    };

    const handleMessageSent = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isOptimistic && msg.content === data.message?.content
            ? { _id: data.id, from: { _id: getValidatedUserData()?.userId, name: 'You' }, content: data.message.content, createdAt: new Date(data.message.createdAt) }
            : msg
        )
      );
    };

    const handleMessageError = (error) => {
      console.error(error);
      showToast(error.error || 'Failed to send message', 'error');
      setMessages((prev) => prev.filter((msg) => !msg.isOptimistic));
    };

    if (window.socket) {
      window.socket.on('new-chat-message', handleNewMessage);
      window.socket.on('message-sent', handleMessageSent);
      window.socket.on('message-error', handleMessageError);
    }

    return () => {
      if (window.socket) {
        window.socket.off('new-chat-message', handleNewMessage);
        window.socket.off('message-sent', handleMessageSent);
        window.socket.off('message-error', handleMessageError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat, activeView, userRole]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const userData = getValidatedUserData();
      if (!userData) return;
      const response = await axios.get(`${BASE_URL}/conversations`, { headers: { Authorization: `Bearer ${userData.token}` } });
      setConversations(response.data.conversations || []);
    } catch {
      showToast('Failed to load conversations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const userData = getValidatedUserData();
      if (!userData) return;
      const response = await axios.get(`${BASE_URL}/contacts`, { headers: { Authorization: `Bearer ${userData.token}` } });
      setContacts(response.data.contacts || []);
    } catch {
      showToast('Failed to load contacts', 'error');
    }
  };

  const fetchMessages = async () => {
    if (!currentChat) return;
    try {
      setLoading(true);
      const userData = getValidatedUserData();
      if (!userData) return;
      const response = await axios.get(`${BASE_URL}/conversation/${currentChat.userId}`, { headers: { Authorization: `Bearer ${userData.token}` } });
      setMessages(response.data.messages || []);
    } catch {
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
      timestamp: new Date().toISOString(),
    };

    try {
      const tempMessage = { _id: `temp-${Date.now()}`, from: { _id: userData.userId, name: 'You' }, content: newMessage.trim(), createdAt: new Date(), isOptimistic: true };
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage('');

      if (window.socket) {
        window.socket.emit('send-chat-message', messageData);
      } else {
        throw new Error('Socket not connected');
      }
    } catch {
      showToast('Failed to send message', 'error');
      setMessages((prev) => prev.filter((msg) => !msg.isOptimistic));
    }
  };

  const handleStartChat = (contact) => {
    setCurrentChat({
      userId: contact._id,
      userName: contact.name,
      userRole: contact.role,
      userAvatar: contact.avatar,
      userEmail: contact.email,
      ...(userRole === 'teacher' && { studentName: contact.studentName, classroom: contact.classroom }),
      ...(userRole === 'student' && { classroom: contact.classroom, subject: contact.subject }),
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
      ...(userRole === 'teacher' && { studentName: conversation.student?.name }),
      ...(userRole === 'student' && { classroom: conversation.classroom, subject: conversation.subject }),
    });
    setActiveView('chat');
  };

  const handleBackToConversations = () => {
    setActiveView('conversations');
    setCurrentChat(null);
    setMessages([]);
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (userRole === 'teacher' && contact.studentName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (userRole === 'student' && (contact.classroom?.toLowerCase().includes(searchTerm.toLowerCase()) || contact.subject?.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getInitial = (name) => (name || '?').charAt(0).toUpperCase();
  const myUserId = getValidatedUserData()?.userId;

  if (activeView === 'chat' && currentChat) {
    return (
      <div className="em-content em-messages-chat-page">
        <div className="em-messages-chat-header">
          <Button icon={ArrowLeft} onClick={handleBackToConversations}>Back</Button>
          <div className="em-messages-avatar">{getInitial(currentChat.userName)}</div>
          <div>
            <strong style={{ color: 'var(--ink)' }}>{currentChat.userName}</strong>
            {userRole === 'teacher' && currentChat.studentName && (
              <div className="em-field__hint">Re: {currentChat.studentName}</div>
            )}
          </div>
        </div>

        <div className="em-chat-messages" style={{ flex: 1 }}>
          {loading ? (
            <div className="em-loading">Loading messages…</div>
          ) : messages.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No messages yet" description="Start the conversation by sending a message!" />
          ) : (
            messages.map((message) => (
              <div key={message._id} className={`em-chat-bubble ${message.from._id === myUserId ? 'em-chat-bubble--sent' : 'em-chat-bubble--received'}`}>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="em-chat-input-row">
          <input
            className="em-input"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message…"
            maxLength={1000}
          />
          <Button type="submit" variant="primary" icon={Send} disabled={!newMessage.trim()}>Send</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="em-content">
      <TopBar
        title="Messages"
        actions={
          <>
            <Button variant={activeView === 'conversations' ? 'primary' : 'secondary'} icon={MessageCircle} onClick={() => setActiveView('conversations')}>
              Conversations
            </Button>
            <Button variant={activeView === 'contacts' ? 'primary' : 'secondary'} icon={Users} onClick={() => setActiveView('contacts')}>
              Contacts
            </Button>
          </>
        }
      />

      <FormField label="Search">
        <input className="em-input" type="text" placeholder="Search…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </FormField>

      {activeView === 'conversations' && (
        loading ? (
          <div className="em-loading">Loading conversations…</div>
        ) : filteredConversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No Conversations"
            description={userRole === 'student' ? 'Your conversations with teachers will appear here!' : 'Start a conversation with a student or parent!'}
          />
        ) : (
          <div className="em-entity-list">
            {filteredConversations.map((conversation) => (
              <Card key={conversation.userId} className="em-messages-list-item" title={null}>
                <button type="button" className="em-messages-row" onClick={() => handleOpenConversation(conversation)}>
                  <div className="em-messages-avatar">{getInitial(conversation.userName)}</div>
                  <div className="em-messages-row__body">
                    <div className="em-messages-row__top">
                      <strong>{conversation.userName}</strong>
                      <span className="em-field__hint">{new Date(conversation.lastMessageTime).toLocaleDateString()}</span>
                    </div>
                    <p className="em-messages-row__preview">{conversation.lastMessage}</p>
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )
      )}

      {activeView === 'contacts' && (
        loading ? (
          <div className="em-loading">Loading contacts…</div>
        ) : filteredContacts.length === 0 ? (
          <EmptyState icon={Users} title="No Contacts" description="No contacts available to message." />
        ) : (
          <div className="em-entity-list">
            {filteredContacts.map((contact) => (
              <Card key={contact._id} title={null}
                actions={<Button variant="primary" onClick={() => handleStartChat(contact)}>Message</Button>}
              >
                <div className="em-messages-row">
                  <div className="em-messages-avatar">{getInitial(contact.name)}</div>
                  <div>
                    <strong style={{ color: 'var(--ink)' }}>{contact.name}</strong>
                    <div className="em-field__hint">{contact.email}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default MessagesSection;
