import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe } from '../../shared/api/auth'
import { isAxiosError } from 'axios'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated' | 'error'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    let cancelled = false
    async function checkAuth() {
      if (!localStorage.getItem('token')) {
        setStatus('unauthenticated')
        return
      }
      try {
        await getMe()
        if (cancelled) return

        setStatus('authenticated')
      } catch (error) {
        if (cancelled) return
        if (isAxiosError(error) && error.response?.status === 401) {
          localStorage.removeItem('token')
          setStatus('unauthenticated')
        } else {
          setStatus('error')
        }
      }
    }
    checkAuth()

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return <p>Проверяем вход...</p>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (status === 'error') {
    return <p>Не удалось проверить вход</p>
  }

  return children
}
export default ProtectedRoute
