import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import lineService from '../services/lineService';

const MyPage = () => {
  const { user, userProfile, organizationId } = useAuth();
  const [organizationInfo, setOrganizationInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lineUserId, setLineUserId] = useState('');
  const [lineDisplayName, setLineDisplayName] = useState('');
  const [lineNotificationEnabled, setLineNotificationEnabled] = useState(true);
  const [lineUpdateLoading, setLineUpdateLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizationData();
    loadLineSettings();
  }, [organizationId, userProfile]);

  const loadLineSettings = () => {
    if (userProfile) {
      setLineUserId(userProfile.line_user_id || '');
      setLineDisplayName(userProfile.line_display_name || '');
      setLineNotificationEnabled(userProfile.line_notification_enabled ?? true);
    }
  };

  const fetchOrganizationData = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // 組織情報を取得
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      
      if (orgError) throw orgError;
      setOrganizationInfo(orgData);
    } catch (error) {
      console.error('組織情報の取得に失敗しました:', error);
      alert('組織情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました');
    }
  };

  const handleLineSettingsUpdate = async () => {
    if (!user?.id) return;

    try {
      setLineUpdateLoading(true);
      
      const updateData = {
        line_user_id: lineUserId.trim() || null,
        line_display_name: lineDisplayName.trim() || null,
        line_notification_enabled: lineNotificationEnabled,
        line_linked_at: lineUserId.trim() ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      alert('LINE設定を更新しました');
      
      // テスト通知を送信（LINE IDが設定されている場合）
      if (lineUserId.trim() && lineNotificationEnabled) {
        const testResult = await lineService.sendMessage(
          lineUserId,
          '🔗 LINE連携が正常に設定されました！\n\nこれからログインやスケジュール通知を受け取れます。'
        );
        
        if (!testResult.success) {
          console.warn('テスト通知の送信に失敗:', testResult.error);
        }
      }
    } catch (error) {
      console.error('LINE設定更新エラー:', error);
      alert('LINE設定の更新に失敗しました: ' + error.message);
    } finally {
      setLineUpdateLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!lineUserId.trim()) {
      alert('LINE User IDを入力してください');
      return;
    }

    try {
      setLineUpdateLoading(true);
      const testMessage = '🧪 これはテスト通知です\n\nLINE連携が正常に動作しています！';
      const result = await lineService.sendMessage(lineUserId, testMessage);
      
      if (result.success) {
        alert('テスト通知を送信しました。LINEを確認してください。');
      } else {
        alert('テスト通知の送信に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('テスト通知エラー:', error);
      alert('テスト通知の送信に失敗しました');
    } finally {
      setLineUpdateLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'teacher':
        return '講師';
      case 'student':
        return '生徒';
      default:
        return role || '不明';
    }
  };

  const getStatusName = (status) => {
    switch (status) {
      case 'active':
        return 'アクティブ';
      case 'inactive':
        return '非アクティブ';
      case 'pending':
        return '承認待ち';
      default:
        return status || '不明';
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="page-header">
        <h1>マイページ</h1>
        <p className="page-description">現在のログイン情報とプロフィール</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ユーザー情報カード */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">ユーザー情報</h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">ユーザーID</label>
                <p className="text-sm text-gray-500 break-all">{user?.id || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">メールアドレス</label>
                <p className="font-medium">{user?.email || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">表示名</label>
                <p className="font-medium">{userProfile?.name || '-'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">役割</label>
                <p className="font-medium">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    userProfile?.role === 'admin' ? 'bg-red-100 text-red-800' :
                    userProfile?.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                    userProfile?.role === 'student' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getRoleName(userProfile?.role)}
                  </span>
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">ステータス</label>
                <p className="font-medium">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    userProfile?.status === 'active' ? 'bg-green-100 text-green-800' :
                    userProfile?.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    userProfile?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStatusName(userProfile?.status)}
                  </span>
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">最終ログイン</label>
                <p className="font-medium">{formatDate(user?.last_sign_in_at)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">アカウント作成日</label>
                <p className="font-medium">{formatDate(user?.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 組織情報カード */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">組織情報</h2>
          </div>
          <div className="card-content">
            {organizationInfo ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">組織名</label>
                  <p className="font-medium">{organizationInfo.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">組織ID</label>
                  <p className="text-sm text-gray-500 break-all">{organizationInfo.id}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">プラン</label>
                  <p className="font-medium">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      organizationInfo.plan === 'premium' ? 'bg-purple-100 text-purple-800' :
                      organizationInfo.plan === 'basic' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {organizationInfo.plan || 'Basic'}
                    </span>
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">組織作成日</label>
                  <p className="font-medium">{formatDate(organizationInfo.created_at)}</p>
                </div>
                
                {organizationInfo.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">説明</label>
                    <p className="font-medium">{organizationInfo.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">組織情報がありません</p>
            )}
          </div>
        </div>

        {/* セッション情報カード */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">セッション情報</h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">認証プロバイダー</label>
                <p className="font-medium">{user?.app_metadata?.provider || 'email'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">セッションID</label>
                <p className="text-sm text-gray-500 break-all">
                  {sessionStorage.getItem('edore_session_id') || '-'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600">メール確認済み</label>
                <p className="font-medium">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    user?.email_confirmed_at ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user?.email_confirmed_at ? '確認済み' : '未確認'}
                  </span>
                </p>
              </div>
              
              {user?.email_confirmed_at && (
                <div>
                  <label className="text-sm font-medium text-gray-600">メール確認日</label>
                  <p className="font-medium">{formatDate(user.email_confirmed_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LINE連携設定 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔗 LINE連携設定</h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  LINE User ID
                </label>
                <input
                  type="text"
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="LINE User ID を入力"
                  className="form-input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  LINEのプロフィールから取得できるユーザーIDを入力してください
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  表示名（任意）
                </label>
                <input
                  type="text"
                  value={lineDisplayName}
                  onChange={(e) => setLineDisplayName(e.target.value)}
                  placeholder="LINEでの表示名"
                  className="form-input w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="lineNotificationEnabled"
                  checked={lineNotificationEnabled}
                  onChange={(e) => setLineNotificationEnabled(e.target.checked)}
                  className="form-checkbox"
                />
                <label 
                  htmlFor="lineNotificationEnabled" 
                  className="text-sm font-medium text-gray-600"
                >
                  LINE通知を受け取る
                </label>
              </div>

              <div className="border-t pt-4 space-y-2">
                <Button
                  onClick={handleLineSettingsUpdate}
                  loading={lineUpdateLoading}
                  disabled={lineUpdateLoading}
                  variant="primary"
                  className="w-full"
                >
                  LINE設定を保存
                </Button>
                
                {lineUserId && (
                  <Button
                    onClick={handleTestNotification}
                    loading={lineUpdateLoading}
                    disabled={lineUpdateLoading}
                    variant="secondary"
                    className="w-full"
                  >
                    テスト通知を送信
                  </Button>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📱 LINE連携の設定方法</h4>
                <ol className="text-xs text-blue-700 space-y-1">
                  <li>1. LINE Developersでボットを作成</li>
                  <li>2. 作成したボットを友達追加</li>
                  <li>3. ボットにメッセージを送信してUser IDを取得</li>
                  <li>4. 上記のフォームにUser IDを入力して保存</li>
                </ol>
              </div>

              <div className="text-xs text-gray-500">
                設定状況: {lineService.getConfigStatus().ready ? '✅ 設定済み' : '❌ 未設定'}
              </div>
            </div>
          </div>
        </div>

        {/* アクション */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">アクション</h2>
          </div>
          <div className="card-content">
            <div className="space-y-3">
              <Button
                onClick={fetchOrganizationData}
                variant="secondary"
                className="w-full"
              >
                情報を更新
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="danger"
                className="w-full"
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .space-y-4 > * + * {
          margin-top: 1rem;
        }
        
        .space-y-3 > * + * {
          margin-top: 0.75rem;
        }
        
        .break-all {
          word-break: break-all;
        }
        
        .grid {
          display: grid;
        }
        
        .grid-cols-1 {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        
        @media (min-width: 1024px) {
          .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        
        .gap-6 {
          gap: 1.5rem;
        }
        
        .inline-block {
          display: inline-block;
        }
        
        .px-2 {
          padding-left: 0.5rem;
          padding-right: 0.5rem;
        }
        
        .py-1 {
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }
        
        .rounded {
          border-radius: 0.25rem;
        }
        
        .text-xs {
          font-size: 0.75rem;
          line-height: 1rem;
        }
        
        .text-sm {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        
        .font-medium {
          font-weight: 500;
        }
        
        .text-gray-500 {
          color: #6B7280;
        }
        
        .text-gray-600 {
          color: #4B5563;
        }
        
        .bg-red-100 { background-color: #FEE2E2; }
        .text-red-800 { color: #991B1B; }
        .bg-blue-100 { background-color: #DBEAFE; }
        .text-blue-800 { color: #1E40AF; }
        .bg-green-100 { background-color: #DCFCE7; }
        .text-green-800 { color: #166534; }
        .bg-yellow-100 { background-color: #FEF3C7; }
        .text-yellow-800 { color: #92400E; }
        .bg-purple-100 { background-color: #F3E8FF; }
        .text-purple-800 { color: #6B21A8; }
        .bg-gray-100 { background-color: #F3F4F6; }
        .text-gray-800 { color: #1F2937; }
      `}</style>
    </div>
  );
};

export default MyPage;