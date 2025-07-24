import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/Button'

const RegisterPage = () => {
  const [name, setName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [role, setRole] = useState('teacher')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { user, clearError } = useAuth()

  const validateForm = () => {
    if (!name.trim()) {
      setError('名前を入力してください')
      return false
    }

    if (!organizationId.trim()) {
      setError('所属塾のIDを入力してください')
      return false
    }

    if (!role) {
      setError('役割を選択してください')
      return false
    }

    return true
  }

  const handleRegister = async () => {
    if (!user) {
      setError('ログインしていません。再度ログインしてください。')
      return
    }

    setError('')
    setSuccess('')
    clearError()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data: existing, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      if (existing) {
        setError('すでに登録済みです。ダッシュボードに移動します。')
        setTimeout(() => {
          navigate('/students')
        }, 2000)
        return
      }

      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        name: name.trim(),
        organization_id: organizationId.trim(),
        role,
      })

      if (insertError) {
        const errorMessage = getErrorMessage(insertError)
        setError(errorMessage)
        console.error('登録エラー:', insertError)
      } else {
        setSuccess('登録が完了しました！ダッシュボードに移動します。')
        setTimeout(() => {
          navigate('/students')
        }, 2000)
      }
    } catch (error) {
      console.error('登録エラー:', error)
      setError('登録中にエラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'PGRST116':
        return 'すでに登録済みです。'
      case '23505':
        return 'このユーザーIDは既に使用されています。'
      case '23503':
        return '指定された所属塾IDが存在しません。正しいIDを入力してください。'
      default:
        return error.message || '登録に失敗しました。'
    }
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card center-text">
          <h2 className="auth-header error">ログインが必要です</h2>
          <p className="auth-text">ユーザー登録を行うには、まずログインしてください。</p>
          <Button 
            onClick={() => navigate('/login')}
            variant="primary"
            className="auth-button primary"
          >
            ログインページへ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-header">ユーザー登録</h2>
        
        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}
        
        {success && (
          <div className="auth-message success">
            {success}
          </div>
        )}
        
        <div className="auth-form-group">
          <label className="auth-form-label">名前：</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            className="auth-form-input"
          />
        </div>
        
        <div className="auth-form-group">
          <label className="auth-form-label">所属塾のID：</label>
          <input 
            value={organizationId} 
            onChange={(e) => setOrganizationId(e.target.value)}
            placeholder="例: edore-academy-001"
            className="auth-form-input"
          />
        </div>
        
        <div className="auth-form-group last">
          <label className="auth-form-label">役割：</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="auth-form-input auth-form-select"
          >
            <option value="admin">管理者</option>
            <option value="teacher">講師</option>
            <option value="student">生徒</option>
          </select>
        </div>
        
        <Button 
          onClick={handleRegister} 
          disabled={loading}
          loading={loading}
          variant="primary"
          className="auth-button primary"
        >
          登録する
        </Button>
      </div>
    </div>
  )
}

export default RegisterPage