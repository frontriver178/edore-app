import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { validateOrganizationId } from '../utils/validation';

const StudentsContext = createContext({});

export const useStudentsData = () => {
  const context = useContext(StudentsContext);
  if (!context) {
    throw new Error('useStudentsData must be used within StudentsProvider');
  }
  return context;
};

export const StudentsProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { organizationId, user } = useAuth();
  
  // キャッシュ情報をuseRefで管理（依存配列に含めない）
  const cacheRef = useRef({ lastFetchTime: null, hasData: false });
  const CACHE_DURATION = 5 * 60 * 1000;
  
  const fetchStudents = useCallback(async (force = false) => {
    if (!organizationId) return;
    
    // キャッシュが有効で強制更新でない場合はスキップ
    if (!force && cacheRef.current.lastFetchTime && 
        Date.now() - cacheRef.current.lastFetchTime < CACHE_DURATION && 
        cacheRef.current.hasData) {
      console.log('💾 StudentsContext: キャッシュからデータを使用', {
        cacheAge: `${Math.round((Date.now() - cacheRef.current.lastFetchTime) / 1000)}秒前`
      });
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
      
      console.log(`StudentsContext: 生徒データ取得完了: ${(queryEnd - queryStart).toFixed(2)}ms, 件数: ${count}`);

      if (error) throw error;
      
      setStudents(data || []);
      cacheRef.current.lastFetchTime = Date.now();
      cacheRef.current.hasData = (data && data.length >= 0);
    } catch (err) {
      console.error('StudentsContext: 生徒取得エラー:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // 初回データ取得（ユーザーと組織IDが設定されたら即座に取得）
  useEffect(() => {
    if (user && organizationId) {
      console.log('🚀 StudentsContext: ユーザー認証完了、生徒データを取得開始');
      fetchStudents();
    }
  }, [user, organizationId]);

  // データ更新関数
  const refreshStudents = useCallback(() => {
    console.log('StudentsContext: データを強制リフレッシュ');
    return fetchStudents(true);
  }, [fetchStudents]);
  
  // 生徒追加後の更新
  const addStudent = useCallback(async (studentData) => {
    try {
      const { error } = await supabase
        .from('students')
        .insert({
          ...studentData,
          organization_id: organizationId,
          status: 'active'
        });

      if (error) throw error;
      
      // 成功したら即座にリフレッシュ
      await refreshStudents();
      return { success: true };
    } catch (error) {
      console.error('生徒追加エラー:', error);
      return { success: false, error: error.message };
    }
  }, [organizationId, refreshStudents]);
  
  // 生徒更新後の更新
  const updateStudent = useCallback(async (studentId, studentData) => {
    try {
      const { error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', studentId);

      if (error) throw error;
      
      // 成功したら即座にリフレッシュ
      await refreshStudents();
      return { success: true };
    } catch (error) {
      console.error('生徒更新エラー:', error);
      return { success: false, error: error.message };
    }
  }, [refreshStudents]);
  
  // 生徒削除後の更新
  const deleteStudent = useCallback(async (studentId) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'inactive' })
        .eq('id', studentId);

      if (error) throw error;
      
      // 成功したら即座にリフレッシュ
      await refreshStudents();
      return { success: true };
    } catch (error) {
      console.error('生徒削除エラー:', error);
      return { success: false, error: error.message };
    }
  }, [refreshStudents]);

  const value = {
    students,
    loading,
    error,
    refreshStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    isDataReady: !loading && cacheRef.current.hasData // データが準備完了しているか
  };

  return (
    <StudentsContext.Provider value={value}>
      {children}
    </StudentsContext.Provider>
  );
};