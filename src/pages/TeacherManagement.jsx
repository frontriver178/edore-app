import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import RoleBasedAccess from '../components/RoleBasedAccess'
import Button from '../components/Button'
import FullPageLoader from '../components/FullPageLoader'
import { validateOrganizationId } from '../utils/validation'

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { organizationId, userRole } = useAuth()

  // 新規講師追加用state
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    subjects: [],
    bio: ''
  })

  // 講師編集用state
  const [editTeacher, setEditTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    hire_date: '',
    status: 'active',
    subjects: [],
    bio: ''
  })

  // 科目一覧
  const subjects = [
    '数学', '英語', '国語', '理科', '社会', '物理', '化学', '生物', '地学',
    '日本史', '世界史', '地理', '現代社会', '政治経済', '倫理', '小論文'
  ]

  // 講師一覧を取得
  const fetchTeachers = async () => {
    const validation = validateOrganizationId(organizationId)
    if (!validation.isValid) {
      console.error('組織ID検証エラー:', validation.message)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeachers(data || [])
    } catch (error) {
      console.error('講師取得エラー:', error)
      alert('講師一覧の取得に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // フィルタリングされた講師一覧を取得
  const getFilteredTeachers = () => {
    return teachers.filter(teacher => {
      const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (teacher.email && teacher.email.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }

  useEffect(() => {
    fetchTeachers()
  }, [organizationId])

  // 新規講師追加
  const handleAddTeacher = async (e) => {
    e.preventDefault()
    
    const validation = validateOrganizationId(organizationId)
    if (!validation.isValid) {
      alert('組織IDが無効です。管理者にお問い合わせください。')
      return
    }

    setLoading(true)
    try {
      // 仮のUUIDを生成（実際のSupabase Authユーザーではない）
      const tempId = crypto.randomUUID()
      
      const { error } = await supabase
        .from('users')
        .insert({
          id: tempId,
          organization_id: organizationId,
          role: 'teacher',
          name: newTeacher.name,
          email: newTeacher.email,
          phone: newTeacher.phone,
          hire_date: newTeacher.hire_date,
          status: newTeacher.status,
          subjects: newTeacher.subjects,
          bio: newTeacher.bio
        })

      if (error) throw error

      alert('講師が正常に追加されました')
      setNewTeacher({
        name: '',
        email: '',
        phone: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'active',
        subjects: [],
        bio: ''
      })
      setShowAddForm(false)
      fetchTeachers()

    } catch (error) {
      console.error('講師追加エラー:', error)
      alert('講師の追加に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 講師編集
  const handleEditTeacher = async (e) => {
    e.preventDefault()
    if (!editingTeacher) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editTeacher.name,
          email: editTeacher.email,
          phone: editTeacher.phone,
          hire_date: editTeacher.hire_date,
          status: editTeacher.status,
          subjects: editTeacher.subjects,
          bio: editTeacher.bio
        })
        .eq('id', editingTeacher.id)

      if (error) throw error

      alert('講師情報が更新されました')
      setShowEditForm(false)
      setEditingTeacher(null)
      fetchTeachers()

    } catch (error) {
      console.error('講師更新エラー:', error)
      alert('講師の更新に失敗しました: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 編集フォームを開く
  const openEditForm = (teacher) => {
    setEditingTeacher(teacher)
    setEditTeacher({
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      hire_date: teacher.hire_date || '',
      status: teacher.status || 'active',
      subjects: teacher.subjects || [],
      bio: teacher.bio || ''
    })
    setShowEditForm(true)
  }

  // 科目選択の処理
  const handleSubjectChange = (subject, isChecked, isEditMode = false) => {
    if (isEditMode) {
      setEditTeacher(prev => ({
        ...prev,
        subjects: isChecked 
          ? [...prev.subjects, subject]
          : prev.subjects.filter(s => s !== subject)
      }))
    } else {
      setNewTeacher(prev => ({
        ...prev,
        subjects: isChecked 
          ? [...prev.subjects, subject]
          : prev.subjects.filter(s => s !== subject)
      }))
    }
  }

  // 講師削除
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!window.confirm(`${teacherName}を削除してもよろしいですか？`)) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', teacherId)

      if (error) throw error

      alert('講師が削除されました')
      fetchTeachers()

    } catch (error) {
      console.error('講師削除エラー:', error)
      alert('講師の削除に失敗しました')
    }
  }

  if (loading) {
    return <FullPageLoader message="講師データを読み込み中..." />
  }

  return (
    <RoleBasedAccess allowedRoles={['admin']}>
      <div className="main-content">
        <div className="toolbar">
          <h1>講師管理</h1>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="primary"
          >
            {showAddForm ? '✕ キャンセル' : '➕ 講師追加'}
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
                    placeholder="名前またはメールアドレスで検索"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">状態</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-select"
                  >
                    <option value="all">すべて</option>
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">結果</label>
                  <div className="form-input bg-gray-50">
                    {getFilteredTeachers().length}件の講師
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 講師追加フォーム */}
          {showAddForm && (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="card-title">新規講師追加</h3>
              </div>
              <div className="card-content">
                <form onSubmit={handleAddTeacher}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">名前 *</label>
                      <input
                        type="text"
                        value={newTeacher.name}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">メールアドレス</label>
                      <input
                        type="email"
                        value={newTeacher.email}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">電話番号</label>
                      <input
                        type="text"
                        value={newTeacher.phone}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, phone: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">入社日</label>
                      <input
                        type="date"
                        value={newTeacher.hire_date}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, hire_date: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">状態</label>
                      <select
                        value={newTeacher.status}
                        onChange={(e) => setNewTeacher(prev => ({ ...prev, status: e.target.value }))}
                        className="form-select"
                      >
                        <option value="active">アクティブ</option>
                        <option value="inactive">非アクティブ</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">担当科目</label>
                    <div className="grid grid-cols-4 gap-2">
                      {subjects.map(subject => (
                        <label key={subject} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newTeacher.subjects.includes(subject)}
                            onChange={(e) => handleSubjectChange(subject, e.target.checked)}
                            className="mr-2"
                          />
                          {subject}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">プロフィール</label>
                    <textarea
                      value={newTeacher.bio}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, bio: e.target.value }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="講師の経歴や専門分野について"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      loading={loading}
                      variant="primary"
                    >
                      講師を追加
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

          {/* 講師編集フォーム */}
          {showEditForm && editingTeacher && (
            <div className="card mb-6">
              <div className="card-header">
                <h3 className="card-title">講師情報編集</h3>
              </div>
              <div className="card-content">
                <form onSubmit={handleEditTeacher}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">名前 *</label>
                      <input
                        type="text"
                        value={editTeacher.name}
                        onChange={(e) => setEditTeacher(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">メールアドレス</label>
                      <input
                        type="email"
                        value={editTeacher.email}
                        onChange={(e) => setEditTeacher(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="form-group">
                      <label className="form-label">電話番号</label>
                      <input
                        type="text"
                        value={editTeacher.phone}
                        onChange={(e) => setEditTeacher(prev => ({ ...prev, phone: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">入社日</label>
                      <input
                        type="date"
                        value={editTeacher.hire_date}
                        onChange={(e) => setEditTeacher(prev => ({ ...prev, hire_date: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">状態</label>
                      <select
                        value={editTeacher.status}
                        onChange={(e) => setEditTeacher(prev => ({ ...prev, status: e.target.value }))}
                        className="form-select"
                      >
                        <option value="active">アクティブ</option>
                        <option value="inactive">非アクティブ</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">担当科目</label>
                    <div className="grid grid-cols-4 gap-2">
                      {subjects.map(subject => (
                        <label key={subject} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editTeacher.subjects.includes(subject)}
                            onChange={(e) => handleSubjectChange(subject, e.target.checked, true)}
                            className="mr-2"
                          />
                          {subject}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="form-label">プロフィール</label>
                    <textarea
                      value={editTeacher.bio}
                      onChange={(e) => setEditTeacher(prev => ({ ...prev, bio: e.target.value }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="講師の経歴や専門分野について"
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

          {/* 講師一覧 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">講師一覧</h3>
            </div>
            <div className="card-content">
              <div className="overflow-x-auto">
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      <th>名前</th>
                      <th>メール</th>
                      <th>電話番号</th>
                      <th>担当科目</th>
                      <th>状態</th>
                      <th>入社日</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTeachers().length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center text-light py-8">
                          {searchTerm || statusFilter !== 'all' ? '条件に一致する講師が見つかりません' : '講師が登録されていません'}
                        </td>
                      </tr>
                    ) : (
                      getFilteredTeachers().map((teacher) => (
                        <tr key={teacher.id}>
                          <td>
                            <div className="font-medium">{teacher.name}</div>
                            {teacher.bio && (
                              <div className="text-sm text-gray-500 truncate" title={teacher.bio}>
                                {teacher.bio.length > 50 ? teacher.bio.substring(0, 50) + '...' : teacher.bio}
                              </div>
                            )}
                          </td>
                          <td>{teacher.email || '-'}</td>
                          <td>{teacher.phone || '-'}</td>
                          <td>
                            {teacher.subjects && teacher.subjects.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects.slice(0, 3).map(subject => (
                                  <span key={subject} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {subject}
                                  </span>
                                ))}
                                {teacher.subjects.length > 3 && (
                                  <span className="text-xs text-gray-500">+{teacher.subjects.length - 3}</span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {teacher.status === 'active' ? 'アクティブ' : '非アクティブ'}
                            </span>
                          </td>
                          <td>
                            {teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('ja-JP') : '-'}
                          </td>
                          <td className="actions-column">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditForm(teacher)}
                                variant="secondary"
                                size="sm"
                              >
                                編集
                              </Button>
                              <Button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                                variant="error"
                                size="sm"
                              >
                                削除
                              </Button>
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
              <h4 className="card-title">講師管理について</h4>
            </div>
            <div className="card-content">
              <ul className="info-list">
                <li>講師は管理者画面から直接追加できます</li>
                <li>講師は生徒の面談記録や成績を管理できます</li>
                <li>講師自身のログイン機能は今後実装予定です</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </RoleBasedAccess>
  )
}

export default TeacherManagement 