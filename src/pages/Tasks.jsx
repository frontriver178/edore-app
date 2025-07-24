import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { taskService } from '../services/taskService';
import { supabase } from '../supabaseClient';
import TaskFormModal from '../components/TaskFormModal';
import { useAuth } from '../contexts/AuthContext';
import '../SpreadsheetStyle.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const { organizationId } = useAuth();
  const [searchParams] = useSearchParams();
  const preSelectedStudentId = searchParams.get('student');

  // モーダル関連のstate
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);


  // 選択された生徒の情報を取得
  useEffect(() => {
    const fetchSelectedStudent = async () => {
      if (preSelectedStudentId && organizationId) {
        try {
          const { data: studentData, error } = await supabase
            .from('students')
            .select('id, name, grade')
            .eq('id', preSelectedStudentId)
            .eq('organization_id', organizationId)
            .single();
          
          if (error) throw error;
          if (studentData) {
            setSelectedStudent(studentData);
          }
        } catch (error) {
          console.error('生徒情報取得エラー:', error);
        }
      }
    };

    fetchSelectedStudent();
  }, [preSelectedStudentId, organizationId]);

  const loadData = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      setLoading(true);
      let tasksData;
      
      if (preSelectedStudentId) {
        // 特定の生徒のタスクのみ取得
        tasksData = await taskService.getTasksByStudent(preSelectedStudentId);
      } else {
        // 組織の全タスクを取得
        tasksData = await taskService.getTasksByOrganization(organizationId);
      }
      
      const [, statsData] = await Promise.all([
        taskService.getTaskCategories(organizationId),
        preSelectedStudentId ? 
          taskService.getTaskStatsByStudent(preSelectedStudentId) :
          taskService.getTaskStats(organizationId)
      ]);
      
      setTasks(tasksData);
      setStats(statsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, preSelectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      loadData();
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      alert('ステータス更新に失敗しました');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('このタスクを削除しますか？')) {
      try {
        await taskService.deleteTask(taskId);
        loadData();
      } catch (error) {
        console.error('タスク削除エラー:', error);
        alert('タスク削除に失敗しました');
      }
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleCloseModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleTaskSaved = () => {
    loadData();
  };

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'overdue':
        const today = new Date().toISOString().split('T')[0];
        return tasks.filter(task => 
          task.status === 'pending' && task.due_date < today
        );
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'in_progress':
        return tasks.filter(task => task.status === 'in_progress');
      default:
        return tasks;
    }
  };

  // const getStatusText = (status) => {
  //   switch (status) {
  //     case 'pending': return '未着手';
  //     case 'in_progress': return '作業中';
  //     case 'completed': return '完了';
  //     case 'cancelled': return 'キャンセル';
  //     default: return status;
  //   }
  // };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="main-content">
      <div className="toolbar">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            {selectedStudent && (
              <Link 
                to={`/students/${selectedStudent.id}`} 
                className="text-green"
              >
                ← {selectedStudent.name}さんのダッシュボードに戻る
              </Link>
            )}
            <h1>
              {selectedStudent 
                ? `${selectedStudent.name}さんのタスク` 
                : 'タスク管理'}
            </h1>
          </div>
          <div className="toolbar-actions">
            <button 
              className="btn btn-primary"
              onClick={handleNewTask}
            >
              新規タスク作成
            </button>
          </div>
        </div>
      </div>

      <div className="content-area">
        {/* 統計サマリー */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="stats-card">
            <div className="stats-card-value">{stats.total || 0}</div>
            <div className="stats-card-label">総タスク数</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{stats.pending || 0}</div>
            <div className="stats-card-label">未着手</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{stats.in_progress || 0}</div>
            <div className="stats-card-label">作業中</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{stats.completed || 0}</div>
            <div className="stats-card-label">完了</div>
          </div>
        </div>

        {/* フィルターバー */}
        <div className="flex gap-2 mb-4">
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            すべて ({tasks.length})
          </button>
          <button 
            className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('pending')}
          >
            未着手 ({stats.pending || 0})
          </button>
          <button 
            className={`btn ${filter === 'in_progress' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('in_progress')}
          >
            作業中 ({stats.in_progress || 0})
          </button>
          <button 
            className={`btn ${filter === 'overdue' ? 'btn-error' : 'btn-secondary'}`}
            onClick={() => setFilter('overdue')}
          >
            期限切れ ({stats.overdue || 0})
          </button>
          <button 
            className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => setFilter('completed')}
          >
            完了 ({stats.completed || 0})
          </button>
        </div>

        {/* 期限切れ警告 */}
        {stats.overdue > 0 && filter !== 'overdue' && (
          <div className="card mb-4" style={{ backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
            <div className="card-content">
              <div className="flex items-center justify-between">
                <span>期限切れのタスクが {stats.overdue} 件あります</span>
                <button 
                  className="btn btn-sm btn-error"
                  onClick={() => setFilter('overdue')}
                >
                  確認する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* タスクテーブル */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              {filter === 'all' ? 'すべてのタスク' : 
               filter === 'pending' ? '未着手のタスク' :
               filter === 'in_progress' ? '作業中のタスク' :
               filter === 'overdue' ? '期限切れのタスク' :
               filter === 'completed' ? '完了したタスク' : 'タスク'}
               ({getFilteredTasks().length}件)
            </h2>
          </div>
          <div className="card-content">
            {getFilteredTasks().length === 0 ? (
              <p className="text-light text-center py-8">
                {filter === 'all' ? 'タスクがありません' : 
                 filter === 'pending' ? '未着手のタスクはありません' :
                 filter === 'in_progress' ? '作業中のタスクはありません' :
                 filter === 'overdue' ? '期限切れのタスクはありません' :
                 filter === 'completed' ? '完了したタスクはありません' : 'タスクがありません'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>タスク名</th>
                      <th>担当生徒</th>
                      <th>講師</th>
                      <th>カテゴリ</th>
                      <th>期限</th>
                      <th>ステータス</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTasks().map(task => {
                      const isOverdue = task.status === 'pending' && 
                        new Date(task.due_date) < new Date();
                      
                      return (
                        <tr key={task.id}>
                          <td className="content-column">
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-secondary mt-1">{task.description}</div>
                            )}
                            {task.feedback && (
                              <div className="text-sm text-green mt-1">
                                フィードバック: {task.feedback}
                              </div>
                            )}
                          </td>
                          
                          <td className="student-column">
                            <div className="font-medium">{task.students?.name || '-'}</div>
                            {task.students?.grade && (
                              <div className="text-sm text-secondary">{task.students.grade}年生</div>
                            )}
                          </td>
                          
                          <td className="teacher-column">{task.users?.name || '-'}</td>
                          
                          <td>
                            {task.task_categories?.name ? (
                              <span 
                                className="btn btn-sm"
                                style={{ 
                                  backgroundColor: task.task_categories.color || '#6b7280',
                                  color: 'white',
                                  border: 'none'
                                }}
                              >
                                {task.task_categories.name}
                              </span>
                            ) : (
                              <span className="text-light">-</span>
                            )}
                          </td>
                          
                          <td className={`date-column ${isOverdue ? 'text-error' : ''}`}>
                            {new Date(task.due_date).toLocaleDateString()}
                            {isOverdue && (
                              <div className="text-sm text-error font-medium">期限切れ</div>
                            )}
                          </td>
                          
                          <td>
                            <select 
                              value={task.status} 
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="form-select"
                            >
                              <option value="pending">未着手</option>
                              <option value="in_progress">作業中</option>
                              <option value="completed">完了</option>
                              <option value="cancelled">キャンセル</option>
                            </select>
                          </td>
                          
                          <td className="actions-column">
                            <div className="flex gap-2">
                              <button 
                                className="btn-text text-green"
                                onClick={() => handleEditTask(task)}
                              >
                                編集
                              </button>
                              <button 
                                className="btn-text text-error"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* タスクフォームモーダル */}
      <TaskFormModal
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        task={editingTask}
        organizationId={organizationId}
        onTaskSaved={handleTaskSaved}
      />
    </div>
  );
};

export default Tasks; 