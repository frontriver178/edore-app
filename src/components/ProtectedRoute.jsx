import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('ProtectedRoute状態:', { 
    user: user?.id, 
    loading, 
    pathname: location.pathname 
  });

  // ユーザーが存在しない場合のみ、loading状態を考慮
  if (!user) {
    if (loading) {
      console.log('ProtectedRoute: 認証情報を確認中...');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-600">認証情報を確認中...</p>
          </div>
        </div>
      );
    }
    
    console.log('ProtectedRoute: ユーザーが未認証、ログインページへリダイレクト');
    return <Navigate to="/login" replace />
  }

  // ユーザーが存在する場合は、loading状態に関係なく表示
  // /onboarding パスの場合は、認証されていればそのまま表示
  if (location.pathname === '/onboarding') {
    console.log('ProtectedRoute: onboardingページを表示');
    return children
  }

  console.log('ProtectedRoute: 認証済み、コンテンツを表示');
  return children
}

export default ProtectedRoute 