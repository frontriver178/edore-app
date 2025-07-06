import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>読み込み中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute 