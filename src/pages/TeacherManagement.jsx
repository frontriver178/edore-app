import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import RoleBasedAccess from '../components/RoleBasedAccess'
import Button from '../components/Button'

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const { user, userRole, organizationId } = useAuth()

  // 新規講師追加用state
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    phone: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  // 講師一覧を取得
  const fetchTeachers = async () => {
    if (!organizationId) return

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
      alert('講師一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [organizationId])

  // 新規講師追加
  const handleAddTeacher = async (e) => {
    e.preventDefault()
    if (!organizationId) return

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
          hire_date: newTeacher.hire_date
        })

      if (error) throw error

      alert('講師が正常に追加されました')
      setNewTeacher({
        name: '',
        email: '',
        phone: '',
        hire_date: new Date().toISOString().split('T')[0]
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
    return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>
  }

  return (
    <RoleBasedAccess allowedRoles={['admin']}>
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>👨‍🏫 講師管理</h2>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="primary"
          >
            {showAddForm ? '✕ キャンセル' : '➕ 講師追加'}
          </Button>
        </div>

        {/* 講師追加フォーム */}
        {showAddForm && (
          <form onSubmit={handleAddTeacher} style={{ 
            background: '#f8f8f8', 
            padding: '1.5rem', 
            borderRadius: '4px', 
            marginBottom: '2rem' 
          }}>
            <h3>新規講師追加</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>名前 *</label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                  required
                />
              </div>
              
              <div>
                <label>メールアドレス</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label>電話番号</label>
                <input
                  type="text"
                  value={newTeacher.phone}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
              
              <div>
                <label>入社日</label>
                <input
                  type="date"
                  value={newTeacher.hire_date}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, hire_date: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              variant="primary"
            >
              講師を追加
            </Button>
          </form>
        )}

        {/* 講師一覧 */}
        <div style={{ background: 'white', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f5f5f5' }}>
              <tr>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>名前</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>メール</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>電話番号</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #ddd' }}>入社日</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #ddd' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    講師が登録されていません
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>{teacher.name}</td>
                    <td style={{ padding: '1rem' }}>{teacher.email || '-'}</td>
                    <td style={{ padding: '1rem' }}>{teacher.phone || '-'}</td>
                    <td style={{ padding: '1rem' }}>
                      {teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <Button
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        variant="error"
                        size="sm"
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#e3f2fd', borderRadius: '4px' }}>
          <h4>💡 講師管理について</h4>
          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
            <li>講師は管理者画面から直接追加できます</li>
            <li>講師は生徒の面談記録や成績を管理できます</li>
            <li>講師自身のログイン機能は今後実装予定です</li>
          </ul>
        </div>
      </div>
    </RoleBasedAccess>
  )
}

export default TeacherManagement 