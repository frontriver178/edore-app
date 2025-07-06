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
    return null
  }

  if (!user || !userRole) {
    return fallback
  }

  if (allowedRoles.includes(userRole)) {
    return children
  }

  return fallback || null
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