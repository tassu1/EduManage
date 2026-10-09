import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import SchoolAdmin from './pages/schooladmin/Dashboard'; 
import TeacherPanel from './pages/teacher/Dashboard';
import StudentPanel from './pages/student/Dashboard';
import ParentPanel from './pages/parent/Dashboard';

function App() {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  // Verified role strings, straight from backend/models/User.js's enum:
  // "superadmin", "schooladmin", "teacher", "student", "parent" (+ "staff",
  // which has no dashboard route yet — out of scope for this pass).
  // Each protected route now requires BOTH a token AND a matching role,
  // instead of just a token. A logged-in user hitting a route that isn't
  // theirs is redirected to '/', same as an unauthenticated user — no new
  // redirect target, no change to backend calls or auth behavior.

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route
            path='/'
            element={token ? <Navigate to={`/${userRole}/dashboard`} replace /> : <Login />}
          />

          <Route
            path='/superadmin/dashboard'
            element={token && userRole === 'superadmin' ? <SuperAdminDashboard /> : <Navigate to='/' replace />}
          />

          <Route
            path='/schooladmin/dashboard'
            element={token && userRole === 'schooladmin' ? <SchoolAdmin /> : <Navigate to='/' replace />}
          />

          <Route
            path='/teacher/dashboard'
            element={token && userRole === 'teacher' ? <TeacherPanel /> : <Navigate to='/' replace />}
          />

          <Route
            path='/student/dashboard'
            element={token && userRole === 'student' ? <StudentPanel /> : <Navigate to='/' replace />}
          />

          <Route
            path='/parent/dashboard'
            element={token && userRole === 'parent' ? <ParentPanel /> : <Navigate to='/' replace />}
          />
          <Route
            path='*'
            element={<Navigate to='/' replace />}
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;