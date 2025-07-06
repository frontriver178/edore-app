import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Button from './Button';

const BulkScheduleModal = ({ 
  isOpen, 
  onClose, 
  organizationId,
  onScheduleUpdate 
}) => {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState('interview'); // 'interview', 'teaching', 'homeroom'
  
  const [formData, setFormData] = useState({
    teacher_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 30,
    subject: '',
    topic: '',
    purpose: '',
    location: '教室',
    notes: '',
    // ホームルーム用
    event_title: '',
    is_recurring: false,
    recurring_pattern: 'weekly', // 'weekly', 'monthly'
    recurring_count: 4 // 繰り返し回数
  });

  const subjects = [
    '数学', '英語', '国語', '理科', '社会', '物理', '化学', '生物', '地学',
    '日本史', '世界史', '地理', '現代社会', '政治経済', '倫理', '小論文'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchStudentsAndTeachers();
    }
  }, [isOpen]);

  const fetchStudentsAndTeachers = async () => {
    try {
      // 生徒一覧取得
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('status', 'active')
        .eq('organization_id', organizationId)
        .order('grade', { ascending: true });

      if (studentsError) throw studentsError;

      // 講師一覧取得
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .in('role', ['admin', 'teacher'])
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (teachersError) throw teachersError;

      setStudents(studentsData || []);
      setTeachers(teachersData || []);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの取得に失敗しました');
    }
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const clearAllStudents = () => {
    setSelectedStudents([]);
  };

  const selectByGrade = (grade) => {
    const gradeStudents = students
      .filter(s => s.grade === grade)
      .map(s => s.id);
    setSelectedStudents(prev => {
      const newSelection = new Set([...prev, ...gradeStudents]);
      return Array.from(newSelection);
    });
  };

  const generateRecurringDates = (startDate, pattern, count) => {
    const dates = [startDate];
    const start = new Date(startDate);
    
    for (let i = 1; i < count; i++) {
      const nextDate = new Date(start);
      if (pattern === 'weekly') {
        nextDate.setDate(start.getDate() + (7 * i));
      } else if (pattern === 'monthly') {
        nextDate.setMonth(start.getMonth() + i);
      }
      dates.push(nextDate.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedStudents.length === 0) {
      alert('生徒を選択してください');
      return;
    }

    try {
      setLoading(true);
      
      // 繰り返しスケジュールの日付を生成
      const dates = formData.is_recurring 
        ? generateRecurringDates(
            formData.scheduled_date, 
            formData.recurring_pattern, 
            formData.recurring_count
          )
        : [formData.scheduled_date];

      const schedules = [];

      // 各日付と各生徒の組み合わせでスケジュール作成
      for (const date of dates) {
        for (const studentId of selectedStudents) {
          let scheduleData = {
            organization_id: organizationId,
            student_id: studentId,
            teacher_id: formData.teacher_id,
            scheduled_date: date,
            notes: formData.notes
          };

          if (scheduleType === 'interview' || scheduleType === 'homeroom') {
            scheduleData = {
              ...scheduleData,
              scheduled_time: formData.scheduled_time,
              duration_minutes: parseInt(formData.duration_minutes),
              interview_type: scheduleType === 'homeroom' ? 'group' : 'regular',
              purpose: formData.purpose || formData.event_title,
              location: formData.location,
              status: 'scheduled',
              reminder_sent: false
            };
          } else if (scheduleType === 'teaching') {
            // 終了時間を計算
            const startTime = new Date(`2000-01-01 ${formData.scheduled_time}`);
            const endTime = new Date(startTime.getTime() + formData.duration_minutes * 60000);
            const endTimeString = endTime.toTimeString().slice(0, 5);
            
            scheduleData = {
              ...scheduleData,
              start_time: formData.scheduled_time,
              end_time: endTimeString,
              subject: formData.subject,
              topic: formData.topic || formData.event_title,
              status: 'scheduled'
            };
          }

          schedules.push(scheduleData);
        }
      }

      // バッチでスケジュール作成
      const tableName = (scheduleType === 'teaching') ? 'teaching_schedules' : 'interview_schedules';
      
      const { error } = await supabase
        .from(tableName)
        .insert(schedules);

      if (error) throw error;

      const totalSchedules = schedules.length;
      const message = formData.is_recurring 
        ? `${selectedStudents.length}名の生徒に${dates.length}回分（計${totalSchedules}件）のスケジュールを作成しました`
        : `${selectedStudents.length}名の生徒にスケジュールを作成しました`;
      
      alert(message);
      
      onClose();
      onScheduleUpdate();
      resetForm();
    } catch (error) {
      console.error('一括スケジュール作成エラー:', error);
      alert('スケジュール作成に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      teacher_id: '',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 30,
      subject: '',
      topic: '',
      purpose: '',
      location: '教室',
      notes: '',
      event_title: '',
      is_recurring: false,
      recurring_pattern: 'weekly',
      recurring_count: 4
    });
    setSelectedStudents([]);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getScheduleTypeName = () => {
    switch (scheduleType) {
      case 'interview': return '面談';
      case 'teaching': return '指導';
      case 'homeroom': return 'ホームルーム';
      default: return 'スケジュール';
    }
  };

  // 学年別生徒数を取得
  const getGradeStats = () => {
    const gradeStats = {};
    students.forEach(student => {
      gradeStats[student.grade] = (gradeStats[student.grade] || 0) + 1;
    });
    return gradeStats;
  };

  const gradeStats = getGradeStats();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2 className="modal-title">
            一括スケジュール作成
          </h2>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* スケジュールタイプ選択 */}
            <div className="form-group">
              <label className="form-label">スケジュールタイプ *</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="interview"
                    checked={scheduleType === 'interview'}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="mr-2"
                  />
                  面談
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="teaching"
                    checked={scheduleType === 'teaching'}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="mr-2"
                  />
                  指導
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scheduleType"
                    value="homeroom"
                    checked={scheduleType === 'homeroom'}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="mr-2"
                  />
                  ホームルーム
                </label>
              </div>
            </div>

            {/* 生徒選択 */}
            <div className="form-group">
              <div className="flex items-center justify-between mb-3">
                <label className="form-label">
                  対象生徒 * ({selectedStudents.length}名選択中)
                </label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={selectAllStudents}
                    variant="secondary"
                    size="sm"
                  >
                    全選択
                  </Button>
                  <Button 
                    type="button" 
                    onClick={clearAllStudents}
                    variant="secondary"
                    size="sm"
                  >
                    選択解除
                  </Button>
                </div>
              </div>
              
              {/* 学年別選択ボタン */}
              <div className="flex gap-2 mb-3">
                {Object.entries(gradeStats).map(([grade, count]) => (
                  <Button
                    key={grade}
                    type="button"
                    onClick={() => selectByGrade(parseInt(grade))}
                    variant="secondary"
                    size="sm"
                  >
                    {grade}年生 ({count}名)
                  </Button>
                ))}
              </div>

              {/* 生徒一覧 */}
              <div className="max-h-48 overflow-y-auto border rounded p-3 grid grid-cols-3 gap-2">
                {students.map(student => (
                  <label key={student.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => handleStudentSelection(student.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {student.name} ({student.grade}年)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">担当講師 *</label>
                <select
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleInputChange}
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

              <div className="form-group">
                <label className="form-label">
                  {scheduleType === 'homeroom' ? 'イベント名' : 
                   scheduleType === 'teaching' ? '授業タイトル' : '面談目的'} *
                </label>
                <input
                  type="text"
                  name={scheduleType === 'interview' ? 'purpose' : 
                        scheduleType === 'teaching' ? 'topic' : 'event_title'}
                  value={scheduleType === 'interview' ? formData.purpose : 
                         scheduleType === 'teaching' ? formData.topic : formData.event_title}
                  onChange={handleInputChange}
                  required
                  placeholder={
                    scheduleType === 'homeroom' ? 'ホームルーム' : 
                    scheduleType === 'teaching' ? '数学基礎' : '学習相談'
                  }
                  className="form-input"
                />
              </div>
            </div>

            {/* 指導用の科目選択 */}
            {scheduleType === 'teaching' && (
              <div className="form-group">
                <label className="form-label">科目 *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">科目を選択</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 日時設定 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">日付 *</label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">開始時間 *</label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">時間（分）</label>
                <select
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="15">15分</option>
                  <option value="30">30分</option>
                  <option value="45">45分</option>
                  <option value="60">60分</option>
                  <option value="90">90分</option>
                  <option value="120">120分</option>
                </select>
              </div>
            </div>

            {/* 繰り返し設定 */}
            <div className="form-group">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                定期的に繰り返す（例：毎週のホームルーム）
              </label>
              
              {formData.is_recurring && (
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">繰り返しパターン</label>
                    <select
                      name="recurring_pattern"
                      value={formData.recurring_pattern}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="weekly">毎週</option>
                      <option value="monthly">毎月</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">繰り返し回数</label>
                    <select
                      name="recurring_count"
                      value={formData.recurring_count}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}回
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* その他設定 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">場所</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="教室"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">備考</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="特記事項があれば"
                  className="form-input"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <Button
            onClick={() => {
              onClose();
              resetForm();
            }}
            variant="secondary"
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            disabled={loading || selectedStudents.length === 0}
          >
            {loading ? '作成中...' : 
             `${getScheduleTypeName()}を${selectedStudents.length}名に作成`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduleModal; 