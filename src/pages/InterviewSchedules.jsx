import React, { useState, useEffect, useCallback } from 'react';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import BulkScheduleModal from '../components/BulkScheduleModal';
import '../SpreadsheetStyle.css';

const InterviewSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completingSchedule, setCompletingSchedule] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // 仮の組織ID（実際はAuthContextから取得）
  const organizationId = '11111111-1111-1111-1111-111111111111';

  const [formData, setFormData] = useState({
    student_id: '',
    teacher_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 30,
    interview_type: 'regular',
    purpose: ''
  });

  const [interviewFormData, setInterviewFormData] = useState({
    content: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [schedulesData, studentsData, teachersData, statsData] = await Promise.all([
        scheduleService.getSchedulesByOrganization(organizationId),
        getStudents(),
        getTeachers(),
        scheduleService.getScheduleStats(organizationId)
      ]);
      
      setSchedules(schedulesData);
      setStudents(studentsData);
      setTeachers(teachersData);
      setStats(statsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const getStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, name, grade')
      .eq('status', 'active')
      .eq('organization_id', organizationId)
      .order('grade', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const getTeachers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .in('role', ['admin', 'teacher'])
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const scheduleData = {
        organization_id: organizationId,
        student_id: formData.student_id,
        teacher_id: formData.teacher_id,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        duration_minutes: parseInt(formData.duration_minutes),
        interview_type: formData.interview_type,
        location: '教室',
        purpose: formData.purpose,
        status: 'scheduled',
        reminder_sent: false
      };

      if (editingSchedule) {
        await scheduleService.updateSchedule(editingSchedule.id, scheduleData);
        alert('面談スケジュールを更新しました');
      } else {
        await scheduleService.createSchedule(scheduleData);
        alert('面談スケジュールを作成しました');
      }

      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleStatusChange = async (scheduleId, newStatus) => {
    try {
      await scheduleService.updateScheduleStatus(scheduleId, newStatus);
      loadData();
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      alert('ステータス更新に失敗しました');
    }
  };

  const handleDelete = async (scheduleId) => {
    if (window.confirm('この面談スケジュールを削除しますか？')) {
      try {
        await scheduleService.deleteSchedule(scheduleId);
        loadData();
      } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      student_id: schedule.student_id,
      teacher_id: schedule.teacher_id,
      scheduled_date: schedule.scheduled_date,
      scheduled_time: schedule.scheduled_time,
      duration_minutes: schedule.duration_minutes,
      interview_type: schedule.interview_type,
      purpose: schedule.purpose
    });
    setShowForm(true);
  };

  const handleComplete = (schedule) => {
    setCompletingSchedule(schedule);
    setInterviewFormData({
      content: ''
    });
    setShowCompleteForm(true);
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const interviewData = {
        organization_id: organizationId,
        student_id: completingSchedule.student_id,
        teacher_id: completingSchedule.teacher_id,
        interview_date: completingSchedule.scheduled_date,
        duration_minutes: completingSchedule.duration_minutes,
        interview_type: completingSchedule.interview_type,
        topics: [],
        content: interviewFormData.content,
        student_condition: null,
        achievements: [],
        challenges: [],
        action_items: []
      };

      await scheduleService.completeInterview(completingSchedule.id, interviewData);
      alert('面談を完了し、記録を作成しました');
      
      setShowCompleteForm(false);
      setCompletingSchedule(null);
      loadData();
    } catch (error) {
      console.error('面談完了エラー:', error);
      alert('面談完了処理に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      teacher_id: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 30,
      interview_type: 'regular',
      purpose: ''
    });
  };

  const getFilteredSchedules = () => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (filter) {
      case 'scheduled':
        return schedules.filter(s => s.status === 'scheduled');
      case 'today':
        return schedules.filter(s => s.scheduled_date === today);
      case 'upcoming':
        return schedules.filter(s => s.status === 'scheduled' && s.scheduled_date >= today);
      case 'overdue':
        return schedules.filter(s => s.status === 'scheduled' && s.scheduled_date < today);
      case 'completed':
        return schedules.filter(s => s.status === 'completed');
      case 'cancelled':
        return schedules.filter(s => s.status === 'cancelled');
      default:
        return schedules;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'scheduled': return '予定';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
      case 'rescheduled': return '再調整';
      default: return status;
    }
  };

  const getInterviewTypeText = (type) => {
    switch (type) {
      case 'regular': return '通常面談';
      case 'parent': return '保護者面談';
      default: return '通常面談';
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="main-content">
      <div className="toolbar">
        <div className="flex items-center justify-between w-full">
          <h1>面談スケジュール管理</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="secondary"
            >
              📅 一括スケジュール作成
            </Button>
            <Button
              onClick={() => {
                setShowForm(true);
                setEditingSchedule(null);
                resetForm();
              }}
              variant="primary"
            >
              + 新規面談スケジュール
            </Button>
          </div>
        </div>
      </div>

      <div className="content-area">
        {/* 統計サマリー */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="stats-card">
            <div className="stats-card-value">{stats.upcoming || 0}</div>
            <div className="stats-card-label">今後の予定</div>
          </div>
          <div className="stats-card">
            <div className="stats-card-value">{stats.overdue || 0}</div>
            <div className="stats-card-label">期限切れ</div>
          </div>
        </div>

        {/* フィルターバー */}
        <div className="flex gap-2 mb-4">
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            すべて ({schedules.length})
          </button>
          <button 
            className={`btn ${filter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('upcoming')}
          >
            今後の予定 ({stats.upcoming || 0})
          </button>
          <button 
            className={`btn ${filter === 'overdue' ? 'btn-error' : 'btn-secondary'}`}
            onClick={() => setFilter('overdue')}
          >
            期限切れ ({stats.overdue || 0})
          </button>
        </div>

        {/* 面談スケジュールテーブル */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              面談スケジュール ({getFilteredSchedules().length}件)
            </h2>
          </div>
          <div className="card-content">
            {getFilteredSchedules().length === 0 ? (
              <p className="text-light text-center py-8">
                面談スケジュールがありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>生徒</th>
                      <th>講師</th>
                      <th>内容</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredSchedules().map(schedule => {
                      const isOverdue = schedule.status === 'scheduled' && 
                        new Date(schedule.scheduled_date) < new Date();
                      const isToday = schedule.scheduled_date === 
                        new Date().toISOString().split('T')[0];
                      
                      return (
                        <tr key={schedule.id}>
                          <td className="student-column">
                            <div className="font-medium">{schedule.students?.name}</div>
                            <div className="text-sm text-secondary">{schedule.students?.grade}年生</div>
                          </td>
                          
                          <td className="teacher-column">{schedule.users?.name}</td>
                          
                          <td className="content-column">
                            <div className={`font-medium ${isOverdue ? 'text-error' : ''} ${isToday ? 'text-blue-600' : ''}`}>
                              {new Date(schedule.scheduled_date).toLocaleDateString()} {schedule.scheduled_time.substring(0, 5)}
                            </div>
                            <div className="text-sm text-secondary">
                              {getInterviewTypeText(schedule.interview_type)} • {schedule.duration_minutes}分
                            </div>
                            <div className="text-sm">
                              {schedule.purpose}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`btn btn-sm ${
                                schedule.status === 'scheduled' ? 'btn-secondary' :
                                schedule.status === 'completed' ? 'btn-success' :
                                schedule.status === 'cancelled' ? 'btn-error' :
                                'btn-secondary'
                              }`}>
                                {getStatusText(schedule.status)}
                              </span>
                              {isOverdue && (
                                <span className="text-sm text-error font-medium">期限切れ</span>
                              )}
                              {isToday && (
                                <span className="text-sm text-blue-600 font-medium">今日</span>
                              )}
                            </div>
                          </td>
                          
                          <td className="actions-column">
                            <div className="flex gap-2">
                              {schedule.status === 'scheduled' && (
                                <button 
                                  className="btn-text text-green"
                                  onClick={() => handleComplete(schedule)}
                                >
                                  完了
                                </button>
                              )}
                              <button 
                                className="btn-text text-green"
                                onClick={() => handleEdit(schedule)}
                              >
                                編集
                              </button>
                              <button 
                                className="btn-text text-error"
                                onClick={() => handleDelete(schedule.id)}
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

        {/* 新規作成・編集フォーム */}
        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingSchedule ? '面談スケジュール編集' : '新規面談スケジュール'}
                </h2>
              </div>
              <div className="modal-body">
                <form id="schedule-form" onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">生徒 *</label>
                      <select
                        value={formData.student_id}
                        onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                        required
                        className="form-select"
                      >
                        <option value="">生徒を選択</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>
                            {student.name} ({student.grade}年)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">担当講師 *</label>
                      <select
                        value={formData.teacher_id}
                        onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                        required
                        className="form-select"
                      >
                        <option value="">講師を選択</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">面談日 *</label>
                      <input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">時間 *</label>
                      <input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                        required
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">面談種類</label>
                      <select
                        value={formData.interview_type}
                        onChange={(e) => setFormData({...formData, interview_type: e.target.value})}
                        className="form-select"
                      >
                        <option value="regular">通常面談</option>
                        <option value="parent">保護者面談</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">面談時間</label>
                      <select
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                        className="form-select"
                      >
                        <option value={30}>30分</option>
                        <option value={45}>45分</option>
                        <option value={60}>60分</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">面談目的 *</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      required
                      className="form-input"
                      placeholder="面談の目的を入力してください"
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  form="schedule-form"
                  className="btn btn-primary"
                >
                  {editingSchedule ? '更新' : '作成'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 面談完了フォーム */}
        {showCompleteForm && completingSchedule && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">面談完了</h2>
                <p className="text-sm text-secondary">
                  {completingSchedule.students?.name}さんとの面談記録を作成します
                </p>
              </div>
              <div className="modal-body">
                <form id="complete-form" onSubmit={handleCompleteSubmit} className="grid gap-4">
                  <div className="form-group">
                    <label className="form-label">面談内容 *</label>
                    <textarea
                      value={interviewFormData.content}
                      onChange={(e) => setInterviewFormData({...interviewFormData, content: e.target.value})}
                      required
                      className="form-textarea"
                      placeholder="面談の詳細な内容を記入してください"
                      rows={4}
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCompleteForm(false);
                    setCompletingSchedule(null);
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  form="complete-form"
                  className="btn btn-success"
                >
                  面談完了
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 一括スケジュール作成モーダル */}
        <BulkScheduleModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          organizationId={organizationId}
          onScheduleUpdate={loadData}
        />
      </div>
    </div>
  );
};

export default InterviewSchedules; 