import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import ScrollToTop from '@/components/ScrollToTop.jsx';
import Layout from '@/components/Layout.jsx';

import HomePage from '@/pages/HomePage.jsx';
import LoginPage from '@/pages/LoginPage.jsx';

// Admin Pages
import DashboardPage from '@/pages/DashboardPage.jsx';
import TrainingsPage from '@/pages/TrainingsPage.jsx';
import TrainingDetailPage from '@/pages/TrainingDetailPage.jsx';
import TraineesPage from '@/pages/TraineesPage.jsx';
import TraineeDetailPage from '@/pages/TraineeDetailPage.jsx';
import AttendancePage from '@/pages/AttendancePage.jsx';
import CompletionPage from '@/pages/CompletionPage.jsx';
import ReportsPage from '@/pages/ReportsPage.jsx';
import TrainingAnalyticsPage from '@/pages/TrainingAnalyticsPage.jsx';
import CalendarPage from '@/pages/CalendarPage.jsx';

// Trainee Pages
import TraineeDashboardPage from '@/pages/TraineeDashboardPage.jsx';
import MyTrainingsPage from '@/pages/MyTrainingsPage.jsx';
import TrainingDetailPageTrainee from '@/pages/TrainingDetailPageTrainee.jsx';
import TraineeProfilePage from '@/pages/TraineeProfilePage.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Admin Routes */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute requiredRole="admin"><Layout><DashboardPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/trainings" 
            element={<ProtectedRoute requiredRole="admin"><Layout><TrainingsPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/trainings/:id" 
            element={<ProtectedRoute requiredRole="admin"><Layout><TrainingDetailPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/trainees" 
            element={<ProtectedRoute requiredRole="admin"><Layout><TraineesPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/trainees/:id" 
            element={<ProtectedRoute requiredRole="admin"><Layout><TraineeDetailPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/attendance" 
            element={<ProtectedRoute requiredRole="admin"><Layout><AttendancePage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/analytics" 
            element={<ProtectedRoute requiredRole="admin"><Layout><TrainingAnalyticsPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/completions" 
            element={<ProtectedRoute requiredRole="admin"><Layout><CompletionPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/reports" 
            element={<ProtectedRoute requiredRole="admin"><Layout><ReportsPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/calendar" 
            element={<ProtectedRoute requiredRole="admin"><Layout><CalendarPage /></Layout></ProtectedRoute>} 
          />
          
          {/* Trainee Routes */}
          <Route 
            path="/trainee-dashboard" 
            element={<ProtectedRoute requiredRole="trainee"><Layout><TraineeDashboardPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/my-trainings" 
            element={<ProtectedRoute requiredRole="trainee"><Layout><MyTrainingsPage /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/my-trainings/:id" 
            element={<ProtectedRoute requiredRole="trainee"><Layout><TrainingDetailPageTrainee /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/trainee-profile" 
            element={<ProtectedRoute requiredRole="trainee"><Layout><TraineeProfilePage /></Layout></ProtectedRoute>} 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;