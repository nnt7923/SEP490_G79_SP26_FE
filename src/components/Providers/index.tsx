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
    return <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center' }}>Loading...</div>
  }

  return <AuthProvider>{children}</AuthProvider>
}

export default Providers