import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import Button from '../components/Button';

const StudentList = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [newStudent, setNewStudent] = useState({ name: '', grade: '', target_school: '' });
  const [adding, setAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', grade: '', target_school: '' });
  // デバッグ用のstate
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    authUser: null,
    usersTableData: null,
    authError: null,
    usersError: null
  });

  // ログインユーザーの情報を一括取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('🔐 認証ユーザー情報:', user);
        
        // デバッグ情報を更新
        setDebugInfo(prev => ({
          ...prev,
          authUser: user,
          authError: authError
        }));
        
        if (user) {
          // まずusersテーブルでユーザーを検索
          const { data: userData, error } = await supabase
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();
          
          console.log('👤 usersテーブル検索結果:', { userData, error });
          
          // デバッグ情報を更新
          setDebugInfo(prev => ({
            ...prev,
            usersTableData: userData,
            usersError: error
          }));
          
          if (error) {
            if (error.code === 'PGRST116') {
              // ユーザーが存在しない場合
              console.warn('⚠️ usersテーブルにレコードが存在しません');
              console.log('📧 認証ユーザーEmail:', user.email);
              
              // emailで検索してみる
              const { data: userByEmail, error: emailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', user.email);
              
              console.log('📧 Email検索結果:', { userByEmail, emailError });
              
              if (userByEmail && userByEmail.length > 0) {
                // Emailでユーザーが見つかった場合、IDを更新
                console.log('🔄 ユーザーIDを更新中...');
                const { data: updatedUser, error: updateError } = await supabase
                  .from('users')
                  .update({ id: user.id })
                  .eq('email', user.email)
                  .select()
                  .single();
                
                console.log('🔄 更新結果:', { updatedUser, updateError });
                
                if (updatedUser && !updateError) {
                  setOrganizationId(updatedUser.organization_id);
                  setUserRole(updatedUser.role);
                  
                  // デバッグ情報を更新
                  setDebugInfo(prev => ({
                    ...prev,
                    usersTableData: updatedUser,
                    usersError: null
                  }));
                  return;
                }
              }
              
              // 新規ユーザーの場合は組織セットアップに誘導
              alert('ユーザー情報が見つかりません。組織のセットアップが必要です。');
              // 組織セットアップページに遷移させる処理を追加
              return;
            }
            throw error;
          }
          
          if (userData) {
            console.log('✅ ユーザー情報取得成功:', userData);
            setOrganizationId(userData.organization_id);
            setUserRole(userData.role);
          }
        }
      } catch (error) {
        console.error('❌ ユーザー情報取得エラー:', error);
        console.error('エラー詳細:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // 開発環境でのデバッグ用：サンプル組織IDを使用
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 開発環境：サンプル組織IDを使用');
          setOrganizationId('11111111-1111-1111-1111-111111111111');
          setUserRole('admin');
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 生徒一覧を取得（組織で絞り込み）
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade, target_school')
        .eq('status', 'active')
        .eq('organization_id', organizationId)
        .order('grade', { ascending: true });

      if (studentsError) throw studentsError;

      setStudents(studentsData || []);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.grade) {
      alert('生徒名と学年は必須です');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.from('students').insert({
        name: newStudent.name,
        grade: Number(newStudent.grade),
        target_school: newStudent.target_school,
        organization_id: organizationId,
        status: 'active'
      }).select();

      if (error) {
        alert('生徒追加に失敗しました: ' + error.message);
      } else if (data) {
        setStudents(prev => [...prev, data[0]]);
        setNewStudent({ name: '', grade: '', target_school: '' });
      }
    } catch (err) {
      alert('生徒追加中にエラーが発生しました');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name,
      grade: student.grade.toString(),
      target_school: student.target_school || ''
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.grade) {
      alert('生徒名と学年は必須です');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          name: editFormData.name,
          grade: Number(editFormData.grade),
          target_school: editFormData.target_school
        })
        .eq('id', editingStudent.id)
        .select();

      if (error) {
        alert('更新に失敗しました: ' + error.message);
      } else if (data) {
        setStudents(prev => prev.map(s => s.id === editingStudent.id ? data[0] : s));
        setShowEditForm(false);
        setEditingStudent(null);
        setEditFormData({ name: '', grade: '', target_school: '' });
      }
    } catch (err) {
      alert('更新中にエラーが発生しました');
    }
  };

  const handleDeleteStudent = useCallback(async (studentId) => {
    if (window.confirm('この生徒を削除しますか？')) {
      setDeletingIds(prev => new Set(prev).add(studentId));
      try {
        const { error } = await supabase.from('students').delete().eq('id', studentId);
        if (error) {
          alert('削除に失敗しました: ' + error.message);
        } else {
          setStudents(prev => prev.filter(s => s.id !== studentId));
        }
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(studentId);
          return newSet;
        });
      }
    }
  }, []);

  if (loading) return <div className="loading">読み込み中...</div>;

  // 役割チェック用の関数
  const canTeacherAccess = userRole === 'teacher' || userRole === 'admin';
  const canAdminAccess = userRole === 'admin';

  return (
    <div className="main-content">
      <div className="toolbar">
        <div className="flex items-center justify-between w-full">
          <h1>生徒一覧</h1>
          <Button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            variant="secondary"
            size="sm"
          >
            {showDebugPanel ? '🔧 デバッグパネルを閉じる' : '🔧 デバッグパネル'}
          </Button>
        </div>
      </div>
      <div className="content-area">

        {/* デバッグパネル */}
        {showDebugPanel && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">🔧 認証・ユーザー情報デバッグパネル</h3>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-2 gap-6">
                
                {/* 認証情報 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">🔐 Supabase認証情報</h4>
                  {debugInfo.authUser ? (
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">ID:</span> {debugInfo.authUser.id}</div>
                      <div><span className="font-medium">Email:</span> {debugInfo.authUser.email}</div>
                      <div><span className="font-medium">作成日:</span> {new Date(debugInfo.authUser.created_at).toLocaleString()}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">認証ユーザーが見つかりません</div>
                  )}
                  {debugInfo.authError && (
                    <div className="text-sm text-red-600 mt-2">
                      エラー: {debugInfo.authError.message}
                    </div>
                  )}
                </div>

                {/* usersテーブル情報 */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">👤 usersテーブル情報</h4>
                  {debugInfo.usersTableData ? (
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">組織ID:</span> {debugInfo.usersTableData.organization_id}</div>
                      <div><span className="font-medium">役割:</span> {debugInfo.usersTableData.role}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">usersテーブルにデータが見つかりません</div>
                  )}
                  {debugInfo.usersError && (
                    <div className="text-sm text-red-600 mt-2">
                      エラー: {debugInfo.usersError.message} (コード: {debugInfo.usersError.code})
                    </div>
                  )}
                </div>

                {/* 現在の状態 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">📊 現在のアプリケーション状態</h4>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">組織ID:</span> {organizationId || '未設定'}</div>
                    <div><span className="font-medium">ユーザー役割:</span> {userRole || '未設定'}</div>
                    <div><span className="font-medium">生徒数:</span> {students.length}</div>
                    <div><span className="font-medium">ローディング状態:</span> {loading ? 'true' : 'false'}</div>
                  </div>
                </div>

                {/* アクション */}
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold mb-2">🛠️ デバッグアクション</h4>
                  <div className="space-y-2">
                    <Button
                      onClick={() => window.location.reload()}
                      variant="secondary"
                      size="sm"
                    >
                      🔄 ページリロード
                    </Button>
                    <Button
                      onClick={() => {
                        setOrganizationId('11111111-1111-1111-1111-111111111111');
                        setUserRole('admin');
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      🧪 テスト組織IDを設定
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {canTeacherAccess && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">新しい生徒を追加</h3>
            </div>
            <div className="card-content">
              <form onSubmit={handleAddStudent} className="grid grid-cols-4 gap-4">
                <div className="form-group">
                  <label className="form-label">生徒名</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="生徒名"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">学年</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="学年"
                    value={newStudent.grade}
                    onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">志望校</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="志望校"
                    value={newStudent.target_school}
                    onChange={e => setNewStudent({ ...newStudent, target_school: e.target.value })}
                  />
                </div>
                <div className="form-group flex items-end">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={adding}
                    loading={adding}
                  >
                    追加
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">生徒一覧 ({students.length}人)</h2>
          </div>
          <div className="card-content">
            {students.length === 0 ? (
              <p className="text-light text-center py-8">生徒が登録されていません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>生徒名</th>
                      <th>学年</th>
                      <th>志望校</th>
                      {canAdminAccess && <th>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <Link to={`/students/${student.id}`} className="text-green">
                            {student.name}
                          </Link>
                        </td>
                        <td>{student.grade}年</td>
                        <td>{student.target_school || '-'}</td>
                        {canAdminAccess && (
                          <td>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEdit(student)}
                                variant="text"
                                className="text-green"
                              >
                                編集
                              </Button>
                              <Button
                                onClick={() => handleDeleteStudent(student.id)}
                                variant="text"
                                className="text-error"
                                disabled={deletingIds.has(student.id)}
                              >
                                {deletingIds.has(student.id) ? '削除中...' : '削除'}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 編集モーダル */}
        {showEditForm && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">
                  生徒情報編集
                </h2>
              </div>
              <div className="modal-body">
                <form id="edit-student-form" onSubmit={handleEditSubmit} className="grid gap-4">
                  <div className="form-group">
                    <label className="form-label">生徒名 *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">学年 *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editFormData.grade}
                      onChange={e => setEditFormData({ ...editFormData, grade: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">志望校</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editFormData.target_school}
                      onChange={e => setEditFormData({ ...editFormData, target_school: e.target.value })}
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <Button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingStudent(null);
                    setEditFormData({ name: '', grade: '', target_school: '' });
                  }}
                  variant="secondary"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  form="edit-student-form"
                  variant="primary"
                >
                  更新
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentList;