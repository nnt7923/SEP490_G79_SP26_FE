import React from 'react'
import { useAuth } from '../../../hook/useAuth'

const Home: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="home-page">
      <h1>Welcome</h1>
      {user ? (
        <p>
          Hi, {user.name} ({user.username})
        </p>
      ) : (
        <p>You are not logged in. Please login to access private pages.</p>
      )}
    </div>
  )
}

export default Home
