import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import lineAuthService from '../services/lineAuthService';
import FullPageLoader from '../components/FullPageLoader';

const LineAuthCallback = () => {
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('LINEログインを処理中...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // エラーパラメータチェック
      if (error) {
        throw new Error(`LINE認証エラー: ${error}`);
      }

      if (!code || !state) {
        throw new Error('認証パラメータが不正です');
      }

      setMessage('LINE認証情報を取得中...');

      // LINE認証処理
      const lineProfile = await lineAuthService.handleLineLoginCallback(code, state);
      
      setMessage('アカウント情報を確認中...');

      // 既存アカウントの確認または新規作成
      const authResult = await handleLineAccountAuth(lineProfile);

      if (authResult.success) {
        setStatus('success');
        setMessage('ログイン成功！ダッシュボードに移動します...');
        
        // 2秒後にダッシュボードへリダイレクト
        setTimeout(() => {
          if (authResult.user.role === 'student') {
            navigate('/student-dashboard');
          } else {
            navigate('/students');
          }
        }, 2000);
      } else {
        throw new Error(authResult.error || 'アカウント処理でエラーが発生しました');
      }

    } catch (error) {
      console.error('LINE認証コールバックエラー:', error);
      setStatus('error');
      setMessage(error.message || 'ログインに失敗しました');
    }
  };

  const handleLineAccountAuth = async (lineProfile) => {
    try {
      // LINEユーザーIDで既存アカウントを検索
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('line_user_id', lineProfile.userId)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        // PGRST116は「データが見つからない」エラーなので無視
        throw searchError;
      }

      if (existingUser) {
        // 既存ユーザーのログイン
        return await loginExistingUser(existingUser, lineProfile);
      } else {
        // 新規ユーザーの作成（招待コードベース）
        return await createNewLineUser(lineProfile);
      }
    } catch (error) {
      console.error('LINEアカウント認証エラー:', error);
      return { success: false, error: error.message };
    }
  };

  const loginExistingUser = async (user, lineProfile) => {
    try {
      // Supabaseに認証ユーザーとして登録
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'line_auth_bypass' // LINEユーザー用の特別なパスワード
      });

      if (signInError) {
        // 認証ユーザーが存在しない場合は作成
        const tempEmail = `line_${lineProfile.userId}@temp.com`;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: 'line_auth_bypass',
          options: {
            data: {
              line_user_id: lineProfile.userId,
              display_name: lineProfile.displayName
            }
          }
        });

        if (signUpError) throw signUpError;
      }

      // LINEプロフィール情報を更新
      const { error: updateError } = await supabase
        .from('users')
        .update({
          line_display_name: lineProfile.displayName,
          line_notification_enabled: true,
          line_linked_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return {
        success: true,
        user: user,
        isNewUser: false
      };
    } catch (error) {
      console.error('既存ユーザーログインエラー:', error);
      return { success: false, error: error.message };
    }
  };

  const createNewLineUser = async (lineProfile) => {
    try {
      // URLパラメータから招待コードを取得
      const invitationCode = searchParams.get('invitation') || 
                           sessionStorage.getItem('invitation_code');

      if (!invitationCode) {
        throw new Error('招待コードが必要です。管理者にお問い合わせください。');
      }

      // 招待コードの確認
      const { data: invitation, error: invitationError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', invitationCode)
        .eq('status', 'active')
        .single();

      if (invitationError || !invitation) {
        throw new Error('招待コードが無効です');
      }

      // 有効期限チェック
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        throw new Error('招待コードの有効期限が切れています');
      }

      // 使用回数チェック
      if (invitation.max_uses && invitation.used_count >= invitation.max_uses) {
        throw new Error('招待コードの使用回数が上限に達しています');
      }

      // 仮のメールアドレスを生成
      const tempEmail = `line_${lineProfile.userId}@${invitation.organization_id}.temp.com`;

      // Supabase認証ユーザーを作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: 'line_auth_bypass',
        options: {
          data: {
            line_user_id: lineProfile.userId,
            display_name: lineProfile.displayName
          }
        }
      });

      if (authError) throw authError;

      // usersテーブルにレコードを作成
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: tempEmail,
          name: lineProfile.displayName,
          role: invitation.default_role || 'student',
          organization_id: invitation.organization_id,
          status: 'active',
          line_user_id: lineProfile.userId,
          line_display_name: lineProfile.displayName,
          line_notification_enabled: true,
          line_linked_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) throw userError;

      // 学生の場合、studentsテーブルにも追加
      if (invitation.default_role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            id: authData.user.id,
            name: lineProfile.displayName,
            organization_id: invitation.organization_id,
            grade: 1, // デフォルト値
            status: 'active',
            line_user_id: lineProfile.userId,
            line_display_name: lineProfile.displayName,
            line_notification_enabled: true,
            line_linked_at: new Date().toISOString()
          });

        if (studentError) throw studentError;
      }

      // 招待コードの使用回数を更新
      const { error: updateInvitationError } = await supabase
        .from('invitation_codes')
        .update({
          used_count: invitation.used_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (updateInvitationError) {
        console.warn('招待コード更新エラー:', updateInvitationError);
      }

      // セッションストレージから招待コードを削除
      sessionStorage.removeItem('invitation_code');

      return {
        success: true,
        user: newUser,
        isNewUser: true
      };
    } catch (error) {
      console.error('新規LINEユーザー作成エラー:', error);
      return { success: false, error: error.message };
    }
  };

  const handleRetry = () => {
    setStatus('processing');
    setMessage('再試行中...');
    handleCallback();
  };

  const handleGoBack = () => {
    navigate('/login');
  };

  if (status === 'processing') {
    return <FullPageLoader message={message} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {status === 'success' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4">
                <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ログイン成功</h2>
              <p className="text-gray-600">{message}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4">
                <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ログインエラー</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  再試行
                </button>
                <button
                  onClick={handleGoBack}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ログイン画面に戻る
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineAuthCallback;