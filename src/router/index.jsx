
import { createBrowserRouter, Navigate } from 'react-router-dom'
import ROUTER from './ROUTER'
import ROUTER_META from './ROUTER_META'
import React, { Suspense } from 'react'
import PageSkeleton from '../components/PageSkeleton'

// Layouts
const LayoutCommon = React.lazy(() => import('../components/Layout'))
const ProtectedRoute = React.lazy(() => import('../components/Authorization/ProtectedRoute'))
const ForbidRole = React.lazy(() => import('../components/Authorization/ForbidRole'))
const RequireRole = React.lazy(() => import('../components/Authorization/RequireRole'))
const GuestRoute = React.lazy(() => import('../components/Authorization/GuestRoute'))

// Pages
const Home = React.lazy(() => import('../pages/public/Home'))
const About = React.lazy(() => import('../pages/public/About'))
const Login = React.lazy(() => import('../pages/public/Login'))
const Register = React.lazy(() => import('../pages/public/Register'))
const VerifyOtp = React.lazy(() => import('../pages/public/VerifyOtp'))
const ForgotPassword = React.lazy(() => import('../pages/public/ForgotPassword'))
const ResetPassword = React.lazy(() => import('../pages/public/ResetPassword'))
const StudentDashboard = React.lazy(() => import('../pages/private/Student'))
const MyPlans = React.lazy(() => import('../pages/private/Student/MyPlans'))
const MyPlansDetail = React.lazy(() => import('../pages/private/Student/MyPlans/Detail'))
const Goals = React.lazy(() => import('../pages/private/Student/Goals'))
const Profile = React.lazy(() => import('../pages/private/Account/Profile'))
const ChangePassword = React.lazy(() => import('../pages/private/Account/ChangePassword'))
const MyResources = React.lazy(() => import('../pages/private/MyResources'))
const NotificationsPage = React.lazy(() => import('../pages/private/Notifications'))
const AdminDashboard = React.lazy(() => import('../pages/private/Admin'))
const MentorDashboard = React.lazy(() => import('../pages/private/Mentor'))
const AdminApiKey = React.lazy(() => import('../pages/private/Admin/APIKey'))
const AdminSubscriptionPlans = React.lazy(() => import('../pages/private/Admin/SubscriptionPlans'))
const AdminBillingTransactions = React.lazy(() => import('../pages/private/Admin/Billing'))
const AdminAIUsageSpending = React.lazy(() => import('../pages/private/Admin/AIUsageSpending'))
const AdminMentorAIUsage = React.lazy(() => import('../pages/private/Admin/MentorAIUsage'))
const AdminUsers = React.lazy(() => import('../pages/private/Admin/Users'))
const AdminAuditLogs = React.lazy(() => import('../pages/private/Admin/AuditLogs'))
const AdminSystemRuntimePolicy = React.lazy(() => import('../pages/private/Admin/SystemRuntimePolicy'))
const Plans = React.lazy(() => import('../pages/private/Plans'))
const PlansResult = React.lazy(() => import('../pages/private/Plans/skeleton'))
const MentorSubjects = React.lazy(() => import('../pages/private/Mentor/Subjects'))
const MentorClasses = React.lazy(() => import('../pages/private/Mentor/Classes'))
const MentorStudents = React.lazy(() => import('../pages/private/Mentor/Students'))
const MentorAIPlans = React.lazy(() => import('../pages/private/Mentor/AIPlans'))
const MentorAIPlanDetail = React.lazy(() => import('../pages/private/Mentor/AIPlans/Detail'))
const MentorDrafts = React.lazy(() => import('../pages/private/Mentor/Drafts'))
const MentorDraftCreate = React.lazy(() => import('../pages/private/Mentor/Drafts/Create'))
const MentorDraftDetail = React.lazy(() => import('../pages/private/Mentor/Drafts/Detail'))
const LessonDetail = React.lazy(() => import('../pages/private/Plans/LessonDetail'))
const Quiz = React.lazy(() => import('../pages/private/Quiz'))
const TaskPage = React.lazy(() => import('../pages/private/Task'))
const StudentOverview = React.lazy(() => import('../pages/private/Student/Overview'))
const StudentAchievements = React.lazy(() => import('../pages/private/Student/Achievements'))
const FocusSession = React.lazy(() => import('../pages/private/FocusSession'))
const FocusSessionHistory = React.lazy(() => import('../pages/private/FocusSession/History'))
const StudentChatPage = React.lazy(() => import('../pages/private/Student/Chat'))
const StudentSharePreviewPage = React.lazy(() => import('../pages/private/Student/Chat/SharePreview'))
const StudentShareUpdatesPage = React.lazy(() => import('../pages/private/Student/Chat/ShareUpdates'))
const MentorChatPage = React.lazy(() => import('../pages/private/Mentor/Chat')) 
const StudentChannelChatPage = React.lazy(() => import('../pages/private/Student/ChannelChat'))
const MentorChannelChatPage = React.lazy(() => import('../pages/private/Mentor/ChannelChat'))
const SubscriptionPage = React.lazy(() => import('../pages/private/Subscription'))
const CurrentSubscriptionPage = React.lazy(() => import('../pages/private/Subscription/CurrentSubscription'))
const SubscriptionPaymentSuccessPage = React.lazy(() => import('../pages/private/Subscription/PaymentSuccess'))
const SubscriptionTransactionHistoryPage = React.lazy(() => import('../pages/private/Subscription/TransactionHistory'))

const Fallback = () => <PageSkeleton />

const router = createBrowserRouter([
  {
    element: <Suspense fallback={<PageSkeleton />}> <LayoutCommon /> </Suspense>,
    handle: { breadcrumb: ROUTER_META[ROUTER.HOME]?.breadcrumb },
    children: [
      { index: true, path: ROUTER.HOME, element: <Home /> },
      { path: ROUTER.CLASSES, element: <div>Classes</div> },
      { path: ROUTER.ABOUT, element: <About /> },
    ],
  },
  {
    element: <Suspense fallback={<PageSkeleton />}> <GuestRoute /> </Suspense>,
    children: [
      {
        element: <Suspense fallback={<PageSkeleton />}> <LayoutCommon /> </Suspense>,
        children: [
      { path: ROUTER.LOGIN, element: <Login /> },
      { path: ROUTER.REGISTER, element: <Register /> },
      { path: ROUTER.VERIFY_OTP, element: <VerifyOtp /> },
      { path: ROUTER.FORGOT_PASSWORD, element: <ForgotPassword /> },
      { path: ROUTER.RESET_PASSWORD, element: <ResetPassword /> },
        ],
      },
    ],
  },
  // General protected routes (any logged-in user)
  {
    element: <Suspense fallback={<PageSkeleton />}> <ProtectedRoute /> </Suspense>,
    children: [
      // Student-only routes
      {
        element: <Suspense fallback={<PageSkeleton />}> <RequireRole role="Student" /> </Suspense>,
        children: [
          { path: ROUTER.STUDENT_DASHBOARD, element: <StudentDashboard /> },
          { path: ROUTER.STUDENT_OVERVIEW, element: <Navigate to={ROUTER.STUDENT_DASHBOARD} replace /> },
          { path: '/student', element: <Navigate to={ROUTER.STUDENT_DASHBOARD} replace /> },
          { path: ROUTER.MY_PLANS, element: <MyPlans /> },
          { path: '/my-plans/detail', element: <MyPlansDetail /> },
          { path: ROUTER.GOALS, element: <Goals /> },
          { path: ROUTER.STUDENT_ACHIEVEMENTS, element: <StudentAchievements /> },
          { path: ROUTER.MY_RESOURCES, element: <MyResources /> },
          { path: ROUTER.NOTIFICATIONS, element: <NotificationsPage /> },
          { path: ROUTER.PLANS, element: <Plans /> },
          { path: ROUTER.PLANS_RESULT, element: <PlansResult /> },
          { path: '/lesson/:lessonId', element: <LessonDetail /> },
          { path: '/quiz/:quizId', element: <Quiz /> },
          { path: '/task/:taskId', element: <TaskPage /> },
          { path: ROUTER.FOCUS_SESSION, element: <FocusSession /> },
          { path: ROUTER.FOCUS_SESSION_HISTORY, element: <FocusSessionHistory /> },
          { path: ROUTER.CHAT, element: <StudentChatPage /> },
          { path: ROUTER.CHAT_SHARE_PREVIEW, element: <StudentSharePreviewPage /> },
          { path: ROUTER.LEARNING_PATH_SHARE_UPDATES, element: <StudentShareUpdatesPage /> },
          { path: ROUTER.CHANNEL_CHAT, element: <StudentChannelChatPage /> },
          { path: ROUTER.SUBSCRIPTION, element: <SubscriptionPage /> },
          { path: ROUTER.SUBSCRIPTION_CURRENT, element: <CurrentSubscriptionPage /> },
          { path: ROUTER.BILLING_RESULT, element: <SubscriptionPaymentSuccessPage /> },
          { path: ROUTER.BILLING_HISTORY, element: <SubscriptionTransactionHistoryPage /> },
          { path: ROUTER.SUBSCRIPTION_SUCCESS, element: <SubscriptionPaymentSuccessPage /> },
        ],
      },
      // Shared routes (Student & Mentor)
      {
        element: <Suspense fallback={<PageSkeleton />}> <ForbidRole forbid="Admin" /> </Suspense>,
        children: [
          { path: ROUTER.PROFILE, element: <Profile /> },
          { path: ROUTER.CHANGE_PASSWORD, element: <ChangePassword /> },
        ],
      },
    ],
  },
  // Admin-only routes
  {
    element: <Suspense fallback={<PageSkeleton />}> <ProtectedRoute role="Admin" /> </Suspense>,
    children: [
      { path: ROUTER.ADMIN_DASHBOARD, element: <AdminDashboard /> },
      { path: ROUTER.ADMIN_API_KEY, element: <AdminApiKey /> },
      { path: ROUTER.ADMIN_SUBSCRIPTION_PLANS, element: <AdminSubscriptionPlans /> },
      { path: ROUTER.ADMIN_BILLING_TRANSACTIONS, element: <AdminBillingTransactions /> },
      { path: ROUTER.ADMIN_AI_SPENDING, element: <AdminAIUsageSpending /> },
      { path: ROUTER.ADMIN_MENTOR_AI_USAGE, element: <AdminMentorAIUsage /> },
      { path: ROUTER.ADMIN_USERS, element: <AdminUsers /> },
      { path: ROUTER.ADMIN_AUDIT_LOGS, element: <AdminAuditLogs /> },
      { path: ROUTER.ADMIN_SYSTEM_RUNTIME_POLICY, element: <AdminSystemRuntimePolicy /> },
      { path: ROUTER.CHANGE_PASSWORD, element: <ChangePassword /> },
    ],
  },
  // Mentor-only routes
  {
    element: <Suspense fallback={<PageSkeleton />}> <ProtectedRoute role="Mentor" /> </Suspense>,
    children: [
      { path: ROUTER.MENTOR_DASHBOARD, element: <MentorDashboard /> },
      { path: '/mentor/subjects', element: <MentorSubjects /> },
      { path: '/mentor/classes', element: <MentorClasses /> },
      { path: '/mentor/students', element: <MentorStudents /> },
      { path: ROUTER.MENTOR_AI_PLANS, element: <MentorAIPlans /> },
      { path: ROUTER.MENTOR_AI_PLAN_DETAIL, element: <MentorAIPlanDetail /> },
      { path: ROUTER.MENTOR_DRAFTS, element: <MentorDrafts /> },
      { path: ROUTER.MENTOR_DRAFT_CREATE, element: <MentorDraftCreate /> },
      { path: ROUTER.MENTOR_DRAFT_DETAIL, element: <MentorDraftDetail /> },
      { path: ROUTER.MENTOR_PROFILE, element: <Profile /> },
      { path: ROUTER.MENTOR_CHAT, element: <MentorChatPage /> },
      { path: ROUTER.MENTOR_CHANNEL_CHAT, element: <MentorChannelChatPage /> },
    ],
  },
])

export default router
