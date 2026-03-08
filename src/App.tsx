import React from 'react'
import { RouterProvider } from 'react-router-dom'
import Providers from './components/Providers'
import GlobalNotifications from './components/GlobalNotifications'
import router from './router'

function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <GlobalNotifications />
    </Providers>
  )
}

export default App
