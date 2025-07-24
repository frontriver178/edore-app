import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';

const DataDebugger = () => {
  const [debugData, setDebugData] = useState({
    organizations: [],
    students: [],
    teachingRecords: [],
    interviewRecords: [],
    users: [],
    currentOrgData: {}
  });
  const [loading, setLoading] = useState(false);
  const { organizationId, user } = useAuth();

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      // 組織IDがない場合は処理を停止
      if (!organizationId) {
        console.log('組織IDが設定されていません');
        setLoading(false);
        return;
      }

      // 組織データ
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 生徒データ（現在の組織のみ）
      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // 指導記録（現在の組織のみ）
      const { data: teachingRecords } = await supabase
        .from('teaching_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // 面談記録（現在の組織のみ）
      const { data: interviewRecords } = await supabase
        .from('interview_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // ユーザーデータ（現在の組織のみ）
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);

      // 現在のorganization_idでのデータ件数
      const currentOrgData = {};
      if (organizationId) {
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const { count: teachingCount } = await supabase
          .from('teaching_records')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const { count: interviewCount } = await supabase
          .from('interview_records')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        currentOrgData.studentCount = studentCount;
        currentOrgData.teachingCount = teachingCount;
        currentOrgData.interviewCount = interviewCount;
      }

      setDebugData({
        organizations: orgs || [],
        students: students || [],
        teachingRecords: teachingRecords || [],
        interviewRecords: interviewRecords || [],
        users: users || [],
        currentOrgData
      });

    } catch (error) {
      console.error('デバッグデータ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card mb-6">
      <div className="card-header">
        <h3 className="card-title">🔍 データベースデバッグ情報</h3>
        <Button 
          onClick={fetchDebugData}
          variant="secondary"
          size="sm"
          loading={loading}
        >
          データを更新
        </Button>
      </div>
      <div className="card-content">
        <div className="grid grid-cols-2 gap-6">
          
          {/* 現在の設定 */}
          <div>
            <h4 className="font-semibold mb-2">📊 現在の設定</h4>
            <div className="text-sm space-y-1">
              <div><strong>ユーザーID:</strong> {user?.id || 'なし'}</div>
              <div><strong>組織ID:</strong> {organizationId || 'なし'}</div>
              <div><strong>認証状態:</strong> {user ? 'ログイン中' : '未ログイン'}</div>
            </div>
          </div>

          {/* 現在の組織のデータ件数 */}
          <div>
            <h4 className="font-semibold mb-2">📈 現在の組織のデータ件数</h4>
            <div className="text-sm space-y-1">
              <div><strong>生徒:</strong> {debugData.currentOrgData.studentCount ?? '取得中...'}</div>
              <div><strong>指導記録:</strong> {debugData.currentOrgData.teachingCount ?? '取得中...'}</div>
              <div><strong>面談記録:</strong> {debugData.currentOrgData.interviewCount ?? '取得中...'}</div>
            </div>
          </div>

          {/* 組織一覧 */}
          <div>
            <h4 className="font-semibold mb-2">🏢 組織一覧 (最新5件)</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {debugData.organizations.map(org => (
                <div key={org.id} className="border-b pb-1">
                  <div><strong>{org.name}</strong></div>
                  <div className="text-gray-500">ID: {org.id}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 生徒一覧 */}
          <div>
            <h4 className="font-semibold mb-2">👨‍🎓 生徒一覧 (最新10件)</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {debugData.students.map(student => (
                <div key={student.id} className="border-b pb-1">
                  <div><strong>{student.name}</strong> ({student.grade}年)</div>
                  <div className="text-gray-500">組織: {student.organization_id}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 指導記録 */}
          <div>
            <h4 className="font-semibold mb-2">📚 指導記録 (最新10件)</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {debugData.teachingRecords.map(record => (
                <div key={record.id} className="border-b pb-1">
                  <div><strong>{record.subject}</strong></div>
                  <div className="text-gray-500">
                    {record.lesson_date} | 組織: {record.organization_id}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 面談記録 */}
          <div>
            <h4 className="font-semibold mb-2">💬 面談記録 (最新10件)</h4>
            <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
              {debugData.interviewRecords.map(record => (
                <div key={record.id} className="border-b pb-1">
                  <div><strong>面談</strong></div>
                  <div className="text-gray-500">
                    {record.interview_date} | 組織: {record.organization_id}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 データが表示されない場合の対処法</h4>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. 現在の組織IDと実際のデータの組織IDが一致しているか確認</li>
            <li>2. Supabaseのテーブル名が正しいか確認</li>
            <li>3. RLS（Row Level Security）ポリシーが適切に設定されているか確認</li>
            <li>4. データが実際にSupabaseに存在するか確認</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DataDebugger;