import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SupabaseTestConnection = () => {
  const [status, setStatus] = useState({
    connected: false,
    tables: {},
    auth: false,
    user: null,
    error: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    try {
      // 1. 基本的な接続テスト
      const { data, error: connectionError } = await supabase
        .from('organizations')
        .select('count')
        .limit(1);
      
      if (connectionError && connectionError.code === '42P01') {
        // テーブルが存在しない場合
        setStatus(prev => ({
          ...prev,
          connected: true,
          error: 'データベーステーブルが作成されていません'
        }));
        setLoading(false);
        return;
      }

      // 2. 各テーブルの存在確認
      const tables = {
        organizations: false,
        users: false,
        students: false,
        student_interviews: false,
        teaching_records: false,
        mock_exam_results: false,
        invitation_codes: false
      };

      for (const tableName of Object.keys(tables)) {
        try {
          await supabase.from(tableName).select('count').limit(1);
          tables[tableName] = true;
        } catch (error) {
          console.warn(`テーブル ${tableName} が見つかりません:`, error);
        }
      }

      // 3. 認証状態確認
      const { data: { user } } = await supabase.auth.getUser();

      setStatus({
        connected: true,
        tables,
        auth: !!user,
        user,
        error: null
      });

    } catch (error) {
      console.error('接続テストエラー:', error);
      setStatus({
        connected: false,
        tables: {},
        auth: false,
        user: null,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    try {
      // サンプル組織の作成
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: 'テスト塾',
            email: 'test@example.com',
            phone: '03-1234-5678',
            address: '東京都新宿区1-1-1'
          }
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      // サンプル生徒の作成
      const { error: studentError } = await supabase
        .from('students')
        .insert([
          {
            organization_id: org.id,
            name: 'テスト太郎',
            grade: 3,
            target_school: 'テスト高校',
            parent_name: 'テスト保護者',
            parent_phone: '090-1234-5678'
          }
        ]);

      if (studentError) throw studentError;

      alert('サンプルデータを作成しました！');
      testConnection(); // 再テスト
    } catch (error) {
      alert('サンプルデータの作成に失敗しました: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-700">Supabase接続をテスト中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 接続状況 */}
      <div className={`p-4 rounded-lg ${status.connected ? 'bg-green-50' : 'bg-red-50'}`}>
        <h3 className={`text-lg font-semibold ${status.connected ? 'text-green-700' : 'text-red-700'}`}>
          🔗 Supabase接続状況
        </h3>
        <p className={status.connected ? 'text-green-600' : 'text-red-600'}>
          {status.connected ? '✅ 接続成功' : '❌ 接続失敗'}
        </p>
        {status.error && (
          <p className="text-red-600 text-sm mt-2">エラー: {status.error}</p>
        )}
      </div>

      {/* テーブル状況 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">📊 データベーステーブル状況</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(status.tables).map(([tableName, exists]) => (
            <div key={tableName} className="flex items-center space-x-2">
              <span className={exists ? 'text-green-600' : 'text-red-600'}>
                {exists ? '✅' : '❌'}
              </span>
              <span className="text-sm">{tableName}</span>
            </div>
          ))}
        </div>
        
        {Object.values(status.tables).some(exists => !exists) && (
          <div className="mt-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-400">
            <p className="text-yellow-800 text-sm">
              ⚠️ 一部のテーブルが見つかりません。SQLファイルを実行してデータベースを初期化してください。
            </p>
          </div>
        )}
      </div>

      {/* 認証状況 */}
      <div className={`p-4 rounded-lg ${status.auth ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <h3 className={`text-lg font-semibold ${status.auth ? 'text-green-700' : 'text-yellow-700'}`}>
          🔐 認証状況
        </h3>
        <p className={status.auth ? 'text-green-600' : 'text-yellow-600'}>
          {status.auth ? '✅ ログイン済み' : '⏳ 未ログイン'}
        </p>
        {status.user && (
          <p className="text-sm text-gray-600 mt-1">
            ユーザー: {status.user.email}
          </p>
        )}
      </div>

      {/* アクション */}
      <div className="space-y-2">
        <button
          onClick={testConnection}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
        >
          🔄 接続を再テスト
        </button>
        
        {status.connected && Object.values(status.tables).every(exists => exists) && (
          <button
            onClick={createSampleData}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg"
          >
            📝 サンプルデータを作成
          </button>
        )}
      </div>
    </div>
  );
};

export default SupabaseTestConnection; 