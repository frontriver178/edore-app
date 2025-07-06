import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../components/Button';

const StudentInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);
  const [searchParams] = useSearchParams();
  const preSelectedStudentId = searchParams.get('student');
  const [formData, setFormData] = useState({
    student_id: preSelectedStudentId || '',
    teacher_id: '',
    interview_date: new Date().toISOString().split('T')[0],
    content: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 面談記録を取得
      let interviewsQuery = supabase
        .from('student_interviews')
        .select(`
          *,
          students(name, grade),
          users(name)
        `)
        .order('interview_date', { ascending: false });

      // 特定の生徒が指定されている場合はフィルタリング
      if (preSelectedStudentId) {
        interviewsQuery = interviewsQuery.eq('student_id', preSelectedStudentId);
      }

      const { data: interviewsData, error: interviewsError } = await interviewsQuery;

      if (interviewsError) throw interviewsError;

      // 生徒一覧を取得
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('status', 'active')
        .order('grade', { ascending: true });

      if (studentsError) throw studentsError;

      // 講師一覧を取得
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .in('role', ['admin', 'teacher'])
        .order('name', { ascending: true });

      if (teachersError) throw teachersError;

      setInterviews(interviewsData || []);
      setStudents(studentsData || []);
      setTeachers(teachersData || []);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 組織IDを動的に取得（既存の組織から最初の1つを取得）
      const { data: organizations, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      if (orgError) throw orgError;
      
      if (!organizations || organizations.length === 0) {
        alert('組織情報が見つかりません');
        return;
      }

      const interviewData = {
        organization_id: organizations[0].id, // 動的に取得
        student_id: formData.student_id,
        teacher_id: formData.teacher_id,
        interview_date: formData.interview_date,
        content: formData.content,
        // 基本的なデフォルト値のみ設定
        interview_type: 'regular',
        duration_minutes: 30,
        topics: [],
        student_condition: null,
        action_items: []
      };

      if (editingInterview) {
        const { error } = await supabase
          .from('student_interviews')
          .update(interviewData)
          .eq('id', editingInterview.id);
        
        if (error) throw error;
        alert('面談記録を更新しました');
      } else {
        const { error } = await supabase
          .from('student_interviews')
          .insert([interviewData]);
        
        if (error) throw error;
        alert('面談記録を登録しました');
      }

      setShowForm(false);
      setEditingInterview(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (interview) => {
    setEditingInterview(interview);
    setFormData({
      student_id: interview.student_id,
      teacher_id: interview.teacher_id,
      interview_date: interview.interview_date,
      content: interview.content
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この面談記録を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('student_interviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('面談記録を削除しました');
      fetchData();
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: preSelectedStudentId || '',
      teacher_id: '',
      interview_date: new Date().toISOString().split('T')[0],
      content: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  // 選択されている生徒の情報を取得
  const selectedStudent = preSelectedStudentId 
    ? students.find(s => s.id === preSelectedStudentId)
    : null;

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
                ? `${selectedStudent.name}さんの面談記録` 
                : '生徒面談管理'}
            </h1>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingInterview(null);
              resetForm();
            }}
            variant="primary"
          >
            + 新規面談記録
          </Button>
        </div>
      </div>
      <div className="content-area">

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingInterview ? '面談記録編集' : '新規面談記録'}
                </h2>
              </div>
              <div className="modal-body">
                <form id="interview-form" onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">生徒 *</label>
                      <select
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleInputChange}
                        required
                        className="form-input form-select"
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
                        name="teacher_id"
                        value={formData.teacher_id}
                        onChange={handleInputChange}
                        required
                        className="form-input form-select"
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

                  <div className="form-group">
                    <label className="form-label">面談日 *</label>
                    <input
                      type="date"
                      name="interview_date"
                      value={formData.interview_date}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">面談内容 *</label>
                    <textarea
                      name="content"
                      value={formData.content}
                      onChange={handleInputChange}
                      required
                      className="form-input form-textarea"
                      placeholder="面談の詳細な内容を記入してください"
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingInterview(null);
                    resetForm();
                  }}
                  variant="secondary"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  form="interview-form"
                  variant="primary"
                >
                  {editingInterview ? '更新' : '登録'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">面談記録一覧 ({interviews.length}件)</h2>
          </div>
          <div className="card-content">
            {interviews.length === 0 ? (
              <p className="text-light text-center py-8">
                面談記録がありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>面談日</th>
                      <th>生徒</th>
                      <th>担当講師</th>
                      <th>面談内容</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((interview) => (
                      <tr key={interview.id}>
                        <td className="date-column">
                          {new Date(interview.interview_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="student-column">
                          {interview.students?.name} ({interview.students?.grade}年)
                        </td>
                        <td className="teacher-column">
                          {interview.users?.name}
                        </td>
                        <td className="content-column">
                          {interview.content}
                        </td>
                        <td className="actions-column">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(interview)}
                              variant="text"
                              className="text-green"
                            >
                              編集
                            </Button>
                            <Button
                              onClick={() => handleDelete(interview.id)}
                              variant="text"
                              className="text-error"
                            >
                              削除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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

export default StudentInterviews; 