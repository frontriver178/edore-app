import { useMemo } from 'react';
import { useStudentsData } from '../contexts/StudentsContext';

// 特定の生徒情報を取得するフック
export const useStudent = (studentId) => {
  const { students, loading, error } = useStudentsData();
  
  const student = useMemo(() => {
    return students.find(s => s.id === studentId);
  }, [students, studentId]);
  
  return {
    student,
    loading,
    error,
    isNotFound: !loading && !student && studentId
  };
};