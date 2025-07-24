import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import lineService from '../services/lineService'

const AuthContext = createContext({})

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // 初期値をtrueに変更
  const [error, setError] = useState(null)
  const [userRole, setUserRole] = useState('admin')
  const [organizationId, setOrganizationId] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [isFetchingOrg, setIsFetchingOrg] = useState(false) // 組織情報取得中フラグ

  const clearError = () => setError(null)

  useEffect(() => {
    // 初期認証状態の確認
    const initializeAuth = async () => {
      const startTime = performance.now()
      try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('現在のユーザー:', user?.id)
        setUser(user)
        
        if (user) {
          // 認証は完了したのでloading状態を解除
          setLoading(false)
          // 組織情報の取得は非同期で行う
          fetchUserOrganization(user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('認証初期化エラー:', error)
        setLoading(false)
      }
      const endTime = performance.now()
      console.log(`Auth初期化完了: ${(endTime - startTime).toFixed(2)}ms`)
    }
    
    initializeAuth()

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('認証状態変更:', _event)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // 組織情報の取得は非同期で行うが、loading状態は解除
        setLoading(false)
        fetchUserOrganization(session.user.id)
      } else {
        setOrganizationId(null)
        setUserRole('admin')
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserOrganization = async (userId) => {
    const startTime = performance.now()
    console.log('fetchUserOrganization開始:', userId, 'current organizationId:', organizationId, 'isFetchingOrg:', isFetchingOrg)
    
    // 既に組織情報を取得済み、または取得中の場合はスキップ
    if (organizationId || isFetchingOrg) {
      console.log('組織情報は既に取得済みまたは取得中:', { organizationId, isFetchingOrg })
      return
    }
    
    setIsFetchingOrg(true) // 取得開始
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('ユーザー組織情報取得エラー:', error)
        // エラーの場合でもデフォルト値を設定
        setOrganizationId('11111111-1111-1111-1111-111111111111') // 一時的なフォールバック
        setUserRole('admin')
        setUserProfile(null)
      } else if (data) {
        console.log('組織情報取得成功:', data)
        setOrganizationId(data.organization_id)
        setUserRole(data.role || 'admin')
        setUserProfile(data)
        
        // ログイン通知を送信（LINE IDが設定されている場合）
        if (data.line_user_id && data.line_notification_enabled) {
          const userData = {
            ...data,
            organization_name: data.organization?.name || '組織名未設定'
          }
          lineService.sendLoginNotification(userData).catch(error => {
            console.warn('ログイン通知送信失敗:', error)
          })
        }
      } else {
        console.warn('ユーザー組織情報が見つかりません')
        // データがない場合のフォールバック
        setOrganizationId('11111111-1111-1111-1111-111111111111')
        setUserRole('admin')
        setUserProfile(null)
      }
    } catch (error) {
      console.error('ユーザー組織情報取得エラー (catch):', error)
      // 例外の場合でもフォールバック
      setOrganizationId('11111111-1111-1111-1111-111111111111')
      setUserRole('admin')
    } finally {
      setIsFetchingOrg(false) // 取得完了
      const endTime = performance.now()
      console.log(`組織情報取得完了: ${(endTime - startTime).toFixed(2)}ms`)
    }
  }

  const signOut = async () => {
    console.log('signOut関数が呼ばれました')
    await supabase.auth.signOut()
  }

  const value = {
    user,
    userRole,
    organizationId,
    userProfile,
    loading,
    error,
    signOut,
    clearError
  }

  // デバッグ用：状態の変化をログ出力（重要な変更のみ）
  useEffect(() => {
    console.log('AuthContext状態変更:', {
      user: user?.id,
      organizationId,
      userRole,
      loading
    });
  }, [user, organizationId, userRole, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}