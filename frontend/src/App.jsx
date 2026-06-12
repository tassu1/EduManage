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
            element={token ? <SuperAdminDashboard /> : <Navigate to='/' replace />}
          />

          <Route
            path='/schooladmin/dashboard'
            element={token ? <SchoolAdmin /> : <Navigate to='/' replace />}
          />

          <Route
            path='/teacher/dashboard'
            element={token ? <TeacherPanel /> : <Navigate to='/' replace />}
          />

          <Route
            path='/student/dashboard'
            element={token ? <StudentPanel /> : <Navigate to='/' replace />}
          />

          <Route
            path='/parent/dashboard'
            element={token ? <ParentPanel /> : <Navigate to='/' replace />}
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