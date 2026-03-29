import React, { Suspense } from 'react'
import { RouterProvider } from 'react-router-dom'
import Providers from './components/Providers'
import GlobalNotifications from './components/GlobalNotifications'
import NotificationBootstrap from './components/Notifications/NotificationBootstrap'
import router from './router'

function App() {
  return (
    <Providers>
      <NotificationBootstrap />
      <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center">Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <GlobalNotifications />
    </Providers>
  )
}

export default App
