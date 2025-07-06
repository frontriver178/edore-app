import React, { useState, useEffect } from 'react';
import { scheduleService } from '../services/scheduleService';
import { teachingScheduleService } from '../services/teachingScheduleService';
import { taskService } from '../services/taskService';
import { supabase } from '../supabaseClient';
import ScheduleCard from './ScheduleCard';

const DateScheduleModal = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  studentId,
  organizationId,
  onScheduleUpdate
}) => {
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleType, setScheduleType] = useState('interview'); // 'interview', 'teaching', or 'task'

  // 面談スケジュール用フォームデータ
  const [interviewFormData, setInterviewFormData] = useState({
    student_id: studentId,
    teacher_id: '',
    scheduled_date: selectedDate,
    scheduled_time: '',
    duration_minutes: 30,
    interview_type: 'regular',
    purpose: '',
    location: '教室',
    notes: ''
  });

  // 指導スケジュール用フォームデータ
  const [teachingFormData, setTeachingFormData] = useState({
    student_id: studentId,
    teacher_id: '',
    scheduled_date: selectedDate,
    start_time: '',
    end_time: '',
    subject: '',
    topic: '',
    notes: ''
  });

  // タスク用フォームデータ
  const [taskFormData, setTaskFormData] = useState({
    student_id: studentId,
    teacher_id: '',
    title: '',
    description: '',
    due_date: selectedDate,
    priority: 'medium',
    category_id: '',
    status: 'pending',
    estimated_hours: 1
  });

  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchScheduleData();
      fetchTeachers();
      fetchTaskCategories();
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    // 日付が変更されたらフォームデータも更新
    setInterviewFormData(prev => ({ ...prev, scheduled_date: selectedDate }));
    setTeachingFormData(prev => ({ ...prev, scheduled_date: selectedDate }));
    setTaskFormData(prev => ({ ...prev, due_date: selectedDate }));
  }, [selectedDate]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      
      // 面談スケジュールを取得
      const { data: interviewSchedules, error: interviewError } = await supabase
        .from('interview_schedules')
        .select(`
          *,
          students(id, name, grade),
          users(id, name)
        `)
        .eq('student_id', studentId)
        .eq('scheduled_date', selectedDate);

      if (interviewError) throw interviewError;

      // 指導スケジュールを取得
      const { data: teachingSchedules, error: teachingError } = await supabase
        .from('teaching_schedules')
        .select(`
          *,
          students(id, name, grade),
          users(id, name)
        `)
        .eq('student_id', studentId)
        .eq('scheduled_date', selectedDate);

      if (teachingError) throw teachingError;

      // タスクを取得（期限日が選択された日のもの）
      const { data: tasks, error: taskError } = await supabase
        .from('student_tasks')
        .select(`
          *,
          students(id, name, grade),
          users(id, name),
          task_categories(id, name, color)
        `)
        .eq('student_id', studentId)
        .eq('due_date', selectedDate);

      if (taskError) throw taskError;

      // 全てのスケジュールとタスクを統合
      const allItems = [
        ...(interviewSchedules || []).map(s => ({ ...s, type: 'interview' })),
        ...(teachingSchedules || []).map(s => ({ ...s, type: 'teaching' })),
        ...(tasks || []).map(t => ({ ...t, type: 'task' }))
      ];

      // 時間順にソート
      allItems.sort((a, b) => {
        const timeA = a.type === 'interview' ? a.scheduled_time : 
                     a.type === 'teaching' ? a.start_time : 
                     '23:59'; // タスクは最後に表示
        const timeB = b.type === 'interview' ? b.scheduled_time : 
                     b.type === 'teaching' ? b.start_time : 
                     '23:59';
        return timeA.localeCompare(timeB);
      });

      setSchedules(allItems);
    } catch (error) {
      console.error('スケジュール取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .in('role', ['admin', 'teacher'])
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('講師取得エラー:', error);
    }
  };

  const fetchTaskCategories = async () => {
    try {
      const categories = await taskService.getTaskCategories(organizationId);
      setTaskCategories(categories || []);
    } catch (error) {
      console.error('タスクカテゴリ取得エラー:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let result;
      
      if (scheduleType === 'interview') {
        const scheduleData = {
          organization_id: organizationId,
          ...interviewFormData,
          // 空文字列をnullに変換
          teacher_id: interviewFormData.teacher_id || null
        };

        if (editingSchedule && editingSchedule.type === 'interview') {
          result = await scheduleService.updateSchedule(editingSchedule.id, scheduleData);
        } else {
          result = await scheduleService.createSchedule(scheduleData);
        }
      } else if (scheduleType === 'teaching') {
        const scheduleData = {
          organization_id: organizationId,
          ...teachingFormData,
          status: 'scheduled',
          // 空文字列をnullに変換
          teacher_id: teachingFormData.teacher_id || null
        };

        if (editingSchedule && editingSchedule.type === 'teaching') {
          result = await teachingScheduleService.updateSchedule(editingSchedule.id, scheduleData);
        } else {
          result = await teachingScheduleService.createSchedule(scheduleData);
        }
      } else if (scheduleType === 'task') {
        const taskData = {
          organization_id: organizationId,
          ...taskFormData,
          // 空文字列をnullに変換
          teacher_id: taskFormData.teacher_id || null,
          category_id: taskFormData.category_id || null
        };

        if (editingSchedule && editingSchedule.type === 'task') {
          result = await taskService.updateTask(editingSchedule.id, taskData);
        } else {
          result = await taskService.createTask(taskData);
        }
      }

      alert(editingSchedule ? 
        `${scheduleType === 'task' ? 'タスク' : 'スケジュール'}を更新しました` : 
        `${scheduleType === 'task' ? 'タスク' : 'スケジュール'}を作成しました`
      );
      resetForm();
      setShowAddForm(false);
      setEditingSchedule(null);
      await fetchScheduleData();
      onScheduleUpdate();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleDelete = async (item) => {
    const itemName = item.type === 'task' ? 'タスク' : 'スケジュール';
    
    if (window.confirm(`この${itemName}を削除しますか？`)) {
      try {
        if (item.type === 'interview') {
          await scheduleService.deleteSchedule(item.id);
        } else if (item.type === 'teaching') {
          await teachingScheduleService.deleteSchedule(item.id);
        } else if (item.type === 'task') {
          await taskService.deleteTask(item.id);
        }
        
        alert(`${itemName}を削除しました`);
        await fetchScheduleData();
        onScheduleUpdate();
      } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const handleEdit = (item) => {
    setEditingSchedule(item);
    setScheduleType(item.type);
    
    if (item.type === 'interview') {
      setInterviewFormData({
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        scheduled_date: item.scheduled_date,
        scheduled_time: item.scheduled_time,
        duration_minutes: item.duration_minutes,
        interview_type: item.interview_type,
        purpose: item.purpose || '',
        location: item.location || '教室',
        notes: item.notes || ''
      });
    } else if (item.type === 'teaching') {
      setTeachingFormData({
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        scheduled_date: item.scheduled_date,
        start_time: item.start_time,
        end_time: item.end_time,
        subject: item.subject,
        topic: item.topic || '',
        notes: item.notes || ''
      });
    } else if (item.type === 'task') {
      setTaskFormData({
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        title: item.title,
        description: item.description || '',
        due_date: item.due_date,
        priority: item.priority,
        category_id: item.category_id || '',
        status: item.status,
        estimated_hours: item.estimated_hours || 1
      });
    }
    
    setShowAddForm(true);
  };

  const handleStatusChange = async (itemId, newStatus, itemType) => {
    try {
      if (itemType === 'interview') {
        await scheduleService.updateScheduleStatus(itemId, newStatus);
      } else if (itemType === 'teaching') {
        await teachingScheduleService.updateSchedule(itemId, { status: newStatus });
      } else if (itemType === 'task') {
        await taskService.updateTaskStatus(itemId, newStatus);
      }
      
      await fetchScheduleData();
      onScheduleUpdate();
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      alert('ステータス更新に失敗しました');
    }
  };

  const handleComplete = async (item) => {
    if (item.type === 'interview') {
      const interviewData = {
        organization_id: organizationId,
        student_id: item.student_id,
        teacher_id: item.teacher_id,
        interview_date: item.scheduled_date,
        duration_minutes: item.duration_minutes,
        interview_type: item.interview_type,
        topics: [],
        content: '面談を実施しました。',
        student_condition: null,
        achievements: [],
        challenges: [],
        action_items: []
      };

      try {
        await scheduleService.completeInterview(item.id, interviewData);
        alert('面談を完了し、記録を作成しました');
        await fetchScheduleData();
        onScheduleUpdate();
      } catch (error) {
        console.error('面談完了エラー:', error);
        alert('面談完了処理に失敗しました');
      }
    } else if (item.type === 'teaching') {
      await handleStatusChange(item.id, 'completed', 'teaching');
    } else if (item.type === 'task') {
      await handleStatusChange(item.id, 'completed', 'task');
      alert('タスクを完了しました');
    }
  };

  const resetForm = () => {
    setInterviewFormData({
      student_id: studentId,
      teacher_id: '',
      scheduled_date: selectedDate,
      scheduled_time: '',
      duration_minutes: 30,
      interview_type: 'regular',
      purpose: '',
      location: '教室',
      notes: ''
    });
    
    setTeachingFormData({
      student_id: studentId,
      teacher_id: '',
      scheduled_date: selectedDate,
      start_time: '',
      end_time: '',
      subject: '',
      topic: '',
      notes: ''
    });

    setTaskFormData({
      student_id: studentId,
      teacher_id: '',
      title: '',
      description: '',
      due_date: selectedDate,
      priority: 'medium',
      category_id: '',
      status: 'pending',
      estimated_hours: 1
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getItemTypeName = (type, item) => {
    switch (type) {
      case 'interview': 
        return item?.interview_type === 'group' ? 'ホームルーム' : '面談';
      case 'teaching': return '指導';
      case 'task': return 'タスク';
      default: return type;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '未着手';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      case 'scheduled': return '予定';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{formatDate(selectedDate)} の予定・タスク</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : (
            <div className="space-y-6">
              {/* 既存のスケジュール・タスク一覧 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">予定・タスク一覧</h3>
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                  >
                    新規追加
                  </button>
                </div>
                
                {schedules.length === 0 ? (
                  <div className="text-center py-8 text-light">
                    この日の予定・タスクはありません
                  </div>
                ) : (
                  <div className="space-y-4">
                    {schedules.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="schedule-item">
                        <div className="schedule-header">
                          <span className={`schedule-type ${
                            item.type === 'interview' && item.interview_type === 'group' 
                              ? 'homeroom' 
                              : item.type
                          }`}>
                            {getItemTypeName(item.type, item)}
                          </span>
                          {item.type === 'task' ? (
                            <span className="schedule-time">
                              期限: {item.due_date}
                            </span>
                          ) : (
                            <span className="schedule-time">
                              {item.type === 'interview' 
                                ? `${item.scheduled_time} (${item.duration_minutes}分)`
                                : `${item.start_time} - ${item.end_time}`
                              }
                            </span>
                          )}
                        </div>
                        
                        <div className="schedule-details">
                          <p><strong>担当:</strong> {item.users?.name}</p>
                          
                          {item.type === 'interview' && (
                            <>
                              <p><strong>種類:</strong> {item.interview_type}</p>
                              <p><strong>目的:</strong> {item.purpose || '-'}</p>
                              <p><strong>場所:</strong> {item.location || '-'}</p>
                            </>
                          )}
                          
                          {item.type === 'teaching' && (
                            <>
                              <p><strong>科目:</strong> {item.subject}</p>
                              <p><strong>トピック:</strong> {item.topic || '-'}</p>
                            </>
                          )}
                          
                          {item.type === 'task' && (
                            <>
                              <p><strong>タイトル:</strong> {item.title}</p>
                              <p><strong>優先度:</strong> {getPriorityText(item.priority)}</p>
                              <p><strong>ステータス:</strong> {getStatusText(item.status)}</p>
                              <p><strong>カテゴリ:</strong> {item.task_categories?.name || '未分類'}</p>
                              <p><strong>予想時間:</strong> {item.estimated_hours}時間</p>
                              {item.description && (
                                <p><strong>説明:</strong> {item.description}</p>
                              )}
                            </>
                          )}
                          
                          {((item.type !== 'task' && item.notes) || (item.type === 'task' && item.description)) && (
                            <p><strong>メモ:</strong> {item.notes || item.description}</p>
                          )}
                        </div>
                        
                        <div className="schedule-actions">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="btn btn-sm btn-secondary"
                          >
                            編集
                          </button>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="btn btn-sm btn-error"
                          >
                            削除
                          </button>
                          {((item.status === 'scheduled' && item.type !== 'task') || 
                            (item.status === 'pending' && item.type === 'task') ||
                            (item.status === 'in_progress' && item.type === 'task')) && (
                            <button 
                              onClick={() => handleComplete(item)}
                              className="btn btn-sm btn-success"
                            >
                              完了
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 新規作成・編集フォーム */}
              {showAddForm && (
                <div className="form-section">
                  <h3 className="text-lg font-semibold mb-4">
                    {editingSchedule ? 
                      `${getItemTypeName(scheduleType, editingSchedule)}編集` : 
                      `${getItemTypeName(scheduleType, editingSchedule)}新規作成`}
                  </h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* タイプ選択 */}
                    <div className="form-group">
                      <label className="form-label">種類</label>
                      <div className="radio-group">
                        <label>
                          <input
                            type="radio"
                            value="interview"
                            checked={scheduleType === 'interview'}
                            onChange={(e) => setScheduleType(e.target.value)}
                          />
                          面談
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="teaching"
                            checked={scheduleType === 'teaching'}
                            onChange={(e) => setScheduleType(e.target.value)}
                          />
                          指導
                        </label>
                        <label>
                          <input
                            type="radio"
                            value="task"
                            checked={scheduleType === 'task'}
                            onChange={(e) => setScheduleType(e.target.value)}
                          />
                          タスク
                        </label>
                      </div>
                    </div>

                    {/* 担当講師選択 */}
                    <div className="form-group">
                      <label className="form-label">担当講師 *</label>
                      <select
                        value={scheduleType === 'interview' ? interviewFormData.teacher_id : 
                               scheduleType === 'teaching' ? teachingFormData.teacher_id :
                               taskFormData.teacher_id}
                        onChange={(e) => {
                          if (scheduleType === 'interview') {
                            setInterviewFormData({...interviewFormData, teacher_id: e.target.value});
                          } else if (scheduleType === 'teaching') {
                            setTeachingFormData({...teachingFormData, teacher_id: e.target.value});
                          } else {
                            setTaskFormData({...taskFormData, teacher_id: e.target.value});
                          }
                        }}
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

                    {/* 面談用フォーム */}
                    {scheduleType === 'interview' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="form-label">時間 *</label>
                            <input
                              type="time"
                              value={interviewFormData.scheduled_time}
                              onChange={(e) => setInterviewFormData({...interviewFormData, scheduled_time: e.target.value})}
                              required
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">時間(分) *</label>
                            <input
                              type="number"
                              value={interviewFormData.duration_minutes}
                              onChange={(e) => setInterviewFormData({...interviewFormData, duration_minutes: parseInt(e.target.value)})}
                              required
                              className="form-input"
                              min="15"
                              max="180"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">面談種類</label>
                          <select
                            value={interviewFormData.interview_type}
                            onChange={(e) => setInterviewFormData({...interviewFormData, interview_type: e.target.value})}
                            className="form-select"
                          >
                            <option value="regular">通常面談</option>
                            <option value="parent">保護者面談</option>
                            <option value="consultation">進路相談</option>
                            <option value="emergency">緊急面談</option>
                            <option value="group">ホームルーム</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label className="form-label">目的 *</label>
                          <input
                            type="text"
                            value={interviewFormData.purpose}
                            onChange={(e) => setInterviewFormData({...interviewFormData, purpose: e.target.value})}
                            required
                            className="form-input"
                            placeholder="面談の目的を入力"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">場所</label>
                          <input
                            type="text"
                            value={interviewFormData.location}
                            onChange={(e) => setInterviewFormData({...interviewFormData, location: e.target.value})}
                            className="form-input"
                            placeholder="面談場所"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">メモ</label>
                          <textarea
                            value={interviewFormData.notes}
                            onChange={(e) => setInterviewFormData({...interviewFormData, notes: e.target.value})}
                            className="form-textarea"
                            rows="3"
                            placeholder="事前準備メモなど"
                          />
                        </div>
                      </>
                    )}

                    {/* 指導用フォーム */}
                    {scheduleType === 'teaching' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="form-label">開始時間 *</label>
                            <input
                              type="time"
                              value={teachingFormData.start_time}
                              onChange={(e) => setTeachingFormData({...teachingFormData, start_time: e.target.value})}
                              required
                              className="form-input"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">終了時間 *</label>
                            <input
                              type="time"
                              value={teachingFormData.end_time}
                              onChange={(e) => setTeachingFormData({...teachingFormData, end_time: e.target.value})}
                              required
                              className="form-input"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">科目 *</label>
                          <input
                            type="text"
                            value={teachingFormData.subject}
                            onChange={(e) => setTeachingFormData({...teachingFormData, subject: e.target.value})}
                            required
                            className="form-input"
                            placeholder="指導科目"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">トピック</label>
                          <input
                            type="text"
                            value={teachingFormData.topic}
                            onChange={(e) => setTeachingFormData({...teachingFormData, topic: e.target.value})}
                            className="form-input"
                            placeholder="指導内容・トピック"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">メモ</label>
                          <textarea
                            value={teachingFormData.notes}
                            onChange={(e) => setTeachingFormData({...teachingFormData, notes: e.target.value})}
                            className="form-textarea"
                            rows="3"
                            placeholder="指導方針・準備事項など"
                          />
                        </div>
                      </>
                    )}

                    {/* タスク用フォーム */}
                    {scheduleType === 'task' && (
                      <>
                        <div className="form-group">
                          <label className="form-label">タイトル *</label>
                          <input
                            type="text"
                            value={taskFormData.title}
                            onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                            required
                            className="form-input"
                            placeholder="タスクのタイトル"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">説明</label>
                          <textarea
                            value={taskFormData.description}
                            onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                            className="form-textarea"
                            rows="3"
                            placeholder="タスクの詳細説明"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="form-label">優先度</label>
                            <select
                              value={taskFormData.priority}
                              onChange={(e) => setTaskFormData({...taskFormData, priority: e.target.value})}
                              className="form-select"
                            >
                              <option value="low">低</option>
                              <option value="medium">中</option>
                              <option value="high">高</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">予想時間(時間)</label>
                            <input
                              type="number"
                              value={taskFormData.estimated_hours}
                              onChange={(e) => setTaskFormData({...taskFormData, estimated_hours: parseFloat(e.target.value)})}
                              className="form-input"
                              min="0.5"
                              max="20"
                              step="0.5"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">カテゴリ</label>
                          <select
                            value={taskFormData.category_id}
                            onChange={(e) => setTaskFormData({...taskFormData, category_id: e.target.value})}
                            className="form-select"
                          >
                            <option value="">カテゴリを選択</option>
                            {taskCategories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {editingSchedule && (
                          <div className="form-group">
                            <label className="form-label">ステータス</label>
                            <select
                              value={taskFormData.status}
                              onChange={(e) => setTaskFormData({...taskFormData, status: e.target.value})}
                              className="form-select"
                            >
                              <option value="pending">未着手</option>
                              <option value="in_progress">進行中</option>
                              <option value="completed">完了</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {editingSchedule ? '更新' : '作成'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingSchedule(null);
                          resetForm();
                        }}
                        className="btn btn-secondary"
                      >
                        キャンセル
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DateScheduleModal; 