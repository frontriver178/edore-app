import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useStudentsData } from '../contexts/StudentsContext';
import RoleBasedAccess from '../components/RoleBasedAccess';
import FullPageLoader from '../components/FullPageLoader';
import PerformanceDebugger from '../components/PerformanceDebugger';

const StudentList = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const { userRole } = useAuth();
  
  // StudentsContextからデータを取得
  const { students, loading, error, addStudent, updateStudent, deleteStudent, isDataReady } = useStudentsData();

  // 新規生徒追加用state
  const [newStudent, setNewStudent] = useState({
    name: '',
    grade: '',
    target_school: '',
    parent_phone: '',
    parent_email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: ''
  });

  // 生徒編集用state
  const [editStudent, setEditStudent] = useState({
    name: '',
    grade: '',
    target_school: '',
    parent_phone: '',
    parent_email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: ''
  });

  // フィルタリングされた生徒一覧を取得（メモ化）
  const getFilteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (student.target_school && student.target_school.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesGrade = gradeFilter === 'all' || student.grade.toString() === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [students, searchTerm, gradeFilter]);

  // 新規生徒追加
  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    const result = await addStudent({
      name: newStudent.name,
      grade: Number(newStudent.grade),
      target_school: newStudent.target_school,
      parent_phone: newStudent.parent_phone,
      parent_email: newStudent.parent_email,
      emergency_contact_name: newStudent.emergency_contact_name,
      emergency_contact_phone: newStudent.emergency_contact_phone,
      notes: newStudent.notes
    });

    if (result.success) {
      alert('生徒が正常に追加されました');
      setNewStudent({
        name: '',
        grade: '',
        target_school: '',
        parent_phone: '',
        parent_email: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        notes: ''
      });
      setShowAddForm(false);
    } else {
      alert('生徒の追加に失敗しました: ' + result.error);
    }
  };

  // 生徒編集
  const handleEditStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const result = await updateStudent(editingStudent.id, {
      name: editStudent.name,
      grade: Number(editStudent.grade),
      target_school: editStudent.target_school,
      parent_phone: editStudent.parent_phone,
      parent_email: editStudent.parent_email,
      emergency_contact_name: editStudent.emergency_contact_name,
      emergency_contact_phone: editStudent.emergency_contact_phone,
      notes: editStudent.notes
    });

    if (result.success) {
      alert('生徒情報が更新されました');
      setShowEditForm(false);
      setEditingStudent(null);
    } else {
      alert('生徒の更新に失敗しました: ' + result.error);
    }
  };

  // 編集フォームを開く
  const openEditForm = (student) => {
    setEditingStudent(student);
    setEditStudent({
      name: student.name || '',
      grade: student.grade || '',
      target_school: student.target_school || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || '',
      notes: student.notes || ''
    });
    setShowEditForm(true);
  };

  // 生徒削除
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`${studentName}を削除してもよろしいですか？`)) return;

    const result = await deleteStudent(studentId);
    
    if (result.success) {
      alert('生徒が削除されました');
    } else {
      alert('生徒の削除に失敗しました: ' + result.error);
    }
  };

  // エラー表示
  if (error) {
    return (
      <div className="main-content">
        <div className="card error-card">
          <div className="card-content">
            <h3>エラーが発生しました</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ローディング表示（初回のみ）
  if (!isDataReady && loading) {
    return <FullPageLoader message="生徒データを読み込み中..." />
  }

  return (
    <RoleBasedAccess allowedRoles={['admin', 'teacher']}>
      <div className="main-content">
        <div className="toolbar">
          <h1>生徒管理</h1>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="primary"
          >
            {showAddForm ? '✕ キャンセル' : '➕ 生徒追加'}
          </Button>
        </div>

        <div className="content-area">
          
          {/* 検索・フィルタリング */}
          <div className="card mb-6">
            <div className="card-content">
              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">検索</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                    placeholder="名前または志望校で検索"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">学年</label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">すべて</option>
                    {[1, 2, 3, 4, 5, 6].map(grade => (
                      <option key={grade} value={grade}>{grade}年生</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">結果</label>
                  <div className="form-input bg-gray-50">
                    {getFilteredStudents.length}件の生徒
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 生徒追加フォーム */}
          {showAddForm && (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="card-title">新規生徒追加</h3>
              </div>
              <div className="card-content">
                <form onSubmit={handleAddStudent}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">名前 *</label>
                      <input
                        type="text"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">学年 *</label>
                      <select
                        value={newStudent.grade}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, grade: e.target.value }))}
                        className="form-select"
                        required
                      >
                        <option value="">選択してください</option>
                        {[1, 2, 3, 4, 5, 6].map(grade => (
                          <option key={grade} value={grade}>{grade}年生</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">志望校</label>
                      <input
                        type="text"
                        value={newStudent.target_school}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, target_school: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">保護者電話番号</label>
                      <input
                        type="text"
                        value={newStudent.parent_phone}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, parent_phone: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">保護者メールアドレス</label>
                      <input
                        type="email"
                        value={newStudent.parent_email}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, parent_email: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">緊急連絡先名</label>
                      <input
                        type="text"
                        value={newStudent.emergency_contact_name}
                        onChange={(e) => setNewStudent(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">緊急連絡先電話番号</label>
                    <input
                      type="text"
                      value={newStudent.emergency_contact_phone}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">備考</label>
                    <textarea
                      value={newStudent.notes}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, notes: e.target.value }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="生徒に関する備考"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      loading={loading}
                      variant="primary"
                    >
                      生徒を追加
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      variant="secondary"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 生徒編集フォーム */}
          {showEditForm && editingStudent && (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="card-title">生徒情報編集</h3>
              </div>
              <div className="card-content">
                <form onSubmit={handleEditStudent}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">名前 *</label>
                      <input
                        type="text"
                        value={editStudent.name}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">学年 *</label>
                      <select
                        value={editStudent.grade}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, grade: e.target.value }))}
                        className="form-select"
                        required
                      >
                        <option value="">選択してください</option>
                        {[1, 2, 3, 4, 5, 6].map(grade => (
                          <option key={grade} value={grade}>{grade}年生</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">志望校</label>
                      <input
                        type="text"
                        value={editStudent.target_school}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, target_school: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">保護者電話番号</label>
                      <input
                        type="text"
                        value={editStudent.parent_phone}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, parent_phone: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">保護者メールアドレス</label>
                      <input
                        type="email"
                        value={editStudent.parent_email}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, parent_email: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">緊急連絡先名</label>
                      <input
                        type="text"
                        value={editStudent.emergency_contact_name}
                        onChange={(e) => setEditStudent(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">緊急連絡先電話番号</label>
                    <input
                      type="text"
                      value={editStudent.emergency_contact_phone}
                      onChange={(e) => setEditStudent(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">備考</label>
                    <textarea
                      value={editStudent.notes}
                      onChange={(e) => setEditStudent(prev => ({ ...prev, notes: e.target.value }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="生徒に関する備考"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      loading={loading}
                      variant="primary"
                    >
                      更新
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      variant="secondary"
                    >
                      キャンセル
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 生徒一覧 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">生徒一覧</h3>
            </div>
            <div className="card-content">
              <div className="overflow-x-auto">
                <table className="spreadsheet-table" style={{ visibility: !isDataReady ? 'hidden' : 'visible' }}>
                  <thead>
                    <tr>
                      <th>名前</th>
                      <th>学年</th>
                      <th>志望校</th>
                      <th>連絡先</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody style={{ opacity: !isDataReady ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }}>
                    {getFilteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-light py-8">
                          {searchTerm || gradeFilter !== 'all' ? '条件に一致する生徒が見つかりません' : '生徒が登録されていません'}
                        </td>
                      </tr>
                    ) : (
                      getFilteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <Link to={`/students/${student.id}`} className="text-green">
                              {student.name}
                            </Link>
                            {student.notes && (
                              <div className="text-sm text-gray-500 truncate" title={student.notes}>
                                {student.notes.length > 30 ? student.notes.substring(0, 30) + '...' : student.notes}
                              </div>
                            )}
                          </td>
                          <td>{student.grade}年生</td>
                          <td>{student.target_school || '-'}</td>
                          <td>
                            <div className="text-sm space-y-1">
                              {student.parent_phone && (
                                <div>📱 {student.parent_phone}</div>
                              )}
                              {student.parent_email && (
                                <div>✉️ {student.parent_email}</div>
                              )}
                              {student.emergency_contact_name && (
                                <div className="text-red-600">
                                  {student.emergency_contact_name}
                                  {student.emergency_contact_phone && ` (${student.emergency_contact_phone})`}
                                </div>
                              )}
                              {!student.parent_phone && !student.parent_email && !student.emergency_contact_name && '-'}
                            </div>
                          </td>
                          <td className="actions-column">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditForm(student)}
                                variant="secondary"
                                size="sm"
                              >
                                編集
                              </Button>
                              <RoleBasedAccess allowedRoles={['admin']}>
                                <Button
                                  onClick={() => handleDeleteStudent(student.id, student.name)}
                                  variant="error"
                                  size="sm"
                                >
                                  削除
                                </Button>
                              </RoleBasedAccess>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card info-card">
            <div className="card-header">
              <h4 className="card-title">生徒管理について</h4>
            </div>
            <div className="card-content">
              <ul className="info-list">
                <li>生徒情報は講師と共有されます</li>
                <li>削除した生徒は非アクティブ状態になり、データは保持されます</li>
                <li>生徒の詳細ページから学習記録や成績を管理できます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* パフォーマンスデバッガー（開発環境のみ） */}
      <PerformanceDebugger />
    </RoleBasedAccess>
  );
};

export default StudentList;