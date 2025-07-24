import React, { useState, useEffect, useCallback } from 'react';
import { scheduleService } from '../services/scheduleService';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import FullPageLoader from '../components/FullPageLoader';
import BulkScheduleModal from '../components/BulkScheduleModal';
import { useAuth } from '../contexts/AuthContext';
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
  const { organizationId } = useAuth();

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


  const getStudents = useCallback(async () => {
    if (!organizationId) return [];
    
    const { data, error } = await supabase
      .from('students')
      .select('id, name, grade')
      .eq('status', 'active')
      .eq('organization_id', organizationId)
      .order('grade', { ascending: true });

    if (error) throw error;
    return data || [];
  }, [organizationId]);

  const getTeachers = useCallback(async () => {
    if (!organizationId) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .in('role', ['admin', 'teacher'])
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }, [organizationId]);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      console.log('⏳ InterviewSchedules: organizationId待機中');
      return;
    }
    
    try {
      console.log('🚀 InterviewSchedules: データ読み込み開始', organizationId);
      const fetchStart = performance.now();
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
      
      const fetchEnd = performance.now();
      console.log(`✅ InterviewSchedules: データ取得完了 ${(fetchEnd - fetchStart).toFixed(2)}ms`, {
        schedules: schedulesData?.length || 0,
        students: studentsData?.length || 0,
        teachers: teachersData?.length || 0
      });
    } catch (error) {
      console.error('❌ InterviewSchedules: データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId, getStudents, getTeachers]);

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
        if (formData.student_id === 'bulk' && editingSchedule.bulkEdit) {
          // 一括編集の場合
          const groupSchedules = editingSchedule.groupSchedules;
          for (const schedule of groupSchedules) {
            const updateData = {
              ...scheduleData,
              student_id: schedule.student_id // 各生徒のIDを保持
            };
            await scheduleService.updateSchedule(schedule.id, updateData);
          }
          alert(`${groupSchedules.length}件の面談スケジュールを一括更新しました`);
        } else {
          // 個別編集の場合
          await scheduleService.updateSchedule(editingSchedule.id, scheduleData);
          alert('面談スケジュールを更新しました');
        }
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

  // const handleStatusChange = async (scheduleId, newStatus) => {
  //   try {
  //     await scheduleService.updateScheduleStatus(scheduleId, newStatus);
  //     loadData();
  //   } catch (error) {
  //     console.error('ステータス更新エラー:', error);
  //     alert('ステータス更新に失敗しました');
  //   }
  // };

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

  // 一括完了処理
  const handleBulkComplete = async (group) => {
    if (!window.confirm(`${group.students.length}件の面談を一括完了しますか？`)) {
      return;
    }

    try {
      for (const schedule of group.allSchedules) {
        // スケジュールのステータスを完了に更新するだけ
        const { error: updateError } = await supabase
          .from('interview_schedules')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id);

        if (updateError) throw updateError;
      }

      alert(`${group.students.length}件の面談を一括完了しました`);
      loadData();
    } catch (error) {
      console.error('一括完了エラー:', error);
      alert('一括完了処理に失敗しました');
    }
  };

  // 一括削除処理
  const handleBulkDelete = async (group) => {
    if (!window.confirm(`${group.students.length}件の面談スケジュールを一括削除しますか？`)) {
      return;
    }

    try {
      for (const schedule of group.allSchedules) {
        await scheduleService.deleteSchedule(schedule.id);
      }
      alert(`${group.students.length}件のスケジュールを一括削除しました`);
      loadData();
    } catch (error) {
      console.error('一括削除エラー:', error);
      alert('一括削除処理に失敗しました');
    }
  };

  // 一括編集処理
  const handleBulkEdit = (group) => {
    // グループの代表スケジュールをベースにフォームを設定
    setEditingSchedule({
      ...group.allSchedules[0],
      bulkEdit: true,
      groupSchedules: group.allSchedules
    });
    setFormData({
      student_id: 'bulk', // 一括編集フラグ
      teacher_id: group.teacher_id,
      scheduled_date: group.scheduled_date,
      scheduled_time: group.scheduled_time,
      duration_minutes: group.duration_minutes,
      interview_type: group.interview_type,
      purpose: group.purpose
    });
    setShowForm(true);
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

  // 同じ日時・講師・内容のスケジュールをグループ化
  const getGroupedSchedules = () => {
    const filteredSchedules = getFilteredSchedules();
    const groups = {};
    
    filteredSchedules.forEach(schedule => {
      const groupKey = `${schedule.scheduled_date}_${schedule.scheduled_time}_${schedule.teacher_id}_${schedule.interview_type}_${schedule.purpose}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...schedule,
          students: [schedule.students],
          scheduleIds: [schedule.id],
          allSchedules: [schedule]
        };
      } else {
        groups[groupKey].students.push(schedule.students);
        groups[groupKey].scheduleIds.push(schedule.id);
        groups[groupKey].allSchedules.push(schedule);
      }
    });
    
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(`${a.scheduled_date} ${a.scheduled_time}`);
      const dateB = new Date(`${b.scheduled_date} ${b.scheduled_time}`);
      return dateA - dateB;
    });
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
    return <FullPageLoader message="面談スケジュールを読み込み中..." />
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
            {getGroupedSchedules().length === 0 ? (
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
                    {getGroupedSchedules().map(group => {
                      const isOverdue = group.status === 'scheduled' && 
                        new Date(group.scheduled_date) < new Date();
                      const isToday = group.scheduled_date === 
                        new Date().toISOString().split('T')[0];
                      
                      return (
                        <tr key={group.scheduleIds.join('-')}>
                          <td className="student-column">
                            {group.students.length === 1 ? (
                              <>
                                <div className="font-medium">{group.students[0]?.name}</div>
                                <div className="text-sm text-secondary">{group.students[0]?.grade}年生</div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">{group.students.length}名の生徒</div>
                                <div className="text-sm text-secondary">
                                  {group.students.map(student => student?.name).join(', ')}
                                </div>
                              </>
                            )}
                          </td>
                          
                          <td className="teacher-column">{group.users?.name}</td>
                          
                          <td className="content-column">
                            <div className={`font-medium ${isOverdue ? 'text-error' : ''} ${isToday ? 'text-blue-600' : ''}`}>
                              {new Date(group.scheduled_date).toLocaleDateString()} {group.scheduled_time.substring(0, 5)}
                            </div>
                            <div className="text-sm text-secondary">
                              {getInterviewTypeText(group.interview_type)} • {group.duration_minutes}分
                            </div>
                            <div className="text-sm">
                              {group.purpose}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`btn btn-sm ${
                                group.status === 'scheduled' ? 'btn-secondary' :
                                group.status === 'completed' ? 'btn-success' :
                                group.status === 'cancelled' ? 'btn-error' :
                                'btn-secondary'
                              }`}>
                                {getStatusText(group.status)}
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
                              {group.students.length === 1 ? (
                                <>
                                  {group.status === 'scheduled' && (
                                    <button 
                                      className="btn-text text-green"
                                      onClick={() => handleComplete(group.allSchedules[0])}
                                    >
                                      完了
                                    </button>
                                  )}
                                  <button 
                                    className="btn-text text-green"
                                    onClick={() => handleEdit(group.allSchedules[0])}
                                  >
                                    編集
                                  </button>
                                  <button 
                                    className="btn-text text-error"
                                    onClick={() => handleDelete(group.allSchedules[0].id)}
                                  >
                                    削除
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="flex flex-col gap-1">
                                    {group.status === 'scheduled' && (
                                      <button 
                                        className="btn-text text-green text-sm"
                                        onClick={() => handleBulkComplete(group)}
                                      >
                                        一括完了
                                      </button>
                                    )}
                                    <button 
                                      className="btn-text text-green text-sm"
                                      onClick={() => handleBulkEdit(group)}
                                    >
                                      一括編集
                                    </button>
                                    <button 
                                      className="btn-text text-error text-sm"
                                      onClick={() => handleBulkDelete(group)}
                                    >
                                      一括削除
                                    </button>
                                  </div>
                                </>
                              )}
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
                      {formData.student_id === 'bulk' ? (
                        <div className="form-input bg-gray-100 p-2 rounded">
                          一括編集中（複数の生徒）
                        </div>
                      ) : (
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
                      )}
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