import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { validateOrganizationId } from '../utils/validation';

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { organizationId } = useAuth();
  
  // データ取得フラグ（重複取得を防ぐ）
  const [hasFetched, setHasFetched] = useState(false);
  
  const fetchStudents = useCallback(async (force = false) => {
    // 強制リフレッシュでない場合、既に取得済みならスキップ
    if (!force && hasFetched) {
      console.log('useStudents: データは既に取得済みです。スキップします。');
      return;
    }
    
    const validation = validateOrganizationId(organizationId);
    if (!validation.isValid) {
      console.error('組織ID検証エラー:', validation.message);
      setError(validation.message);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const queryStart = performance.now();
      const { data, error, count } = await supabase
        .from('students')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('grade', { ascending: true });
      const queryEnd = performance.now();
      
      console.log(`useStudents: Supabase生徒データ取得完了: ${(queryEnd - queryStart).toFixed(2)}ms`);

      if (error) throw error;
      
      console.log(`useStudents: 取得した生徒数: ${count}`);
      setStudents(data || []);
      setHasFetched(true);
    } catch (err) {
      console.error('useStudents: 生徒取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, hasFetched]);

  // 初回データ取得
  useEffect(() => {
    if (organizationId && !hasFetched) {
      console.log('useStudents: 初回データ取得を開始します。組織ID:', organizationId);
      fetchStudents();
    }
  }, [organizationId, fetchStudents, hasFetched]);

  // データ更新後の再取得
  const refreshStudents = useCallback(() => {
    console.log('useStudents: データを強制リフレッシュします');
    setHasFetched(false);
    fetchStudents(true);
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    refreshStudents,
    fetchStudents: () => fetchStudents(true) // 外部から呼び出す場合は強制リフレッシュ
  };
};