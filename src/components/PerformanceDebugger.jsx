import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const PerformanceDebugger = () => {
  const [metrics, setMetrics] = useState({
    authTime: null,
    orgIdTime: null,
    queryTime: null,
    totalStudents: null,
    renderTime: null
  });
  const [isVisible, setIsVisible] = useState(false);
  const { organizationId, user } = useAuth();
  const startTime = performance.now();

  useEffect(() => {
    // 組織ID取得時間を計測
    if (organizationId) {
      const orgIdTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, orgIdTime: orgIdTime.toFixed(2) }));
    }
  }, [organizationId]);

  const runPerformanceTest = async () => {
    const testResults = {};
    
    // 1. 生徒データ取得時間を計測
    const queryStart = performance.now();
    try {
      const { data, error, count } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('grade', { ascending: true });
      
      const queryEnd = performance.now();
      testResults.queryTime = (queryEnd - queryStart).toFixed(2);
      testResults.totalStudents = count;
      
      // 2. データサイズを確認
      if (data) {
        const dataSize = new Blob([JSON.stringify(data)]).size;
        testResults.dataSize = (dataSize / 1024).toFixed(2) + ' KB';
      }
    } catch (error) {
      console.error('Performance test error:', error);
    }

    // 3. インデックス存在確認（管理者のみ）
    if (user && organizationId) {
      try {
        const { data: tableInfo } = await supabase
          .rpc('get_table_indexes', { table_name: 'students' });
        testResults.indexes = tableInfo;
      } catch (error) {
        // RPC関数が存在しない場合は無視
      }
    }

    setMetrics(prev => ({ ...prev, ...testResults }));
  };

  // 開発環境でのみ表示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999
    }}>
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔍 Performance
      </button>

      {isVisible && (
        <div style={{
          position: 'absolute',
          bottom: 40,
          right: 0,
          backgroundColor: 'white',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '16px',
          minWidth: '300px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 12px 0' }}>パフォーマンス診断</h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p><strong>認証状態:</strong> {user ? 'ログイン済み' : '未ログイン'}</p>
            <p><strong>組織ID:</strong> {organizationId || '取得中...'}</p>
            <p><strong>組織ID取得時間:</strong> {metrics.orgIdTime ? `${metrics.orgIdTime}ms` : '計測中...'}</p>
            <hr style={{ margin: '8px 0' }} />
            
            {metrics.queryTime && (
              <>
                <p><strong>クエリ実行時間:</strong> {metrics.queryTime}ms</p>
                <p><strong>生徒数:</strong> {metrics.totalStudents}件</p>
                <p><strong>データサイズ:</strong> {metrics.dataSize}</p>
              </>
            )}
            
            <button
              onClick={runPerformanceTest}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              パフォーマンステスト実行
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDebugger;