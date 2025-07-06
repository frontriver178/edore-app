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
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleRegister = async () => {
    if (!user) {
      alert('ログインしていません')
      return
    }

    setLoading(true)

    try {
      const { data: existing, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existing) {
        alert('すでに登録済みです')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase.from('users').insert({
        id: user.id,
        name,
        organization_id: organizationId,
        role,
      })

      if (insertError) {
        alert('登録に失敗しました: ' + insertError.message)
      } else {
        alert('登録成功！')
        navigate('/students')
      }
    } catch (error) {
      console.error('登録エラー:', error)
      alert('登録中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>ログインが必要です</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '400px', margin: '0 auto' }}>
      <h2>ユーザー登録</h2>
      <div style={{ marginBottom: '1rem' }}>
        <label>名前：</label>
        <input 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>所属塾のID：</label>
        <input 
          value={organizationId} 
          onChange={(e) => setOrganizationId(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>役割：</label>
        <select 
          value={role} 
          onChange={(e) => setRole(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
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
        style={{ width: '100%' }}
      >
        登録する
      </Button>
    </div>
  )
}

export default RegisterPage