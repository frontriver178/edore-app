import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import RegisterPage from './pages/RegisterPage';
import OrganizationSetup from './pages/OrganizationSetup';
import StudentList from './pages/StudentList';
import TeacherManagement from './pages/TeacherManagement';
import StudentInterviews from './pages/StudentInterviews';
import TeachingRecords from './pages/TeachingRecords';
import MockExamResults from './pages/MockExamResults';
import StudentDashboard from './pages/StudentDashboard';
import Tasks from './pages/Tasks';
import InterviewSchedules from './pages/InterviewSchedules';
import TeachingSchedules from './pages/TeachingSchedules';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import './SpreadsheetStyle.css'; // Import the spreadsheet-style stylesheet

const AppContent = () => {
  const location = useLocation();
  const showSidebar = location.pathname !== '/login' && location.pathname !== '/signup';

  return (
    <div className="app-container">
      {showSidebar && (
        <div className="sidebar">
          <Navigation />
        </div>
      )}
      <div className={showSidebar ? "main-content" : "main-content-full"}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Navigate to="/students" replace />} />
                  <Route path="/organization-setup" element={<OrganizationSetup />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/students/:id" element={<StudentDashboard />} />
                  <Route path="/students" element={<StudentList />} />
                  <Route path="/teachers" element={<TeacherManagement />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/interview-schedules" element={<InterviewSchedules />} />
                  <Route path="/student-interviews" element={<StudentInterviews />} />
                  <Route path="/teaching-schedules" element={<TeachingSchedules />} />
                  <Route path="/teaching-records" element={<TeachingRecords />} />
                  <Route path="/mock-exams" element={<MockExamResults />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;

