import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

    const api = import.meta.env.VITE_API_URL || 'http://localhost:5000';



  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); 
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const response = await axios.post(`${api}/api/auth/login`, {
      email: formData.email,
      password: formData.password
    });

    const userData = response.data;

    
    if (!userData._id ) {
      throw new Error('Invalid user data received from server');
    }

    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userId', userData._id);
    localStorage.setItem('schoolId', userData.school?userData.school:" ");
    localStorage.setItem('userRole', userData.role);

    if (userData.role === 'teacher') {
      window.location.href = '/teacher/dashboard';
    } else if (userData.role === 'schooladmin') {
      window.location.href = '/schooladmin/dashboard';
    } else if (userData.role === 'superadmin') {
      window.location.href = '/superadmin/dashboard';
    } else if (userData.role === 'student') {
      window.location.href = '/student/dashboard';
    }
     else if (userData.role === 'parent') {
      window.location.href = '/parent/dashboard';
    } else {
      alert(`Welcome ${userData.name}!`);
    }
    
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Login failed. Please try again.';
    setError(message);
    console.error( error);
  } finally {
    setLoading(false);
  }
};
 

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎓 EduManage </h1>
          <p>School Management System</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary login-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>


        <div className="login-footer">
          <p>Contact administrator for account access</p>
        </div>
      </div>
    </div>
  );
};

export default Login;