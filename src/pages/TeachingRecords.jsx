import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../components/Button';

const TeachingRecords = () => {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [searchParams] = useSearchParams();
  const preSelectedStudentId = searchParams.get('student');
  const [organizationId, setOrganizationId] = useState(null);
  const [formData, setFormData] = useState({
    student_id: preSelectedStudentId || '',
    teacher_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
    lesson_content: ''
  });

  // ログインユーザーのorganization_idを取得
  useEffect(() => {
    const fetchOrganizationId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', user.id)
            .single();
          
          if (error) throw error;
          if (userData) {
            setOrganizationId(userData.organization_id);
          }
        }
      } catch (error) {
        console.error('組織ID取得エラー:', error);
      }
    };

    fetchOrganizationId();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 指導記録を取得
      let recordsQuery = supabase
        .from('teaching_records')
        .select(`
          *,
          students(name, grade),
          users(name)
        `)
        .eq('organization_id', organizationId)
        .order('lesson_date', { ascending: false });

      // 特定の生徒が指定されている場合はフィルタリング
      if (preSelectedStudentId) {
        recordsQuery = recordsQuery.eq('student_id', preSelectedStudentId);
      }

      const { data: recordsData, error: recordsError } = await recordsQuery;

      if (recordsError) throw recordsError;

      // 生徒一覧を取得（組織で絞り込み）
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade')
        .eq('status', 'active')
        .eq('organization_id', organizationId)
        .order('grade', { ascending: true });

      if (studentsError) throw studentsError;

      // 講師一覧を取得（組織で絞り込み）
      const { data: teachersData, error: teachersError } = await supabase
        .from('users')
        .select('id, name')
        .in('role', ['admin', 'teacher'])
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (teachersError) throw teachersError;

      setRecords(recordsData || []);
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
      const recordData = {
        organization_id: organizationId,
        student_id: formData.student_id,
        teacher_id: formData.teacher_id,
        lesson_date: formData.lesson_date,
        lesson_content: formData.lesson_content,
        // 基本的なデフォルト値のみ設定
        subject: '指導',
        lesson_type: 'individual',
        duration_minutes: 90
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('teaching_records')
          .update(recordData)
          .eq('id', editingRecord.id);
        
        if (error) throw error;
        alert('指導履歴を更新しました');
      } else {
        const { error } = await supabase
          .from('teaching_records')
          .insert([recordData]);
        
        if (error) throw error;
        alert('指導履歴を登録しました');
      }

      setShowForm(false);
      setEditingRecord(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      student_id: record.student_id,
      teacher_id: record.teacher_id,
      lesson_date: record.lesson_date,
      lesson_content: record.lesson_content
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('この指導記録を削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('teaching_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('指導記録を削除しました');
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
      lesson_date: new Date().toISOString().split('T')[0],
      lesson_content: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // フォーム表示時の処理を最適化
  const handleShowForm = () => {
    setShowForm(true);
    setEditingRecord(null);
    resetForm();
  };

  // フィルタリング
  const filteredRecords = records.filter(record => {
    const subjectMatch = filterSubject === '' || record.subject.includes(filterSubject);
    const studentMatch = filterStudent === '' || record.student_id === filterStudent;
    return subjectMatch && studentMatch;
  });

  // 科目一覧取得（フィルタ用）
  const subjects = [...new Set(records.map(record => record.subject))].sort();

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
                ? `${selectedStudent.name}さんの指導履歴` 
                : '指導履歴管理'}
            </h1>
          </div>
          <Button
            onClick={handleShowForm}
            variant="primary"
          >
            + 新規指導記録
          </Button>
        </div>
      </div>
      <div className="content-area">

        {/* フィルター */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">フィルター</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  科目
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">すべての科目</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">
                  生徒
                </label>
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="form-input form-select"
                >
                  <option value="">すべての生徒</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.grade}年)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingRecord ? '指導記録編集' : '新規指導記録'}
                </h2>
              </div>
              <div className="modal-body">
                <form id="teaching-form" onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">
                        生徒 *
                      </label>
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
                      <label className="form-label">
                        担当講師 *
                      </label>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">
                        授業日 *
                      </label>
                      <input
                        type="date"
                        name="lesson_date"
                        value={formData.lesson_date}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        授業内容 *
                      </label>
                      <textarea
                        name="lesson_content"
                        value={formData.lesson_content}
                        onChange={handleInputChange}
                        required
                        className="form-input form-textarea"
                        placeholder="今日の授業で行った内容を詳しく記入してください"
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingRecord(null);
                    resetForm();
                  }}
                  variant="secondary"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  form="teaching-form"
                  variant="primary"
                >
                  {editingRecord ? '更新' : '登録'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              指導記録一覧 ({filteredRecords.length}件)
            </h2>
          </div>
          <div className="card-content">
            {filteredRecords.length === 0 ? (
              <p className="text-light text-center py-8">
                指導記録がありません
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>授業日</th>
                      <th>生徒</th>
                      <th>講師</th>
                      <th>指導内容</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="date-column">
                          {new Date(record.lesson_date).toLocaleDateString('ja-JP')}
                        </td>
                        <td className="student-column">
                          {record.students?.name} ({record.students?.grade}年)
                        </td>
                        <td className="teacher-column">
                          {record.users?.name}
                        </td>
                        <td className="content-column">
                          {record.lesson_content}
                        </td>
                        <td className="actions-column">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(record)}
                              variant="text"
                              className="text-green"
                            >
                              編集
                            </Button>
                            <Button
                              onClick={() => handleDelete(record.id)}
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

export default TeachingRecords; 