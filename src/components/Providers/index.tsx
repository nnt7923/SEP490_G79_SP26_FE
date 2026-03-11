import React from 'react'
import useAuthStore from '../../store/useAuthStore'
import { AuthProvider } from '../../hook/useAuth'

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, init } = useAuthStore()
  const [starting, setStarting] = React.useState(true)

  React.useEffect(() => {
    const boot = async () => {
      await init()
      setStarting(false)
    }
    boot()
  }, [init])

  if (starting || loading) {
    return (
      <div className="app-loader">
        <div className="app-loader__content">
          <span className="app-loader__prompt">
            {'>'}_<span className="app-loader__cursor" />
          </span>
          <span className="app-loader__dots">loading</span>
        </div>
      </div>
    )
  }

  return <AuthProvider>{children}</AuthProvider>
}

export default Providers