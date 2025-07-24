import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StudentsProvider } from './contexts/StudentsContext';
import { AppDataProvider } from './contexts/AppDataContext';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import RegisterPage from './pages/RegisterPage';
import OrganizationSetup from './pages/OrganizationSetup';
import ImprovedOrganizationSetup from './pages/ImprovedOrganizationSetup';
import LineAuthCallback from './pages/LineAuthCallback';
import StudentList from './pages/StudentList';
import TeacherManagement from './pages/TeacherManagement';
import StudentInterviews from './pages/StudentInterviews';
import TeachingRecords from './pages/TeachingRecords';
import MockExamResults from './pages/MockExamResults';
import StudentDashboard from './pages/StudentDashboard';
import Tasks from './pages/Tasks';
import InterviewSchedules from './pages/InterviewSchedules';
import TeachingSchedules from './pages/TeachingSchedules';
import MyPage from './pages/MyPage';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { setupGlobalErrorHandlers } from './utils/globalErrorHandler';
import './SpreadsheetStyle.css'; // Import the spreadsheet-style stylesheet
import './styles/components.css'; // Import unified components styles

const AppContent = () => {
  const location = useLocation();
  const showSidebar = location.pathname !== '/login' && 
                      location.pathname !== '/signup' && 
                      location.pathname !== '/onboarding' &&
                      !location.pathname.startsWith('/auth/');

  return (
    <div className="app-container">
      {showSidebar && <Navigation />}
      <div className={showSidebar ? "main-content" : "main-content-full"}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth/line/callback" element={<LineAuthCallback />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <ImprovedOrganizationSetup />
              </ProtectedRoute>
            }
          />
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
                  <Route path="/mypage" element={<MyPage />} />
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
  // グローバルエラーハンドラーを初期化
  React.useEffect(() => {
    setupGlobalErrorHandlers();
    
    // セッションIDを生成（デバッグ用）
    if (!sessionStorage.getItem('edore_session_id')) {
      sessionStorage.setItem('edore_session_id', Date.now().toString());
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppDataProvider>
          <StudentsProvider>
            <Router>
              <AppContent />
            </Router>
          </StudentsProvider>
        </AppDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

