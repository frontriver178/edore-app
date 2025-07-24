import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const AppDataContext = createContext({});

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const { organizationId, user } = useAuth();
  
  // キャッシュの有効期限（3分）
  const CACHE_DURATION = 3 * 60 * 1000;
  
  const fetchStudents = useCallback(async (force = false) => {
    if (!organizationId) return;
    
    // キャッシュチェック
    if (!force && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION && students.length > 0) {
      return;
    }

    try {
      setStudentsLoading(true);
      const queryStart = performance.now();
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('grade', { ascending: true });
      
      const queryEnd = performance.now();
      
      if (error) throw error;
      
      setStudents(data || []);
    } catch (error) {
      console.error('❌ AppDataContext: 生徒取得エラー:', error);
    } finally {
      setStudentsLoading(false);
    }
  }, [organizationId, lastFetchTime, students.length]);

  const fetchTeachers = useCallback(async (force = false) => {
    if (!organizationId) return;
    
    try {
      setTeachersLoading(true);
      const queryStart = performance.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['admin', 'teacher'])
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });
      
      const queryEnd = performance.now();
      
      if (error) throw error;
      
      setTeachers(data || []);
    } catch (error) {
      console.error('❌ AppDataContext: 講師取得エラー:', error);
    } finally {
      setTeachersLoading(false);
    }
  }, [organizationId]);

  const fetchAllData = useCallback(async (force = false) => {
    if (!organizationId || !user) return;
    
    await Promise.all([
      fetchStudents(force),
      fetchTeachers(force)
    ]);
    
    setLastFetchTime(Date.now());
  }, [organizationId, user, fetchStudents, fetchTeachers]);

  // 初回データ取得
  useEffect(() => {
    if (user && organizationId) {
      fetchAllData();
    }
  }, [user, organizationId, fetchAllData]);

  // 全体のローディング状態を管理
  useEffect(() => {
    setLoading(studentsLoading || teachersLoading);
  }, [studentsLoading, teachersLoading]);

  const value = {
    students,
    teachers,
    loading,
    studentsLoading,
    teachersLoading,
    refreshData: () => fetchAllData(true),
    refreshStudents: () => fetchStudents(true),
    refreshTeachers: () => fetchTeachers(true),
    isDataReady: !loading && students.length >= 0 && teachers.length >= 0
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};