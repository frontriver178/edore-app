import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Button from '../components/Button';
import FullPageLoader from '../components/FullPageLoader';
import StudentCalendar from '../components/StudentCalendar';

// 科目表示コンポーネント
const SubjectsDisplay = ({ subjects }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxVisible = 2; // ダッシュボードでは少なめに表示
  
  if (!subjects || subjects.length === 0) {
    return (
      <div className="subjects-display">
        <div className="subjects-display-empty">
          -
        </div>
      </div>
    );
  }

  const visibleSubjects = isExpanded ? subjects : subjects.slice(0, maxVisible);
  const hasMore = subjects.length > maxVisible;
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="subjects-display">
      <div className="subjects-display-container">
        {visibleSubjects.map((subject, index) => (
          <span key={index} className="subject-item">
            {subject.subject}: {subject.deviation_value}
          </span>
        ))}
        
        {hasMore && (
          <span 
            className={`subjects-toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
            onClick={toggleExpanded}
            title={isExpanded ? '折りたたむ' : `他 ${subjects.length - maxVisible} 科目を表示`}
          >
            {isExpanded ? (
              <>
                <span className="toggle-icon">▲</span>
                <span className="toggle-text">折りたたむ</span>
              </>
            ) : (
              <>
                <span className="toggle-icon">▼</span>
                <span className="toggle-text">+{subjects.length - maxVisible}</span>
              </>
            )}
          </span>
        )}
      </div>
      
      {/* 科目の統計情報（ダッシュボードでは4科目以上で表示） */}
      {isExpanded && subjects.length > 4 && (
        <div className="subjects-summary">
          {subjects.length}科目 (平均: {Math.round(subjects.reduce((sum, s) => sum + s.deviation_value, 0) / subjects.length * 10) / 10})
        </div>
      )}
    </div>
  );
};

const StudentDashboard = () => {
  const { id: studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [teachingRecords, setTeachingRecords] = useState([]);
  const [mockExamResults, setMockExamResults] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [interviewSchedules, setInterviewSchedules] = useState([]);
  const [teachingSchedules, setTeachingSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // 仮の組織ID（実際はAuthContextから取得）
  const organizationId = '11111111-1111-1111-1111-111111111111';

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);

      // studentIdが無効な場合は早期リターン
      if (!studentId || studentId === 'undefined') {
        console.error('無効なstudentId:', studentId);
        return;
      }

      // 生徒基本情報を取得
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      // 面談記録を取得（最新5件）
      const { data: interviewsData, error: interviewsError } = await supabase
        .from('student_interviews')
        .select(`
          *,
          users(name)
        `)
        .eq('student_id', studentId)
        .order('interview_date', { ascending: false })
        .limit(5);

      if (interviewsError) throw interviewsError;

      // 指導履歴を取得（最新5件）
      const { data: teachingData, error: teachingError } = await supabase
        .from('teaching_records')
        .select(`
          *,
          users(name)
        `)
        .eq('student_id', studentId)
        .order('lesson_date', { ascending: false })
        .limit(5);

      if (teachingError) throw teachingError;

      // 模試結果を取得（最新5件）
      const { data: mockData, error: mockError } = await supabase
        .from('mock_exam_results')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })
        .limit(5);

      if (mockError) throw mockError;

      // タスクを取得（最新10件）
      const { data: tasksData, error: tasksError } = await supabase
        .from('student_tasks')
        .select(`
          *,
          students(name),
          users(name),
          task_categories(name, color)
        `)
        .eq('student_id', studentId)
        .order('due_date', { ascending: true })
        .limit(10);

      if (tasksError) throw tasksError;

      // 面談スケジュールを取得（今後3ヶ月分）
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      const { data: interviewSchedulesData, error: interviewSchedulesError } = await supabase
        .from('interview_schedules')
        .select(`
          *,
          users(name)
        `)
        .eq('student_id', studentId)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .lte('scheduled_date', threeMonthsFromNow.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (interviewSchedulesError) throw interviewSchedulesError;

      // 指導スケジュールを取得（今後3ヶ月分）
      const { data: teachingSchedulesData, error: teachingSchedulesError } = await supabase
        .from('teaching_schedules')
        .select(`
          *,
          users(name)
        `)
        .eq('student_id', studentId)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .lte('scheduled_date', threeMonthsFromNow.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (teachingSchedulesError) throw teachingSchedulesError;



      setStudent(studentData);
      setInterviews(interviewsData || []);
      setTeachingRecords(teachingData || []);
      setMockExamResults(mockData || []);
      setTasks(tasksData || []);
      setInterviewSchedules(interviewSchedulesData || []);
      setTeachingSchedules(teachingSchedulesData || []);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentData();
  }, [studentId, fetchStudentData]);

  // スケジュール更新時のコールバック
  const handleScheduleUpdate = () => {
    fetchStudentData();
  };

  // 模試結果の統計を計算
  const calculateMockStats = () => {
    if (mockExamResults.length === 0) return null;
    
    // 結果をグループ化（同じ模試をまとめる）
    const grouped = {};
    mockExamResults.forEach(result => {
      const key = `${result.exam_name}-${result.exam_date}`;
      if (!grouped[key]) {
        grouped[key] = {
          exam_name: result.exam_name,
          exam_date: result.exam_date,
          overall_deviation: null,
          subjects: [],
          notes: result.analysis_notes || ''
        };
      }
      
      if (result.subject && result.deviation_value) {
        if (result.subject === '総合' || result.subject === '全体') {
          grouped[key].overall_deviation = result.deviation_value;
        } else {
          grouped[key].subjects.push({
            subject: result.subject,
            deviation_value: result.deviation_value
          });
        }
      }
    });
    
    // 総合偏差値が設定されていない場合、科目平均を計算
    Object.values(grouped).forEach(group => {
      if (!group.overall_deviation && group.subjects.length > 0) {
        const avg = group.subjects.reduce((sum, s) => sum + s.deviation_value, 0) / group.subjects.length;
        group.overall_deviation = Math.round(avg * 10) / 10;
      }
    });
    
    const groupedResults = Object.values(grouped);
    
    if (groupedResults.length === 0) return {
      count: 0,
      average: '-',
      latest: '-',
      latestExam: ''
    };
    
    const deviationValues = groupedResults
      .map(r => r.overall_deviation)
      .filter(v => v && v > 0);
    
    if (deviationValues.length === 0) return {
      count: groupedResults.length,
      average: '-',
      latest: '-',
      latestExam: groupedResults[0]?.exam_name || ''
    };
    
    const average = deviationValues.reduce((sum, score) => sum + score, 0) / deviationValues.length;
    const latest = groupedResults[0]; // 最新（日付順でソート済み）
    
    return {
      count: groupedResults.length,
      average: Math.round(average * 10) / 10,
      latest: latest.overall_deviation || '-',
      latestExam: latest.exam_name
    };
  };

  const mockStats = calculateMockStats();

  // タスクの統計を計算
  const calculateTaskStats = () => {
    if (tasks.length === 0) return { total: 0, pending: 0, overdue: 0 };
    
    const today = new Date().toISOString().split('T')[0];
    const pending = tasks.filter(t => t.status === 'pending').length;
    const overdue = tasks.filter(t => t.status === 'pending' && t.due_date < today).length;
    
    return {
      total: tasks.length,
      pending: pending,
      overdue: overdue
    };
  };

  const taskStats = calculateTaskStats();


  if (loading) {
    return <FullPageLoader message="生徒データを読み込み中..." />
  }

  if (!student) {
    return (
      <div className="main-content">
        <div className="content-area">
          <div className="text-center">
            <h1 className="mb-4">生徒が見つかりません</h1>
            <Button 
              to="/students" 
              variant="primary"
            >
              生徒一覧に戻る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="toolbar">
        <div className="flex items-center gap-4">
          <Link 
            to="/students" 
            className="text-green hover:text-primary-green flex items-center"
          >
            ← 生徒一覧に戻る
          </Link>
          <h1>{student.name}さんのダッシュボード</h1>
        </div>
      </div>
      <div className="content-area">

        {/* 生徒基本情報 */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">基本情報</h2>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-secondary">学年</p>
                <p className="font-medium">{student.grade}年</p>
              </div>
              <div>
                <p className="text-sm text-secondary">志望校</p>
                <p className="font-medium">{student.target_school || '未設定'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary">保護者</p>
                <p className="font-medium">{student.parent_name || '未登録'}</p>
              </div>
              <div>
                <p className="text-sm text-secondary">保護者連絡先</p>
                <p className="font-medium">{student.parent_phone || '未登録'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 概要統計 */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* 面談記録サマリー */}
          <div className="stats-card">
            <div className="stats-card-value">{interviews.length}</div>
            <div className="stats-card-label">面談記録</div>
            <div className="stats-card-sublabel">
              {interviews.length > 0 
                ? `最新: ${new Date(interviews[0].interview_date).toLocaleDateString('ja-JP')}` 
                : '記録なし'}
            </div>
          </div>

          {/* 指導履歴サマリー */}
          <div className="stats-card">
            <div className="stats-card-value">{teachingRecords.length}</div>
            <div className="stats-card-label">指導履歴</div>
            <div className="stats-card-sublabel">
              {teachingRecords.length > 0 
                ? `最新: ${new Date(teachingRecords[0].lesson_date).toLocaleDateString('ja-JP')}` 
                : '記録なし'}
            </div>
          </div>

          {/* タスクサマリー */}
          <div className="stats-card">
            <div className="stats-card-value">{taskStats.pending}</div>
            <div className="stats-card-label">未完了タスク</div>
            <div className="stats-card-sublabel">
              {taskStats.overdue > 0 
                ? `期限切れ: ${taskStats.overdue}件` 
                : '期限内'}
            </div>
          </div>

          {/* 模試結果サマリー */}
          <div className="stats-card">
            <div className="stats-card-value">
              {mockStats ? mockStats.latest : '-'}
            </div>
            <div className="stats-card-label">模試結果</div>
            <div className="stats-card-sublabel">
              {mockStats 
                ? `平均偏差値: ${mockStats.average} (${mockStats.count}回)`
                : '記録なし'}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 最新面談記録 */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="card-title">最新面談記録</h2>
                <Link 
                  to={`/student-interviews?student=${studentId}`}
                  className="text-green text-sm"
                >
                  すべて見る →
                </Link>
              </div>
            </div>
            <div className="card-content">
              {interviews.length === 0 ? (
                <p className="text-light text-center py-4">面談記録がありません</p>
              ) : (
                <div className="space-y-4">
                  {interviews.slice(0, 3).map((interview) => (
                    <div key={interview.id} className="border-l-4 border-green pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-secondary">
                          {new Date(interview.interview_date).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-sm text-primary mb-1">
                        担当: {interview.users?.name}
                      </p>
                      <p className="text-sm text-secondary line-clamp-3">
                        {interview.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 最新指導履歴 */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="card-title">最新指導履歴</h2>
                <Link 
                  to={`/teaching-records?student=${studentId}`}
                  className="text-green text-sm"
                >
                  すべて見る →
                </Link>
              </div>
            </div>
            <div className="card-content">
              {teachingRecords.length === 0 ? (
                <p className="text-light text-center py-4">指導履歴がありません</p>
              ) : (
                <div className="space-y-4">
                  {teachingRecords.slice(0, 3).map((record) => (
                    <div key={record.id} className="border-l-4 border-green pl-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm text-secondary">
                          {new Date(record.lesson_date).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-sm text-primary mb-1">
                        講師: {record.users?.name}
                      </p>
                      <p className="text-sm text-secondary line-clamp-3">
                        {record.lesson_content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 最新タスク */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="card-title">最新タスク</h2>
                <Link 
                  to={`/tasks?student=${studentId}`}
                  className="text-green text-sm"
                >
                  すべて見る →
                </Link>
              </div>
            </div>
            <div className="card-content">
              {tasks.length === 0 ? (
                <p className="text-light text-center py-4">タスクがありません</p>
              ) : (
                <div className="space-y-4">
                  {tasks.slice(0, 5).map((task) => {
                    const isOverdue = task.status === 'pending' && task.due_date < new Date().toISOString().split('T')[0];
                    const isToday = task.due_date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <div key={task.id} className={`border-l-4 pl-4 ${
                        isOverdue ? 'border-red-500' : 
                        isToday ? 'border-yellow-500' : 
                        'border-green'
                      }`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm ${isOverdue ? 'text-red-600' : isToday ? 'text-yellow-600' : 'text-secondary'}`}>
                            {new Date(task.due_date).toLocaleDateString('ja-JP')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'completed' ? '完了' :
                             task.status === 'in_progress' ? '進行中' : '未着手'}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">
                          {task.title}
                        </p>
                        <p className="text-sm text-secondary">
                          {task.task_categories?.name || '未分類'} | 担当: {task.users?.name}
                        </p>
                        {(isOverdue || isToday) && (
                          <p className={`text-xs mt-1 font-medium ${
                            isOverdue ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {isOverdue ? '期限切れ' : '今日が期限'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* カレンダー */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">スケジュールカレンダー</h2>
          </div>
          <div className="card-content">
            <StudentCalendar 
              interviews={interviews}
              teachingRecords={teachingRecords}
              tasks={tasks}
              interviewSchedules={interviewSchedules}
              teachingSchedules={teachingSchedules}
              studentId={studentId}
              organizationId={organizationId}
              onScheduleUpdate={handleScheduleUpdate}
            />
          </div>
        </div>

        {/* 模試結果 */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="card-title">最新模試結果</h2>
              <Link 
                to={`/mock-exams?student=${studentId}`}
                className="text-green text-sm"
              >
                すべて見る →
              </Link>
            </div>
          </div>
          <div className="card-content">
            {mockExamResults.length === 0 ? (
              <p className="text-light text-center py-4">模試結果がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>試験日</th>
                      <th>模試名</th>
                      <th>総合偏差値</th>
                      <th className="subjects-column">科目別偏差値</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // 模試結果をグループ化
                      const grouped = {};
                      mockExamResults.forEach(result => {
                        const key = `${result.exam_name}-${result.exam_date}`;
                        if (!grouped[key]) {
                          grouped[key] = {
                            exam_name: result.exam_name,
                            exam_date: result.exam_date,
                            overall_deviation: null,
                            subjects: [],
                            notes: result.analysis_notes || ''
                          };
                        }
                        
                        if (result.subject && result.deviation_value) {
                          if (result.subject === '総合' || result.subject === '全体') {
                            grouped[key].overall_deviation = result.deviation_value;
                          } else {
                            grouped[key].subjects.push({
                              subject: result.subject,
                              deviation_value: result.deviation_value
                            });
                          }
                        }
                      });
                      
                      // 総合偏差値が設定されていない場合、科目平均を計算
                      Object.values(grouped).forEach(group => {
                        if (!group.overall_deviation && group.subjects.length > 0) {
                          const avg = group.subjects.reduce((sum, s) => sum + s.deviation_value, 0) / group.subjects.length;
                          group.overall_deviation = Math.round(avg * 10) / 10;
                        }
                      });
                      
                      return Object.values(grouped).map((result, index) => (
                        <tr key={index}>
                          <td>
                            {new Date(result.exam_date).toLocaleDateString('ja-JP')}
                          </td>
                          <td>{result.exam_name}</td>
                          <td>
                            <span className="font-medium text-primary-green">
                              {result.overall_deviation || '-'}
                            </span>
                          </td>
                          <td className="subjects-column">
                            {result.subjects.length > 0 ? (
                              <SubjectsDisplay subjects={result.subjects} />
                            ) : '-'}
                          </td>
                          <td>
                            {result.notes || '-'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard; 