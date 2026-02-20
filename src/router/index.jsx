import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ROUTER from './ROUTER'
import ROUTER_META from './ROUTER_META'

// Layouts
const LayoutCommon = React.lazy(() => import('../components/Layout'))
const ProtectedRoute = React.lazy(() => import('../components/Authorization/ProtectedRoute'))

// Pages
const Home = React.lazy(() => import('../pages/public/Home'))
const Login = React.lazy(() => import('../pages/public/Login'))
const Register = React.lazy(() => import('../pages/public/Register'))
const VerifyOtp = React.lazy(() => import('../pages/public/VerifyOtp'))
const ForgotPassword = React.lazy(() => import('../pages/public/ForgotPassword'))
const ResetPassword = React.lazy(() => import('../pages/public/ResetPassword'))
const StudentDashboard = React.lazy(() => import('../pages/private/Student'))
const Profile = React.lazy(() => import('../pages/private/Student/Profile'))
const AdminDashboard = React.lazy(() => import('../pages/private/Admin'))
const MentorDashboard = React.lazy(() => import('../pages/private/Mentor'))
const AdminApiKey = React.lazy(() => import('../pages/private/Admin/APIKey'))



const router = createBrowserRouter([
  {
    element: <React.Suspense fallback={<div />}> <LayoutCommon /> </React.Suspense>,
    handle: { breadcrumb: ROUTER_META[ROUTER.HOME]?.breadcrumb },
    children: [
      { index: true, path: ROUTER.HOME, element: <Home /> },
      { path: ROUTER.CLASSES, element: <div>Classes</div> },
      { path: ROUTER.ABOUT, element: <div>About Us</div> },
    ],
  },
  {
    element: <React.Suspense fallback={<div />}> <LayoutCommon /> </React.Suspense>,
    children: [
      { path: ROUTER.LOGIN, element: <Login /> },
      { path: ROUTER.REGISTER, element: <Register /> },
      { path: ROUTER.VERIFY_OTP, element: <VerifyOtp /> },
      { path: ROUTER.FORGOT_PASSWORD, element: <ForgotPassword /> },
      { path: ROUTER.RESET_PASSWORD, element: <ResetPassword /> },
    ],
  },
  // General protected routes (any logged-in user)
  {
    element: <React.Suspense fallback={<div />}> <ProtectedRoute /> </React.Suspense>,
    children: [
      { path: ROUTER.STUDENT_DASHBOARD, element: <StudentDashboard /> },
      { path: ROUTER.PROFILE, element: <Profile /> },
      { path: ROUTER.PLANS, element: <React.Suspense fallback={<div />}> {React.createElement(React.lazy(() => import('../pages/private/Plans')))} </React.Suspense> },
      { path: ROUTER.PLANS_RESULT, element: <React.Suspense fallback={<div />}> {React.createElement(React.lazy(() => import('../pages/private/Plans/skeleton')))} </React.Suspense> },
    ],
  },
  // Admin-only routes
  {
    element: <React.Suspense fallback={<div />}> <ProtectedRoute role="Admin" /> </React.Suspense>,
    children: [
      { path: ROUTER.ADMIN_DASHBOARD, element: <AdminDashboard /> },
      { path: ROUTER.ADMIN_API_KEY, element: <AdminApiKey /> },
    ],
  },
  // Mentor-only routes
  {
    element: <React.Suspense fallback={<div />}> <ProtectedRoute role="Mentor" /> </React.Suspense>,
    children: [
      { path: ROUTER.MENTOR_DASHBOARD, element: <MentorDashboard /> },
    ],
  },
])

export default router