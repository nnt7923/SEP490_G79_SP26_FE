import React from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ROUTER from './ROUTER'
import ROUTER_META from './ROUTER_META'
import { lazy, Suspense } from 'react'

// Layouts
const LayoutCommon = lazy(() => import('../components/Layout'))
const ProtectedRoute = lazy(() => import('../components/Authorization/ProtectedRoute'))
const ForbidRole = lazy(() => import('../components/Authorization/ForbidRole'))

// Pages
const Home = lazy(() => import('../pages/public/Home'))
const Login = lazy(() => import('../pages/public/Login'))
const Register = lazy(() => import('../pages/public/Register'))
const VerifyOtp = lazy(() => import('../pages/public/VerifyOtp'))
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/public/ResetPassword'))
const StudentDashboard = lazy(() => import('../pages/private/Student'))
const MyPlans = lazy(() => import('../pages/private/Student/MyPlans'))
const MyPlansDetail = lazy(() => import('../pages/private/Student/MyPlans/Detail'))
const Goals = lazy(() => import('../pages/private/Student/Goals'))
const GoalsDetail = lazy(() => import('../pages/private/Student/Goals/Detail'))
const Profile = lazy(() => import('../pages/private/Account/Profile'))
const ChangePassword = lazy(() => import('../pages/private/Account/ChangePassword'))
const MyResources = lazy(() => import('../pages/private/MyResources'))
const AdminDashboard = lazy(() => import('../pages/private/Admin'))
const MentorDashboard = lazy(() => import('../pages/private/Mentor'))
const AdminApiKey = lazy(() => import('../pages/private/Admin/APIKey'))
const AdminUsers = lazy(() => import('../pages/private/Admin/Users'))
const Plans = lazy(() => import('../pages/private/Plans'))
const PlansResult = lazy(() => import('../pages/private/Plans/skeleton'))

const Fallback = () => <div />

const router = createBrowserRouter([
  {
    element: (
      <Suspense fallback={<Fallback />}>
        <LayoutCommon />
      </Suspense>
    ),
    handle: { breadcrumb: ROUTER_META[ROUTER.HOME]?.breadcrumb },
    children: [
      { index: true, path: ROUTER.HOME, element: <Home /> },
      { path: ROUTER.CLASSES, element: <div>Classes</div> },
      { path: ROUTER.ABOUT, element: <div>About Us</div> },
    ],
  },
  {
    element: (
      <Suspense fallback={<Fallback />}>
        <LayoutCommon />
      </Suspense>
    ),
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
    element: (
      <Suspense fallback={<Fallback />}>
        <ProtectedRoute />
      </Suspense>
    ),
    children: [
      { path: ROUTER.STUDENT_DASHBOARD, element: <StudentDashboard /> },
      { path: ROUTER.MY_PLANS, element: <MyPlans /> },
      { path: '/my-plans/:pathId', element: <MyPlansDetail /> },
      { path: ROUTER.GOALS, element: <Goals /> },
      { path: '/goals/:goalId', element: <GoalsDetail /> },
      { path: ROUTER.PROFILE, element: <Profile /> },
      { path: ROUTER.CHANGE_PASSWORD, element: <ChangePassword /> },
      { path: ROUTER.MY_RESOURCES, element: <MyResources /> },
      {
        element: (
          <Suspense fallback={<Fallback />}>
            <ForbidRole forbid="Admin" />
          </Suspense>
        ),
        children: [
          { path: ROUTER.PROFILE, element: <Profile /> },
          { path: ROUTER.PLANS, element: <Plans /> },
          { path: ROUTER.PLANS_RESULT, element: <PlansResult /> },
        ],
      },
      { path: ROUTER.CHANGE_PASSWORD, element: <ChangePassword /> },
    ],
  },
  // Admin-only routes
  {
    element: (
      <Suspense fallback={<Fallback />}>
        <ProtectedRoute role="Admin" />
      </Suspense>
    ),
    children: [
      { path: ROUTER.ADMIN_DASHBOARD, element: <AdminDashboard /> },
      { path: ROUTER.ADMIN_API_KEY, element: <AdminApiKey /> },
      { path: ROUTER.ADMIN_USERS, element: <AdminUsers /> },
    ],
  },
  // Mentor-only routes
  {
    element: (
      <Suspense fallback={<Fallback />}>
        <ProtectedRoute role="Mentor" />
      </Suspense>
    ),
    children: [
      { path: ROUTER.MENTOR_DASHBOARD, element: <MentorDashboard /> },
      { path: ROUTER.MENTOR_PROFILE, element: <Profile /> },
    ],
  },
])

export default router