import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/Button'

const ImprovedOrganizationSetup = () => {
  const [loading, setLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [navigationBlocked, setNavigationBlocked] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  // ステップ1: 参加方法選択
  const [joinMethod, setJoinMethod] = useState('')

  // ステップ2: 招待コード入力
  const [inviteData, setInviteData] = useState({
    code: '',
    name: ''
  })

  // ステップ3: 新規組織申請
  const [applicationData, setApplicationData] = useState({
    applicantName: '',
    organizationName: '',
    organizationDescription: '',
    phone: '',
    address: ''
  })

  // 状態管理
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [debugInfo, setDebugInfo] = useState({
    systemStatus: null,
    invitationDetail: null,
    dbError: null,
    userInfo: null
  })
  const [showDebugPanel, setShowDebugPanel] = useState(false)

  // デバッグ情報取得（完全修正版対応）
  const fetchDebugInfo = async () => {
    try {
      // システム全体状態確認
      const { data: systemData, error: systemError } = await supabase
        .rpc('debug_system_status')
      
      // 招待コード詳細確認
      const { data: detailData, error: detailError } = await supabase
        .rpc('debug_invitation_detail', { p_code: 'ADMIN-DEMO2024' })
      
      // ユーザー情報
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      setDebugInfo({
        systemStatus: systemData,
        invitationDetail: detailData,
        dbError: systemError || detailError,
        userInfo: currentUser
      })
    } catch (err) {
      setDebugInfo(prev => ({ ...prev, dbError: err.message }))
    }
  }

  // 初期化時のユーザーチェック（簡素化版）
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setCheckingUser(false)
        return
      }

      console.log('🔍 オンボーディングページでユーザーチェック開始:', user.email)
      
      try {
        // 既存ユーザーかチェック
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id, organization_id, name, role')
          .eq('id', user.id)
          .single()

        if (existingUser && !userError && existingUser.organization_id) {
          // 既存ユーザーで組織が設定済みの場合のみ生徒一覧に遷移
          console.log('✅ 既存ユーザーで組織設定済み - 生徒一覧へ:', existingUser)
          navigate('/students', { replace: true })
          return
        }
        
        // その他の場合は全てオンボーディング継続
        console.log('🚀 オンボーディング継続 - ステップ1から開始')
        setCurrentStep(1)
        setError('') // エラーをクリア

      } catch (err) {
        console.log('🆕 新規ユーザー - ステップ1から開始:', err.message)
        setCurrentStep(1)
        setError('')
      }
      
      setCheckingUser(false)
    }

    if (user) {
      checkUserStatus()
    }
  }, [user, navigate])

  // 招待コード使用（完全修正版対応）
  const handleInviteCodeSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError('ログインが必要です')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🎫 招待コード使用開始:', {
        code: inviteData.code,
        userId: user.id,
        email: user.email,
        name: inviteData.name
      })

      const { data, error } = await supabase
        .rpc('use_invitation_code', {
          p_code: inviteData.code.toUpperCase(),
          p_user_id: user.id,
          p_user_email: user.email,
          p_user_name: inviteData.name
        })

      console.log('📊 招待コード使用結果:', { data, error })

      if (error) {
        console.error('❌ 招待コード使用エラー:', error)
        setError(`招待コードの使用中にエラーが発生しました: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        const result = data[0]
        console.log('📋 招待コード使用結果詳細:', result)
        
        if (result.success) {
          console.log('🎉 招待コード使用成功!')
          setSuccess(result.message)
          if (!navigationBlocked) {
            setNavigationBlocked(true)
            setTimeout(() => {
              navigate('/students')
            }, 2000)
          }
        } else {
          console.error('❌ 招待コード使用失敗:', result.message)
          setError(result.message || '招待コードの使用に失敗しました')
        }
      } else {
        setError('招待コードの使用結果を取得できませんでした')
      }
    } catch (error) {
      console.error('💥 招待コード使用例外エラー:', error)
      setError(`招待コードの使用中に予期しないエラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 組織申請送信（完全修正版対応）
  const handleApplicationSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError('ログインが必要です')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🏢 組織申請開始:', {
        email: user.email,
        name: applicationData.applicantName,
        orgName: applicationData.organizationName
      })

      const { data, error } = await supabase
        .rpc('submit_organization_application', {
          p_user_id: user.id,
          p_user_email: user.email,
          p_applicant_name: applicationData.applicantName,
          p_organization_name: applicationData.organizationName,
          p_organization_description: applicationData.organizationDescription,
          p_phone: applicationData.phone,
          p_address: applicationData.address
        })

      console.log('📊 組織申請結果:', { data, error })

      if (error) {
        console.error('❌ 組織申請エラー:', error)
        setError(`組織申請の送信中にエラーが発生しました: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        const result = data[0]
        console.log('📋 組織申請結果詳細:', result)
        
        if (result.success) {
          console.log('🎉 組織申請成功!')
          setSuccess(result.message)
          setCurrentStep(4)
        } else {
          console.error('❌ 組織申請失敗:', result.message)
          setError(result.message || '組織申請の送信に失敗しました')
        }
      } else {
        setError('組織申請の結果を取得できませんでした')
      }
    } catch (error) {
      console.error('💥 組織申請例外エラー:', error)
      setError(`組織申請の送信中に予期しないエラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card center-text">
          <p className="auth-text">ログインが必要です</p>
          <Button onClick={() => navigate('/login')} className="auth-button primary">ログインページへ</Button>
        </div>
      </div>
    )
  }

  if (checkingUser) {
    return (
      <div className="auth-container">
        <div className="auth-card center-text">
          <div className="auth-text">ユーザー情報を確認中...</div>
          <div className="auth-footer-text">
            初回ログインの場合、自動的にオンボーディングページに誘導されます
          </div>
        </div>
      </div>
    )
  }

  if (success && currentStep !== 4) {
    return (
      <div className="auth-container">
        <div className="auth-card center-text">
          <h2 className="auth-header success">🎉 セットアップ完了！</h2>
          <p className="auth-text">{success}</p>
          <Button 
            onClick={() => {
              if (!navigationBlocked) {
                setNavigationBlocked(true)
                navigate('/students')
              }
            }}
            variant="primary"
            style={{ width: '100%' }}
          >
            ダッシュボードへ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        
        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1" />
            <h2 className="onboarding-header">Edore へようこそ</h2>
            <div className="flex-1 text-right">
              <Button
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/login')
                }}
                variant="text"
                size="sm"
                className="text-sm text-secondary"
              >
                ログアウト
              </Button>
            </div>
          </div>
          
          <p className="auth-footer-text mb-2">アカウントのセットアップを行います</p>
          
          {/* 現在のユーザー情報 */}
          <div className="debug-panel-state mb-4 text-sm">
            ログイン中: {user?.email}
          </div>
          
          {/* プログレスバー */}
          <div className="onboarding-progress">
            {[1, 2, 3].map((step) => (
              <div className="onboarding-step" key={step}>
                <div
                  className={`onboarding-step-number ${
                    currentStep >= step ? 'active' : 'pending'
                  }`}
                >
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* デバッグパネル */}
        {showDebugPanel && (
          <div className="card debug-card mb-6">
            <div className="card-header">
              <h4 className="card-title">🔧 デバッグ情報（完全修正版）</h4>
            </div>
            <div className="card-content">
              <div className="mb-4">
                <strong>ユーザー情報:</strong>
                <pre className="debug-code-block">
                  {JSON.stringify(debugInfo.userInfo, null, 2)}
                </pre>
              </div>

              <div className="mb-4">
                <strong>システム全体状態:</strong>
                <pre className="debug-code-block">
                  {JSON.stringify(debugInfo.systemStatus, null, 2)}
                </pre>
              </div>

              <div className="mb-4">
                <strong>招待コード詳細:</strong>
                <pre className="debug-code-block">
                  {JSON.stringify(debugInfo.invitationDetail, null, 2)}
                </pre>
              </div>

              {debugInfo.dbError && (
                <div className="mb-4">
                  <strong>データベースエラー:</strong>
                  <pre className="debug-code-block error">
                    {JSON.stringify(debugInfo.dbError, null, 2)}
                  </pre>
                </div>
              )}

              <Button
                onClick={fetchDebugInfo}
                variant="secondary"
                size="sm"
                className="mr-2"
              >
                🔄 更新
              </Button>
              <Button
                onClick={() => setShowDebugPanel(false)}
                variant="secondary"
                size="sm"
              >
                ❌ 閉じる
              </Button>
            </div>
          </div>
        )}

        {/* デバッグパネル開閉ボタン */}
        <div className="center-text mb-4">
          <Button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            variant="text"
            size="sm"
            style={{ marginRight: '0.5rem' }}
          >
            {showDebugPanel ? '🔧 デバッグパネルを閉じる' : '🔧 デバッグパネルを開く（完全修正版）'}
          </Button>
          
          <Button
            onClick={() => {
              console.log('🚨 緊急リセット実行')
              setNavigationBlocked(false)
              setCurrentStep(1)
              setError('')
              setSuccess('')
              window.location.reload()
            }}
            variant="text"
            size="sm"
            style={{ color: '#ff4444' }}
          >
            🚨 緊急リセット
          </Button>
        </div>

        {error && (
          <div className="auth-message error">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {/* ステップ1: 参加方法選択 */}
        {currentStep === 1 && (
          <div className="onboarding-section">
            <h3>参加方法を選択してください</h3>
            <div className="space-y-4">
              <div 
                className={`onboarding-option ${joinMethod === 'invite' ? 'selected' : ''}`}
                onClick={() => setJoinMethod('invite')}
              >
                <div>
                  <div className="onboarding-option-label">🎫 招待コードで参加</div>
                  <div className="onboarding-option-description">
                    既存の塾から招待コードをもらっている場合
                  </div>
                </div>
              </div>
              
              <div 
                className={`onboarding-option ${joinMethod === 'apply' ? 'selected' : ''}`}
                onClick={() => setJoinMethod('apply')}
              >
                <div>
                  <div className="onboarding-option-label">🏢 新しい塾を登録</div>
                  <p className="text-secondary text-sm">
                    新しい塾としてEdoreを利用開始する場合
                  </p>
                </div>
              </div>
            </div>
            
            <div className="auth-form-actions vertical">
              <Button 
                onClick={() => setCurrentStep(joinMethod === 'invite' ? 2 : 3)}
                disabled={!joinMethod}
                variant="primary"
                className="auth-button"
              >
                次へ
              </Button>
              
              <div className="center-text">
                <Button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    navigate('/login')
                  }}
                  variant="text"
                  size="sm"
                  className="text-secondary text-sm"
                >
                  📧 別のアカウントでログイン
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ステップ2: 招待コード入力 */}
        {currentStep === 2 && (
          <div className="onboarding-section">
            <h3>🎫 招待コードで参加</h3>
            <form onSubmit={handleInviteCodeSubmit} className="auth-form">
              <div className="auth-form-group">
                <label className="auth-form-label">招待コード *</label>
                <input 
                  type="text"
                  value={inviteData.code}
                  onChange={(e) => setInviteData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="auth-form-input"
                  style={{ fontFamily: 'monospace', fontSize: '1rem' }}
                  placeholder="ADMIN-DEMO2024"
                  required
                />
                <small className="text-secondary">※塾の管理者から提供されたコードを入力してください</small>
              </div>

              <div className="auth-form-group">
                <label className="auth-form-label">あなたの名前 *</label>
                <input 
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                  className="auth-form-input"
                  required
                />
              </div>

              <div className="auth-form-actions">
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  variant="secondary"
                  className="auth-button secondary"
                >
                  戻る
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  className="auth-button primary flex-2"
                >
                  参加する
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ステップ3: 新規組織申請 */}
        {currentStep === 3 && (
          <div>
            <h3>🏢 新しい塾の登録申請</h3>
            <form onSubmit={handleApplicationSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label>申請者名（あなたの名前）*</label>
                  <input 
                    type="text"
                    value={applicationData.applicantName}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, applicantName: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                    required
                  />
                </div>

                <div>
                  <label>塾名 *</label>
                  <input 
                    type="text"
                    value={applicationData.organizationName}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, organizationName: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                    required
                  />
                </div>

                <div>
                  <label>塾の説明</label>
                  <textarea 
                    value={applicationData.organizationDescription}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, organizationDescription: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', minHeight: '80px' }}
                    placeholder="どのような塾かを簡単にご記入ください"
                  />
                </div>

                <div>
                  <label>電話番号</label>
                  <input 
                    type="tel"
                    value={applicationData.phone}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </div>

                <div>
                  <label>住所</label>
                  <input 
                    type="text"
                    value={applicationData.address}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, address: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  />
                </div>
              </div>

              <div className="auth-form-actions">
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  variant="secondary"
                  className="auth-button secondary"
                >
                  戻る
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  loading={loading}
                  variant="primary"
                  className="auth-button primary flex-2"
                >
                  申請送信
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ステップ4: 申請完了 */}
        {currentStep === 4 && (
          <div className="center-text">
            <h3>📝 申請を受け付けました</h3>
            <p className="text-secondary mb-6">
              申請内容を確認後、運営チームよりご連絡いたします。<br />
              通常1〜2営業日でご返答いたします。
            </p>
            
            <div className="card info-card mb-6">
              <div className="card-header">
                <h4 className="card-title">💡 お急ぎの場合</h4>
              </div>
              <div className="card-content">
                <p className="text-secondary">
                  お急ぎの場合は下記までお問い合わせください：<br/>
                  📧 support@edore.example.com<br/>
                  📞 03-1234-5678
                </p>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/login')}
              variant="primary"
              className="auth-button"
            >
              ログインページに戻る
            </Button>
          </div>
        )}

        {/* フッター */}
        <div className="card info-card mt-6">
          <div className="card-header">
            <h4 className="card-title">✅ セットアップ後にできること</h4>
          </div>
          <div className="card-content">
            <ul className="info-list">
              <li>生徒・講師の管理</li>
              <li>面談記録の作成・管理</li>
              <li>成績・教材管理</li>
              <li>スケジュール管理</li>
            </ul>
            <div className="text-light text-sm mt-4">
              完全修正版 - 外部キー制約エラー解決済み
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImprovedOrganizationSetup 