import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// 役割ベースのアクセス制御コンポーネント
const RoleBasedAccess = ({ allowedRoles, children, fallback = null }) => {
  const { user } = useAuth()
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userData && !error) {
          setUserRole(userData.role)
        }
      } catch (err) {
        console.error('ユーザー役割の取得に失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user || !userRole) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600">このページにアクセスする権限がありません。</p>
        </div>
      </div>
    )
  }

  if (allowedRoles.includes(userRole)) {
    return children
  }

  return fallback || (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限が不足しています</h2>
        <p className="text-gray-600">管理者権限が必要です。</p>
      </div>
    </div>
  )
}

// 管理者のみアクセス可能
export const AdminOnly = ({ children, fallback = null }) => (
  <RoleBasedAccess allowedRoles={['admin']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
)

// 講師・管理者のみアクセス可能
export const TeacherAndAdminOnly = ({ children, fallback = null }) => (
  <RoleBasedAccess allowedRoles={['teacher', 'admin']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
)

// 生徒以外（講師・管理者）のみアクセス可能
export const StaffOnly = ({ children, fallback = null }) => (
  <RoleBasedAccess allowedRoles={['teacher', 'admin']} fallback={fallback}>
    {children}
  </RoleBasedAccess>
)

export default RoleBasedAccess 