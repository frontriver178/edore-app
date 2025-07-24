import React, { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';
import { supabase } from '../supabaseClient';
import './forms.css';

const TaskFormModal = ({ 
  isOpen, 
  onClose, 
  task,
  organizationId,
  onTaskSaved
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    student_id: '',
    teacher_id: '',
    due_date: '',
    priority: 'medium',
    estimated_hours: 1,
    status: 'pending'
  });
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  // デバッグ用関数
  const debugDatabaseConnection = useCallback(async () => {
    try {
      console.log('🔍 データベース接続テスト開始');
      
      // 1. 組織データの確認
      console.log('📊 組織データ確認中...');
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .limit(5);
      
      console.log('📊 組織データ:', { data: orgData, error: orgError });
      
      // 2. 生徒データの確認
      console.log('👥 生徒データ確認中...');
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .limit(5);
      
      console.log('👥 生徒データ:', { data: studentData, error: studentError });
      
      // 3. 講師データの確認
      console.log('👨‍🏫 講師データ確認中...');
      const { data: teacherData, error: teacherError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .limit(5);
      
      console.log('👨‍🏫 講師データ:', { data: teacherData, error: teacherError });
      
      // 4. 特定の組織IDでのフィルタリング
      console.log('🎯 特定組織でのフィルタリング:', { organizationId });
      const { data: filteredStudents, error: filteredError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('organization_id', organizationId)
        .order('name');
      
      console.log('🎯 フィルタリング結果:', { data: filteredStudents, error: filteredError });
      
    } catch (error) {
      console.error('❌ データベーステストエラー:', error);
    }
  }, [organizationId]);

  // データを取得する関数をuseCallbackで定義
  const fetchData = useCallback(async () => {
    try {
      console.log('🚀 データ取得開始:', { organizationId });
      
      // デバッグ用関数を実行
      await debugDatabaseConnection();
      
      // 生徒一覧を取得
      console.log('👥 生徒一覧取得中...');
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('organization_id', organizationId)
        .order('name');

      if (studentsError) {
        console.error('❌ 生徒データ取得エラー:', studentsError);
        throw studentsError;
      }

      // 講師一覧を取得
      console.log('👨‍🏫 講師一覧取得中...');
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('role', 'teacher')
        .order('name');

      if (teachersError) {
        console.error('❌ 講師データ取得エラー:', teachersError);
        throw teachersError;
      }

      console.log('✅ 取得したデータ:', {
        students: studentsData,
        teachers: teachersData
      });

      setStudents(studentsData || []);
      setTeachers(teachersData || []);

      // 成功メッセージ
      console.log('🎉 データ取得成功!', {
        studentsCount: studentsData?.length || 0,
        teachersCount: teachersData?.length || 0
      });

    } catch (error) {
      console.error('❌ データ取得エラー:', error);
      alert('データの取得に失敗しました。コンソールを確認してください。');
    }
  }, [organizationId, debugDatabaseConnection]);

  // タスクデータが変更されたときフォームを更新
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        student_id: task.student_id || '',
        teacher_id: task.teacher_id || '',
        due_date: task.due_date || '',
        priority: task.priority || 'medium',
        estimated_hours: task.estimated_hours || 1,
        status: task.status || 'pending'
      });
    } else {
      // 新規作成時は初期値にリセット
      setFormData({
        title: '',
        description: '',
        student_id: '',
        teacher_id: '',
        due_date: '',
        priority: 'medium',
        estimated_hours: 1,
        status: 'pending'
      });
    }
  }, [task]);

  // データを取得
  useEffect(() => {
    if (isOpen && organizationId) {
      fetchData();
    }
  }, [isOpen, organizationId, fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData = {
        ...formData,
        organization_id: organizationId,
        // 空文字列をnullに変換
        teacher_id: formData.teacher_id || null,
        category_id: null // カテゴリは使用しない
      };

      if (task) {
        // 更新
        await taskService.updateTask(task.id, taskData);
      } else {
        // 新規作成
        await taskService.createTask(taskData);
      }

      alert(task ? 'タスクを更新しました' : 'タスクを作成しました');
      onTaskSaved();
      onClose();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            {task ? 'タスク編集' : 'タスク新規作成'}
          </h2>
          <button 
            className="modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit} className={loading ? 'form-loading' : ''}>
            <div className="form-group">
              <label className="form-label required">タスク名</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="form-input"
                placeholder="例：数学の宿題、英語の復習"
              />
            </div>

            <div className="form-group">
              <label className="form-label">詳細説明</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="form-textarea"
                rows="3"
                placeholder="タスクの詳細や注意事項があれば入力"
              />
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label required">担当生徒</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => handleChange('student_id', e.target.value)}
                  required
                  className="form-select"
                >
                  <option value="">生徒を選択</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.grade}年生)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">担当講師</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => handleChange('teacher_id', e.target.value)}
                  className="form-select"
                >
                  <option value="">講師を選択（任意）</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label required">期限</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">優先度</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="form-select"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">予想時間（時間）</label>
              <input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => handleChange('estimated_hours', parseFloat(e.target.value) || 1)}
                className="form-input"
                min="0.5"
                max="20"
                step="0.5"
              />
              <div className="form-help">
                このタスクにかかる予想時間を入力してください
              </div>
            </div>

            {task && (
              <div className="form-group">
                <label className="form-label">ステータス</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="form-select"
                >
                  <option value="pending">未着手</option>
                  <option value="in_progress">作業中</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
            )}

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                キャンセル
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '保存中...' : (task ? '更新' : '作成')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal; 