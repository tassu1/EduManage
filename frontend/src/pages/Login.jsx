import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import FormField from '../components/FormField';
import '../styles/layout.css';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/auth/login', { email: formData.email, password: formData.password });
      const userData = response.data;

      if (!userData._id) {
        throw new Error('Invalid user data received from server');
      }

      localStorage.setItem('token', userData.token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData._id);
      localStorage.setItem('schoolId', userData.school ? userData.school : ' ');
      localStorage.setItem('userRole', userData.role);

      if (userData.role === 'teacher') {
        window.location.href = '/teacher/dashboard';
      } else if (userData.role === 'schooladmin') {
        window.location.href = '/schooladmin/dashboard';
      } else if (userData.role === 'superadmin') {
        window.location.href = '/superadmin/dashboard';
      } else if (userData.role === 'student') {
        window.location.href = '/student/dashboard';
      } else if (userData.role === 'parent') {
        window.location.href = '/parent/dashboard';
      } else {
        // Preserved exactly: roles with no dashboard (e.g. 'staff') fall
        // through to this alert rather than a route. Flagged separately
        // as the known 'staff' login gap — not something to invent a
        // destination for here.
        alert(`Welcome ${userData.name}!`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="em-login-page">
      <Card className="em-login-card">
        <div className="em-login-header">
          <div className="em-login-badge"><GraduationCap size={26} strokeWidth={2} /></div>
          <h1>EduManage</h1>
          <p>School Management System</p>
        </div>

        {error && <p className="em-field__error em-login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <FormField label="Email Address" htmlFor="email">
            <input
              className="em-input"
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </FormField>

          <FormField label="Password" htmlFor="password">
            <input
              className="em-input"
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </FormField>

          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            Sign In
          </Button>
        </form>

        <p className="em-login-footer">Contact administrator for account access</p>
      </Card>
    </div>
  );
};

export default Login;
