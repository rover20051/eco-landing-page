import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/react'

import AuthPage from './pages/AuthPage'
import PendingApproval from './pages/PendingApproval'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardHome from './pages/student/DashboardHome'
import ModulesGrid from './pages/student/ModulesGrid'
import LessonView from './pages/student/lesson/LessonView'
import StudentApp from './pages/StudentApp'

// Admin Panel Imports
import AdminApp from './pages/admin/AdminApp'
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManager from './pages/admin/UserManager'
import ApproveUsers from './pages/admin/ApproveUsers'
import AttendanceManager from './pages/admin/AttendanceManager'
import CourseManager from './pages/admin/CourseManager'
import AssignmentGrader from './pages/admin/AssignmentGrader'

function HomeRedirect() {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  return isSignedIn ? <Navigate to="/dashboard" replace /> : <AuthPage />
}

export default function App() {
  return (
    <Routes>
      {/* RUTAS PÚBLICAS */}
      <Route path="/" element={<HomeRedirect />} />
      {/* Shown to users who are logged in but pending approval */}
      <Route path="/pending-approval" element={<PendingApproval />} />

      {/* RUTAS PRIVADAS (Estudiante) */}
      <Route
        path="/dashboard"
        element={<ProtectedRoute />}
      >
        <Route element={<StudentApp />}>
          <Route index element={<DashboardHome />} />
          <Route path="modules" element={<ModulesGrid />} />
          <Route path="modules/:lessonId" element={<LessonView />} />
          <Route path="achievements" element={<div>Página de Logros (En construcción)</div>} />
          <Route path="notifications" element={<div>Notificaciones (En construcción)</div>} />
        </Route>
      </Route>

      {/* RUTAS PRIVADAS (Admin) */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRole="admin" />}
      >
        <Route element={<AdminApp />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ApproveUsers />} />
          <Route path="user-manager" element={<UserManager />} />
          <Route path="modules" element={<CourseManager />} />
          <Route path="assignments" element={<AssignmentGrader />} />
          <Route path="assignments/:assignmentId" element={<AssignmentGrader />} />
          <Route path="attendance" element={<AttendanceManager />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
