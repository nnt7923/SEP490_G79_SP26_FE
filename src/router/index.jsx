import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ROUTER from './ROUTER'
import ROUTER_META from './ROUTER_META'

// Layouts
const LayoutCommon = React.lazy(() => import('../components/Layout'))
const ProtectedRoute = React.lazy(() => import('../components/Authorization/ProtectedRoute'))

// Pages
const Home = React.lazy(() => import('../pages/public/Home'))
const Login = React.lazy(() => import('../pages/public/login'))
const Register = React.lazy(() => import('../pages/public/Register'))
const VerifyOtp = React.lazy(() => import('../pages/public/VerifyOtp'))
const ForgotPassword = React.lazy(() => import('../pages/public/ForgotPassword'))
const ResetPassword = React.lazy(() => import('../pages/public/ResetPassword'))
const StudentDashboard = React.lazy(() => import('../pages/private/Student'))
const Profile = React.lazy(() => import('../pages/private/Student/Profile'))

const router = createBrowserRouter([
  {
    element: <React.Suspense fallback={<div />}> <LayoutCommon /> </React.Suspense>,
    handle: { breadcrumb: ROUTER_META[ROUTER.HOME]?.breadcrumb },
    children: [
      { index: true, path: ROUTER.HOME, element: <Home /> },
      { path: ROUTER.CLASSES, element: <div>Classes</div> },
      { path: ROUTER.PLANS, element: <div>Plans</div> },
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
  {
    element: <ProtectedRoute />, // example private wrapper without role
    children: [
      { path: ROUTER.STUDENT_DASHBOARD, element: <StudentDashboard /> },
      { path: ROUTER.PROFILE, element: <Profile /> },
    ],
  },
])

export default router