import React from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import Layout from '@/components/Layout.jsx';

import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';

// Admin Pages — Torres Tech & Yazaki Torres
import DashboardPage          from '@/pages/DashboardPage.jsx';
import TrainingsPage          from '@/pages/TrainingsPage.jsx';
import TrainingDetailPage     from '@/pages/TrainingDetailPage.jsx';
import TraineesPage           from '@/pages/TraineesPage.jsx';
import TraineeDetailPage      from '@/pages/TraineeDetailPage.jsx';
import AttendancePage         from '@/pages/AttendancePage.jsx';
import CompletionPage         from '@/pages/CompletionPage.jsx';
import ReportsPage            from '@/pages/ReportsPage.jsx';
import TrainingAnalyticsPage  from '@/pages/TrainingAnalyticsPage.jsx';
import CalendarPage           from '@/pages/CalendarPage.jsx';
import SettingsPage           from '@/pages/SettingsPage.jsx';

// Senior High Pages
import SHDashboardPage    from '@/pages/senior-high/SHDashboardPage.jsx';
import SHSchoolsPage      from '@/pages/senior-high/SHSchoolsPage.jsx';
import SHBatchesPage      from '@/pages/senior-high/SHBatchesPage.jsx';
import SHBatchDetailPage  from '@/pages/senior-high/SHBatchDetailPage.jsx';
import SHStudentsPage     from '@/pages/senior-high/SHStudentsPage.jsx';
import SHAttendancePage   from '@/pages/senior-high/SHAttendancePage.jsx';
import SHCertificatesPage from '@/pages/senior-high/SHCertificatesPage.jsx';
import SHTrainingsPage    from '@/pages/senior-high/SHTrainingsPage.jsx';
import SHTrainingDetailPage from '@/pages/senior-high/SHTrainingDetailPage.jsx';

// Trainee Pages
import TraineeDashboardPage      from '@/pages/TraineeDashboardPage.jsx';
import MyTrainingsPage           from '@/pages/MyTrainingsPage.jsx';
import TrainingDetailPageTrainee from '@/pages/TrainingDetailPageTrainee.jsx';
import TraineeProfilePage        from '@/pages/TraineeProfilePage.jsx';

// Room Display
import RoomDisplayPage from '@/pages/RoomDisplayPage.jsx';

const TT_YT_COMPANIES = ['torres-tech', 'yazaki-torres'];

const AdminRoute = ({ children }) => (
  <ProtectedRoute requiredRole="admin">
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/room-display" element={<RoomDisplayPage />} />

          {/* ── Redirects for old flat routes → torres-tech by default ── */}
          <Route path="/dashboard"   element={<Navigate to="/torres-tech/dashboard"   replace />} />
          <Route path="/trainees"    element={<Navigate to="/torres-tech/trainees"    replace />} />
          <Route path="/trainees/:id" element={<Navigate to="/torres-tech/trainees"   replace />} />
          <Route path="/attendance"  element={<Navigate to="/torres-tech/attendance"  replace />} />
          <Route path="/analytics"   element={<Navigate to="/torres-tech/analytics"   replace />} />
          <Route path="/completions" element={<Navigate to="/torres-tech/completions" replace />} />
          <Route path="/reports"     element={<Navigate to="/torres-tech/reports"     replace />} />
          <Route path="/calendar"    element={<Navigate to="/torres-tech/calendar"    replace />} />
          <Route path="/settings"    element={<Navigate to="/torres-tech/settings"    replace />} />

          {/* ── Pre-Training — shared, no company prefix ── */}
          <Route path="/pre-training"     element={<AdminRoute><TrainingsPage /></AdminRoute>} />
          <Route path="/pre-training/:id" element={<AdminRoute><TrainingDetailPage /></AdminRoute>} />

          {/* ── Torres Tech + Yazaki Torres routes ── */}
          {TT_YT_COMPANIES.map((company) => (
            <React.Fragment key={company}>
              <Route path={`/${company}/dashboard`}    element={<AdminRoute><DashboardPage /></AdminRoute>} />
              <Route path={`/${company}/trainees`}     element={<AdminRoute><TraineesPage /></AdminRoute>} />
              <Route path={`/${company}/trainees/:id`} element={<AdminRoute><TraineeDetailPage /></AdminRoute>} />
              <Route path={`/${company}/attendance`}   element={<AdminRoute><AttendancePage /></AdminRoute>} />
              <Route path={`/${company}/analytics`}    element={<AdminRoute><TrainingAnalyticsPage /></AdminRoute>} />
              <Route path={`/${company}/completions`}  element={<AdminRoute><CompletionPage /></AdminRoute>} />
              <Route path={`/${company}/reports`}      element={<AdminRoute><ReportsPage /></AdminRoute>} />
              <Route path={`/${company}/calendar`}     element={<AdminRoute><CalendarPage /></AdminRoute>} />
              <Route path={`/${company}/settings`}     element={<AdminRoute><SettingsPage /></AdminRoute>} />
            </React.Fragment>
          ))}

          {/* ── Senior High — completely separate routes ── */}
          <Route path="/senior-high/dashboard"      element={<AdminRoute><SHDashboardPage /></AdminRoute>} />
          <Route path="/senior-high/schools"        element={<AdminRoute><SHSchoolsPage /></AdminRoute>} />
          <Route path="/senior-high/batches"        element={<AdminRoute><SHBatchesPage /></AdminRoute>} />
          <Route path="/senior-high/batches/:id"    element={<AdminRoute><SHBatchDetailPage /></AdminRoute>} />
          <Route path="/senior-high/students"       element={<AdminRoute><SHStudentsPage /></AdminRoute>} />
          <Route path="/senior-high/attendance"     element={<AdminRoute><SHAttendancePage /></AdminRoute>} />
          <Route path="/senior-high/certificates"   element={<AdminRoute><SHCertificatesPage /></AdminRoute>} />
          <Route path="/senior-high/settings"       element={<AdminRoute><SettingsPage /></AdminRoute>} />
          <Route path="/senior-high/pre-training"   element={<AdminRoute><SHTrainingsPage /></AdminRoute>} />
          <Route path="/senior-high/pre-training/:id" element={<AdminRoute><SHTrainingDetailPage /></AdminRoute>} />

          {/* ── Trainee Routes ── */}
          <Route path="/trainee-dashboard" element={<ProtectedRoute requiredRole="trainee"><Layout><TraineeDashboardPage /></Layout></ProtectedRoute>} />
          <Route path="/my-trainings"      element={<ProtectedRoute requiredRole="trainee"><Layout><MyTrainingsPage /></Layout></ProtectedRoute>} />
          <Route path="/my-trainings/:id"  element={<ProtectedRoute requiredRole="trainee"><Layout><TrainingDetailPageTrainee /></Layout></ProtectedRoute>} />
          <Route path="/trainee-profile"   element={<ProtectedRoute requiredRole="trainee"><Layout><TraineeProfilePage /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;