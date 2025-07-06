import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/Button'

const OrganizationSetup = () => {
  const [loading, setLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuth()

  // 管理者セットアップ用state
  const [setupData, setSetupData] = useState({
    adminCode: '',
    name: '',
  })

  // 初期化時に既存ユーザーかチェック
  useEffect(() => {
    const checkExistingUser = async () => {
      if (!user) {
        setCheckingUser(false)
        return
      }

      try {
        const { data: existingUser, error } = await supabase
          .from('users')
          .select('id, organization_id, name, role')
          .eq('id', user.id)
          .single()

        if (existingUser && !error) {
          // 既存ユーザーの場合は生徒一覧に遷移
          navigate('/students')
          return
        }
      } catch (err) {
        console.log('新規ユーザーです:', err)
      }
      
      setCheckingUser(false)
    }

    checkExistingUser()
  }, [user, navigate])

  // 管理者セットアップ
  const handleAdminSetup = async (e) => {
    e.preventDefault()
    if (!user) {
      alert('ログインが必要です')
      return
    }

    setLoading(true)
    try {
      // 再度既存ユーザーチェック
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (existingUser) {
        navigate('/students')
        return
      }

      // 管理者コード確認
      const { data: invitation, error: inviteError } = await supabase
        .from('invitation_codes')
        .select('organization_id, role, expires_at')
        .eq('code', setupData.adminCode)
        .eq('used', false)
        .eq('role', 'admin') // 管理者コードのみ
        .single()

      if (inviteError || !invitation) {
        alert('管理者コードが見つからないか、既に使用済みです')
        setLoading(false)
        return
      }

      // 有効期限チェック
      if (new Date(invitation.expires_at) < new Date()) {
        alert('管理者コードの有効期限が切れています')
        setLoading(false)
        return
      }

      // 管理者ユーザー登録
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          organization_id: invitation.organization_id,
          role: 'admin',
          name: setupData.name,
          email: user.email
        })

      if (userError) {
        if (userError.code === '23505') {
          navigate('/students')
          return
        }
        alert('ユーザー登録に失敗しました: ' + userError.message)
        return
      }

      // 管理者コードを使用済みにする
      await supabase
        .from('invitation_codes')
        .update({ used: true, used_at: new Date(), used_by: user.id })
        .eq('code', setupData.adminCode)

      alert('管理者として登録が完了しました！')
      navigate('/students')

    } catch (error) {
      console.error('セットアップエラー:', error)
      alert('セットアップ中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>ログインが必要です</div>
  }

  if (checkingUser) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ユーザー情報を確認中...</div>
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      <h2>管理者セットアップ</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        運営チームから提供された管理者コードを入力してください。
      </p>
      
      <form onSubmit={handleAdminSetup} style={{ background: '#f8f8f8', padding: '1.5rem', borderRadius: '4px' }}>
        <h3>🔑 管理者として参加</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label>管理者コード *</label>
          <input 
            type="text"
            value={setupData.adminCode}
            onChange={(e) => setSetupData(prev => ({ ...prev, adminCode: e.target.value.toUpperCase() }))}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '1rem' }}
            placeholder="ADMIN-ABC123"
            required
          />
          <small style={{ color: '#666' }}>※運営チームから提供されたコードを入力してください</small>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>あなたの名前 *</label>
          <input 
            type="text"
            value={setupData.name}
            onChange={(e) => setSetupData(prev => ({ ...prev, name: e.target.value }))}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            required
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          loading={loading}
          variant="primary"
          style={{ width: '100%' }}
        >
          管理者として開始
        </Button>
      </form>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e8f5e8', borderRadius: '4px' }}>
        <h4>✅ セットアップ後にできること</h4>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>講師の追加・管理</li>
          <li>生徒の追加・管理</li>
          <li>面談記録の管理</li>
          <li>成績・教材管理</li>
        </ul>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', borderRadius: '4px' }}>
        <h4>💡 新しい塾の開設について</h4>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          新規塾の開設をご希望の場合は、運営チームまでお問い合わせください。<br/>
          📧 support@edore.example.com
        </p>
      </div>
    </div>
  )
}

export default OrganizationSetup 